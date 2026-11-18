"""Local deterministic fallback for a Remotion headless-RAF failure; source video frames stay unaltered except resize/crop."""
from pathlib import Path
import argparse, datetime, hashlib, io, json, os, shutil, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'public'
COMPOSITOR=ROOT/'node_modules/@remotion/compositor-darwin-arm64'
FFMPEG=Path(os.environ.get('FFMPEG_PATH',str(COMPOSITOR/'ffmpeg')))
ENV={**os.environ,'DYLD_LIBRARY_PATH':str(COMPOSITOR)}
FPS=30
FONT=Path('/System/Library/Fonts/SFNS.ttf')
WHITE=(245,245,247);MUTED=(166,168,175)

def font(size,weight='Regular'):
    value=ImageFont.truetype(str(FONT),size)
    value.set_variation_by_name(weight)
    return value

def text(draw,xy,value,size,color=WHITE,weight='Regular',tracking=0,center=False):
    face=font(size,weight)
    width=sum(draw.textlength(ch,font=face) for ch in value)+max(0,len(value)-1)*tracking
    x,y=xy
    top_bearing=face.getbbox('H',anchor='la')[1]
    if center:x-=width/2
    for ch in value:
        draw.text((round(x),round(y-top_bearing)),ch,font=face,fill=color,anchor='la')
        x+=draw.textlength(ch,font=face)+tracking
    return width

def wave_samples(path):
    with wave.open(str(path),'rb') as stream:
        if stream.getsampwidth()!=2:raise ValueError('Expected16-bit PCM stems')
        rate=stream.getframerate();channels=stream.getnchannels()
        data=np.frombuffer(stream.readframes(stream.getnframes()),dtype='<i2').astype(np.float64).reshape(-1,channels)/32768
    if rate!=48000:raise ValueError('Expected48kHz stems')
    return rate,data

def mixed_audio(plan,scratch):
    rate,voice=wave_samples(PUBLIC/plan['audio']['voiceFile']);mr,music=wave_samples(PUBLIC/plan['audio']['musicFile'])
    if rate!=mr or len(voice)!=56*rate or len(music)!=56*rate:raise ValueError('Masters must each be exactly56seconds')
    if voice.shape[1]==1:voice=np.repeat(voice,2,axis=1)
    if music.shape[1]==1:music=np.repeat(music,2,axis=1)
    points=[0,6,12,242,248,309,315,401,407,486,492,623,629,714,720,850,856,924,930,1034,1040,1080,1086,1246,1252,1320,1326,1376,1382,1464,1470,1621,1627,1662,1680]
    levels=[0,.6,.25,.25,.6,.6,.25,.25,.6,.6,.25,.25,.6,.6,.25,.25,.6,.6,.25,.25,.6,.6,.25,.25,.6,.6,.25,.25,.6,.6,.25,.25,.6,.6,0]
    curve=np.interp(np.arange(len(music))/rate*FPS,points,levels)
    mix=voice+music*curve[:,None]
    # One transparent master gain protects headroom, without compressing the quiet/critical contrast.
    target=10**(-2/20);gain=min(1,target/max(float(np.max(np.abs(mix))),1e-12));mix*=gain
    destination=scratch/'fallback-mix.wav'
    with wave.open(str(destination),'wb') as stream:
        stream.setnchannels(2);stream.setsampwidth(2);stream.setframerate(rate);stream.writeframes(np.clip(np.rint(mix*32767),-32768,32767).astype('<i2').tobytes())
    return destination,gain

def label(shot):
    overlay=Image.new('RGBA',(1920,1080));draw=ImageDraw.Draw(overlay)
    width=text(draw,(96,1030),shot['title'],36,weight='Semibold',tracking=-.9)
    if shot['detail']:text(draw,(96+width+24,1034),shot['detail'],22,color=MUTED)
    return overlay

def opening(index,hero):
    image=ImageOps.fit(hero,(1920,1080),method=Image.Resampling.LANCZOS)
    scale=1+.012*min(1,index/60);w=round(1920*scale);h=round(1080*scale)
    image=ImageOps.fit(image.resize((w,h),Image.Resampling.LANCZOS),(1920,1080),centering=(.5,.5)).convert('RGBA')
    gradient=np.zeros((1080,1920,4),dtype=np.uint8);gradient[:,:,3]=np.clip(255*.55*(1-np.arange(1920)/(1920*.65)),0,255).astype(np.uint8)[None,:]
    image=Image.alpha_composite(image,Image.fromarray(gradient));overlay=Image.new('RGBA',image.size);draw=ImageDraw.Draw(overlay)
    shift=round(8*(1-min(1,index/10))**3)
    opacity=min(1,index/7)
    color=(*WHITE,round(255*opacity));text(draw,(96,320+shift),'Kinetic',144,color,'Semibold',-6.48);text(draw,(96,455+shift),'Core',144,color,'Semibold',-6.48)
    text(draw,(96,650),'Created by Mykyta Borisov',30);text(draw,(96,710),'NASA Space Apps Challenge 2026',24,MUTED)
    return Image.alpha_composite(image,overlay).convert('RGB')

def closing(index,logo):
    image=Image.new('RGBA',(1920,1080),(0,0,0,255));image.alpha_composite(ImageOps.contain(logo,(240,240),Image.Resampling.LANCZOS),(840,240));draw=ImageDraw.Draw(image)
    text(draw,(960,540),'Kinetic Core',92,weight='Semibold',tracking=-3.68,center=True)
    text(draw,(960,675),'Created by Mykyta Borisov',30,MUTED,center=True)
    text(draw,(960,755),'Fly the critical moments.',36,center=True)
    if index>82:image=Image.blend(image,Image.new('RGBA',image.size,(0,0,0,255)),min(1,(index-82)/8))
    return image.convert('RGB')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--scratch',type=Path,required=True);parser.add_argument('--output',type=Path,default=ROOT/'Kinetic-Core-Teaser-v0.5.5.mp4');args=parser.parse_args()
    scratch=args.scratch.resolve();scratch.mkdir(parents=True,exist_ok=True)
    plan=json.loads((ROOT/'edit-plan.json').read_text())
    subprocess.run([str(Path(os.environ.get('NODE_PATH_EXECUTABLE','/Users/andrkrupenko/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'))),str(ROOT/'scripts/preflight.mjs')],check=True,stdout=subprocess.DEVNULL)
    if sum(shot['durationFrames'] for shot in plan['shots'])!=1680:raise ValueError('Expected1680 frames')
    output=args.output.resolve();receipt_path=ROOT/'render-receipt.json'
    if output.exists():
        prior=json.loads(receipt_path.read_text()) if receipt_path.exists() else {}
        if prior.get('outputSha256')!=hashlib.sha256(output.read_bytes()).hexdigest():raise ValueError('Refusing to replace an unrelated existing output')
    mixed,gain=mixed_audio(plan,scratch);temporary=scratch/'teaser-encode-working.mp4';log_path=scratch/'fallback-encode.log'
    command=[str(FFMPEG),'-hide_banner','-loglevel','warning','-threads','2','-f','image2pipe','-framerate','30','-c:v','png','-i','pipe:0','-i',str(mixed),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-threads','2','-c:a','aac','-b:a','192k','-t','56','-movflags','+faststart','-y',str(temporary)]
    hero=Image.open(PUBLIC/'hero.png').convert('RGB');logo=Image.open(PUBLIC/'logo.png').convert('RGBA');written=0
    with log_path.open('wb') as log:
        encoder=subprocess.Popen(command,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=log,env=ENV)
        try:
            for shot in plan['shots']:
                count=shot['durationFrames'];overlay=label(shot);decoder=None
                if shot['classification']!='identity':
                    width=round(1792*shot['zoom']);height=round(1008*shot['zoom']);left=round(64+1792*shot['focusX']*(1-shot['zoom']));top=round(1008*shot['focusY']*(1-shot['zoom']))
                    decode=[str(FFMPEG),'-hide_banner','-loglevel','error','-threads','1','-filter_threads','1','-ss',str(shot['sourceInFrame']/FPS),'-i',str(PUBLIC/shot['source']),'-map','0:v:0','-frames:v',str(count),'-vf',f'scale={width}:{height}:flags=lanczos,format=rgb24','-an','-fps_mode','passthrough','-pix_fmt','rgb24','-threads','1','-c:v','rawvideo','-f','image2pipe','pipe:1']
                    decoder=subprocess.Popen(decode,stdout=subprocess.PIPE,stderr=log,env=ENV)
                for local in range(count):
                    if shot['id']==1:frame=opening(local,hero)
                    elif shot['id']==22:frame=closing(local,logo)
                    else:
                        data=decoder.stdout.read(width*height*3)
                        if len(data)!=width*height*3:raise RuntimeError(f'Short source at shot{shot["id"]}/frame{local}')
                        plate=Image.new('RGB',(1920,1008));plate.paste(Image.frombytes('RGB',(width,height),data),(left,top));frame=Image.new('RGB',(1920,1080));frame.paste(plate,(0,0))
                        layer=overlay
                        if local<4:layer=overlay.copy();layer.putalpha(layer.getchannel('A').point(lambda value:round(value*local/4)))
                        frame=Image.alpha_composite(frame.convert('RGBA'),layer).convert('RGB')
                    if local==count//2:frame.save(scratch/f'shot-{shot["id"]:02}.png')
                    buffer=io.BytesIO();frame.save(buffer,format='PNG',compress_level=0);encoder.stdin.write(buffer.getbuffer());written+=1
                if decoder and decoder.wait()!=0:raise RuntimeError('Source decode failed')
                print(f'Shot{shot["id"]:02} complete;{written}/1680frames',flush=True)
            encoder.stdin.close()
            if encoder.wait()!=0:raise RuntimeError(log_path.read_text()[-4000:])
        except Exception:
            encoder.kill();encoder.wait()
            if decoder and decoder.poll() is None:decoder.kill();decoder.wait()
            raise
    if written!=1680:raise RuntimeError('Final frame count mismatch')
    output.parent.mkdir(parents=True,exist_ok=True);os.replace(temporary,output)
    receipt={'schema':'kinetic-core-teaser-render.v0.5.5','createdAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'renderer':'FFmpeg + Pillow deterministic local fallback','reason':'Remotion4.0.543 Studio works; default headless browser RAF callback stalls during composition retrieval under default,ANGLE and software ANGLE backends. No vendor dependency patches applied.','editableSource':'src/index.ts /src/Root.tsx /src/Teaser.tsx','editPlanSha256':hashlib.sha256((ROOT/'edit-plan.json').read_bytes()).hexdigest(),'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'outputFile':output.name,'outputSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'frames':written,'fps':30,'pictureSeconds':56,'sourceFrameHandling':'Actual decoded30fps source frames; no temporal interpolation, slow motion, repeated-frame filler or changed telemetry. Normal contain-fit resize and purposeful detail crops only.','typeface':'Local macOS System Font(SFNS), Regular/Semibold; font files are not redistributed.','audio':{'voiceStartSeconds':0,'masterDurationSeconds':56,'musicSpeechGain':.25,'musicGapGain':.6,'linearDuckRampSeconds':.2,'globalMixHeadroomGain':gain,'pcmSamplePeakTargetDbFS':-2,'editorialEffectsAreNotGameAudio':True},'sources':[{'file':source,'sha256':hashlib.sha256((PUBLIC/source).read_bytes()).hexdigest()} for source in sorted({shot['source'] for shot in plan['shots']}|{'audio/voiceover-en.wav','audio/music.wav'})]}
    receipt_path.write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'output':str(output),'sha256':receipt['outputSha256'],'frames':written,'mixGain':gain}),flush=True)

if __name__=='__main__':main()
