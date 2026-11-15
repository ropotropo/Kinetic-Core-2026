"""Build portable final-export cadence evidence from decoded per-frame reports."""
from pathlib import Path
import datetime, hashlib, importlib.util, json

ROOT=Path(__file__).resolve().parent
PROJECT=Path('presentation/video')
spec=importlib.util.spec_from_file_location('cadence',ROOT/'analyze_cadence.py')
cadence=importlib.util.module_from_spec(spec);spec.loader.exec_module(cadence)

def rounded(value):
    if isinstance(value,float):return round(value,6)
    if isinstance(value,list):return [rounded(x) for x in value]
    if isinstance(value,dict):return {k:rounded(v) for k,v in value.items()}
    return value

def black_intervals(data):
    frames=[data['firstFrameStats']]+data['frames'];times=data['timestamps'];duration=float(data['metadata']['format']['duration'])
    results=[];start=None
    for i,frame in enumerate(frames):
        if frame['blackFrame'] and start is None:start=times[i]
        if start is not None and (not frame['blackFrame'] or i==len(frames)-1):
            end=times[i] if not frame['blackFrame'] else duration
            results.append({'startSeconds':start,'endSeconds':end,'durationSeconds':end-start});start=None
    return results

def main():
    plan=json.loads((PROJECT/'v2-edit-plan.json').read_text())
    full=json.loads((ROOT/'v2-full-game-cadence.json').read_text());world=json.loads((ROOT/'v2-world-cadence.json').read_text());whole=json.loads((ROOT/'v2-whole-frame-cadence.json').read_text())
    assert full['sourceSha256']==world['sourceSha256']==whole['sourceSha256']
    audio_path=ROOT/'v2-audio-validation.json';audio=json.loads(audio_path.read_text()) if audio_path.exists() else None
    if audio:assert audio['film']['sha256']==full['sourceSha256']
    ids_active={9,10,11,12,13,14,15,16,21}
    ids_title={1,22}
    segments=[]
    for shot in plan['shots']:
        start=shot['fromFrame']/30;end=(shot['fromFrame']+shot['durationFrames'])/30
        kind='active-flight' if shot['id'] in ids_active else ('intentional-title' if shot['id'] in ids_title else ('touchdown-with-intentional-settled-debrief' if shot['id']==17 else 'ui-operation-or-menu'))
        segments.append({'id':shot['id'],'name':shot['subject'],'classification':kind,'startSeconds':start,'endSeconds':end,'source':shot['source'],'sourceTrimSeconds':shot['trimSeconds'],'playbackRate':shot['playbackRate'],'editorZoom':shot['zoom'],'measuredRangeSeconds':[start+.1,end-.1],'fullGameplayROI':cadence.summarize(full,start+.1,end-.1),'centralWorldROI':cadence.summarize(world,start+.1,end-.1)})
    active=[r for r in segments if r['classification']=='active-flight']
    intervals=black_intervals(whole)
    gameplay_black=black_intervals(full)
    operational_black=[r for r in intervals if r['endSeconds']>3 and r['startSeconds']<79]
    operational_plate_black=[r for r in gameplay_black if r['endSeconds']>3 and r['startSeconds']<79]
    duration=float(full['metadata']['format']['duration']);v=next(s for s in full['metadata']['streams'] if s['codec_type']=='video')
    result={'schema':'kinetic-core-video-validation.v2','createdAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'film':{'file':Path(full['source']).name,'sha256':full['sourceSha256'],'durationSeconds':duration,'width':v['width'],'height':v['height'],'decodedFrameCount':len(full['timestamps']),'containerFrameRate':v['avg_frame_rate'],'within90Seconds':duration<=90},'method':{'version':cadence.METHOD_VERSION,'scriptFile':'analyze_cadence.py','scriptSha256':hashlib.sha256((ROOT/'analyze_cadence.py').read_bytes()).hexdigest(),'allFramesDecoded':True,'timing':'Presentation timestamps independently read with ffprobe; duplicate-run duration uses actual PTS intervals.','analysisRaster':[240,180],'scaling':'Area averaging to8-bit gray, after ROI crop.','rois':{'fullGameplay':{'x':64,'y':0,'width':1792,'height':1008},'centralWorld':{'x':448,'y':170,'width':800,'height':600},'wholeFrame':{'x':0,'y':0,'width':1920,'height':1080}},'nearDuplicateThreshold':{'meanAbsoluteLumaDeltaLessThan':0.03,'fractionOfPixelsChangingByAtLeast2LumaLessThan':0.001},'cumulativeAnchorGuard':'Also compare each near-duplicate frame to the fixed start of its run. Reset/break when cumulative change exceeds the same thresholds. This prevents tiny continuous drift from being counted as one literal freeze.','blackFrameThreshold':{'meanLumaLessThan':0.6,'fractionOfPixelsAbove8LumaLessThan':0.001},'shotEdgeTrimSeconds':0.1,'limits':'Near-duplicate/change rate is a visual-change proxy, not an instrumented game render-fps counter. Camera tracking, deliberate static UI, and settled landing result can legitimately repeat. Container30fps is not evidence of smoothness. Full-game and central-world crops exclude external captions; closeups can move the craft outside the central crop, so both are reported.'},'activeFlightSummary':{'segments':len(active),'fullGameplayWorstNearDuplicatePct':max(s['fullGameplayROI']['nearDuplicatePct'] for s in active),'fullGameplayLongestNearStaticHoldSeconds':max(s['fullGameplayROI']['longestNearStaticHoldSeconds'] for s in active),'centralWorldLongestNearStaticHoldSeconds':max(s['centralWorldROI']['longestNearStaticHoldSeconds'] for s in active),'fullGameplayLongestAnchoredNearStaticHoldSeconds':max(s['fullGameplayROI']['longestAnchoredNearStaticHoldSeconds'] for s in active),'centralWorldLongestAnchoredNearStaticHoldSeconds':max(s['centralWorldROI']['longestAnchoredNearStaticHoldSeconds'] for s in active)},'blackGaps':{'wholeFrameBlackIntervals':intervals,'gameplayPlateBlackIntervals':gameplay_black,'operationalWholeFrameBlackIntervals3to79Seconds':operational_black,'operationalGameplayPlateBlackIntervals3to79Seconds':operational_plate_black,'noOperationalBlackGaps':len(operational_black)==0 and len(operational_plate_black)==0},'segments':segments,'nativeSourcePrescan':json.loads((ROOT/'source-prescan-v2.json').read_text()),'audio':audio,'visualReview':{'status':'pending-direct-review','authorExpected':'Mykyta Borisov','projectExpected':'Kinetic Core','reviewScope':'Opening/ending, final captions, real UI operations, full context then purposeful closeups, active-motion freezes, and narration/visual synchronization.','listeningStatus':'Direct listening must be recorded separately; PCM statistics alone do not establish pronunciation or subjective musical balance.'},'conclusion':'Pending direct review of final export alongside decoded cadence and audio evidence.'}
    output=ROOT/'validation-v2.json';output.write_text(json.dumps(rounded(result),indent=2)+'\n')
    print(json.dumps(rounded({k:result[k] for k in ['film','activeFlightSummary','blackGaps']}),indent=2))

if __name__=='__main__':main()
