import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const plan=JSON.parse(fs.readFileSync(path.join(root,'edit-plan.json'),'utf8'));
const compositor=path.join(root,'node_modules','@remotion','compositor-darwin-arm64');
const ffprobe=process.env.FFPROBE_PATH || path.join(compositor,'ffprobe');
const env={...process.env,DYLD_LIBRARY_PATH:compositor};
const errors=[];
const metadata=new Map();
const publicRoot=path.join(root,'public');
function inspect(relative) {
  if(metadata.has(relative))return metadata.get(relative);
  const source=path.resolve(publicRoot,relative);
  if(!source.startsWith(publicRoot+path.sep))throw new Error('Asset leaves public folder');
  if(!fs.existsSync(source)){errors.push(`Missing asset: ${relative}`);return null;}
  const probe=JSON.parse(execFileSync(ffprobe,['-v','error','-show_streams','-show_format','-of','json',source],{env,encoding:'utf8'}));
  metadata.set(relative,probe);return probe;
}
let cursor=0;
for(const shot of plan.shots) {
  if(shot.fromFrame!==cursor)errors.push(`Shot ${shot.id} does not follow the previous cut`);
  cursor=shot.fromFrame+shot.durationFrames;
  if(!shot.ready)errors.push(`Shot ${shot.id} source is not verified ready`);
  if(shot.playbackRate!==1)errors.push(`Shot ${shot.id} has unexpected playback retiming`);
  const probe=inspect(shot.source);
  if(!probe || shot.classification==='identity')continue;
  const video=probe.streams.find(stream=>stream.codec_type==='video');
  if(!video){errors.push(`No video stream: ${shot.source}`);continue;}
  const seconds=Number(video.duration || probe.format.duration);
  const availableFrames=Math.round(seconds*plan.output.fps);
  if(shot.sourceInFrame+shot.durationFrames>availableFrames)errors.push(`Shot ${shot.id} exceeds ${shot.source}: needs frame ${shot.sourceInFrame+shot.durationFrames}, source has ${availableFrames}`);
}
if(cursor!==1680 || plan.output.frames!==1680)errors.push('Timeline must end at 1680 frames /56 seconds');
if(plan.project!=='Kinetic Core' || plan.soleAuthor!=='Mykyta Borisov')errors.push('Project identity mismatch');
if(plan.frozenCommit!=='559a56eab08abfaca62001704c188be71e9f6dab')errors.push('Frozen game source mismatch');
for(const relative of ['audio/voiceover-en.wav','audio/music.wav']) {
  const probe=inspect(relative);
  if(probe && Number(probe.format.duration)<56)errors.push(`${relative} is shorter than the 56-second master`);
}
console.log(JSON.stringify({passed:errors.length===0,composition:plan.compositionId,frames:cursor,seconds:cursor/30,sources:[...metadata].map(([file,data])=>({file,durationSeconds:Number(data.format.duration)})),errors},null,2));
process.exitCode=errors.length ? 1 : 0;
