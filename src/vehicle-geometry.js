import * as THREE from 'three';
import { getVehicleLayout } from './vehicle-design.js';

const TAU=Math.PI*2;
const UP=new THREE.Vector3(0,1,0);

function mesh(parent,geometry,material,position=[0,0,0]){
  const object=new THREE.Mesh(geometry,material);object.position.set(...position);
  object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
function cylinder(parent,top,bottom,height,material,position=[0,0,0],segments=48){return mesh(parent,new THREE.CylinderGeometry(top,bottom,height,segments,1),material,position);}
function box(parent,size,material,position=[0,0,0]){return mesh(parent,new THREE.BoxGeometry(...size),material,position);}
function ring(parent,r,y,material,tube=.025){const o=mesh(parent,new THREE.TorusGeometry(r,tube,8,64),material,[0,y,0]);o.rotation.x=Math.PI/2;return o;}
function beam(parent,a,b,r,material){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),d=to.clone().sub(from);const o=cylinder(parent,r,r,d.length(),material);o.position.copy(from).add(to).multiplyScalar(.5);o.quaternion.setFromUnitVectors(UP,d.normalize());return o;}
function hardwareBounds(group){
  group.updateWorldMatrix(true,true);const bounds=new THREE.Box3();
  group.traverse(o=>{if(o.isMesh&&!o.userData.effect&&o.geometry){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
  return bounds;
}
function plumeMaterial(color){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  uniforms:{tint:{value:new THREE.Color(color)},clock:{value:0}},
  vertexShader:`varying vec2 tex;varying vec3 n;varying vec3 v;void main(){tex=uv;vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
  fragmentShader:`uniform vec3 tint;uniform float clock;varying vec2 tex;varying vec3 n;varying vec3 v;void main(){float edge=pow(abs(dot(normalize(n),normalize(v))),.75);float tail=smoothstep(0.0,.72,tex.y);float ripple=.74+.26*sin(tex.y*83.0-clock*17.0+sin(tex.x*32.0+clock*9.0));float a=edge*tail*ripple*.5;gl_FragColor=vec4(tint,a);}`});}

function palette(){
  const standard=(color,metalness,roughness)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
  const hull=standard(0xe7eae8,.24,.44),white=standard(0xe8ecea,.22,.42);
  const darkMetal=standard(0x283239,.8,.33),titanium=standard(0x9eaaaf,.83,.29);
  const copper=standard(0xbf9659,.75,.4),black=standard(0x151a1e,.12,.8);
  const nozzle=standard(0x42464a,.82,.38);nozzle.side=THREE.DoubleSide;
  const glass=standard(0x0b2434,.64,.15),solar=standard(0x152c47,.4,.36);solar.side=THREE.DoubleSide;
  return {hull,white,darkMetal,titanium,copper,black,nozzle,glass,solar,
    exhaust:new THREE.MeshBasicMaterial({color:0xf6b27b,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),
    exhaustCore:new THREE.MeshBasicMaterial({color:0xfff1cc,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),
    exhaustVacuum:new THREE.MeshBasicMaterial({color:0x9bb6e4,transparent:true,opacity:.34,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),
    rcsFlame:new THREE.MeshBasicMaterial({color:0xc3d2e7,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending})};
}

function nozzle(parent,r,h,m){
  const points=[[.95,-.5],[.92,-.38],[.8,-.2],[.6,0],[.37,.3],[.32,.5]].map(([x,y])=>new THREE.Vector2(x*r,y*h));
  mesh(parent,new THREE.LatheGeometry(points,48),m.nozzle);
  for(let i=0;i<5;i++)ring(parent,r*(.94-i*.12),(-.46+i*.16)*h,m.titanium,Math.max(.014,r*.02));
  cylinder(parent,r*.3,r*.27,h*.23,m.copper,[0,h*.49,0],24);
}

function addTank(part,p,m){
  const r=p.radius,h=p.length;
  cylinder(part,r,r,h,m.hull);
  for(const sign of [-1,1]){
    ring(part,r*1.008,sign*(h*.5-.07),m.titanium,Math.max(.018,r*.009));
    cylinder(part,r*.93,r*.93,.08,m.titanium,[0,sign*h*.5,0]);
  }
  for(const y of [-.33,.06,.37])ring(part,r*1.004,h*y,m.titanium,Math.max(.012,r*.006));
  for(let i=0;i<4;i++){
    const a=i*TAU/4;const rail=box(part,[r*.045,h*.82,r*.045],m.white,[Math.sin(a)*r,h*.025,Math.cos(a)*r]);rail.rotation.y=a;
  }
  cylinder(part,r*1.006,r*1.006,Math.min(h*.055,.36),m.black,[0,-h*.32,0]);
}

/** The one canonical model for workshop, launch, transfer and landing.
 * +Y is the nose; coordinates and part centres come from vehicle-design.js.
 * No geometry layout or performance calculation is reimplemented here.
 */
export function createVehicleGeometry(design,options={}){
  const layout=options.layout||getVehicleLayout(design),ownMaterials=!options.materials;
  const m=options.materials||palette(),root=new THREE.Group();root.name='Player vehicle';
  const stages=[0,1,2].map(i=>{const group=new THREE.Group();group.name=`Stage ${i}`;root.add(group);return group;});
  const parts=new Map(),flames=[],attitudeJets=[],effectMaterials=[];
  for(const p of layout.parts){
    const part=new THREE.Group();part.name=p.slotId;part.userData={partId:p.slotId,slotId:p.slotId,type:p.type,stage:p.stage};
    part.position.set(...p.position);if(Array.isArray(p.rotation))part.rotation.set(...p.rotation);stages[p.stage??2].add(part);parts.set(p.slotId,part);
    const r=Math.max(.06,p.radius),h=Math.max(.08,p.length);
    if(p.type==='tank')addTank(part,p,m);
    else if(p.type==='engine'){
      nozzle(part,r,h,m);
      for(let i=0;i<4;i++){const a=i*TAU/4;beam(part,[Math.sin(a)*r*.45,h*.43,Math.cos(a)*r*.45],[Math.sin(a)*r*.74,-h*.1,Math.cos(a)*r*.74],.035,m.copper);}
      const flame=new THREE.Group();flame.position.y=-h*.5;part.add(flame);flame.visible=false;
      const plumeMat=plumeMaterial(p.stage===0?0xf8a667:0x91b3e5),coreMat=plumeMaterial(0xffe1ae);effectMaterials.push(plumeMat,coreMat);
      const plume=mesh(flame,new THREE.CylinderGeometry(r*.64,r*2.1,h*6,32,1,true),plumeMat,[0,-h*3,0]);plume.castShadow=false;plume.receiveShadow=false;plume.userData.effect=true;
      const core=mesh(flame,new THREE.CylinderGeometry(r*.4,r*.85,h*2.7,24,1,true),coreMat,[0,-h*1.35,0]);core.castShadow=false;core.receiveShadow=false;core.userData.effect=true;
      flames.push({stage:p.stage,object:flame,partId:p.slotId,origin:[p.position[0],p.position[1]-h*.5,p.position[2]],radius:r});
    }else if(p.type==='capsule'){
      cylinder(part,r*.32,r,h,m.white);ring(part,r,-h*.48,m.darkMetal,r*.035);
      cylinder(part,r*.34,r*.34,.12,m.titanium,[0,h*.54,0]);
      for(let i=0;i<4;i++){
        const a=Math.PI/4+i*Math.PI/2,win=box(part,[r*.34,h*.22,.07],m.glass,[Math.sin(a)*r*.64,h*.13,Math.cos(a)*r*.64]);win.rotation.set(-.35,a,0);
      }
      box(part,[r*.56,h*.4,.07],m.darkMetal,[0,-h*.1,r*.86]);box(part,[r*.45,h*.31,.08],m.white,[0,-h*.1,r*.9]);
      for(let i=0;i<4;i++){
        const a=i*TAU/4,pod=new THREE.Group();pod.position.set(Math.sin(a)*r*.94,-h*.35,Math.cos(a)*r*.94);pod.rotation.y=a;part.add(pod);
        box(pod,[.18,.15,.17],m.darkMetal);
        const jet=mesh(pod,new THREE.ConeGeometry(.055,.38,10),m.rcsFlame,[.27,0,0]);jet.rotation.z=Math.PI/2;jet.visible=false;jet.castShadow=false;jet.userData.effect=true;attitudeJets.push(jet);
      }
    }else if(p.type==='separator'){
      cylinder(part,r,r,h,m.darkMetal);ring(part,r*1.01,-h*.36,m.copper,r*.018);ring(part,r*1.01,h*.36,m.titanium,r*.018);
      for(let i=0;i<12;i++){const a=i*TAU/12;box(part,[.08,h*.7,.08],m.titanium,[Math.sin(a)*r,0,Math.cos(a)*r]);}
    }else if(p.type==='fairing'){
      cylinder(part,r*.05,r,h,m.hull);ring(part,r,-h*.5,m.titanium,r*.015);
    }else if(p.type==='booster'){
      cylinder(part,r,r,h*.72,m.hull,[0,-h*.04,0]);cylinder(part,.01,r,h*.2,m.white,[0,h*.42,0]);
      // Standalone booster has its own staged nozzle and thrust plume.
      const engine=new THREE.Group();engine.position.y=-h*.44;part.add(engine);nozzle(engine,r*.78,h*.15,m);
      const flame=new THREE.Group();flame.position.y=-h*.51;part.add(flame);flame.visible=false;
      const plume=mesh(flame,new THREE.CylinderGeometry(r*.6,r*1.8,h*.7,24,1,true),m.exhaust,[0,-h*.35,0]);plume.castShadow=false;plume.receiveShadow=false;plume.userData.effect=true;
      flames.push({stage:p.stage,object:flame,partId:p.slotId,origin:[p.position[0],p.position[1]-h*.51,p.position[2]],radius:r});
      for(const y of [-.3,.2])ring(part,r*1.012,y*h,m.darkMetal,r*.025);
    }else if(p.type==='solar'){
      box(part,[r*2,.065,h],m.solar);for(let i=0;i<7;i++)box(part,[.025,.075,h],m.titanium,[-r+i*r/3,0,0]);
      for(const z of [-h*.5,h*.5])box(part,[r*2,.08,.04],m.titanium,[0,0,z]);
      beam(part,[-r,0,0],[r,0,0],.045,m.titanium);
    }else if(p.type==='legs'){
      const foot=[r,-h*.5,0],hip=[-h*.35,h*.5,0];
      beam(part,hip,foot,.07,m.titanium);beam(part,[hip[0],0,hip[2]],[foot[0]*.9,foot[1]+h*.17,foot[2]*.9],.05,m.copper);
      cylinder(part,r*.37,r*.41,.12,m.titanium,foot,24);
    }
    part.traverse(o=>{if(o.isMesh){o.userData.partId=p.slotId;o.userData.slotId=p.slotId;}});
  }
  root.updateMatrixWorld(true);
  const bounds=hardwareBounds(root),stageBoxes=stages.map(hardwareBounds);
  const size=bounds.getSize(new THREE.Vector3());
  root.userData={parts,stages,flames,attitudeJets,layout,design,height:layout.height||size.y,radius:layout.radius||Math.max(size.x,size.z)/2,
    bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},stageBounds:stageBoxes,
    landingFeetY:stageBoxes[2].isEmpty()?0:stageBoxes[2].min.y,
    core:stages[0],upper:stages[1],spacecraft:stages[2],coreHeight:stageBoxes[0].isEmpty()?0:stageBoxes[0].max.y,
    upperHeight:stageBoxes[1].isEmpty()?0:stageBoxes[1].max.y-stageBoxes[1].min.y,
    engines:flames.filter(f=>f.stage===0).map(f=>f.object),upperPlume:flames.find(f=>f.stage===1)?.object||new THREE.Group(),
    thrustPoints:flames.map(f=>new THREE.Vector3(...f.origin)),custom:true,
    effectMaterials,dispose(){const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());effectMaterials.forEach(material=>material.dispose());if(ownMaterials)Object.values(m).forEach(material=>material.dispose());}};
  return root;
}

export function setVehicleStage(root,index=0){root.userData.stages?.forEach((stage,i)=>{stage.visible=i>=index;});}
export function setVehicleThrust(root,index,throttle=0,atmosphere=0,time=0){
  for(const flame of root.userData.flames||[]){
    flame.object.visible=flame.stage===index&&throttle>.001;
    flame.object.scale.set(1+atmosphere*.1,.32+Math.max(0,throttle)*1.5,1+atmosphere*.1);
  }
  root.userData.effectMaterials?.forEach(m=>{m.uniforms.clock.value=time;});
}
export function getVehicleBounds(root,index=0,target=new THREE.Box3()){
  target.makeEmpty();root.updateWorldMatrix(true,true);
  root.userData.stageBounds?.forEach((bounds,i)=>{if(i>=index&&!bounds.isEmpty())target.union(bounds.clone().applyMatrix4(root.matrixWorld));});return target;
}
