import test from 'node:test';
import assert from 'node:assert/strict';
import { createLunarDesign } from '../src/vehicle-design.js';
import { createVehicleGeometry, setVehicleThrust, disableVehicleEffects } from '../src/vehicle-geometry.js';

test('detached custom core loses shader exhaust while the active source keeps its effects and hardware', () => {
  const craft=createVehicleGeometry(createLunarDesign());
  setVehicleThrust(craft,0,1,1,10);
  const core=craft.userData.core, detached=core.clone(true);
  let before=0,after=0,source=0,hardware=0;
  detached.traverse(o=>{if(o.userData.effect&&o.visible)before++;});
  assert.ok(before>0);
  disableVehicleEffects(detached);
  detached.traverse(o=>{if(o.userData.effect&&o.visible)after++;if(o.isMesh&&!o.userData.effect&&o.visible)hardware++;});
  core.traverse(o=>{if(o.userData.effect&&o.visible)source++;});
  assert.equal(after,0);assert.equal(source,before);assert.ok(hardware>0);
  craft.userData.dispose();
});
