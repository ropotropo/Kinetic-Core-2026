import {AbsoluteFill, CanvasImage, Easing, Interactive, Track, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio, Video} from '@remotion/media';

export type TeaserProps = {voiceEnabled: boolean; musicEnabled: boolean; voiceVolume: number; musicVolume: number};
type ShotProps = {source: string; sourceIn: number; ready: boolean; title: string; detail: string; zoom: number; focusX: number; focusY: number};

function ShotInner({source, sourceIn, ready, title, detail, zoom, focusX, focusY}: ShotProps) {
  const frame = useCurrentFrame();
  return <>
    <div style={{position:'absolute', left:0, right:0, top:0, height:1008, overflow:'hidden', backgroundColor:'#000'}}>
      {ready ? <Video name="Actual frozen-build footage" src={source} trimBefore={sourceIn} playbackRate={1} muted objectFit="contain" style={{position:'absolute', left:64, top:0, width:1792, height:1008, scale:zoom, transformOrigin:`${focusX*100}% ${focusY*100}%`}}/> : <AbsoluteFill style={{backgroundColor:'#000', justifyContent:'center', alignItems:'center', color:'#a6a8af', fontSize:40}}>Preview: awaiting the verified v0.5.5 capture</AbsoluteFill>}
    </div>
    <Interactive.Div name="Short shot label" style={{position:'absolute', left:96, right:96, top:1008, height:72, display:'flex', gap:24, alignItems:'center', color:'#f5f5f7', opacity:interpolate(frame,[0,4],[0,1],{extrapolateLeft:'clamp', extrapolateRight:'clamp'})}}>
      <span style={{fontSize:36, fontWeight:600, letterSpacing:'-.025em', whiteSpace:'nowrap'}}>{title}</span>
      <span style={{fontSize:22, color:'#a6a8af', lineHeight:1.15}}>{detail}</span>
    </Interactive.Div>
  </>;
}

export const Shot = Interactive.create({Component:ShotInner, layout:'absolute-fill', schema:{
  source:{type:'asset', assetType:'video', default:'', description:'Frozen v0.5.5 source'},
  sourceIn:{type:'number', hiddenFromList:false, default:0, min:0, step:1, integer:true, description:'Source in (frames)'},
  ready:{type:'boolean', default:false, description:'Verified source ready'},
  title:{type:'string', default:'', description:'Short label'},
  detail:{type:'string', default:'', description:'Scope label'},
  zoom:{type:'number', hiddenFromList:false, default:1, min:1, max:1.3, step:.01, description:'Detail scale'},
  focusX:{type:'number', hiddenFromList:false, default:.5, min:0, max:1, step:.01, description:'Horizontal detail anchor'},
  focusY:{type:'number', hiddenFromList:false, default:.5, min:0, max:1, step:.01, description:'Vertical detail anchor'},
}});

function OpeningInner() {
  const frame=useCurrentFrame();
  return <>
    <CanvasImage name="Approved lunar portrait" src={staticFile('hero.png')} style={{width:'100%', height:'100%', objectFit:'cover', scale:interpolate(frame,[0,60],[1,1.012],{extrapolateRight:'clamp',output:'perceptual-scale'})}}/>
    <div style={{position:'absolute', inset:0, background:'linear-gradient(90deg,rgba(0,0,0,.55),transparent 65%)'}}/>
    <Interactive.Div name="Game title" style={{position:'absolute', left:96, top:320, color:'#f5f5f7', fontSize:144, fontWeight:650, letterSpacing:'-.045em', lineHeight:.94, opacity:interpolate(frame,[0,7],[0,1],{extrapolateRight:'clamp'}), translate:interpolate(frame,[0,10],['0px 8px','0px 0px'],{extrapolateRight:'clamp',easing:Easing.out(Easing.cubic)})}}>Kinetic<br/>Core</Interactive.Div>
    <Interactive.Div name="Sole author credit" style={{position:'absolute', left:96, top:650, color:'#f5f5f7', fontSize:30}}>Created by Mykyta Borisov</Interactive.Div>
    <Interactive.Div name="Event context" style={{position:'absolute', left:96, top:710, color:'#a6a8af', fontSize:24}}>NASA Space Apps Challenge 2026</Interactive.Div>
  </>;
}
export const Opening=Interactive.create({Component:OpeningInner,layout:'absolute-fill',schema:{}});

function ClosingInner() {
  const frame=useCurrentFrame();
  return <>
    <CanvasImage name="Approved KC mission mark" src={staticFile('logo.png')} style={{position:'absolute', left:840, top:240, width:240, height:240, objectFit:'contain'}}/>
    <Interactive.Div name="Closing game title" style={{position:'absolute', top:540, left:96, right:96, textAlign:'center', color:'#f5f5f7', fontSize:92, fontWeight:600, letterSpacing:'-.04em'}}>Kinetic Core</Interactive.Div>
    <Interactive.Div name="Closing sole author" style={{position:'absolute', top:675, left:96, right:96, textAlign:'center', color:'#a6a8af', fontSize:30}}>Created by Mykyta Borisov</Interactive.Div>
    <Interactive.Div name="Closing invitation" style={{position:'absolute', top:755, left:96, right:96, textAlign:'center', color:'#f5f5f7', fontSize:36}}>Fly the critical moments.</Interactive.Div>
    <div style={{position:'absolute', inset:0, backgroundColor:'#000', opacity:interpolate(frame,[82,90],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}/>
  </>;
}
export const Closing=Interactive.create({Component:ClosingInner,layout:'absolute-fill',schema:{}});

export function Soundtrack({voiceEnabled,musicEnabled,voiceVolume,musicVolume}:TeaserProps) {
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  return <>
    <Track name="Original English narration">
      {voiceEnabled ? <Audio name="Preplaced narration master: no extra offset" src={staticFile('audio/voiceover-en.wav')} from={0} durationInFrames={56*fps} volume={voiceVolume}/> : null}
    </Track>
    <Track name="Original music and editorial sound design">
      {musicEnabled ? <Audio name="116 BPM score: speech ducking and quiet-critical contrast" src={staticFile('audio/music.wav')} durationInFrames={56*fps} volume={musicVolume*interpolate(frame,[0,6,12,242,248,309,315,401,407,486,492,623,629,714,720,850,856,924,930,1034,1040,1080,1086,1246,1252,1320,1326,1376,1382,1464,1470,1621,1627,1662,1680],[0,.6,.25,.25,.6,.6,.25,.25,.6,.6,.25,.25,.6,.6,.25,.25,.6,.6,.25,.25,.6,.6,.25,.25,.6,.6,.25,.25,.6,.6,.25,.25,.6,.6,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}/> : null}
    </Track>
  </>;
}
