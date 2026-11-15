import * as THREE from 'three';
import { FLAG_SVG } from './brand.js';

/** Presentation-only surface EVA after the simulation has confirmed contact. */
export function createSurfaceFinale(materials,reducedMotion=false){
  const root=new THREE.Group();root.visible=false;
  const crew=new THREE.Group();root.add(crew);
  const white=materials.white,metal=materials.titanium;
  const visor=new THREE.MeshStandardMaterial({color:0x9d8864,metalness:.83,roughness:.16});
  const add=(parent,g,m,p)=>{const o=new THREE.Mesh(g,m);o.position.set(...p);o.castShadow=true;parent.add(o);return o;};
  add(crew,new THREE.CapsuleGeometry(.27,.48,6,16),white,[0,1.13,0]);
  add(crew,new THREE.BoxGeometry(.44,.62,.28),white,[0,1.18,-.28]);
  add(crew,new THREE.SphereGeometry(.3,24,16),white,[0,1.7,0]);
  const glass=add(crew,new THREE.SphereGeometry(.25,24,16,0,Math.PI,0,Math.PI),visor,[0,1.71,.11]);glass.scale.set(1,.83,.8);
  const limbs=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.16,.82,0);crew.add(leg);
    add(leg,new THREE.CapsuleGeometry(.11,.47,4,12),white,[0,-.28,0]);add(leg,new THREE.BoxGeometry(.24,.14,.36),white,[0,-.72,.07]);limbs.push(leg);
    const arm=new THREE.Group();arm.position.set(side*.33,1.36,0);crew.add(arm);
    add(arm,new THREE.CapsuleGeometry(.09,.42,4,12),white,[0,-.24,0]);limbs.push(arm);
  }
  const companion=crew.clone(true);root.add(companion);
  const companionLimbs=limbs.map(limb=>companion.children[crew.children.indexOf(limb)]);
  const flag=new THREE.Group();flag.position.set(8,0,3);root.add(flag);
  add(flag,new THREE.CylinderGeometry(.025,.034,2.9,12),metal,[0,1.45,0]);
  const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=900;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,1500,900);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  let disposed=false;
  const artwork=new Image();artwork.onload=()=>{if(disposed)return;ctx.drawImage(artwork,0,0,1500,900);map.needsUpdate=true;};
  artwork.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(FLAG_SVG);
  const cloth=new THREE.MeshStandardMaterial({map,side:THREE.DoubleSide,roughness:.95,metalness:0});
  add(flag,new THREE.PlaneGeometry(1.8,1.08),cloth,[.91,2.26,0]);
  add(flag,new THREE.CylinderGeometry(.014,.014,1.82,8),metal,[.91,2.8,0]).rotation.z=Math.PI/2;
  let age=0,active=false;
  function reset(){age=0;active=false;root.visible=false;}
  function update(dt,state={}){
    if(!state.active){if(active)reset();return;}
    active=true;root.visible=true;root.position.set(state.x||0,0,0);age+=Math.min(.1,Math.max(0,dt));
    const progress=THREE.MathUtils.smoothstep(age,1.5,reducedMotion?3.5:10);
    crew.position.set(2+progress*5.6,0,2.8);crew.rotation.y=Math.PI/2;
    limbs.forEach((limb,i)=>{limb.rotation.x=!reducedMotion&&progress>0&&progress<1?Math.sin(age*6.7+(i%2)*Math.PI)*.32:0;});
    companion.position.set(crew.position.x-1.25,0,4.4);companion.rotation.y=Math.PI/2;
    companionLimbs.forEach((limb,i)=>{limb.rotation.x=!reducedMotion&&progress>0&&progress<1?Math.sin(age*6.7+(i%2)*Math.PI+1)*.28:0;});
    if(progress>.7)limbs[3].rotation.x=-THREE.MathUtils.smoothstep(progress,.7,.95);
    flag.visible=age>(reducedMotion?3:8.5);
  }
  function dispose(){disposed=true;artwork.onload=null;root.traverse(o=>o.geometry?.dispose());visor.dispose();cloth.dispose();map.dispose();}
  return {root,update,reset,dispose,get age(){return age;}};
}

/** Finite particles. Atmosphere permits steam; vacuum permits ballistic dust. */
export function createSurfaceThrustEffects(reducedMotion=false){
  const count=reducedMotion?64:480,positions=new Float32Array(count*3),sizes=new Float32Array(count),alpha=new Float32Array(count);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aAlpha',new THREE.BufferAttribute(alpha,1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{tint:{value:new THREE.Color(0xc8c7c3)}},
    vertexShader:`attribute float aSize; attribute float aAlpha; varying float fade; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(aSize*620.0/max(1.0,-p.z),1.0,130.0);fade=aAlpha;}`,
    fragmentShader:`uniform vec3 tint;varying float fade;void main(){float r=length(gl_PointCoord-vec2(.5))*2.0;float a=pow(max(0.0,1.0-r),1.7)*fade;if(a<.005)discard;gl_FragColor=vec4(tint,a);}`});
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.renderOrder=4;
  const root=new THREE.Group();root.add(points);
  const fanMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,uniforms:{tint:{value:new THREE.Color(0xc6bda9)},strength:{value:0},clock:{value:0}},
    vertexShader:`varying vec2 tex;void main(){tex=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform vec3 tint;uniform float strength;uniform float clock;varying vec2 tex;void main(){vec2 p=(tex-.5)*2.0;float r=length(p);float a=atan(p.y,p.x);float streak=.35+.65*pow(.5+.5*sin(a*87.0-r*24.0+clock*5.0),3.0);float edge=smoothstep(.04,.12,r)*(1.0-smoothstep(.2,1.0,r));float alpha=edge*streak*strength;if(alpha<.005)discard;gl_FragColor=vec4(tint,alpha);}`});
  const fan=new THREE.Mesh(new THREE.PlaneGeometry(70,70),fanMaterial);fan.rotation.x=-Math.PI/2;fan.renderOrder=3;root.add(fan);
  const particles=Array.from({length:count},()=>({age:99,life:0,p:new THREE.Vector3(),v:new THREE.Vector3(),size:1}));let cursor=0,emission=0,seed=19,lastAnchor=null;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function update(dt,state={}){
    const h=Math.min(.1,Math.max(0,dt)),vacuum=state.vacuum===true,gravity=state.gravity??1.62;
    const sourceZ=Number(state.z)||0;
    if(state.anchorToGround){
      const anchor=new THREE.Vector3(state.x||0,state.groundY||0,sourceZ);
      if(lastAnchor){const shift=anchor.clone().sub(lastAnchor);particles.forEach(p=>{if(p.age<p.life)p.p.add(shift);});}
      lastAnchor=anchor;
    }else lastAnchor=null;
    const intensity=state.paused?0:Math.max(0,state.throttle||0)*Math.max(0,1-(state.height||0)/(vacuum?45:180));
    fan.visible=vacuum&&(intensity>0||state.paused&&fanMaterial.uniforms.strength.value>.001);
    fan.position.set(state.x||0,(state.groundY||0)+.07,0);
    if(!state.paused){fanMaterial.uniforms.clock.value+=h;fanMaterial.uniforms.strength.value=vacuum?Math.sqrt(intensity)*.6:0;}
    material.uniforms.tint.value.set(vacuum?(state.color||0xa5a29c):0xc6c6c2);
    if(vacuum)material.uniforms.tint.value.lerp(new THREE.Color(0xe2ddd1),.35);
    emission+=h*intensity*(reducedMotion?24:vacuum?175:220);
    while(emission>=1){emission--;const p=particles[cursor++%count],a=rand()*Math.PI*2,speed=(vacuum?10:7)+rand()*(vacuum?20:15);p.age=0;p.life=(vacuum?2.3:4)+rand()*2;p.size=vacuum?.65+rand()*1.25:5+rand()*12;p.p.set((state.x||0)+Math.cos(a)*2+(vacuum?0:(cursor%2?7:-7)),(state.groundY||0)+.05,sourceZ+Math.sin(a)*2);p.v.set(Math.cos(a)*speed,vacuum?.7+rand()*3.4:7+rand()*16,Math.sin(a)*speed+(vacuum?0:6));}
    particles.forEach((p,i)=>{p.age+=state.paused?0:h;if(p.age<p.life){p.p.addScaledVector(p.v,state.paused?0:h);p.v.y-=(vacuum?gravity:.32)*(state.paused?0:h);p.p.y=Math.max(state.groundY||0,p.p.y);positions.set(p.p.toArray(),i*3);sizes[i]=p.size*(vacuum?1:1+p.age*.7);alpha[i]=(vacuum?.5:.42)*Math.max(0,1-p.age/p.life);}else alpha[i]=0;});
    geometry.attributes.position.needsUpdate=geometry.attributes.aSize.needsUpdate=geometry.attributes.aAlpha.needsUpdate=true;
    points.visible=intensity>0||particles.some(p=>p.age<p.life);
    root.visible=points.visible||fan.visible;
  }
  function clear(){particles.forEach(p=>p.age=99);alpha.fill(0);emission=0;lastAnchor=null;points.visible=fan.visible=root.visible=false;fanMaterial.uniforms.strength.value=0;}
  return {root,update,clear,dispose(){geometry.dispose();material.dispose();fan.geometry.dispose();fanMaterial.dispose();}};
}
