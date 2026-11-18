from pathlib import Path
import argparse,json,os,subprocess,wave,io
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--ffmpeg-dir',required=True);args=parser.parse_args()
BIN=Path(args.ffmpeg_dir);env={**os.environ,'DYLD_LIBRARY_PATH':str(BIN)}
out=ROOT/'video/public/audio';plan=json.loads((ROOT/'source/voice-beats.json').read_text())
rate=48000;audio=np.zeros(round(plan['durationSeconds']*rate));cues=[]
def stamp(t):
    v=round(t*1000);h,v=divmod(v,3600000);m,v=divmod(v,60000);s,v=divmod(v,1000);return f'{h:02}:{m:02}:{s:02},{v:03}'
for beat in plan['beats']:
    source=out/'voice-clips'/(beat['id']+'.mp3')
    raw=subprocess.check_output([str(BIN/'ffmpeg'),'-v','error','-i',str(source),'-ar',str(rate),'-ac','1','-c:a','pcm_s16le','-f','wav','pipe:1'],env=env)
    with wave.open(io.BytesIO(raw),'rb') as w: pcm=w.readframes(w.getnframes())
    samples=np.frombuffer(pcm,dtype='<i2').astype(float)/32768
    start=round(beat['start']*rate);end=start+len(samples)
    assert end<=len(audio),beat['id'];assert not np.any(audio[start:end]),'Overlapping voice cues'
    audio[start:end]+=samples;beat['duration']=len(samples)/rate;beat['end']=end/rate
    meta=json.loads((out/'voice-clips'/(beat['id']+'.json')).read_text())
    for sentence in meta['boundaries']:
        a=beat['start']+sentence['offset']/1e7;b=a+sentence['duration']/1e7
        cues.append(f'{len(cues)+1}\n{stamp(a)} --> {stamp(b)}\n{sentence["text"]}\n')
    print(beat['id'],beat['start'],round(beat['end'],3),flush=True)
rawpath=out/'voiceover-en-unnormalized.wav'
with wave.open(str(rawpath),'wb') as w:
    w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(np.round(np.clip(audio,-1,1)*32767).astype('<i2').tobytes())
subprocess.run([str(BIN/'ffmpeg'),'-v','error','-y','-i',str(rawpath),'-af','loudnorm=I=-17:TP=-2:LRA=7','-ar','48000','-ac','1','-c:a','pcm_s16le',str(out/'voiceover-en.wav')],env=env,check=True)
(ROOT/'source/narration-timing.json').write_text(json.dumps(plan,indent=2)+'\n')
(ROOT/'Kinetic-Core-Teaser-v0.5.5.en.srt').write_text('\n'.join(cues))
