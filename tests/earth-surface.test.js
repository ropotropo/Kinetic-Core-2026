import test from 'node:test';
import assert from 'node:assert/strict';
import {indexBuildings,buildingHeightAt} from '../src/earth-surface.js';
test('loaded footprint roofs preserve holes and the tallest overlapping structure',()=>{
 const shape={type:'Polygon',coordinates:[[[0,0],[4,0],[4,4],[0,4],[0,0]],[[1,1],[3,1],[3,3],[1,3],[1,1]]]};
 const b=indexBuildings([{geometry:shape,properties:{render_height:20}},{geometry:shape,properties:{render_height:30}}]);
 assert.equal(buildingHeightAt(b,.5,.5),30);assert.equal(buildingHeightAt(b,2,2),0);assert.equal(buildingHeightAt(b,5,5),0);
});
