import test from 'node:test';
import assert from 'node:assert/strict';
import {descentPlumeResponse} from '../src/descent-plume.js';
test('descent plume is absent with no applied thrust and responds monotonically to actual power',()=>{
  assert.deepEqual(descentPlumeResponse(0),{visible:false,length:0,width:0,opacity:0,coreOpacity:0});
  assert.equal(descentPlumeResponse(NaN).visible,false);
  const low=descentPlumeResponse(.15),medium=descentPlumeResponse(.5),high=descentPlumeResponse(1);
  for(const key of ['length','width','opacity','coreOpacity'])assert.ok(low[key]<medium[key]&&medium[key]<high[key]);
  assert.equal(descentPlumeResponse(5).length,high.length);
});
test('vacuum plume spreads more than the same applied thrust in atmosphere, without extra thrust',()=>{
  const vacuum=descentPlumeResponse(.7),air=descentPlumeResponse(.7,true);
  assert.ok(vacuum.width>air.width);assert.equal(vacuum.length,air.length);assert.equal(vacuum.opacity,air.opacity);
});
