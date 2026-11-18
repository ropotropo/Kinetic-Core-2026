import test from 'node:test';
import assert from 'node:assert/strict';
import { canStartSeparationBeat, advanceSeparationClock, separationBeatWeight, separationEnvelope } from '../src/separation-camera.js';
import { chaseDistance } from '../src/visual-framing.js';

const held={mode:'launch',stage:0,time:154,phase:'launch',altitude:72000,paused:true};
const released={...held,stage:1,paused:false};
test('manual staging after loading a held checkpoint triggers, initial released restore does not',()=>{
  assert.equal(canStartSeparationBeat(held,released),true);
  assert.equal(canStartSeparationBeat(null,released),false);
  assert.equal(canStartSeparationBeat(held,{...released,paused:true}),false);
  assert.equal(canStartSeparationBeat(held,{...released,time:120}),false);
  assert.equal(canStartSeparationBeat(held,released,{discontinuity:true}),false);
});
test('inspection, reduced motion, low release and cross-frame mode changes suppress the beat',()=>{
  assert.equal(canStartSeparationBeat(held,released,{inspection:true}),false);
  assert.equal(canStartSeparationBeat(held,released,{reducedMotion:true}),false);
  assert.equal(canStartSeparationBeat(held,{...released,altitude:99}),false);
  assert.equal(canStartSeparationBeat(held,{...released,mode:'transfer'}),false);
  assert.equal(canStartSeparationBeat(held,{...released,phase:'countdown'}),false);
  assert.equal(canStartSeparationBeat(held,{...held,paused:false}),false);
});
test('pause freezes the shot and the envelope enters and exits without endpoint jumps',()=>{
  assert.equal(advanceSeparationClock(1.5,.1,true),1.5);
  assert.equal(advanceSeparationClock(1.5,.05,false),1.55);
  assert.equal(advanceSeparationClock(1.5,20,false),1.6);
  assert.equal(separationBeatWeight(0),0);
  assert.equal(separationBeatWeight(1),1);
  assert.equal(separationBeatWeight(4.7),0);
  assert.ok(separationBeatWeight(.001)<.00001);
  assert.ok(separationBeatWeight(4.699)<.00001);
});
test('fixed hardware sphere envelope contains both craft and real released-stage centers on a phone',()=>{
  const active=[12,25,0],releasedCenter=[-26,-45,8],ar=12,br=22;
  const envelope=separationEnvelope(active,ar,releasedCenter,br);
  for(const [center,radius]of [[active,ar],[releasedCenter,br]])assert.ok(Math.hypot(...center.map((n,i)=>n-envelope.center[i]))+radius<=envelope.radius+1e-10);
  const fov=38,aspect=.6,distance=chaseDistance(envelope.radius,fov,aspect);
  const limitingHalfAngle=Math.atan(Math.tan(fov*Math.PI/360)*aspect);
  assert.ok(Math.asin(envelope.radius/distance)<limitingHalfAngle);
  assert.deepEqual(separationEnvelope([0,0,0],30,[1,0,0],4),{center:[0,0,0],radius:30});
});
