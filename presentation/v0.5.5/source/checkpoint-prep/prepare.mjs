// Capture preparation, NOT a claim of an uninterrupted browser playthrough.
// Only the frozen game's real constructors, integration, controls and serializer
// evolve mission state. No phase, position, velocity, fuel or outcome is assigned.
import {createLunarMission,stepLunarMission,separateMissionStage,beginLunarDeparture,getLunarMissionTelemetry,serializeLunarMission,restoreLunarMission,missionMass} from '../../../../src/lunar-mission.js';
import {createLunarDesign} from '../../../../src/vehicle-design.js';
import {getMissionWorldState} from '../../../../src/lunar-mission.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(out,'../../../..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const mission=createLunarMission(createLunarDesign(),'tranquility');
const checkpoints=[],actions=[],phases=[];const saved=new Set();
let previousPhase='',iterations=0;
async function save(name){
 if(saved.has(name))return;saved.add(name);
 const value=serializeLunarMission(mission),restored=restoreLunarMission(value);
 const a=getMissionWorldState(mission),b=getMissionWorldState(restored);
 if(Math.hypot(...a.position.map((v,i)=>v-b.position[i]))>1e-5||Math.abs(missionMass(mission)-missionMass(restored))>.001)throw Error('Restore continuity failed');
 const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');await fs.writeFile(path.join(out,name+'.json'),bytes);
 const t=getLunarMissionTelemetry(mission);checkpoints.push({file:name+'.json',sha256:hash(bytes),phase:mission.phase,time:mission.time,stageIndex:mission.stageIndex,altitude:t.altitude,mass:t.mass,totalFuel:t.totalFuel,verticalSpeed:t.verticalSpeed,horizontalSpeed:t.horizontalSpeed,restorationValidated:true});
 console.log('CHECKPOINT',name,mission.phase,Math.round(mission.time),Math.round(t.altitude));
}
await save('initial-rollout');
while(!['landed','failed'].includes(mission.phase)&&iterations++<2000000){
 let t=getLunarMissionTelemetry(mission);
 if(mission.phase!==previousPhase){phases.push({phase:mission.phase,time:mission.time,altitude:t.altitude});previousPhase=mission.phase;}
 if(mission.phase==='launch'&&t.altitude>=500&&mission.stageIndex===0)await save('ascent-500m');
 if(mission.phase==='launch'&&mission.stageIndex===0&&mission.launch.stages[0].fuel<15000)await save('before-core-depletion');
 if(mission.phase==='launch'&&mission.launch.stages[mission.stageIndex]?.fuel<=1e-8){
  await save('core-depleted');const before=missionMass(mission),result=separateMissionStage(mission);if(!result.ok)throw Error(result.message);actions.push({time:mission.time,control:'Separate stage',result,massBefore:before,massAfter:missionMass(mission)});
 }
 if(mission.resources?.upperAttached&&mission.resources.upperFuel<=1e-8){
  await save('upper-depleted');const before=missionMass(mission),result=separateMissionStage(mission);if(!result.ok)throw Error(result.message);actions.push({time:mission.time,control:'Separate stage',result,massBefore:before,massAfter:missionMass(mission)});
 }
 if(mission.phase==='orbit'){
  await save('earth-orbit');const result=beginLunarDeparture(mission);if(!result)throw Error('Departure planning refused');actions.push({time:mission.time,control:'Plan lunar departure'});
 }
 if(mission.phase==='coast')await save('earth-moon-transfer');
 if(mission.primary==='moon'){
  if(mission.phase==='lunar-approach')await save('lunar-approach');
  if(mission.phase==='capture')await save('lunar-capture');
  if(mission.phase==='lunar-orbit')await save('lunar-orbit');
  if(['descent','landing'].includes(mission.phase)){
   for(const altitude of [30000,5000,500,100,30,8,3,1])if(t.altitude<=altitude)await save('moon-below-'+altitude+'m');
  }
 }
 const dt=['rollout','countdown','launch','departure'].includes(mission.phase)?1:mission.phase==='window'?10:mission.primary==='moon'?(t.altitude<300000?0.25:30):1000;
 stepLunarMission(mission,{throttle:1,guidance:true},dt);
 if(mission.time>14*86400)throw Error('Encounter window exceeded');
}
if(mission.phase!=='landed')throw Error('No genuine contact: '+mission.phase+' '+mission.failure);
await save('computed-contact-reference');
const final=getLunarMissionTelemetry(mission);
const sourceFiles=['src/lunar-mission.js','src/physics.js','src/vehicle-design.js','src/storage.js','src/ascent-guidance.js'];
const sources=[];for(const file of sourceFiles)sources.push({file,sha256:hash(await fs.readFile(path.join(root,file)))});
const manifest={frozenCommit:'559a56eab08abfaca62001704c188be71e9f6dab',method:'Continuous deterministic propagation from the normal Lunar demonstrator through the frozen production game solver. Guidance on; explicit control actions for exhausted stages and departure. Serialized checkpoints pass the production restore validator. No phase/position/fuel/outcome was overwritten.',captureBoundary:'These are solver-prepared staged capture entry points, not UI-saved human playthrough evidence. The browser must restore through the normal checkpoint path, explicitly set engine power and resume, then record real new simulation frames. Do not claim an uninterrupted browser mission or treat this preparation as flight certification.',iterations,simulatedSeconds:mission.time,sources,phases,actions,checkpoints,computedContactReference:final.impact};
await fs.writeFile(path.join(out,'preparation-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('PHYSICAL PREPARATION COMPLETE',JSON.stringify(final.impact));
