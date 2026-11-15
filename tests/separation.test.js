import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceBallistic, inertialToLocal, releaseBody } from '../src/separation-motion.js';
import { createLaunch, stepLaunch, separateStage, getLaunchTelemetry } from '../src/physics.js';
import { boxClearance } from '../src/separation-contact.js';

test('contact clearance separates overlapping and fully contained hardware bounds',()=>{
 for(const b of [{min:{x:9,y:2,z:2},max:{x:13,y:8,z:8}},{min:{x:2,y:2,z:2},max:{x:8,y:8,z:8}}]){
  const a={min:{x:0,y:0,z:0},max:{x:10,y:10,z:10}},c=boxClearance(a,b);
  assert.ok(c);b.min[c.axis]+=c.amount;b.max[c.axis]+=c.amount;assert.equal(boxClearance(a,b),null);
 }
});

test('separated hardware does not acquire a phantom contact',()=>{
 assert.equal(boxClearance({min:{x:0,y:0,z:0},max:{x:1,y:1,z:1}},{min:{x:2,y:0,z:0},max:{x:3,y:1,z:1}}),null);
});
test('detached stage inherits inertial flight velocity and spring separation',()=>{
 const p=[6571000,0],v=[0,7800],b=releaseBody(p,v,Math.PI/2);
 assert.ok(Math.abs(b.velocity[0])<1e-12);assert.equal(b.velocity[1],7798);
 advanceBallistic(b,5);assert.ok(b.position[1]>38000);assert.ok(b.position[0]<p[0]);assert.deepEqual(p,[6571000,0]);
});
test('coasting debris remains independent of the moving craft frame',()=>{
 const p=[6571000,0],b=releaseBody(p,[0,7800],0);advanceBallistic(b,10);
 const local=inertialToLocal(b.position,[6571000,78000]);assert.ok(local.every(Number.isFinite));assert.ok(local[1]<-100);
});
test('confirmed orbit continues advancing position and time with engine off',()=>{
 const s=createLaunch();for(let i=0;i<42000&&s.phase==='launch';i++){stepLaunch(s,{throttle:1,guidance:true},1/60);if(s.stages[s.stageIndex]?.fuel===0)separateStage(s);}
 assert.equal(s.phase,'orbit');const p=s.position.slice(),t=s.time,f=s.stages[1].fuel;stepLaunch(s,{throttle:0},30);
 assert.ok(Math.hypot(s.position[0]-p[0],s.position[1]-p[1])>100000);assert.ok(s.time>t+29);assert.equal(s.stages[1].fuel,f);assert.equal(getLaunchTelemetry(s).thrust,0);
});
