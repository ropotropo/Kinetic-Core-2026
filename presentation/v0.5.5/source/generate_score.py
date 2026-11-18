"""Original stereo space-exploration underscore. No sampled or downloaded music."""
from pathlib import Path
import wave
import numpy as np

RATE = 48000
SECONDS = 56
BPM = 116
rng = np.random.default_rng(20261115)
score = np.zeros((RATE * SECONDS, 2), dtype=np.float64)

def note(start, duration, midi, gain, pan=0.0, sound='pad'):
    begin = int(start * RATE)
    n = min(int(duration * RATE), len(score)-begin)
    if n <= 0:
        return
    t = np.arange(n) / RATE
    frequency = 440 * 2 ** ((midi-69)/12)
    if sound == 'pad':
        envelope = np.minimum(t/0.8, 1) * np.minimum((duration-t)/1.3, 1)
        signal = (np.sin(2*np.pi*frequency*t)+0.24*np.sin(2*np.pi*frequency*2.002*t)+0.13*np.sin(2*np.pi*frequency*0.997*t)) * envelope
    elif sound == 'pluck':
        envelope = (1-np.exp(-t*100))*np.exp(-t*4.2)
        signal = (np.sin(2*np.pi*frequency*t)+.2*np.sin(2*np.pi*frequency*2*t)) * envelope
    elif sound == 'bass':
        signal = np.sin(2*np.pi*frequency*t) * np.minimum(t/.02,1) * np.minimum((duration-t)/.15,1)
    else:
        signal = np.sin(2*np.pi*(50*t+2*(1-np.exp(-t*30))))*np.exp(-t*18)
    score[begin:begin+n,0] += gain * np.sqrt((1-pan)/2) * signal
    score[begin:begin+n,1] += gain * np.sqrt((1+pan)/2) * signal

beat = 60/BPM
bar = beat*4
chords = [[50,53,57,64],[46,50,53,60],[53,57,60,67],[48,52,55,62]]
for bar_index, start in enumerate(np.arange(0,SECONDS,bar)):
    chord = chords[bar_index % 4]
    for j, midi in enumerate(chord):
        note(start,bar+1.4,midi,.028,pan=(j-1.5)*.3)
    note(start,bar,chord[0]-24,.055,sound='bass')
    energy = float(np.interp(start,[0,6,13,17,24,30,31,36,42,48,53,56],[.12,.25,.65,.9,1,.9,.3,.45,.85,1,.5,0]))
    for j in range(8):
        note(start+j*beat/2,1.0,chord[[0,2,1,3,2,1,3,2][j]]+12,.035*energy,pan=(-.55 if j%2 else .55),sound='pluck')
    if 16 < start < 30 or 38 < start < 49:
        for j in [0,2]:
            note(start+j*beat,.3,36,.055*energy,sound='kick')

# Original editorial risers mark cuts; they are not recorded game audio.
for start in [16.2,23.7,35.8,43.9]:
    n=int(.65*RATE);begin=int(start*RATE);u=np.linspace(0,1,n)
    noise=rng.standard_normal(n);noise=np.convolve(noise,np.ones(11)/11,mode='same')
    effect=noise*np.sin(np.pi*u)**2*.055
    score[begin:begin+n,0]+=effect;score[begin:begin+n,1]+=np.roll(effect,171)
for start,midi in [(44.35,74),(44.6,77),(48.25,81)]:
    note(start,1.3,midi,.025,sound='pluck')
# Quiet filtered air adds space without masking the narrator.
air = rng.standard_normal(len(score))
air = (air-np.roll(air,1))*.0013
score[:,0] += air
score[:,1] += np.roll(air,811)
t = np.arange(len(score))/RATE
fade = np.minimum(t/2,1)*np.minimum((SECONDS-t)/4,1)
score *= np.maximum(fade,0)[:,None]
peak = np.max(np.abs(score))
score *= .42/peak
pcm = np.round(np.clip(score,-1,1)*32767).astype('<i2')
out = Path(__file__).resolve().parents[1]/'video/public/audio/music.wav'
out.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(out),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())
print(out)
