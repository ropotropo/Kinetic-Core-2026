"""Offline PCM audio checks; levels are dBFS/RMS, not perceptual LUFS or a listening test."""
from pathlib import Path
import argparse, hashlib, json, os, subprocess, wave
import numpy as np

METHOD_VERSION = 'pcm-stem-comparison.v4-teaser-spoken-anchor'
FFDIR = Path(os.environ.get('KC_FFMPEG_DIR',str(Path(__file__).resolve().parents[2]/'video/node_modules/@remotion/compositor-darwin-arm64')))
ROOT = Path(os.environ.get('KC_QA_OUTPUT','/Users/andrkrupenko/Documents/ChatGPT/Nick/work/kinetic-core-v055-media/qa'))
ENV = {**os.environ, 'DYLD_LIBRARY_PATH': str(FFDIR)}

def db(value):
    return float(20*np.log10(max(float(value), 1e-12)))

def rms(samples):
    return float(np.sqrt(np.mean(samples*samples))) if len(samples) else 0.0

def read_wave(path):
    with wave.open(str(path), 'rb') as wav:
        rate, channels, width = wav.getframerate(), wav.getnchannels(), wav.getsampwidth()
        if width != 2:
            raise ValueError('Expected 16-bit PCM')
        data = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').reshape(-1, channels).astype(np.float64)/32768
    return rate, data

def summary(path, rate, data):
    return {'file':Path(path).name, 'sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(), 'sampleRate':rate, 'channels':data.shape[1], 'durationSeconds':len(data)/rate, 'rmsDbFS':db(rms(data)), 'samplePeakDbFS':db(np.max(np.abs(data))), 'clippingSamplesAt0999':int(np.sum(np.abs(data)>=.999))}

def offset_from_correlation(final_mono, voice, rate):
    # An independently measured spoken window; search actual export offset from minus half to plus one second; choose an active spoken window rather than a music gap.
    decimation = rate//12000
    r = rate/decimation
    voice_start, voice_end, final_start, final_end = 17.0, 19.0, 16.5, 20.5
    template = voice[round(voice_start*rate):round(voice_end*rate):decimation]
    candidate = final_mono[round(final_start*rate):round(final_end*rate):decimation]
    template = template-template.mean();candidate=candidate-candidate.mean()
    size = 1 << (len(template)+len(candidate)-1).bit_length()
    dot = np.fft.irfft(np.fft.rfft(candidate,size)*np.conj(np.fft.rfft(template,size)),size)[:len(candidate)-len(template)+1]
    low = max(0,round((voice_start-.5-final_start)*r))
    high = round((voice_start+1-final_start)*r)
    lag = low+int(np.argmax(dot[low:high+1]))
    matched=candidate[lag:lag+len(template)]
    correlation=float(np.dot(matched,template)/(np.linalg.norm(matched)*np.linalg.norm(template)))
    return final_start+lag/r-voice_start, correlation

def measure_loudness(source):
    # Measurement pass only: discard normalized output and retain original-stream loudness statistics.
    command=[str(FFDIR/'ffmpeg'),'-hide_banner','-loglevel','info','-threads','1','-i',str(source),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-c:a','pcm_s16le','-f','wav','pipe:1']
    measured=subprocess.run(command,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,env=ENV,check=True).stderr.decode()
    raw=json.loads(measured[measured.rfind('{'):measured.rfind('}')+1])
    return {'integratedLUFS':float(raw['input_i']),'truePeakDbTP':float(raw['input_tp']),'loudnessRangeLU':float(raw['input_lra']),'measurement':'ffmpeg loudnorm first-pass input statistics; no modification to deliverable'}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('film');parser.add_argument('voice');parser.add_argument('music');parser.add_argument('timing');args=parser.parse_args()
    final_pcm=ROOT/'v2-final-audio.wav'
    subprocess.run([str(FFDIR/'ffmpeg'),'-hide_banner','-loglevel','error','-threads','1','-i',args.film,'-vn','-ar','48000','-ac','2','-c:a','pcm_s16le','-f','wav','-y',str(final_pcm)],env=ENV,check=True)
    rate,final=read_wave(final_pcm);vr,voice_channels=read_wave(args.voice);mr,music_channels=read_wave(args.music)
    if vr!=rate or mr!=rate:raise ValueError('Stems must match 48kHz export extraction')
    voice=voice_channels.mean(axis=1);final_mono=final.mean(axis=1);music=music_channels.mean(axis=1)
    offset,correlation=offset_from_correlation(final_mono,voice,rate)
    offset_samples=round(offset*rate)
    voice_timeline=np.zeros(len(final_mono));end=min(len(final_mono),offset_samples+len(voice));voice_timeline[offset_samples:end]=voice[:end-offset_samples]
    timing=json.loads(Path(args.timing).read_text());beat_results=[]
    for beat in timing['beats']:
        a,b=round(beat['startSeconds']*rate),min(len(final_mono),round(beat['endSeconds']*rate))
        v=voice_timeline[a:b];f=final[a:b];m=music_channels[a:b]
        design=np.column_stack([np.repeat(v,2),m.reshape(-1)]);gains=np.linalg.lstsq(design,f.reshape(-1),rcond=None)[0]
        # Exclude spoken pauses from the speech-to-residual comparison, using20ms blocks of the known stem.
        block=rate//50;usable=len(v)//block*block
        active=np.repeat(np.sqrt(np.mean(v[:usable].reshape(-1,block)**2,axis=1))>10**(-35/20),block)
        voice_component=np.repeat((gains[0]*v[:usable])[:,None],2,axis=1);residual=f[:usable]-voice_component
        active_voice_rms=rms(voice_component[active]);active_residual_rms=rms(residual[active])
        recon=design@gains
        beat_results.append({'text':beat['text'],'startSeconds':beat['startSeconds'],'endSeconds':beat['endSeconds'],'fittedVoiceGain':float(gains[0]),'fittedMusicGain':float(gains[1]),'speechActiveRmsDbFS':db(active_voice_rms),'residualUnderSpeechRmsDbFS':db(active_residual_rms),'speechOverResidualDb':db(active_voice_rms/max(active_residual_rms,1e-12)),'twoStemFitResidualDbFS':db(rms(f.reshape(-1)-recon))})
    result={'schema':'kinetic-core-audio-validation.v1','methodVersion':METHOD_VERSION,'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'method':'Decode final AAC to48kHz stereo PCM, measure unclipped PCM samples, independently correlate known speech stem to export, then fit known voice/music stems within each spoken beat. Speech-over-residual uses20ms speech-active blocks.','limits':'RMS dBFS is reported separately from loudnorm integrated LUFS/true peak. A numeric level test does not replace listening for intelligibility/pronunciation. Timing correlation uses mono-average; stem fits and speech/residual level comparisons preserve both stereo channels.','film':{**summary(args.film,rate,final), **measure_loudness(args.film)},'voiceStem':summary(args.voice,vr,voice_channels),'musicStem':summary(args.music,mr,music_channels),'measuredVoiceOffsetSeconds':offset,'voiceCorrelation17to19Seconds':correlation,'correlationAnchorReason':'17-19s is active narration; the earlier7-9s window included mostly an intentional music gap','expectedVoiceStartSeconds':timing['voiceStartSeconds'],'expectedVoiceEndSeconds':timing['voiceStartSeconds']+len(voice)/rate,'narrationFitsWithinFilm':timing['voiceStartSeconds']+len(voice)/rate<=len(final)/rate,'tailAfterCompleteVoiceSeconds':len(final)/rate-(offset+len(voice)/rate),'beats':beat_results,'listeningStatus':'Not established by this numeric analysis; direct listening required separately.'}
    destination=ROOT/'teaser-audio-validation.json';destination.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k not in ['beats','method','limits']},indent=2))

if __name__=='__main__':main()
