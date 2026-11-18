import test from 'node:test';
import assert from 'node:assert/strict';
import {createInspectionGestures} from '../src/inspection-gestures.js';

test('an upward one-finger drag raises the camera and normalizes by viewport',()=>{
  const a=createInspectionGestures(),b=createInspectionGestures();a.down(1,100,200);b.down(1,200,400);
  const small=a.move(1,104,190,400,400),large=b.move(1,208,380,800,800);
  assert.ok(small.pitch>0);assert.deepEqual(small,large);assert.equal(small.zoom,1);
});
test('one to two to one fingers rebases without angle or zoom jumps',()=>{
  const gestures=createInspectionGestures();gestures.down(1,100,200);gestures.move(1,110,190,400,400);
  gestures.down(2,210,190);assert.deepEqual(gestures.move(1,110,190,400,400),{yaw:0,pitch:0,zoom:1});
  assert.ok(gestures.move(2,220,190,400,400).zoom<1);
  gestures.up(2);assert.deepEqual(gestures.move(1,110,190,400,400),{yaw:-0,pitch:-0,zoom:1});
  assert.ok(gestures.move(1,110,180,400,400).pitch>0);
});
test('two-finger motion changes zoom only and large jumps remain bounded',()=>{
  const gestures=createInspectionGestures();gestures.down(1,100,100);gestures.down(2,200,100);
  const pinch=gestures.move(2,2000,4000,400,400);assert.equal(pinch.yaw,0);assert.equal(pinch.pitch,0);assert.ok(pinch.zoom>=1/1.18&&pinch.zoom<=1.18);
  gestures.up(2);const orbit=gestures.move(1,-10000,-10000,400,400);assert.ok(Math.abs(orbit.yaw)<=Math.PI*2*.06);assert.ok(Math.abs(orbit.pitch)<=Math.PI*.06);
});
test('cancel/blur clear ownership and tiny pinches or a third finger cannot spike',()=>{
  const gestures=createInspectionGestures();gestures.down(1,10,10);gestures.down(2,11,10);assert.equal(gestures.move(2,15,10,400,400),null);
  gestures.down(3,40,40);assert.equal(gestures.move(1,30,30,400,400),null);gestures.up(3);assert.deepEqual(gestures.move(1,30,30,400,400),{yaw:0,pitch:0,zoom:1});
  gestures.clear();assert.equal(gestures.has(1),false);assert.equal(gestures.move(1,200,200,400,400),null);
});
