import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldShowOrbitOverview} from '../src/flight-view.js';

test('trajectory camera cannot replace a new launch even with a stale overview request',()=>{
  const view={mode:'launch',phase:'launch',orbitOverview:true,positionSI:[6371000,0]};
  assert.equal(shouldShowOrbitOverview(view),false);
  assert.equal(shouldShowOrbitOverview({...view,phase:'orbit'}),true);
  for(const phase of ['assembly','docking','landing','failed','landed','docked'])assert.equal(shouldShowOrbitOverview({...view,phase}),false);
});
test('trajectory inspection requires explicit selection and valid orbital state',()=>{
  const view={mode:'launch',phase:'orbit',orbitOverview:true,positionSI:[6571000,0]};
  for(const override of [{orbitOverview:false},{mode:'assembly'},{positionSI:undefined},{positionSI:[NaN,0]},{positionSI:[1]}])assert.equal(shouldShowOrbitOverview({...view,...override}),false);
});
