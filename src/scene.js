import * as THREE from 'three';
import { createCelestials, createFlightSky, VISUAL_PROFILES } from './celestial.js';
import { createVehicleGeometry, setVehicleStage, setVehicleThrust, getVehicleBounds } from './vehicle-geometry.js';
import { createSurfaceFinale, createSurfaceThrustEffects } from './cinematic.js';
import { getDestination } from './destinations.js';
import { advanceBallistic, inertialToLocal, releaseBody } from './separation-motion.js';
import { createOrbitOverview } from './orbit-overview.js';
import { boxClearance } from './separation-contact.js';
import { shouldShowOrbitOverview } from './flight-view.js';

// Presentation only. SI simulation stays in physics.js; camera and celestial
// background use a local origin so GPU float precision never drives the flight.
// Procedural vehicle designs are fictional and are not NASA-certified hardware.
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;

function canvasTexture(draw, width = 1024, height = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeTextures() {
  const hull = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#e2e5e4'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d4d8d7';
    for (let x = 0; x < w; x += 128) ctx.fillRect(x, 0, 2, h);
    for (let y = 0; y < h; y += 128) {
      ctx.fillStyle = '#b6bfbe'; ctx.fillRect(0, y, w, 2);
      ctx.fillStyle = '#f1f3f2'; ctx.fillRect(0, y + 2, w, 2);
    }
    ctx.fillStyle = '#26313a'; ctx.fillRect(0, 765, w, 65);
    ctx.fillStyle = '#d7773f'; ctx.fillRect(0, 832, w, 9);
    ctx.fillStyle = '#2c353c';
    ctx.font = '600 38px Arial'; ctx.textAlign = 'center';
    ctx.fillText('KINETIC', 255, 340); ctx.fillText('CORE', 255, 388);
    ctx.fillText('KINETIC', 768, 340); ctx.fillText('CORE', 768, 388);
    ctx.font = '14px monospace';
    ctx.fillText('EXPLORATION VEHICLE', 255, 425);
    ctx.fillText('EXPLORATION VEHICLE', 768, 425);
    ctx.fillStyle = '#899593';
    for (let y = 30; y < h; y += 128) {
      for (let x = 16; x < w; x += 64) {
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
      }
    }
  });
  const thermal = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#d8dddd'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
      const odd = ((x + y) / 64) % 2;
      ctx.fillStyle = odd ? '#bcc7c8' : '#d5dcdc';
      ctx.fillRect(x + 1, y + 1, 62, 62);
      ctx.strokeStyle = '#9fadae'; ctx.strokeRect(x + 3, y + 3, 58, 58);
    }
  });
  const solar = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#13243a'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 72) for (let x = 0; x < w; x += 48) {
      ctx.fillStyle = (x / 48 + y / 72) % 3 === 0 ? '#203e65' : '#19304f';
      ctx.fillRect(x + 3, y + 3, 42, 66);
      ctx.fillStyle = '#688294'; ctx.fillRect(x + 23, y + 3, 1, 66);
    }
    ctx.strokeStyle = '#92a0a4'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
  });
  const deck = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#333c41'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#465056'; ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = '#b7ad81'; ctx.lineWidth = 7;
    ctx.strokeRect(150, 150, w - 300, h - 300);
  });
  deck.wrapS = deck.wrapT = THREE.RepeatWrapping;
  deck.repeat.set(3, 3);
  const earthFallback = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#204f71'; ctx.fillRect(0, 0, w, h);
    const patches = [[.21,.37,.16,.15],[.3,.65,.07,.22],[.53,.35,.1,.15],[.56,.56,.08,.2],[.73,.36,.17,.15],[.81,.72,.07,.06]];
    ctx.fillStyle = '#5d7868';
    patches.forEach(([x,y,rx,ry]) => { ctx.beginPath(); ctx.ellipse(x*w,y*h,rx*w,ry*h,-.2,0,TAU); ctx.fill(); });
    ctx.fillStyle = '#d9e1df'; ctx.fillRect(0, 0, w, h*.045); ctx.fillRect(0, h*.93, w, h*.07);
  }, 2048, 1024);
  const coastalGround=canvasTexture((ctx,w,h)=>{
    ctx.fillStyle='#576052';ctx.fillRect(0,0,w,h);let seed=1776;
    const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<420;i++){ctx.fillStyle=i%4?'rgba(34,61,43,.24)':'rgba(149,143,102,.2)';ctx.beginPath();ctx.ellipse(rand()*w,rand()*h,8+rand()*65,8+rand()*90,rand()*3.14,0,TAU);ctx.fill();}
    for(let i=0;i<16000;i++){ctx.fillStyle=i%2?'rgba(18,37,23,.11)':'rgba(202,201,158,.1)';ctx.fillRect(rand()*w,rand()*h,1,1);}
  });coastalGround.wrapS=coastalGround.wrapT=THREE.RepeatWrapping;coastalGround.repeat.set(64,64);
  return { hull, thermal, solar, deck, earthFallback,coastalGround };
}

function box(parent, size, position, material, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function cylinder(parent, top, bottom, height, position, material, radial = 48) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, radial), material);
  mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function ring(parent, radius, tube, position, material, alongZ = false) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 64), material);
  mesh.position.set(...position);
  if (!alongZ) mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true; parent.add(mesh); return mesh;
}
function beam(parent, a, b, radius, material) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
  const direction = to.clone().sub(from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material);
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true; parent.add(mesh); return mesh;
}

function makeNozzle(parent, radius, height, position, materials) {
  const curve = [[1,0],[.98,.12],[.87,.3],[.67,.52],[.43,.76],[.3,.93],[.32,1]];
  const points = curve.map(([x,y]) => new THREE.Vector2(x * radius, y * height));
  const shell = new THREE.Mesh(new THREE.LatheGeometry(points, 32), materials.nozzle);
  shell.position.set(...position); parent.add(shell); shell.castShadow = true;
  for (let i = 0; i < 5; i++) ring(parent, radius * (.96 - i*.12), .025, [position[0],position[1]+height*(.08+i*.13),position[2]], materials.darkMetal);
  cylinder(parent, radius*.25, radius*.25, .42, [position[0],position[1]+height+.16,position[2]], materials.copper, 16);
  return shell;
}

function makeSpacecraft(materials, options = {}) {
  // Origin = docking face; +Y is the spacecraft nose. Everything extends aft.
  const craft = new THREE.Group();
  const radialScale = options.capsule?.radius ? options.capsule.radius / 2.03 : 1;
  const length = (options.capsule?.height || 3.4) + (options.service?.height || 3.2);
  const service = new THREE.Group(); craft.add(service);
  cylinder(service, 1.72, 1.72, 3.35, [0,-4.65,0], materials.thermal);
  cylinder(service, 1.78, 1.78, .22, [0,-6.35,0], materials.darkMetal);
  cylinder(service, 1.76, 1.76, .18, [0,-2.94,0], materials.titanium);
  for (let i = 0; i < 8; i++) {
    const a = i*TAU/8;
    const panel = box(service,[.62,2.56,.075],[Math.sin(a)*1.75,-4.62,Math.cos(a)*1.75],materials.white);
    panel.rotation.y=a;
    const rail=box(service,[.055,2.83,.065],[Math.sin(a+.12)*1.79,-4.65,Math.cos(a+.12)*1.79],materials.titanium); rail.rotation.y=a+.12;
  }
  // Four visible RCS quadrants, with offset nozzles rather than painted lights.
  const jets=[];
  for (let i=0;i<4;i++) {
    const a=i*Math.PI/2+Math.PI/4;
    const pod=new THREE.Group();pod.position.set(Math.sin(a)*1.8,-3.57,Math.cos(a)*1.8);pod.rotation.y=a;service.add(pod);
    box(pod,[.38,.46,.4],[0,0,0],materials.darkMetal);
    for (const s of [-1,1]) {
      const jet=cylinder(pod,.055,.13,.24,[s*.22,0,.03],materials.nozzle,12);jet.rotation.z=s*Math.PI/2;
      const flame=new THREE.Mesh(new THREE.ConeGeometry(.1,.56,10),materials.rcsFlame);
      flame.rotation.z=-s*Math.PI/2;flame.position.set(s*.5,0,.03);flame.visible=false;pod.add(flame);jets.push(flame);
    }
    const jet=cylinder(pod,.055,.12,.22,[0,.24,.01],materials.nozzle,12);
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.1,.5,10),materials.rcsFlame);flame.position.set(0,.48,0);flame.visible=false;pod.add(flame);jets.push(flame);
  }
  makeNozzle(service,.69,1.05,[0,-7.15,0],materials);
  cylinder(craft,2.04,2.04,.26,[0,-2.72,0],materials.heatShield);
  cylinder(craft,.63,2.03,2.43,[0,-1.39,0],materials.capsule);
  ring(craft,1.95,.055,[0,-2.52,0],materials.titanium);
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2+Math.PI/4;
    const win=box(craft,[.55,.49,.07],[Math.sin(a)*1.04,-.9,Math.cos(a)*1.04],materials.glass);
    win.rotation.set(-.43, a,0);
    const frame=box(craft,[.69,.62,.045],[Math.sin(a)*1.015,-.91,Math.cos(a)*1.015],materials.titanium);
    frame.rotation.copy(win.rotation);win.renderOrder=2;
  }
  cylinder(craft,.6,.67,.23,[0,-.08,0],materials.darkMetal);
  ring(craft,.52,.08,[0,.045,0],materials.titanium);
  ring(craft,.38,.025,[0,.09,0],materials.copper);
  for(let i=0;i<6;i++) {
    const a=i*TAU/6;
    box(craft,[.13,.08,.18],[Math.sin(a)*.54,.15,Math.cos(a)*.54],materials.white,[0,a,0]);
  }
  // Stowed instrument and antenna hardware stays inside the launch envelope.
  box(service,[.42,.8,.28],[1.76,-5.33,0],materials.copper);
  beam(service,[1.8,-5.55,0],[2.2,-4.38,0],.035,materials.titanium);
  craft.scale.set(radialScale,length / 7.15,radialScale);
  const serviceRadialScale=(options.service?.radius || 1.85)/(1.72*radialScale);
  service.scale.x=service.scale.z=serviceRadialScale;
  craft.userData.length=length;
  craft.userData.jets=jets;
  return craft;
}

function makeRocket(materials, vehicle = {}) {
  const rocket=new THREE.Group();
  const core=new THREE.Group();rocket.add(core);
  cylinder(core,2.63,2.63,25.2,[0,15.4,0],materials.hull);
  cylinder(core,2.64,2.79,1.6,[0,2.8,0],materials.darkMetal);
  cylinder(core,2.63,2.63,.5,[0,28.2,0],materials.white);
  cylinder(core,2.63,2.63,1.8,[0,29.25,0],materials.black);
  for(const y of [3.3,7.1,16.8,24.5,28.5])ring(core,2.646,.045,[0,y,0],materials.titanium);
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2;
    const rail=box(core,[.16,21.7,.13],[Math.sin(a)*2.65,15.1,Math.cos(a)*2.65],materials.white);rail.rotation.y=a;
  }
  const engines=[];
  for(const [x,z] of [[0,0],[-1.16,-1.16],[-1.16,1.16],[1.16,-1.16],[1.16,1.16]]) {
    makeNozzle(core,.75,1.62,[x,.15,z],materials);
    const plume=new THREE.Group();plume.position.set(x,.22,z);core.add(plume);engines.push(plume);
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.62,7.5,24,1,true),materials.exhaust);
    flame.position.y=-3.9;flame.rotation.z=Math.PI;plume.add(flame);
    const hot=new THREE.Mesh(new THREE.ConeGeometry(.3,2.7,16,1,true),materials.exhaustCore);
    hot.position.y=-1.5;hot.rotation.z=Math.PI;plume.add(hot);plume.visible=false;
  }
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2+Math.PI/4;
    beam(core,[Math.sin(a)*1.8,1.8,Math.cos(a)*1.8],[Math.sin(a)*2.45,4,Math.cos(a)*2.45],.1,materials.copper);
  }
  const upper=new THREE.Group();upper.position.y=30.3;rocket.add(upper);
  makeNozzle(upper,1.05,2,[0,.12,0],materials);
  cylinder(upper,2.2,2.2,10.8,[0,8.05,0],materials.hull);
  cylinder(upper,2.2,2.63,1.0,[0,2.35,0],materials.darkMetal);
  cylinder(upper,1.78,2.2,1.8,[0,14.32,0],materials.white);
  for(const y of [2.9,5.7,10.9,13.5])ring(upper,2.215,.04,[0,y,0],materials.titanium);
  for(let i=0;i<12;i++){
    const a=i*TAU/12;
    const panel=box(upper,[.08,1.45,.04],[Math.sin(a)*2.23,3.7,Math.cos(a)*2.23],materials.titanium);panel.rotation.y=a;
  }
  const upperPlume=new THREE.Group();upperPlume.position.y=.2;upper.add(upperPlume);
  const upperFlame=new THREE.Mesh(new THREE.ConeGeometry(.82,10,24,1,true),materials.exhaustVacuum);upperFlame.position.y=-5.1;upperFlame.rotation.z=Math.PI;upperPlume.add(upperFlame);upperPlume.visible=false;
  const coreHeight=vehicle.core?.height||40,upperHeight=vehicle.upper?.height||13.5;
  const coreRadius=vehicle.core?.radius||2.05,upperRadius=vehicle.upper?.radius||2.05;
  core.scale.set(coreRadius/2.63,coreHeight/30.3,coreRadius/2.63);
  upper.scale.set(upperRadius/2.2,upperHeight/15.2,upperRadius/2.2);
  upper.position.y=coreHeight;
  const spacecraft=makeSpacecraft(materials,vehicle);
  const height=coreHeight+upperHeight+spacecraft.userData.length;
  spacecraft.position.y=height;rocket.add(spacecraft);
  rocket.userData={core,upper,spacecraft,engines,upperPlume,height,coreHeight,upperHeight};
  return rocket;
}

function makePad(materials) {
  const pad=new THREE.Group();
  box(pad,[26,1.3,24],[0,-.8,0],materials.concrete);
  box(pad,[12,.55,13],[0,.04,0],materials.deck);
  box(pad,[6.1,.6,6.1],[0,.56,0],materials.darkMetal);
  box(pad,[5.0,.45,5.0],[0,.83,0],materials.grate);
  // Service tower is intentionally off-axis so the vehicle silhouette stays clear.
  const tower=new THREE.Group();tower.position.set(-10,0,-5);pad.add(tower);
  const width=4.8;
  for(const x of [-width/2,width/2])for(const z of [-width/2,width/2])beam(tower,[x,0,z],[x,50,z],.14,materials.tower);
  for(let y=0;y<49;y+=5) {
    for(const z of [-width/2,width/2]){
      beam(tower,[-width/2,y,z],[width/2,y+5,z],.07,materials.tower);
      beam(tower,[width/2,y,z],[-width/2,y+5,z],.07,materials.tower);
    }
    box(tower,[5.6,.17,5.6],[0,y,0],materials.tower);
  }
  for(const y of [15.4,30.2,45.4]) {
    box(tower,[7.0,.35,1.25],[4.7,y,0],materials.tower);
    box(tower,[7.0,.09,.08],[4.7,y+.9,-.58],materials.titanium);
    box(tower,[7.0,.09,.08],[4.7,y+.9,.58],materials.titanium);
    for(let x=1.5;x<8;x+=1.4)for(const z of [-.58,.58])box(tower,[.045,.9,.045],[x,y+.48,z],materials.titanium);
  }
  for(const x of [-1,1]) {
    const pipe=new THREE.Mesh(new THREE.TorusGeometry(6.4,.11,8,32,Math.PI),materials.copper);pipe.rotation.set(Math.PI/2,0,0);pipe.position.set(x*4,-.1,1);pad.add(pipe);
  }
  box(pad,[7,.12,18],[0,.03,10],materials.black);
  for(const x of [-4.2,4.2])box(pad,[1.3,2.7,22],[x,-.4,14],materials.concrete);
  box(pad,[8.5,.55,8],[0,-1,27],materials.concrete,[.22,0,0]);
  for(const sign of [-1,1]){
    beam(pad,[sign*6,-.2,0],[sign*6,-.2,20],.15,materials.titanium);
    for(const z of [2,7,12])beam(pad,[sign*6,-.2,z],[sign*4,.3,z],.07,materials.titanium);
  }
  pad.userData.tower=tower;
  return pad;
}

function makeStation(materials) {
  const station=new THREE.Group();
  // Port is exactly z=0 in the docking simulation's local frame.
  const hub=cylinder(station,2.25,2.25,8,[0,0,-5.1],materials.thermal);hub.rotation.x=Math.PI/2;
  for(const z of [-1.2,-3,-6.6,-9])ring(station,2.28,.09,[0,0,z],materials.titanium,true);
  const collar=cylinder(station,1.5,2.25,1.3,[0,0,-.78],materials.white);collar.rotation.x=Math.PI/2;
  const inner=new THREE.Mesh(new THREE.CircleGeometry(.73,48),materials.portDark);inner.position.z=-.14;station.add(inner);
  ring(station,.9,.14,[0,0,-.03],materials.titanium,true);
  ring(station,.73,.045,[0,0,.035],materials.copper,true);
  ring(station,1.25,.035,[0,0,-.1],materials.portLight,true);
  for(let i=0;i<8;i++) {
    const a=i*TAU/8;
    box(station,[.17,.17,.17],[Math.sin(a)*1.25,Math.cos(a)*1.25,0],i%2===0?materials.portLight:materials.titanium);
  }
  // Black-white fiducials and a central docking cross are geometric alignment cues.
  box(station,[.06,1.08,.025],[0,0,-.10],materials.white);
  box(station,[1.08,.06,.025],[0,0,-.10],materials.white);
  for(const [x,y] of [[-1.7,0],[1.7,0],[0,1.7],[0,-1.7]]) {
    box(station,[.55,.3,.05],[x,y,-.48],materials.black);
    box(station,[.22,.22,.06],[x,y,-.44],materials.white);
  }
  for(const sign of [-1,1]) {
    const cross=cylinder(station,1.8,1.8,9,[sign*5.1,0,-7.9],materials.white);cross.rotation.z=Math.PI/2;
    const end=cylinder(station,1.82,1.82,.23,[sign*9.65,0,-7.9],materials.titanium);end.rotation.z=Math.PI/2;
    const module=cylinder(station,1.6,1.6,7,[sign*4.5,0,-13.8],materials.thermal);module.rotation.x=Math.PI/2;
    ring(station,1.63,.055,[sign*4.5,0,-10.4],materials.titanium,true);
    box(station,[.8,.8,1.8],[sign*2.0,2.0,-6.6],materials.copper);
  }
  for(let x=-20;x<20;x+=2.4) {
    beam(station,[x,-.4,-15],[x+2.4,.4,-15],.06,materials.titanium);
    beam(station,[x,.4,-15],[x+2.4,-.4,-15],.06,materials.titanium);
    beam(station,[x,-.4,-15],[x+2.4,-.4,-15],.05,materials.titanium);
    beam(station,[x,.4,-15],[x+2.4,.4,-15],.05,materials.titanium);
  }
  for(const x of [-18,-11,11,18])for(const sign of [-1,1]) {
    box(station,[5.8,13.4,.12],[x,sign*7.5,-15],materials.solar);
    box(station,[.1,14.2,.16],[x,sign*7.3,-15],materials.titanium);
    for(const edge of [-1,1])box(station,[.065,13.5,.14],[x+edge*2.9,sign*7.5,-15],materials.copper);
  }
  // Radiators are distinct white thermal-control surfaces, not more solar cells.
  for(const sign of [-1,1]) {
    box(station,[7.5,2.5,.08],[sign*10,0,-5.4],materials.radiator,[0,sign*.24,.12]);
    for(let i=0;i<7;i++)box(station,[.035,2.42,.1],[sign*(6.8+i*.95),0,-5.35],materials.titanium,[0,sign*.24,.12]);
  }
  return station;
}

function makeDockingCockpit(materials){
  const root=new THREE.Group();root.visible=false;
  const cabinFrame=new THREE.Group();root.add(cabinFrame);
  const liner=new THREE.MeshStandardMaterial({color:0x151a1e,metalness:.18,roughness:.73});
  const edging=new THREE.MeshStandardMaterial({color:0x596166,metalness:.58,roughness:.43});
  const frame=new THREE.Shape();frame.moveTo(-1.3,-.9);frame.lineTo(1.3,-.9);frame.lineTo(1.3,.95);frame.lineTo(-1.3,.95);frame.closePath();
  const aperture=new THREE.Path();aperture.moveTo(-.9,-.33);aperture.lineTo(-1.02,.57);aperture.lineTo(1.02,.57);aperture.lineTo(.9,-.33);aperture.closePath();frame.holes.push(aperture);
  const surround=new THREE.Mesh(new THREE.ExtrudeGeometry(frame,{depth:.1,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.025}),liner);surround.position.z=-1.2;cabinFrame.add(surround);
  for(const sign of [-1,1]){
    beam(cabinFrame,[sign*.9,-.33,-1.06],[sign*1.02,.57,-1.06],.025,edging);
    box(cabinFrame,[.055,.38,.075],[sign*1.08,-.05,-.91],materials.titanium);
    for(const y of [-.27,.02,.3,.54]){
      const screw=cylinder(cabinFrame,.014,.014,.025,[sign*(.96+y*.1),y,-1.03],materials.titanium,10);screw.rotation.x=Math.PI/2;
    }
  }
  beam(cabinFrame,[-1.02,.57,-1.06],[1.02,.57,-1.06],.025,edging);
  beam(cabinFrame,[-.9,-.33,-1.06],[.9,-.33,-1.06],.035,edging);
  box(cabinFrame,[2.3,.28,.5],[0,-.58,-.95],liner,[.1,0,0]);
  const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=256;
  const ctx=canvas.getContext('2d'),map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const displayMaterial=new THREE.MeshBasicMaterial({map,toneMapped:false});
  const display=new THREE.Mesh(new THREE.PlaneGeometry(1.32,.22),displayMaterial);display.position.set(0,-.33,-.94);root.add(display);
  for(const sign of [-1,1])for(let i=0;i<3;i++){
    box(cabinFrame,[.075,.06,.035],[sign*(.78+i*.1),-.4,-.79],i===0?materials.white:materials.darkMetal);
  }
  const cabinLight=new THREE.PointLight(0xc7d1da,.9,3,2);cabinLight.position.set(0,.1,-.3);root.add(cabinLight);
  let last='';
  function update(view,aspect,viewportHeight,verticalFov){
    cabinFrame.scale.x=clamp(aspect/1.6,.65,1.55);
    // The interior can adapt to the window, but the LCD remains an unstretched
    // 6:1 camera-space plane. Cap its CSS height, independent of DPR or aspect.
    const pixelHeight=.22*Math.max(1,viewportHeight)/(2*Math.abs(display.position.z)*Math.tan(verticalFov*Math.PI/360));
    const fittedHeight=Math.min(100,Math.max(1,viewportHeight)*aspect*.84/6);
    display.scale.setScalar(Math.min(1,fittedHeight/pixelHeight));
    const values=[Number(view.range??view.position?.[2])||0,Number(view.closingSpeed)||0,Number(view.lateralOffset??Math.hypot(view.position?.[0]||0,view.position?.[1]||0)),Number(view.angleDegrees??view.attitudeErrorDegrees)||0];
    const key=values.map((n,i)=>n.toFixed(i===0?1:2)).join('|')+String(view.captureReady)+String(view.phase);
    if(key===last)return;last=key;
    ctx.fillStyle='#080d11';ctx.fillRect(0,0,1536,256);ctx.textAlign='left';
    ctx.fillStyle='#a0b0bb';ctx.font='500 26px Arial';ctx.fillText('MANUAL APPROACH',30,39);
    ctx.fillStyle=view.captureReady?'#a8d8bd':'#d2dbe1';ctx.font='500 22px Arial';ctx.fillText(view.phase==='docked'?'CAPTURE CONFIRMED':view.captureReady?'CAPTURE LIMITS MET':'RCS / RELATIVE NAVIGATION',810,39);
    const labels=['RANGE / m','CLOSING / m/s','LATERAL / m','ATTITUDE / deg'];
    values.forEach((n,i)=>{const x=30+i*376;ctx.fillStyle='#879ba8';ctx.font='500 21px Arial';ctx.fillText(labels[i],x,93);ctx.fillStyle='#dce6eb';ctx.font='500 61px Arial';ctx.fillText(n.toFixed(i===0?1:2),x,172);});
    ctx.fillStyle='#314552';ctx.fillRect(30,204,1474,2);ctx.fillStyle='#8296a3';ctx.font='500 20px Arial';ctx.fillText('Body-mounted view. Reticle marks the real docking port.',30,239);map.needsUpdate=true;
  }
  return {root,update,dispose(){map.dispose();displayMaterial.dispose();liner.dispose();edging.dispose();}};
}

function makeLander(materials) {
  // Feet touch y=0. The local upright axis is +Y, matching landing.js.
  const lander=new THREE.Group(),attitudeJets=[];
  const foil=new THREE.MeshStandardMaterial({color:0xb69a60,metalness:.77,roughness:.44,flatShading:true});
  const paleFoil=new THREE.MeshStandardMaterial({color:0xc5c3af,metalness:.69,roughness:.37,flatShading:true});
  cylinder(lander,1.45,1.8,1.7,[0,2.12,0],foil,8);
  cylinder(lander,1.57,1.57,.15,[0,3.04,0],materials.darkMetal,8);
  for(let i=0;i<8;i++){
    const a=i*TAU/8;
    const panel=box(lander,[.89,1.31,.08],[Math.sin(a)*1.52,2.15,Math.cos(a)*1.52],i%3===0?paleFoil:foil);panel.rotation.y=a;
    beam(lander,[Math.sin(a)*1.5,1.45,Math.cos(a)*1.5],[Math.sin(a)*1.4,2.91,Math.cos(a)*1.4],.035,materials.titanium);
  }
  const cabin=cylinder(lander,1.07,1.36,1.78,[0,3.98,0],materials.white,8);cabin.rotation.y=Math.PI/8;
  cylinder(lander,.64,1.08,.45,[0,5.08,0],materials.thermal,8);
  cylinder(lander,.43,.43,.12,[0,5.34,0],materials.darkMetal,24);
  ring(lander,.47,.035,[0,5.41,0],materials.titanium);
  for(const x of [-.53,.53]){
    box(lander,[.62,.5,.08],[x,4.23,1.08],materials.darkMetal,[.17,0,0]);
    box(lander,[.51,.39,.085],[x,4.25,1.13],materials.glass,[.17,0,0]);
  }
  box(lander,[.72,1.04,.13],[0,3.47,1.31],materials.titanium);
  box(lander,[.56,.84,.08],[0,3.49,1.4],materials.thermal);
  for(let i=0;i<9;i++)box(lander,[.67,.045,.09],[0,.35+i*.34,1.8],materials.titanium);
  for(const x of [-.39,.39])beam(lander,[x,.2,1.8],[x,3.14,1.8],.035,materials.titanium);
  for(let i=0;i<4;i++){
    const a=Math.PI/4+i*Math.PI/2;
    const foot=[Math.sin(a)*3.6,.13,Math.cos(a)*3.6];
    beam(lander,[Math.sin(a)*1.3,2.77,Math.cos(a)*1.3],foot,.095,materials.titanium);
    beam(lander,[Math.sin(a)*1.4,1.54,Math.cos(a)*1.4],[foot[0]*.9,.57,foot[2]*.9],.07,materials.darkMetal);
    beam(lander,[Math.sin(a)*1.95,1.95,Math.cos(a)*1.95],[foot[0]*.88,.7,foot[2]*.88],.11,materials.copper);
    cylinder(lander,.55,.62,.17,foot,materials.titanium,24);
    const pod=new THREE.Group();pod.position.set(Math.sin(a)*1.39,4.55,Math.cos(a)*1.39);pod.rotation.y=a;lander.add(pod);
    box(pod,[.32,.25,.31],[0,0,0],materials.darkMetal);
    const jet=cylinder(pod,.05,.1,.2,[0,.18,0],materials.nozzle,12);jet.rotation.z=Math.PI/2;
  }
  for(const sign of [-1,1]){
    const tank=new THREE.Mesh(new THREE.SphereGeometry(.43,24,16),paleFoil);tank.position.set(sign*1.4,3.38,0);lander.add(tank);
    beam(lander,[sign*1.2,3.07,-.55],[sign*1.2,4.03,-.55],.035,materials.copper);
  }
  // Opposed pairs provide a visible torque without inventing translation.
  // Positive simulation torque tilts clockwise: upper exhaust points -X,
  // lower exhaust +X. Flames respond to the actual torque, including hold.
  for(const torqueSign of [-1,1])for(const upper of [true,false]){
    const outward=(upper?-1:1)*torqueSign;
    const pod=new THREE.Group();pod.position.set(outward*1.62,upper?4.48:1.72,.68);lander.add(pod);
    box(pod,[.23,.2,.22],[0,0,0],materials.darkMetal);
    const nozzle=cylinder(pod,.045,.09,.17,[outward*.16,0,0],materials.nozzle,12);nozzle.rotation.z=-outward*Math.PI/2;
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.085,.66,12),materials.rcsFlame);
    flame.rotation.z=outward*Math.PI/2;flame.position.x=outward*.52;flame.visible=false;pod.add(flame);
    flame.userData.torqueSign=torqueSign;attitudeJets.push(flame);
  }
  makeNozzle(lander,.57,.75,[0,.47,0],materials);
  const plume=new THREE.Mesh(new THREE.CylinderGeometry(.23,1.7,5.5,32,1,true),materials.exhaustVacuum);plume.position.y=-2.2;plume.visible=false;lander.add(plume);
  const hot=new THREE.Mesh(new THREE.CylinderGeometry(.12,.4,1.9,24,1,true),materials.exhaustCore);hot.position.y=-.3;hot.visible=false;lander.add(hot);
  const antenna=new THREE.Group();antenna.position.set(-.8,5.08,-.5);lander.add(antenna);
  beam(antenna,[0,0,0],[0,1.1,0],.025,materials.titanium);
  const dish=new THREE.Mesh(new THREE.SphereGeometry(.43,24,12,0,TAU,0,.55),materials.white);dish.rotation.set(.9,0,.3);dish.position.y=1.14;antenna.add(dish);
  box(lander,[1.3,.055,.83],[1.9,4.8,-.3],materials.solar,[0,0,-.18]);
  beam(lander,[1,4.7,-.3],[2.5,4.7,-.3],.025,materials.titanium);
  for(let i=0;i<4;i++){
    const a=Math.PI/4+i*Math.PI/2,s=Math.sin(a),c=Math.cos(a);
    beam(lander,[s*1.8,2.7,c*1.8],[s*2.6,.9,c*2.6],.045,materials.copper);
    const bracket=box(lander,[.32,.2,.12],[s*1.58,2.81,c*1.58],materials.titanium);bracket.rotation.y=a;
    const valve=box(lander,[.2,.19,.12],[s*1.6,1.76,c*1.6],materials.darkMetal);valve.rotation.y=a;
    ring(lander,.55,.018,[s*2.545,.235,c*2.545],materials.darkMetal);
  }
  for(const x of [-.48,.48]){
    beam(lander,[x,3.01,1.61],[x,4.02,1.61],.025,materials.titanium);
    beam(lander,[x,4.02,1.61],[x,4.14,1.35],.025,materials.titanium);
  }
  box(lander,[.35,.29,.17],[-1.2,3.9,.73],materials.black);
  const lens=cylinder(lander,.08,.08,.14,[-1.2,3.91,.89],materials.glass,16);lens.rotation.x=Math.PI/2;
  lander.userData={plume,hot,foil,paleFoil,attitudeJets};
  return lander;
}

function makeSurface(destination,materials) {
  const profile=VISUAL_PROFILES[destination.id]||VISUAL_PROFILES.moon;
  const ice=profile.kind.includes('ice'),titan=destination.id==='titan';
  const group=new THREE.Group();
  const meanRadius=Math.max(10000,Number(destination.radius)||1737400);
  const heightAt=(x,z=0)=>-.5*(x*x+z*z)/meanRadius*THREE.MathUtils.smoothstep(Math.hypot(x,z),600,6000);
  let seed=destination.id.split('').reduce((n,c)=>n+c.charCodeAt(0),131);
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const surfaceMap=canvasTexture((ctx,w,h)=>{
    // Canvas pixel channels are sRGB, whereas THREE.Color stores linear RGB.
    const image=ctx.createImageData(w,h),base=new THREE.Color(profile.color).convertLinearToSRGB();
    for(let i=0;i<image.data.length;i+=4){
      const noise=(rand()-.5)*27;
      image.data[i]=clamp(base.r*255+noise,0,255);image.data[i+1]=clamp(base.g*255+noise,0,255);image.data[i+2]=clamp(base.b*255+noise,0,255);image.data[i+3]=255;
    }
    ctx.putImageData(image,0,0);
    if(ice){
      for(let i=0;i<65;i++){
        const x=rand()*w,y=rand()*h;ctx.beginPath();ctx.moveTo(x,y);
        for(let n=1;n<7;n++)ctx.lineTo(x+(n/6-.1)*w*.7,y+Math.sin(n*.7+i)*h*.08+rand()*18);
        ctx.strokeStyle=destination.id==='europa'?'rgba(94,80,68,.44)':'rgba(62,77,80,.31)';ctx.lineWidth=1+rand()*4;ctx.stroke();
      }
    }else{
      for(let i=0;i<100;i++){
        const x=rand()*w,y=rand()*h,r=2+rand()*25;
        ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.strokeStyle='rgba(16,17,18,.12)';ctx.lineWidth=1;ctx.stroke();
      }
    }
  },1024,1024);
  surfaceMap.wrapS=surfaceMap.wrapT=THREE.RepeatWrapping;surfaceMap.repeat.set(140,140);
  const groundMaterial=new THREE.MeshStandardMaterial({map:surfaceMap,color:0xffffff,roughness:ice?.88:1,metalness:0,envMapIntensity:0});
  const geometry=new THREE.PlaneGeometry(12000,12000,144,144);geometry.rotateX(-Math.PI/2);
  const vertices=geometry.attributes.position;
  for(let i=0;i<vertices.count;i++){
    const x=vertices.getX(i),z=vertices.getZ(i),r=Math.hypot(x,z);
    const fade=clamp((r-600)/1200,0,1);
    let h=Math.sin(x*.0031)*Math.cos(z*.0027)*42+Math.sin(x*.0012+z*.0018)*80+Math.sin(x*.0073-z*.0039)*13;
    if(ice)h*=.4;if(titan)h*=.65;
    vertices.setY(i,h*fade+heightAt(x,z)-.035);
  }
  geometry.computeVertexNormals();
  const ground=new THREE.Mesh(geometry,groundMaterial);ground.receiveShadow=true;group.add(ground);
  // The terminal state can still be tens of kilometres from its pad. Continue
  // the illustrative mean-radius surface beyond the detailed landing patch;
  // the target/beacons remain fixed at x=0 and never follow the spacecraft.
  if(meanRadius>100000){
    const outerGeometry=new THREE.RingGeometry(5500,Math.min(200000,meanRadius*.15),192,48);outerGeometry.rotateX(-Math.PI/2);
    const p=outerGeometry.attributes.position,uv=outerGeometry.attributes.uv;
    for(let i=0;i<p.count;i++){p.setY(i,heightAt(p.getX(i),p.getZ(i))-.15);uv.setXY(i,p.getX(i)/12000+.5,-p.getZ(i)/12000+.5);}outerGeometry.computeVertexNormals();
    const horizon=new THREE.Mesh(outerGeometry,groundMaterial);horizon.receiveShadow=true;group.add(horizon);
  }
  const rockGeometry=new THREE.DodecahedronGeometry(1,0),rockMaterial=new THREE.MeshStandardMaterial({color:profile.color,roughness:.97,metalness:0,envMapIntensity:0});
  const rocks=new THREE.InstancedMesh(rockGeometry,rockMaterial,190),dummy=new THREE.Object3D();
  for(let i=0;i<190;i++){
    const a=rand()*TAU,r=34+rand()*410,size=.18+rand()**3*2.1;
    dummy.position.set(Math.cos(a)*r,size*.32,Math.sin(a)*r);dummy.rotation.set(rand(),rand()*TAU,rand());dummy.scale.set(size*(1+rand()),size*.55,size);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
  }
  rocks.castShadow=true;rocks.receiveShadow=true;group.add(rocks);
  // Survey beacons mark a real-scale 25 m zone on unpaved terrain. These are
  // fictional training equipment, not a claim of existing lunar infrastructure.
  const beacons=[];
  for(let i=0;i<8;i++){
    const a=i*TAU/8,x=Math.cos(a)*25,z=Math.sin(a)*25;
    cylinder(group,.08,.13,.75,[x,.37,z],materials.darkMetal,12);
    const light=new THREE.Mesh(new THREE.SphereGeometry(.15,12,8),new THREE.MeshBasicMaterial({color:0xc6d6bf}));light.position.set(x,.83,z);group.add(light);beacons.push(light);
  }
  group.userData={surfaceMap,groundMaterial,rockMaterial,beacons,kind:profile.kind,heightAt};
  return group;
}

function makeMissionEffects(materials,reducedMotion) {
  const group=new THREE.Group(),count=reducedMotion?28:120;
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3),particleGeometry=new THREE.BufferGeometry();
  particleGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));particleGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const dustMaterial=new THREE.PointsMaterial({size:.23,vertexColors:true,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true});
  const dust=new THREE.Points(particleGeometry,dustMaterial);group.add(dust);
  const bits=[];
  for(let i=0;i<(reducedMotion?5:16);i++){
    const fragment=new THREE.Mesh(new THREE.BoxGeometry(.3+i%3*.17,.1,.38),i%3===0?materials.copper:materials.titanium);fragment.visible=false;fragment.castShadow=true;group.add(fragment);bits.push(fragment);
  }
  const flash=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:0xffdaa1,transparent:true,opacity:0,depthWrite:false}));group.add(flash);
  let event=null,age=100;
  const velocity=[];
  function trigger(type,origin,color,gravity=1.62){
    event={type,origin:origin.clone(),color:new THREE.Color(color),gravity};age=0;flash.position.copy(origin);
    for(let i=0;i<count;i++){
      const a=i*2.399963,radial=(type==='impact'?3.5:1.3)+(i%13)*.35;
      velocity[i]=new THREE.Vector3(Math.cos(a)*radial,(type==='impact'?2.8:1)+(i%7)*.25,Math.sin(a)*radial);
      colors.set(event.color.toArray(),i*3);
    }
    particleGeometry.attributes.color.needsUpdate=true;
    bits.forEach((bit,i)=>{bit.visible=type==='impact';bit.position.copy(origin);bit.rotation.set(i*.3,i*.6,i*.2);bit.userData.velocity=new THREE.Vector3(Math.cos(i*2.4)*(3+i%3),2+i%5,Math.sin(i*2.4)*(3+i%4));});
  }
  function update(dt){
    if(!event)return;age+=dt;
    for(let i=0;i<count;i++){
      const v=velocity[i];const p=event.origin.clone().addScaledVector(v,age);p.y-=.5*event.gravity*age*age;
      if(event.type==='touchdown'||event.type==='impact')p.y=Math.max(event.origin.y-(event.type==='impact'?1.25:.05),p.y);
      positions.set(p.toArray(),i*3);
    }
    particleGeometry.attributes.position.needsUpdate=true;
    dustMaterial.opacity=Math.max(0,(event.type==='impact'?.72:.38)*(1-age/5));
    bits.forEach((bit,i)=>{
      if(!bit.visible)return;bit.position.copy(event.origin).addScaledVector(bit.userData.velocity,age);bit.position.y=Math.max(event.origin.y-1.22,bit.position.y-.5*event.gravity*age*age);
      if(!reducedMotion)bit.rotation.set(i*.3+age*(.8+i*.03),i*.6+age*.3,i*.2+age*.6);
      bit.visible=age<6;
    });
    const impact=event.type==='impact';flash.material.opacity=impact?Math.max(0,(reducedMotion?.12:.46)*(1-age/.55)):0;flash.scale.setScalar(.2+age*(reducedMotion?4:11));
    if(age>6){event=null;dustMaterial.opacity=0;flash.material.opacity=0;}
  }
  function clear(){event=null;age=100;dustMaterial.opacity=0;flash.material.opacity=0;bits.forEach(bit=>bit.visible=false);}
  return {group,trigger,update,clear,getAge:()=>age};
}

function disposeGeometries(root) {
  const geometries=new Set();root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);});
  geometries.forEach(geometry=>geometry.dispose());
}

export function createScene(canvas, options = {}) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.04;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(38,1,.1,15000);
  scene.add(camera);
  const textures=makeTextures();
  const materials={
    hull:new THREE.MeshStandardMaterial({map:textures.hull,color:0xffffff,metalness:.36,roughness:.48}),
    white:new THREE.MeshStandardMaterial({color:0xe8ecea,metalness:.26,roughness:.43}),
    capsule:new THREE.MeshStandardMaterial({color:0xd3dcdb,metalness:.64,roughness:.33}),
    thermal:new THREE.MeshStandardMaterial({map:textures.thermal,metalness:.72,roughness:.42}),
    titanium:new THREE.MeshStandardMaterial({color:0x9aabb0,metalness:.82,roughness:.28}),
    darkMetal:new THREE.MeshStandardMaterial({color:0x344047,metalness:.85,roughness:.34}),
    black:new THREE.MeshStandardMaterial({color:0x151c20,metalness:.25,roughness:.65}),
    nozzle:new THREE.MeshStandardMaterial({color:0x313b40,metalness:.86,roughness:.37,side:THREE.DoubleSide}),
    copper:new THREE.MeshStandardMaterial({color:0xc39a64,metalness:.82,roughness:.35}),
    glass:new THREE.MeshStandardMaterial({color:0x082c3b,metalness:.58,roughness:.13,emissive:0x0c1b22,emissiveIntensity:.4}),
    heatShield:new THREE.MeshStandardMaterial({color:0x24272a,metalness:.05,roughness:.88}),
    concrete:new THREE.MeshStandardMaterial({color:0x525a5c,roughness:.97}),
    deck:new THREE.MeshStandardMaterial({map:textures.deck,roughness:.88,metalness:.3}),
    grate:new THREE.MeshStandardMaterial({color:0x1b2428,roughness:.8,metalness:.75}),
    tower:new THREE.MeshStandardMaterial({color:0x5b6669,metalness:.58,roughness:.57}),
    solar:new THREE.MeshStandardMaterial({map:textures.solar,color:0xe3edff,metalness:.58,roughness:.32,side:THREE.DoubleSide}),
    radiator:new THREE.MeshStandardMaterial({color:0xd1d7d4,metalness:.22,roughness:.7,side:THREE.DoubleSide}),
    portDark:new THREE.MeshBasicMaterial({color:0x03090c}),
    portLight:new THREE.MeshBasicMaterial({color:0xc9e7de}),
    exhaust:new THREE.MeshBasicMaterial({color:0xffa95c,transparent:true,opacity:.54,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),
    exhaustCore:new THREE.MeshBasicMaterial({color:0xfff3ce,transparent:true,opacity:.84,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),
    exhaustVacuum:new THREE.MeshBasicMaterial({color:0xa1bfff,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),
    rcsFlame:new THREE.MeshBasicMaterial({color:0x9ed1e5,transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending})
  };
  // A procedural studio environment gives metals real reflections without a
  // downloaded HDRI, a third-party service, or a runtime network dependency.
  const envFaces=[];
  for(let i=0;i<6;i++){
    const face=document.createElement('canvas');face.width=face.height=128;
    const ctx=face.getContext('2d');const gradient=ctx.createLinearGradient(0,0,0,128);
    gradient.addColorStop(0,i===2?'#d1d8dc':'#667781');gradient.addColorStop(.48,'#687780');gradient.addColorStop(1,'#1b242a');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    if(i<4){ctx.fillStyle='#dce1df';ctx.fillRect(46,7,19,104);ctx.fillStyle='#7e8a90';ctx.fillRect(77,16,7,88);}
    envFaces.push(face);
  }
  const environment=new THREE.CubeTexture(envFaces);environment.colorSpace=THREE.SRGBColorSpace;environment.needsUpdate=true;scene.environment=environment;
  const hemi=new THREE.HemisphereLight(0xc9dbea,0x222a2a,1.65);scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffead5,3.3);key.position.set(35,65,45);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-48;key.shadow.camera.right=48;key.shadow.camera.top=64;key.shadow.camera.bottom=-22;key.shadow.camera.near=1;key.shadow.camera.far=160;key.shadow.normalBias=.04;scene.add(key);scene.add(key.target);
  const fill=new THREE.DirectionalLight(0xa4c8e0,1.7);fill.position.set(-30,25,-20);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xf2f3e7,1.5);rim.position.set(15,25,-45);scene.add(rim);
  const engineLight=new THREE.PointLight(0xff8c45,0,65,2);engineLight.position.set(0,3,0);scene.add(engineLight);
  const assembly=new THREE.Group();scene.add(assembly);
  const launchEnvironment=new THREE.Group();scene.add(launchEnvironment);launchEnvironment.visible=false;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(260,260),new THREE.MeshStandardMaterial({color:0x252c31,metalness:.27,roughness:.69}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.5;floor.receiveShadow=true;assembly.add(floor);
  // The bay's tall ribs and light slots frame the rocket, while leaving its
  // central silhouette uninterrupted and the UI free of artificial card chrome.
  const back=box(assembly,[180,110,1],[0,45,-35],new THREE.MeshStandardMaterial({color:0x293138,roughness:.88}));back.receiveShadow=true;
  for(let x=-75;x<=75;x+=15) {
    box(assembly,[.5,105,1.6],[x,45,-33],materials.darkMetal);
    if(x%30===0)box(assembly,[.42,78,.2],[x+2,47,-32.1],new THREE.MeshBasicMaterial({color:0x74888e}));
  }
  const assemblyPad=makePad(materials);assembly.add(assemblyPad);
  const launchPad=makePad(materials);launchPad.position.y=-1.1;launchEnvironment.add(launchPad);
  const launchGround=new THREE.Mesh(new THREE.PlaneGeometry(80000,80000),new THREE.MeshStandardMaterial({map:textures.coastalGround,color:0xffffff,roughness:1}));launchGround.rotation.x=-Math.PI/2;launchGround.position.set(-39080,-1.6,0);launchGround.receiveShadow=true;launchEnvironment.add(launchGround);
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(80000,80000),new THREE.MeshStandardMaterial({color:0x295d72,roughness:.42,metalness:.03}));ocean.rotation.x=-Math.PI/2;ocean.position.set(41000,-2.2,-100);launchEnvironment.add(ocean);
  const shore=new THREE.Mesh(new THREE.PlaneGeometry(80,80000),new THREE.MeshStandardMaterial({color:0xa49e82,roughness:1}));shore.rotation.x=-Math.PI/2;shore.position.set(960,-1.8,0);launchEnvironment.add(shore);
  const localGroundMaterials=[launchGround,ocean,shore].map(mesh=>mesh.material);
  localGroundMaterials.forEach(material=>{material.transparent=true;material.depthWrite=false;});
  for(const x of [-48,48])box(launchEnvironment,[9,.12,600],[x,-1.3,190],materials.concrete);
  box(launchEnvironment,[34,.08,1900],[0,-1.42,1120],materials.grate);
  const waterTank=new THREE.Group();waterTank.position.set(-95,-1.6,-70);launchEnvironment.add(waterTank);
  for(const x of [-4,4])for(const z of [-4,4])beam(waterTank,[x,0,z],[x,35,z],.27,materials.tower);
  cylinder(waterTank,8,8,8,[0,40,0],materials.white);const tankCap=new THREE.Mesh(new THREE.SphereGeometry(8,32,16),materials.white);tankCap.scale.y=.45;tankCap.position.y=44;waterTank.add(tankCap);
  beam(waterTank,[5,0,0],[5,38,0],.24,materials.titanium);
  const operations=new THREE.Group();operations.position.set(-1250,-1.6,1550);launchEnvironment.add(operations);
  box(operations,[140,120,100],[0,60,0],materials.white);box(operations,[105,8,103],[0,112,0],materials.darkMetal);
  for(const x of [-34,0,34])box(operations,[21,83,1.5],[x,47,51],materials.tower);
  const rocketRoot=new THREE.Group();scene.add(rocketRoot);
  let vehicle={},rocket=makeRocket(materials,vehicle);rocketRoot.add(rocket);
  const crawler=new THREE.Group();crawler.visible=false;scene.add(crawler);
  box(crawler,[16,.8,17],[0,-.7,0],materials.deck);
  for(const x of [-7.4,7.4])for(const z of [-5.4,-1.8,1.8,5.4]){const wheel=cylinder(crawler,1.05,1.05,1.8,[x,-1.5,z],materials.darkMetal,24);wheel.rotation.z=Math.PI/2;}
  const docking=new THREE.Group();scene.add(docking);docking.visible=false;
  const station=makeStation(materials);docking.add(station);
  // Visual station reference during high ascent, not a simulated rendezvous.
  const orbitalStation=makeStation(materials);orbitalStation.position.set(-70,36,-110);orbitalStation.visible=false;scene.add(orbitalStation);
  let dockingCraft=makeSpacecraft(materials,vehicle);dockingCraft.rotation.x=-Math.PI/2;const craftAttitude=new THREE.Group();craftAttitude.add(dockingCraft);docking.add(craftAttitude);
  const dockingCockpit=makeDockingCockpit(materials);camera.add(dockingCockpit.root);
  const reducedMotion=options.reducedMotion??window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
  const celestials=createCelestials(renderer,options),earth=celestials.earth,earthAtmosphere=celestials.earthAtmosphere;
  const flightSky=createFlightSky(celestials);
  earth.position.set(-650,-1760,-1700);earth.rotation.set(.2,2.6,-.3);earth.visible=false;scene.add(earth);
  const destinationPreview=celestials.preview;destinationPreview.visible=false;scene.add(destinationPreview);
  const orbitOverview=createOrbitOverview(scene,celestials.getTexture('earth'));
  let selectedDestination='moon';
  const landing=new THREE.Group();landing.visible=false;scene.add(landing);
  let surface=makeSurface(getDestination('moon'),materials);landing.add(surface);
  const lander=makeLander(materials);landing.add(lander);
  const landingParent=celestials.parentContext.clone(true);landingParent.visible=false;scene.add(landingParent);
  const effects=makeMissionEffects(materials,reducedMotion);scene.add(effects.group);
  const surfaceThrust=createSurfaceThrustEffects(reducedMotion);scene.add(surfaceThrust.root);
  const finale=createSurfaceFinale(materials,reducedMotion);scene.add(finale.root);
  const captureGlow=new THREE.Mesh(new THREE.TorusGeometry(1.47,.026,8,72),new THREE.MeshBasicMaterial({color:0xadd8ba,transparent:true,opacity:0,depthWrite:false}));captureGlow.position.z=.08;station.add(captureGlow);
  const starPositions=[];let seed=43921;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<1600;i++) {
    const azimuth=random()*TAU,elevation=Math.acos(2*random()-1),radius=6000;
    starPositions.push(radius*Math.sin(elevation)*Math.cos(azimuth),radius*Math.cos(elevation),radius*Math.sin(elevation)*Math.sin(azimuth));
  }
  const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
  const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xc4d3df,size:2.1,sizeAttenuation:true,transparent:true,opacity:.75,depthWrite:false}));scene.add(stars);stars.visible=false;
  let mode='assembly',previousStage=0,previousPhase=null,previousMissionTime=null,phaseAt=0,destructiveFailure=false,disposed=false,elapsed=0,dragging=false,dragX=0,rotation=.18,zoom=1;
  const look=new THREE.Vector3(0,26,0),desiredLook=new THREE.Vector3(),desiredCamera=new THREE.Vector3();
  const cameraPoint=new THREE.Vector3(),targetProjection=new THREE.Vector3();
  const debris=[];
  let wasOverview=false;
  let orbitYaw=0,orbitPitch=0,orbitZoom=1,dragY=0,freeOrbit=false;
  let launchReferenceAngle=null;
  function resetOrbit(){orbitYaw=orbitPitch=0;orbitZoom=1;freeOrbit=false;}
  camera.position.set(72,40,94);camera.lookAt(look);

  function resetOutcomeVisuals(){
    effects.clear();surfaceThrust.clear();finale.reset();destructiveFailure=false;captureGlow.material.opacity=0;
    materials.portLight.color.set(0xc9e7de);
    surface.userData.beacons.forEach(beacon=>beacon.material.color.set(0xc6d6bf));
  }
  function clearDebris(){for(const d of debris)scene.remove(d.object);debris.length=0;}
  function separateVisual(stage,time,view){
    const source=stage===0?rocket.userData.core:rocket.userData.upper;
    const object=source.clone(true);source.updateWorldMatrix(true,false);source.getWorldPosition(object.position);source.getWorldQuaternion(object.quaternion);scene.add(object);
    object.traverse(child=>{if(child.material===materials.exhaust||child.material===materials.exhaustCore||child.material===materials.exhaustVacuum)child.visible=false;});
    const body=Array.isArray(view.positionSI)&&Array.isArray(view.velocitySI)?releaseBody(view.positionSI,view.velocitySI,Number(view.pitch)||0):null;
    debris.push({object,start:time,last:time,base:object.position.clone(),rotation:object.quaternion.clone(),body,axis:new THREE.Vector3(Math.sin(Number(view.pitch)||0),Math.cos(Number(view.pitch)||0),0),stage});
  }
  function setMode(next){
    if(!['assembly','rollout','launch','transfer','docking','destination','landing','finale'].includes(next)||next===mode)return;
    mode=next;resetOrbit();clearDebris();resetOutcomeVisuals();previousStage=0;previousPhase=null;previousMissionTime=null;
    assembly.visible=mode==='assembly';launchEnvironment.visible=['launch','rollout'].includes(mode);rocketRoot.visible=['assembly','launch','rollout','transfer'].includes(mode);docking.visible=mode==='docking';
    crawler.visible=mode==='rollout';destinationPreview.visible=mode==='destination';landing.visible=['landing','finale'].includes(mode);landingParent.visible=mode==='landing'&&selectedDestination!=='titan';
    earth.visible=earthAtmosphere.visible=mode==='docking';stars.visible=['docking','destination','landing'].includes(mode);
    camera.up.set(0,1,0);
    if(mode==='assembly'){rocketRoot.rotation.set(0,rotation,0);rocketRoot.position.set(0,0,0);camera.position.set(72*zoom,40,94*zoom);look.set(0,rocket.userData.height*.48,0);}
    if(mode==='launch'){rocketRoot.rotation.set(0,0,0);rocketRoot.position.set(0,0,0);camera.position.set(92,36,118);look.set(0,27,0);}
    if(mode==='docking'){camera.position.set(13,7,102);look.set(0,0,35);}
    if(mode==='destination'){camera.position.set(0,7,69);look.set(0,0,0);}
    if(mode==='landing'){camera.position.set(28,28,52);look.set(0,6,0);}
    if(mode==='transfer'){camera.position.set(24,12,35);look.set(0,0,0);}
    camera.lookAt(look);
  }
  function setDestination(next='moon'){
    const id=typeof next==='string'?next:next?.id;
    if(!getDestination(id)||id===selectedDestination)return false;
    selectedDestination=id;celestials.setDestination(id);
    landing.remove(surface);disposeGeometries(surface);
    surface.userData.surfaceMap.dispose();surface.userData.groundMaterial.dispose();surface.userData.rockMaterial.dispose();
    surface.userData.beacons.forEach(beacon=>beacon.material.dispose());
    surface=makeSurface(getDestination(id),materials);landing.add(surface);
    landingParent.scale.copy(celestials.parentContext.scale);landingParent.rotation.copy(celestials.parentContext.rotation);
    landingParent.children.forEach((child,i)=>{child.visible=celestials.parentContext.children[i]?.visible??true;});
    resetOutcomeVisuals();previousPhase=null;
    return true;
  }
  function setVehicle(next={}){
    vehicle=next;clearDebris();rocketRoot.remove(rocket);if(rocket.userData.custom)rocket.userData.dispose();else disposeGeometries(rocket);
    const design=next.design||(next.format==='kineti-core-rocket'?next:null);
    rocket=design?createVehicleGeometry(design,{materials}):makeRocket(materials,vehicle);rocketRoot.add(rocket);
    for(const pad of [assemblyPad,launchPad])pad.userData.tower.scale.y=clamp(rocket.userData.height/52,.7,1.65);
    craftAttitude.remove(dockingCraft);if(dockingCraft.userData.dispose)dockingCraft.userData.dispose();else disposeGeometries(dockingCraft);
    if(design){
      const model=createVehicleGeometry(design,{materials});setVehicleStage(model,2);model.position.y=-model.userData.stageBounds[2].max.y;
      dockingCraft=new THREE.Group();dockingCraft.add(model);dockingCraft.userData={jets:model.userData.attitudeJets,length:model.userData.stageBounds[2].max.y-model.userData.stageBounds[2].min.y,dispose:()=>model.userData.dispose()};
    }else dockingCraft=makeSpacecraft(materials,vehicle);
    dockingCraft.rotation.x=-Math.PI/2;craftAttitude.add(dockingCraft);
    previousStage=0;launchReferenceAngle=null;
  }
  function update(view={},dt=1/60){
    // Reject incomplete events rather than mixing wall and mission time.
    if(view.separation!==undefined&&!Number.isFinite(view.time))return;
    orbitalStation.visible=false;
    orbitOverview.root.visible=false;
    if(disposed)return;
    if(view.destination)setDestination(view.destination);
    if(view.mode)setMode(view.mode);
    const frameDt=clamp(Number.isFinite(dt)?dt:1/60,0,.1);elapsed+=frameDt;
    const t=Number.isFinite(view.time)?view.time:elapsed;
    const smooth=1-Math.exp(-frameDt*5.2);
    dockingCockpit.root.visible=false;
    const cockpitView=mode==='docking'&&view.cameraMode==='cockpit'&&!freeOrbit;
    const desiredFov=cockpitView?55:mode==='docking'&&['port','docking'].includes(view.cameraMode)&&!freeOrbit?42:38;
    const desiredFar=['landing','finale','launch','rollout'].includes(mode)?300000:15000,desiredNear=cockpitView?.03:.1;
    if(camera.fov!==desiredFov||camera.far!==desiredFar||camera.near!==desiredNear){camera.fov=desiredFov;camera.far=desiredFar;camera.near=desiredNear;camera.updateProjectionMatrix();}
    engineLight.intensity=0;
    key.position.set(35,65,45);key.color.set(0xffead5);key.target.position.set(0,0,0);camera.up.set(0,1,0);
    // Only physical mission time participates in rewind detection.
    const phase=view.phase||previousPhase||mode;
    const missionTime=Number.isFinite(view.time)?view.time:null;
    const rewound=missionTime!==null&&previousMissionTime!==null&&missionTime<previousMissionTime-1e-7;
    const terminalPhases=['failed','docked','landed','orbit'];
    const restarted=terminalPhases.includes(previousPhase)&&!terminalPhases.includes(phase)&&!['assembly','destination'].includes(phase);
    if(rewound||restarted){
      resetOutcomeVisuals();clearDebris();phaseAt=elapsed;
      const restoredStage=Number(view.stageIndex??view.activeStageIndex);
      previousStage=Number.isFinite(restoredStage)?clamp(Math.floor(restoredStage),0,2):0;
    }
    if(missionTime!==null)previousMissionTime=missionTime;
    if(phase!==previousPhase){
      previousPhase=phase;phaseAt=elapsed;
      if(phase==='docked')materials.portLight.color.set(0xa5d4b4);
      if(phase==='landed'){const pos=view.position||[0,0];effects.trigger('touchdown',new THREE.Vector3(pos[0],(surface.userData.heightAt?.(pos[0])||0)+.1,0),VISUAL_PROFILES[selectedDestination].color,getDestination(selectedDestination).gravity);}
      if(phase==='failed'){
        if(mode==='landing'){
          const pos=view.position||[0,0],speed=view.impact?.speed??view.maxImpact??0;
          const floor=surface.userData.heightAt?.(pos[0])||0;
          if(pos[1]<2&&speed>3){destructiveFailure=true;effects.trigger('impact',new THREE.Vector3(pos[0],floor+1.3,0),VISUAL_PROFILES[selectedDestination].color,getDestination(selectedDestination).gravity);}
          else if(pos[1]<2)effects.trigger('touchdown',new THREE.Vector3(pos[0],floor+.1,0),VISUAL_PROFILES[selectedDestination].color,getDestination(selectedDestination).gravity);
        }else if(mode==='docking'&&(view.position?.[2]??100)<5){destructiveFailure=true;effects.trigger('impact',new THREE.Vector3(...(view.position||[0,0,0])),0x9faeb1,0);}
        else if(mode==='launch'){destructiveFailure=true;effects.trigger('impact',new THREE.Vector3(0,rocket.userData.height*.45,0),0xb3a999,(view.altitude||0)<100?9.81:0);}
      }
    }
    celestials.update(elapsed,rotation,reducedMotion);
    if(mode==='assembly'){
      scene.background=new THREE.Color(0x1a2229);scene.fog=new THREE.Fog(0x1a2229,115,260);
      rocket.userData.core.visible=rocket.userData.upper.visible=true;rocket.userData.engines.forEach(e=>e.visible=false);rocket.userData.upperPlume.visible=false;
      if(rocket.userData.custom){setVehicleStage(rocket,0);setVehicleThrust(rocket,0,0);}
      rocketRoot.rotation.set(0,rotation,0);rocketRoot.position.set(0,0,0);
      desiredCamera.set(69*zoom,rocket.userData.height*.57,91*zoom);desiredLook.set(0,rocket.userData.height*.48,0);
      camera.position.lerp(desiredCamera,smooth);look.lerp(desiredLook,smooth);camera.lookAt(look);
      hemi.intensity=1.6;key.intensity=3.3;fill.intensity=1.7;rim.intensity=1.5;scene.environmentIntensity=.85;
    }else if(mode==='rollout'){
      scene.background=new THREE.Color(0x87aabd);scene.fog=new THREE.Fog(0x87aabd,800,8500);
      localGroundMaterials.forEach(material=>{material.opacity=1;});
      const progress=clamp(Number(view.rolloutProgress??view.cinematicProgress??((elapsed-phaseAt)/3)),0,1);
      const travel=90*(1-THREE.MathUtils.smoothstep(progress,0,1));
      rocketRoot.position.set(0,1.2,travel);rocketRoot.rotation.set(0,0,0);rocketRoot.visible=true;
      crawler.position.set(0,1.2,travel);crawler.visible=true;launchEnvironment.position.set(0,0,0);launchEnvironment.visible=true;
      if(rocket.userData.custom){setVehicleStage(rocket,0);setVehicleThrust(rocket,0,0);}else{rocket.userData.core.visible=rocket.userData.upper.visible=true;rocket.userData.engines.forEach(e=>e.visible=false);rocket.userData.upperPlume.visible=false;}
      desiredLook.set(0,rocket.userData.height*.46,travel);const distance=Math.max(100,rocket.userData.height*1.8);
      desiredCamera.copy(desiredLook).add(new THREE.Vector3(.62,.17,.82).normalize().multiplyScalar(distance));camera.position.copy(desiredCamera);look.copy(desiredLook);camera.lookAt(look);
      hemi.intensity=1.35;key.intensity=3.6;fill.intensity=.65;rim.intensity=.7;scene.environmentIntensity=.5;
    }else if(mode==='launch'){
      const altitude=Math.max(0,Number(view.altitude)||0),pitch=Number(view.pitch)||0;
      const stage=clamp(Math.floor(Number(view.stageIndex??view.activeStageIndex)||0),0,2),throttle=clamp(Number(view.throttle)||0,0,1);
      if(stage>previousStage)for(let i=previousStage;i<stage;i++)separateVisual(i,t,view);
      previousStage=stage;
      rocket.userData.core.visible=stage===0;rocket.userData.upper.visible=stage<2;
      const space=THREE.MathUtils.smoothstep(altitude,7000,80000);
      scene.background=new THREE.Color(0x87aabd).lerp(new THREE.Color(0x000000),space);
      scene.fog=space<.7?new THREE.Fog(scene.background,700+altitude*1.8,Math.max(18000,altitude*35)):null;
      stars.visible=space>.65;stars.material.opacity=clamp((space-.65)*2,.0,.75);
      earth.visible=earthAtmosphere.visible=altitude>14000;
      const longitude=Array.isArray(view.positionSI)?Math.atan2(view.positionSI[1],view.positionSI[0]):0;
      earth.position.set(-1200,-900-Math.max(0,altitude-100000)*.00015,-3500);
      earth.rotation.z=-longitude;earth.rotation.y=2.6+t*.0000729;
      // The old stationary ISS decoration looked like a frozen rendezvous.
      // A station belongs to the separate approach scenario, not ascent.
      orbitalStation.visible=false;
      if(Array.isArray(view.positionSI)){
        const latitude=Number(view.site?.latitude??vehicle.site?.latitude??28.6084)*Math.PI/180;
        const omega=Number(view.effectiveRotation)||7.2921159e-5*Math.cos(latitude);
        if(launchReferenceAngle===null)launchReferenceAngle=Array.isArray(view.launchPositionSI)?Math.atan2(view.launchPositionSI[1],view.launchPositionSI[0]):0;
        const a=launchReferenceAngle+omega*t;
        const ground=inertialToLocal([6371000*Math.cos(a),6371000*Math.sin(a)],view.positionSI);
        launchEnvironment.position.set(ground[0],ground[1],0);
      }else launchEnvironment.position.set(0,-altitude,0);
      // Blend the local site into the always-present globe, without a blue gap.
      const groundOpacity=1-THREE.MathUtils.smoothstep(altitude,6000,24000);
      localGroundMaterials.forEach(material=>{material.opacity=groundOpacity;});
      launchEnvironment.visible=altitude<26000;crawler.visible=false;
      // Rocket positions are local to its active stage. This frame follows the
      // vehicle, while the actual altitude is represented by atmosphere/ground.
      const pivot=rocket.userData.height*.48;
      rocketRoot.rotation.z=-pitch;rocketRoot.position.set(-Math.sin(pitch)*pivot,pivot*(1-Math.cos(pitch)),0);
      if(rocket.userData.custom){setVehicleStage(rocket,stage);setVehicleThrust(rocket,stage,throttle,1-space,t);}
      rocket.userData.engines.forEach((e,i)=>{e.visible=stage===0&&throttle>.01;e.scale.set(1,mix(.45,1.35,throttle)*(1+Math.sin(elapsed*53+i)*.05),1);});
      rocket.userData.upperPlume.visible=stage===1&&throttle>.01;rocket.userData.upperPlume.scale.set(1,1+Math.sin(elapsed*43)*.045,1);
      engineLight.intensity=throttle*(stage===0?750:240);engineLight.position.set(0,stage===0?1:30,0);
      // Keep the transform pivot stable, but follow the hardware that remains.
      // A fixed full-stack camera target crops the upper stage and capsule.
      const followedBounds=rocket.userData.custom?getVehicleBounds(rocket,stage):new THREE.Box3().setFromObject(rocket.userData.spacecraft);
      if(!rocket.userData.custom&&stage<2)followedBounds.union(new THREE.Box3().setFromObject(rocket.userData.upper));
      if(!rocket.userData.custom&&stage===0)followedBounds.union(new THREE.Box3().setFromObject(rocket.userData.core));
      followedBounds.getCenter(desiredLook);
      const extent=followedBounds.getSize(new THREE.Vector3()),fit=Math.max(24,Math.max(extent.x,extent.y,extent.z)/(2*Math.tan(camera.fov*Math.PI/360))/Math.min(1,camera.aspect)*1.3);
      const followOffset=new THREE.Vector3(.61,.14,.8).normalize().multiplyScalar(fit);
      desiredCamera.copy(desiredLook).add(followOffset);
      if(stage===0&&altitude<180&&!freeOrbit){
        const blend=THREE.MathUtils.smoothstep(altitude,70,180);
        const padHeight=Math.max(rocket.userData.height,followedBounds.max.y-launchEnvironment.position.y);
        const padFit=padHeight/(2*Math.tan(camera.fov*Math.PI/360))/Math.min(1,camera.aspect)*1.22;
        const padLook=new THREE.Vector3(desiredLook.x,(followedBounds.max.y+launchEnvironment.position.y)*.5,0);
        const padCamera=padLook.clone().add(new THREE.Vector3(.61,.14,.8).normalize().multiplyScalar(padFit));
        desiredCamera.lerpVectors(padCamera,desiredCamera,blend);desiredLook.lerpVectors(padLook,desiredLook,blend);
      }
      camera.position.copy(desiredCamera);look.copy(desiredLook);camera.lookAt(look);
      hemi.intensity=mix(1.7,.58,space);key.intensity=mix(3.7,4.6,space);fill.intensity=mix(.9,.3,space);rim.intensity=1;scene.environmentIntensity=mix(.8,.35,space);
      for(const d of debris){
        const age=Math.max(0,t-d.start),step=Math.max(0,t-d.last);d.last=t;
        if(d.body&&Array.isArray(view.positionSI)){
          advanceBallistic(d.body,Math.min(step,10));
          const relative=inertialToLocal(d.body.position,view.positionSI);
          d.object.position.copy(d.base).add(new THREE.Vector3(relative[0],relative[1],(d.stage===0?-1:1)*age*.7));
        }else d.object.position.copy(d.base).addScaledVector(d.axis,-age*2);
        // Keep detached hardware behind the separating joint, including when
        // the player pitches through it. This is a visual clearance constraint.
        if(age<2){const projection=d.object.position.clone().sub(d.base).dot(d.axis),clearance=-age*2;if(projection>clearance)d.object.position.addScaledVector(d.axis,clearance-projection);}
        const activeBounds=new THREE.Box3().setFromObject(rocket.userData.spacecraft);
        if(stage<2)activeBounds.union(new THREE.Box3().setFromObject(rocket.userData.upper));
        const stageBounds=new THREE.Box3().setFromObject(d.object);
        const contact=boxClearance(activeBounds,stageBounds);
        if(contact){
          const {axis:k,amount:push}=contact;d.object.position[k]+=push;
          // Rebase the independent debris state after contact, rather than
          // drawing the same interpenetration again on the following frame.
          d.base[k]+=push;
          if(d.body&&k!=='z'){
            const p=view.positionSI,r=Math.hypot(...p),normal=k==='x'?[-p[1]/r,p[0]/r]:[p[0]/r,p[1]/r];
            const relativeSpeed=d.body.velocity.reduce((v,n,i)=>v+(n-view.velocitySI[i])*normal[i],0);
            if(relativeSpeed*Math.sign(push)<0)d.body.velocity=d.body.velocity.map((v,i)=>v-1.25*relativeSpeed*normal[i]);
          }
        }
        d.object.quaternion.copy(d.rotation);d.object.visible=age<180&&d.object.position.length()<8000;
      }
      // Detached stages must also clear each other, not only the active craft.
      for(let i=0;i<debris.length;i++)for(let j=i+1;j<debris.length;j++){
        const a=debris[i],b=debris[j];
        const contact=boxClearance(new THREE.Box3().setFromObject(a.object),new THREE.Box3().setFromObject(b.object));
        if(contact){const {axis,amount}=contact;b.object.position[axis]+=amount;b.base[axis]+=amount;}
      }
      rocketRoot.visible=phase!=='failed'||elapsed-phaseAt<.28;
      surfaceThrust.update(frameDt,{throttle:stage===0?throttle:0,height:altitude,x:launchEnvironment.position.x,z:24,groundY:launchEnvironment.position.y-1.2,paused:view.paused,vacuum:false,anchorToGround:true});
    }else if(mode==='transfer'){
      scene.background=new THREE.Color(0x000000);scene.fog=null;stars.visible=false;launchEnvironment.visible=crawler.visible=landingParent.visible=false;
      const stage=clamp(Number(view.stageIndex??view.activeStageIndex??2),0,2),throttle=clamp(Number(view.throttle)||0,0,1);
      rocketRoot.visible=!destructiveFailure;rocketRoot.rotation.set(0,0,0);rocketRoot.position.set(0,0,0);
      if(rocket.userData.custom){setVehicleStage(rocket,stage);setVehicleThrust(rocket,stage,throttle,0,t);}
      else{rocket.userData.core.visible=stage===0;rocket.userData.upper.visible=stage<2;rocket.userData.engines.forEach(e=>e.visible=stage===0&&throttle>.01);rocket.userData.upperPlume.visible=stage===1&&throttle>.01;}
      const p=view.positionSI||[6371000+200000,0],longitude=Math.atan2(p[1],p[0]);
      const angle=Number.isFinite(view.craftAngle)?view.craftAngle:longitude+Math.PI/2;
      const localNose=new THREE.Vector2(-Math.sin(longitude)*Math.cos(angle)+Math.cos(longitude)*Math.sin(angle),Math.cos(longitude)*Math.cos(angle)+Math.sin(longitude)*Math.sin(angle));
      rocketRoot.rotation.z=Math.atan2(localNose.y,localNose.x)-Math.PI/2;
      const localBounds=rocket.userData.custom?getVehicleBounds(rocket,stage):new THREE.Box3().setFromObject(rocket.userData.spacecraft);
      localBounds.getCenter(cameraPoint);rocketRoot.position.sub(cameraPoint);rocketRoot.updateMatrixWorld(true);
      const bounds=rocket.userData.custom?getVehicleBounds(rocket,stage):new THREE.Box3().setFromObject(rocket.userData.spacecraft),size=bounds.getSize(new THREE.Vector3());
      bounds.getCenter(desiredLook);const fit=Math.max(22,Math.max(size.x,size.y,size.z)/(2*Math.tan(camera.fov*Math.PI/360))/Math.min(1,camera.aspect)*1.35);
      desiredCamera.copy(desiredLook).add(new THREE.Vector3(.55,.28,.88).normalize().multiplyScalar(fit));camera.position.copy(desiredCamera);look.copy(desiredLook);camera.lookAt(look);
      hemi.intensity=.3;key.color.set(0xfffaf2);key.intensity=4;fill.intensity=.15;rim.intensity=.55;scene.environmentIntensity=.25;
      surfaceThrust.clear();
    }else if(mode==='docking'){
      scene.background=new THREE.Color(0x03080d);scene.fog=null;
      earth.visible=earthAtmosphere.visible=stars.visible=true;earth.position.set(-1200,-900,-3500);earth.rotation.y=2.6+t*.0000729;
      hemi.intensity=.23;key.color.set(0xfffaf2);key.intensity=4.6;fill.intensity=.15;rim.intensity=.5;scene.environmentIntensity=.35;
      const position=Array.isArray(view.position)?view.position:[0,0,80];
      craftAttitude.position.set(Number(position[0])||0,Number(position[1])||0,Number(position[2])||0);
      const orientation=view.quaternion||view.orientation;
      if(Array.isArray(orientation)&&orientation.length===4)craftAttitude.quaternion.set(...orientation).normalize();else craftAttitude.quaternion.identity();
      const firing=view.firing||[0,0,0];const firingLevel=Math.abs(firing[0]||0)+Math.abs(firing[1]||0)+Math.abs(firing[2]||0);
      dockingCraft.userData.jets.forEach((jet,i)=>{jet.visible=firingLevel>.01&&i%3===Math.floor(elapsed*16)%3;});
      const firstPerson=['port','cockpit','docking'].includes(view.cameraMode);
      dockingCraft.visible=!firstPerson&&(!destructiveFailure||elapsed-phaseAt<.28);
      if(firstPerson){
        cameraPoint.set(0,view.cameraMode==='cockpit'?.12:0,view.cameraMode==='cockpit'?1.35:-.22).applyQuaternion(craftAttitude.quaternion).add(craftAttitude.position);camera.position.copy(cameraPoint);
        desiredLook.set(0,0,-1).applyQuaternion(craftAttitude.quaternion).add(camera.position);camera.up.set(0,1,0).applyQuaternion(craftAttitude.quaternion);camera.lookAt(desiredLook);
        dockingCockpit.root.visible=cockpitView;dockingCockpit.update(view,camera.aspect,canvas.clientHeight||1,camera.fov);
      }else if(view.cameraMode==='target'){
        desiredCamera.set(14,7,3);desiredLook.copy(craftAttitude.position);desiredLook.z+=(dockingCraft.userData.length||7)*.35;
        camera.position.copy(desiredCamera);look.copy(desiredLook);camera.up.set(0,1,0);camera.lookAt(look);
      }else{
        camera.up.set(0,1,0);
        const range=Math.max(0,craftAttitude.position.z),length=dockingCraft.userData.length||7;
        desiredCamera.copy(craftAttitude.position).add(new THREE.Vector3(11+Math.min(range*.025,4),5+length*.65,20+length*1.9));
        desiredLook.copy(craftAttitude.position).multiplyScalar(clamp(range/160,.0,.6));desiredLook.z-=2;
        camera.position.copy(desiredCamera);look.copy(desiredLook);camera.lookAt(look);
      }
      const captured=phase==='docked';captureGlow.material.opacity=captured?.36+.14*Math.exp(-(elapsed-phaseAt))*Math.sin((elapsed-phaseAt)*7):0;
      if(!captured)materials.portLight.color.set(0xc9e7de);
    }else if(mode==='destination'){
      scene.background=new THREE.Color(0x020509);scene.fog=null;stars.visible=true;stars.material.opacity=.65;
      hemi.intensity=.035;key.position.set(-60,25,45);key.color.set(0xfffaf2);key.intensity=4.3;fill.intensity=.015;rim.intensity=0;scene.environmentIntensity=0;
      camera.position.set(0,5,69*clamp(zoom,.78,1.3));look.set(0,0,0);camera.lookAt(look);
    }else if(mode==='landing'||mode==='finale'){
      const destination=getDestination(selectedDestination),titan=selectedDestination==='titan',ice=VISUAL_PROFILES[selectedDestination].kind.includes('ice');
      const position=view.position||[0,800],x=Number(position[0])||0,height=Math.max(0,Number(position[1])||0),angle=Number(view.angle)||0;
      const terrainY=surface.userData.heightAt?.(x)||0,renderHeight=height+terrainY;
      const custom=view.customMission&&rocket.userData.custom,activeDescent=['landing','descent'].includes(phase),throttle=activeDescent?clamp(Number(view.throttle)||0,0,1):0;
      scene.background=new THREE.Color(titan?0x44382a:0x020407);scene.fog=titan?new THREE.FogExp2(0x8d7454,.0018):null;
      stars.visible=!titan;stars.material.opacity=.62;
      key.target.position.set(x,renderHeight+2,0);key.position.copy(key.target.position).add(new THREE.Vector3(-65,100,75));key.color.set(ice?0xf5f8ff:0xfff8ec);key.intensity=titan?1.55:4.1;
      hemi.intensity=titan?.75:.09;fill.intensity=titan?.18:.045;rim.intensity=.15;scene.environmentIntensity=.12;
      lander.position.set(x,renderHeight,0);lander.rotation.z=-angle;lander.visible=true;
      let craftHeight=6;
      if(custom){
        setVehicleStage(rocket,2);setVehicleThrust(rocket,2,throttle,0,t);rocketRoot.visible=true;lander.visible=false;
        const feet=rocket.userData.landingFeetY;rocketRoot.rotation.set(0,0,-angle);rocketRoot.position.set(x-Math.sin(angle)*feet,renderHeight-Math.cos(angle)*feet,0);
        const stageBounds=rocket.userData.stageBounds[2];craftHeight=stageBounds.max.y-stageBounds.min.y;
        rocket.userData.attitudeJets.forEach((jet,i)=>{jet.visible=activeDescent&&!view.paused&&Math.abs(Number(view.torque)||0)>5&&i%2===(Math.sign(view.torque)>0?0:1);});
      }
      lander.userData.plume.visible=lander.userData.hot.visible=throttle>.015;
      lander.userData.plume.scale.set(.5+throttle*.65,.35+throttle*.8,.5+throttle*.65);
      lander.userData.hot.scale.setScalar(.45+throttle*.55);
      const torque=Number(view.torque)||0;
      lander.userData.attitudeJets.forEach(jet=>{
        jet.visible=activeDescent&&!view.paused&&Math.abs(torque)>5&&Math.sign(torque)===jet.userData.torqueSign;
        jet.scale.setScalar(.4+.6*clamp(Math.abs(torque)/900,0,1));
      });
      engineLight.position.copy(lander.position).add(new THREE.Vector3(0,1.4,0));engineLight.intensity=throttle*(titan?12:5);
      const terminal=1-THREE.MathUtils.smoothstep(height,70,200);
      const descentCamera=['cockpit','port','docking'].includes(view.cameraMode)&&activeDescent;
      if(descentCamera){
        lander.visible=false;if(custom)rocketRoot.visible=false;camera.position.set(x,terrainY+Math.max(8,height+craftHeight*.8),.08);camera.up.set(0,0,-1);camera.lookAt(new THREE.Vector3(0,0,0));
      }else{
        desiredCamera.set(x+mix(18,Math.max(15,height*.12),terminal),renderHeight+mix(Math.max(11,craftHeight*.85),Math.max(11,height*.25),terminal),mix(Math.max(32,craftHeight*2.6),Math.max(30,height*1.6+30),terminal));
        desiredLook.set(mix(x,x*.5,terminal),terrainY+mix(height+craftHeight*.45,Math.max(3,craftHeight*.42,height*.52),terminal),0);
        if(Math.abs(camera.position.y-height)>200){camera.position.copy(desiredCamera);look.copy(desiredLook);}
        camera.position.copy(desiredCamera);look.copy(desiredLook);camera.lookAt(look);
      }
      // Context is composed in camera space, rather than pretending to be an
      // ephemeris. Keep the complete silhouette inside the upper-left view.
      landingParent.visible=!custom&&!titan&&!['mars','mercury'].includes(selectedDestination);landingParent.position.copy(camera.position).add(new THREE.Vector3(-2500,1600,-11000).applyQuaternion(camera.quaternion));
      const parentScale=clamp(VISUAL_PROFILES[selectedDestination].parentSize*35,100,VISUAL_PROFILES[selectedDestination].parent==='saturn'?310:650);
      landingParent.scale.setScalar(parentScale);
      if(phase==='landed')surface.userData.beacons.forEach(beacon=>beacon.material.color.set(0x9dcba9));
      else if(phase==='failed')surface.userData.beacons.forEach(beacon=>beacon.material.color.set(0xd0a17d));
      else surface.userData.beacons.forEach(beacon=>beacon.material.color.set(0xc6d6bf));
      if(phase==='failed'&&view.impact?.speed>3){lander.rotation.z=-angle+Math.min(1.1,(elapsed-phaseAt)*.45);lander.position.y=terrainY+Math.max(.1,height-(elapsed-phaseAt)*.4);}
      surfaceThrust.update(frameDt,{throttle,height,x,groundY:terrainY,paused:view.paused,vacuum:!titan,gravity:destination.gravity,color:VISUAL_PROFILES[selectedDestination].color});
      const moonCeremony=selectedDestination==='moon'&&(phase==='landed'||mode==='finale')&&(view.crewEnabled===true||!custom);
      finale.update(view.paused?0:frameDt,{active:moonCeremony,x});
      if(moonCeremony&&!freeOrbit){
        const focus=THREE.MathUtils.smoothstep(finale.age,1,5);
        desiredLook.set(x+3,craftHeight*.37,1).lerp(new THREE.Vector3(x+7,1.5,3),focus);
        desiredCamera.set(x+Math.max(18,craftHeight*1.4),Math.max(10,craftHeight*.8),Math.max(30,craftHeight*2.6)).lerp(new THREE.Vector3(x+12,5.5,17),focus);
        camera.position.copy(desiredCamera);look.copy(desiredLook);camera.up.set(0,1,0);camera.lookAt(look);
      }
    }
    celestials.setSunDirection(new THREE.Vector3().subVectors(key.position,key.target.position));
    effects.update(frameDt);
    const showOverview=!view.customMission&&shouldShowOrbitOverview({...view,mode});
    if(wasOverview&&!showOverview){camera.position.copy(desiredCamera);look.copy(desiredLook);camera.lookAt(look);}
    if(freeOrbit){
      let center=mode==='docking'?craftAttitude.position:['landing','finale'].includes(mode)?lander.position:mode==='destination'?new THREE.Vector3():desiredLook;
      let radius=(mode==='assembly'?Math.max(55,rocket.userData.height*1.7):mode==='destination'?69:38)*orbitZoom;
      if(rocket.userData.custom&&['assembly','rollout','launch','transfer','landing','finale'].includes(mode)){
        const bounds=getVehicleBounds(rocket,['landing','finale','transfer'].includes(mode)?2:Number(view.stageIndex??view.activeStageIndex)||0),size=bounds.getSize(new THREE.Vector3());
        center=bounds.getCenter(new THREE.Vector3());radius=Math.max(16,Math.max(size.x,size.y,size.z)*1.8)/Math.min(1,camera.aspect)*orbitZoom;
      }
      camera.up.set(0,1,0);
      camera.position.set(center.x+radius*Math.cos(orbitPitch)*Math.sin(orbitYaw),center.y+radius*Math.sin(orbitPitch),center.z+radius*Math.cos(orbitPitch)*Math.cos(orbitYaw));
      camera.lookAt(center);
      if(mode==='docking')dockingCraft.visible=true;
      if(['landing','finale'].includes(mode)){lander.visible=!(view.customMission&&rocket.userData.custom);if(view.customMission)rocketRoot.visible=true;}
    }
    orbitOverview.update(view,debris);
    if(showOverview){
      rocketRoot.visible=launchEnvironment.visible=earth.visible=earthAtmosphere.visible=false;
      debris.forEach(d=>d.object.visible=false);scene.fog=null;scene.background=new THREE.Color(0x000000);stars.visible=true;
      orbitOverview.root.visible=true;camera.up.set(0,1,0);
      camera.position.set(0,0,24/Math.tan(camera.fov*Math.PI/360)/Math.min(1,camera.aspect));camera.lookAt(0,0,0);
    }
    wasOverview=showOverview;
    const useFlightSky=!showOverview&&(['launch','rollout','transfer','docking'].includes(mode)||(view.customMission&&['landing','finale'].includes(mode)));
    let celestialMarkers=[];
    if(useFlightSky){
      earth.visible=earthAtmosphere.visible=stars.visible=false;
      celestialMarkers=flightSky.update({...view,mode},camera);
      const background=scene.background;scene.background=null;renderer.autoClear=false;renderer.clear(true,true,true);
      renderer.render(flightSky.scene,flightSky.camera);renderer.clearDepth();renderer.render(scene,camera);renderer.autoClear=true;scene.background=background;
    }else renderer.render(scene,camera);
    targetProjection.set(0,0,0).project(camera);
    return {targetX:(targetProjection.x+1)/2,targetY:(1-targetProjection.y)/2,targetVisible:Math.abs(targetProjection.x)<=1&&Math.abs(targetProjection.y)<=1&&targetProjection.z>=-1&&targetProjection.z<=1,celestialMarkers};
  }
  function resize(){
    if(disposed)return;
    const width=Math.max(1,canvas.clientWidth||canvas.parentElement?.clientWidth||640);
    const height=Math.max(1,canvas.clientHeight||canvas.parentElement?.clientHeight||640);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  function onPointerDown(event){if(event.button!==0)return;dragging=true;dragX=event.clientX;dragY=event.clientY;canvas.setPointerCapture?.(event.pointerId);}
  function onPointerMove(event){if(!dragging)return;freeOrbit=true;orbitYaw-=(event.clientX-dragX)*.007;orbitPitch=clamp(orbitPitch+(event.clientY-dragY)*.007,-1.45,1.45);dragX=event.clientX;dragY=event.clientY;}
  function onPointerUp(){dragging=false;}
  function onWheel(event){event.preventDefault();freeOrbit=true;orbitZoom=clamp(orbitZoom*Math.exp(event.deltaY*.001),.25,4);}
  canvas.addEventListener('pointerdown',onPointerDown);canvas.addEventListener('pointermove',onPointerMove);canvas.addEventListener('pointerup',onPointerUp);canvas.addEventListener('pointercancel',onPointerUp);canvas.addEventListener('wheel',onWheel,{passive:false});
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(canvas);
  resize();update({mode:'assembly'},1/60);
  function dispose(){
    if(disposed)return;disposed=true;observer?.disconnect();clearDebris();
    canvas.removeEventListener('pointerdown',onPointerDown);canvas.removeEventListener('pointermove',onPointerMove);canvas.removeEventListener('pointerup',onPointerUp);canvas.removeEventListener('pointercancel',onPointerUp);canvas.removeEventListener('wheel',onWheel);
    disposeGeometries(scene);const allMaterials=new Set();scene.traverse(o=>{if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>allMaterials.add(m));}});allMaterials.forEach(m=>m.dispose());Object.values(textures).forEach(t=>t.dispose());surface.userData.surfaceMap.dispose();dockingCockpit.dispose();finale.dispose();surfaceThrust.dispose();flightSky.dispose();celestials.dispose();environment.dispose();renderer.dispose();
  }
  return {setMode,setVehicle,setDestination,update,resize,dispose,resetOrbit,renderer,scene,camera};
}
