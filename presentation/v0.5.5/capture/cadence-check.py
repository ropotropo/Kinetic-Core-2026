from pathlib import Path
import argparse, hashlib, json, os, re, subprocess
import numpy as np

FFDIR = Path('/Users/andrkrupenko/Documents/ChatGPT/Nick/Hakaton2026/presentation/video/remotion/node_modules/@remotion/compositor-darwin-arm64')
ENV = {**os.environ, 'DYLD_LIBRARY_PATH': str(FFDIR)}
METHOD_VERSION = 'decoded-luma-cadence.v4-cumulative-anchor'
ROOT = Path(__file__).resolve().parent / 'cadence'
ROOT.mkdir(parents=True, exist_ok=True)

def probe(source):
    data = subprocess.check_output([str(FFDIR/'ffprobe'), '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(source)], env=ENV)
    return json.loads(data)

def analyze(source, name, crop):
    metadata = probe(source)
    video = next(stream for stream in metadata['streams'] if stream['codec_type'] == 'video')
    width, height = 240, 180
    filters = f'crop={crop},scale={width}:{height}:flags=area,format=gray'
    log_path = ROOT / f'{name}-decode.log'
    with log_path.open('wb') as log:
        command = [str(FFDIR/'ffmpeg'), '-hide_banner', '-loglevel', 'info', '-threads', '1', '-filter_threads', '1', '-i', str(source), '-map', '0:v:0', '-vf', filters, '-an', '-fps_mode', 'passthrough', '-pix_fmt', 'gray', '-threads', '1', '-c:v', 'rawvideo', '-f', 'image2pipe', 'pipe:1']
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=log, env=ENV)
        rows = []
        previous = None
        anchor = None
        first_frame_stats = None
        byte_count = width*height
        while True:
            data = process.stdout.read(byte_count)
            if not data:
                break
            if len(data) != byte_count:
                raise RuntimeError('Incomplete decoded frame')
            current = np.frombuffer(data, dtype=np.uint8).astype(np.int16)
            current_stats = {'meanLuma': float(np.mean(current)), 'fractionOver8Luma': float(np.mean(current > 8))}
            current_stats['blackFrame'] = current_stats['meanLuma'] < 0.6 and current_stats['fractionOver8Luma'] < 0.001
            if first_frame_stats is None:
                first_frame_stats = current_stats
            if previous is not None:
                delta = np.abs(current-previous)
                mae = float(np.mean(delta))
                active_fraction = float(np.mean(delta >= 2))
                near_duplicate = mae < 0.03 and active_fraction < 0.001
                if anchor is None:
                    anchor = previous.copy()
                anchor_delta = np.abs(current-anchor)
                anchor_mae = float(np.mean(anchor_delta))
                anchor_active_fraction = float(np.mean(anchor_delta >= 2))
                anchor_duplicate = near_duplicate and anchor_mae < 0.03 and anchor_active_fraction < 0.001
                if not anchor_duplicate:
                    anchor = current.copy()
                rows.append({'frame': len(rows)+1, 'exactDuplicate': bool(np.array_equal(current, previous)), 'maeLuma': mae, 'activeFraction2Luma': active_fraction, 'nearDuplicate': near_duplicate, 'anchorNearDuplicate': anchor_duplicate, 'anchorLumaMAE': anchor_mae, 'anchorActiveFraction2Luma': anchor_active_fraction, **current_stats})
            previous = current
        if process.wait() != 0:
            raise RuntimeError(log_path.read_text()[-2000:])
    frame_metadata = subprocess.check_output([str(FFDIR/'ffprobe'), '-v', 'error', '-select_streams', 'v:0', '-show_frames', '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', str(source)], env=ENV)
    times = [float(frame['best_effort_timestamp_time']) for frame in json.loads(frame_metadata)['frames']]
    if len(times) != len(rows)+1:
        raise RuntimeError(f'Frame timestamp mismatch {len(times)} versus {len(rows)+1}')
    for row, time in zip(rows, times[1:]):
        row['time'] = time
    output = {'methodVersion': METHOD_VERSION, 'source': str(source), 'sourceSha256': hashlib.sha256(Path(source).read_bytes()).hexdigest(), 'name': name, 'crop': crop, 'analysisDimensions': [width, height], 'threshold': {'nearDuplicate': 'MAE <0.03 on 0–255 luma AND <0.1% pixels changing by at least2 luma; borders/captions excluded by ROI'}, 'metadata': metadata, 'firstFrameStats': first_frame_stats, 'timestamps': times, 'frames': rows}
    destination = ROOT / f'{name}-cadence.json'
    destination.write_text(json.dumps(output, separators=(',', ':'))+'\n')
    return output

def summarize(data, start, end):
    rows = [row for row in data['frames'] if start <= row['time'] < end]
    if not rows:
        return None
    runs = []
    current = []
    for row in rows:
        if row['nearDuplicate']:
            current.append(row)
        elif current:
            runs.append(current)
            current = []
    if current:
        runs.append(current)
    # A duplicate transition covers its preceding PTS interval; use actual PTS, not nominal fps.
    previous_times = {index: data['timestamps'][index-1] for index in range(1, len(data['timestamps']))}
    intervals = [(max(start, previous_times[run[0]['frame']]), min(end, run[-1]['time'])) for run in runs]
    durations = [max(0, b-a) for a,b in intervals]
    long_runs = [{'start': a, 'end': b, 'seconds': duration} for (a,b), duration in zip(intervals,durations) if duration >= 0.5]
    anchor_runs = []
    anchor_run = []
    for row in rows:
        if row.get('anchorNearDuplicate', False):
            anchor_run.append(row)
        elif anchor_run:
            anchor_runs.append(anchor_run);anchor_run=[]
    if anchor_run:
        anchor_runs.append(anchor_run)
    anchor_durations = [max(0,min(end, run[-1]['time'])-max(start,previous_times[run[0]['frame']])) for run in anchor_runs]
    anchor_fields = {'anchorNearDuplicatePct': 100*sum(row.get('anchorNearDuplicate',False) for row in rows)/len(rows), 'longestAnchoredNearStaticHoldSeconds': max(anchor_durations,default=0)} if 'anchorNearDuplicate' in rows[0] else {}
    changed = sum(not row['nearDuplicate'] for row in rows)
    return {'start': start, 'end': end, 'decodedTransitions': len(rows), 'exactDuplicatePct': 100*sum(row['exactDuplicate'] for row in rows)/len(rows), 'nearDuplicatePct': 100*sum(row['nearDuplicate'] for row in rows)/len(rows), 'meaningfulChangesPerSecond': changed/(end-start), 'medianAdjacentLumaMAE': float(np.median([row['maeLuma'] for row in rows])), 'longestNearStaticHoldSeconds': max(durations,default=0), 'nearStaticHoldsAtLeastHalfSecond': sorted(long_runs,key=lambda row:row['seconds'],reverse=True)[:12], **anchor_fields}

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('source');parser.add_argument('name');parser.add_argument('--crop', default='720:540:520:180')
    args=parser.parse_args()
    result=analyze(args.source,args.name,args.crop)
    print(json.dumps({'report': str(ROOT/f'{args.name}-cadence.json'), 'summary':summarize(result,0,float(result['metadata']['format']['duration']))},indent=2))
