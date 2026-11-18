import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sceneFrameAngle,inertialToRender,solarDirection,raySphereOccluded,heightFieldOccluded,isSolarOccluder,solarGlareStrength,SURFACE_PARENT_BEARING } from '../src/solar-direction.js';
const close=(actual,expected)=>actual.forEach((value,i)=>assert.ok(Math.abs(value-expected[i])<1e-10));

test('the Sun stays in the same world direction when only the camera changes, while its screen bearing moves',()=>{
  const view={mode:'launch',positionSI:[6371000,0]},direction=solarDirection(view);
  close(solarDirection({...view,cameraQuaternion:[0,1,0,0],cameraPosition:[900,20,-80]}),direction);
  const camera=new THREE.PerspectiveCamera(38,1,.1,90000);camera.lookAt(new THREE.Vector3(...direction));camera.updateMatrixWorld(true);
  const initial=new THREE.Vector3(...direction).multiplyScalar(43000).project(camera);assert.ok(Math.abs(initial.x)<1e-10&&Math.abs(initial.y)<1e-10);
  camera.rotateY(.3);camera.updateMatrixWorld(true);const moved=new THREE.Vector3(...direction).multiplyScalar(43000).project(camera);assert.ok(Math.abs(moved.x)>.5);
  for(const mode of ['landing','finale'])close(solarDirection({mode,destination:'io'}),solarDirection({mode,destination:'io',cameraQuaternion:[.3,.4,.5,.6]}));
  assert.ok(SURFACE_PARENT_BEARING[1]>Math.sin(Math.asin(.05)),'fixed parent center clears its maximum angular radius above terrain');
});
test('Earth and docking frame transforms preserve the fixed inertial vector and explicit local angle',()=>{
  const vector=[.2,.7,-.4];close(inertialToRender(vector,0),[.7,.2,-.4]);close(inertialToRender(vector,Math.PI/2),[-.2,.7,-.4]);
  close(inertialToRender(vector,0,true),[.4,.2,-.7]);
  for(const angle of [0,.8,Math.PI/2,-2.4]){const [east,up,cross]=inertialToRender(vector,angle);close([Math.cos(angle)*up-Math.sin(angle)*east,Math.sin(angle)*up+Math.cos(angle)*east,cross],vector);assert.ok(Math.abs(Math.hypot(...solarDirection({mode:'launch',localFrameAngle:angle}))-1)<1e-10);}
  assert.equal(sceneFrameAngle({mode:'launch',positionSI:[0,7],localFrameAngle:.4}),.4);
});
test('integrated Moon ground uses Moon radial up, transfer retains Earth radial, and local rehearsals need no invented inertial frame',()=>{
  const view={customMission:true,destination:'moon',positionSI:[100,10],moonPositionSI:[100,0]};
  assert.equal(sceneFrameAngle({...view,mode:'landing'}),Math.PI/2);assert.equal(sceneFrameAngle({...view,mode:'transfer'}),Math.atan2(10,100));
  assert.notDeepEqual(solarDirection({...view,mode:'landing'}),solarDirection({...view,mode:'transfer'}));
  close(solarDirection({mode:'landing',destination:'moon',customMission:true}),solarDirection({mode:'landing',destination:'moon'}));
});
test('celestial occultation blocks forward bodies, handles surface/inside cases, and ignores grazing or more distant bodies',()=>{
  const origin=[0,0,0],direction=[0,0,-1];
  assert.equal(raySphereOccluded(origin,direction,[0,0,-20],5),true);assert.equal(raySphereOccluded(origin,direction,[0,0,20],5),false);
  assert.equal(raySphereOccluded(origin,direction,[5,0,-20],5),false);assert.equal(raySphereOccluded(origin,direction,[0,0,-100],5,50),false);
  assert.equal(raySphereOccluded([0,5,0],[0,1,0],[0,0,0],5),false);assert.equal(raySphereOccluded([0,5,0],[0,-1,0],[0,0,0],5),true);
  assert.equal(raySphereOccluded(origin,direction,[0,0,0],5),true);assert.equal(raySphereOccluded(origin,[0,0,0],[0,0,-20],5),false);
});
test('ground visibility uses a bounded real height-field query and detects intervening ridges',()=>{
  let calls=0;assert.equal(heightFieldOccluded([0,2,0],[1,.2,0],()=>{calls++;return 0;}),false);assert.equal(calls,64);
  assert.equal(heightFieldOccluded([0,2,0],[1,-.1,0],()=>0),true);
  assert.equal(heightFieldOccluded([0,2,0],[1,.1,0],x=>x>8&&x<30?8:0),true);
});
test('hardware occlusion excludes hidden ancestors, animated effects, additive exhaust and faded or shadow-only meshes',()=>{
  const parent=new THREE.Group(),material=new THREE.MeshBasicMaterial(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);parent.add(mesh);assert.equal(isSolarOccluder(mesh),true);
  parent.visible=false;assert.equal(isSolarOccluder(mesh),false);parent.visible=true;parent.userData.effect=true;assert.equal(isSolarOccluder(mesh),false);parent.userData.effect=false;
  material.transparent=true;material.opacity=0;assert.equal(isSolarOccluder(mesh),false);material.opacity=1;material.blending=THREE.AdditiveBlending;assert.equal(isSolarOccluder(mesh),false);
  mesh.material=new THREE.ShadowMaterial();assert.equal(isSolarOccluder(mesh),false);mesh.material=material;material.blending=THREE.NormalBlending;mesh.userData.solarTerrain=true;assert.equal(isSolarOccluder(mesh),false);
});
test('glare fades at the viewport edge and vanishes off screen, behind camera, or behind an occluder',()=>{
  assert.equal(solarGlareStrength([0,0,0]),1);assert.ok(solarGlareStrength([.9,0,0])>0&&solarGlareStrength([.9,0,0])<solarGlareStrength([.5,0,0]));
  for(const point of [[1,0,0],[0,-1,0],[0,0,2],[0,0,-2]])assert.equal(solarGlareStrength(point),0);assert.equal(solarGlareStrength([0,0,0],true),0);
});
