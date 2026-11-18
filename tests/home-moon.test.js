import test from 'node:test';
import assert from 'node:assert/strict';
import { createMoonRenderLoop } from '../src/home-moon.js';

function animation(){
  const queued=new Map(),draws=[];let id=0;
  const loop=createMoonRenderLoop({render:dt=>draws.push(dt),requestFrame:callback=>{queued.set(++id,callback);return id;},cancelFrame:frame=>queued.delete(frame)});
  return{loop,draws,queued,tick(time){const frames=[...queued.values()];queued.clear();frames.forEach(callback=>callback(time));}};
}
test('Moon work stops while inactive and resumes without integrating hidden time',()=>{
  const a=animation();assert.equal(a.queued.size,0);
  a.loop.setActive(true);a.tick(0);a.tick(50);assert.deepEqual(a.draws,[0,.05]);
  a.loop.setActive(false);assert.equal(a.queued.size,0);a.tick(9000);assert.equal(a.draws.length,2);
  a.loop.setActive(true);a.tick(10000);assert.equal(a.draws.at(-1),0);a.tick(10050);assert.equal(a.draws.at(-1),.05);
});
test('the decorative Moon caps draws at 24fps and bounds a foreground timing stall',()=>{
  const a=animation();a.loop.setActive(true);a.tick(0);a.tick(16);a.tick(32);assert.equal(a.draws.length,1);a.tick(48);assert.equal(a.draws.length,2);
  a.tick(3000);assert.equal(a.draws.at(-1),.1);assert.equal(a.queued.size,1);
  a.loop.setActive(true);assert.equal(a.queued.size,1,'repeat open cannot create another animation chain');
});
test('reduced motion draws a static frame and repaints only when explicitly invalidated',()=>{
  const a=animation();a.loop.setActive(true,{reducedMotion:true});a.tick(0);assert.deepEqual(a.draws,[0]);assert.equal(a.queued.size,0);
  a.loop.invalidate();a.tick(5000);assert.deepEqual(a.draws,[0,0]);assert.equal(a.queued.size,0);
  a.loop.setActive(false);a.loop.invalidate();assert.equal(a.queued.size,0);
  a.loop.setActive(true,{reducedMotion:true});a.tick(10000);assert.deepEqual(a.draws,[0,0,0]);
});
test('disposal cancels outstanding work and late texture or visibility callbacks cannot restart it',()=>{
  const a=animation();a.loop.setActive(true);assert.equal(a.queued.size,1);a.loop.dispose();assert.equal(a.queued.size,0);
  a.loop.setActive(true);a.loop.invalidate();a.tick(100);assert.equal(a.queued.size,0);assert.equal(a.draws.length,0);
});
