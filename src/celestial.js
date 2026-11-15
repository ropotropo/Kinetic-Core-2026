import * as THREE from 'three';

// These are explicit paths so the portable builder can embed every resource.
// The maps are NASA display assets. They do not define gravity or landing DEMs.
export const BODY_TEXTURE_PATHS = Object.freeze({
  earth: 'assets/celestial-earth.jpg',
  earthHD: 'assets/earth-blue-marble.jpg',
  moon: 'assets/celestial-moon.jpg',
  moonHD: 'assets/celestial-moon-hd.jpg',
  moonHeight: 'assets/celestial-moon-height.jpg',
  phobos: 'assets/celestial-phobos.jpg',
  deimos: 'assets/celestial-deimos.jpg',
  io: 'assets/celestial-io.jpg',
  europa: 'assets/celestial-europa.jpg',
  europaHD: 'assets/celestial-europa-hd.jpg',
  ganymede: 'assets/celestial-ganymede.jpg',
  callisto: 'assets/celestial-callisto.jpg',
  titan: 'assets/celestial-titan.jpg',
  enceladus: 'assets/celestial-enceladus.jpg',
  rhea: 'assets/celestial-rhea.jpg',
  iapetus: 'assets/celestial-iapetus.jpg',
  triton: 'assets/celestial-triton.jpg',
  mars: 'assets/celestial-mars.jpg',
  jupiter: 'assets/celestial-jupiter.jpg',
  saturn: 'assets/celestial-saturn.jpg',
  neptune: 'assets/celestial-neptune.jpg',
});

export const VISUAL_PROFILES = Object.freeze({
  mercury: { parent:'earth', color:'#91867b', kind:'regolith', parentSize:2 },
  mars: { parent:'earth', color:'#ae7051', kind:'regolith', parentSize:2 },
  moon: { parent: 'earth', color: '#97938d', kind: 'regolith', parentSize: 2.4 },
  phobos: { parent: 'mars', color: '#7b7367', kind: 'regolith', parentSize: 28, shape: [1.28, 1.03, .83] },
  deimos: { parent: 'mars', color: '#8b8074', kind: 'regolith', parentSize: 14, shape: [1.2, .94, .86] },
  io: { parent: 'jupiter', color: '#a79952', kind: 'sulfur', parentSize: 22 },
  europa: { parent: 'jupiter', color: '#d5dce0', kind: 'ice', parentSize: 14 },
  ganymede: { parent: 'jupiter', color: '#9e9482', kind: 'ice-rock', parentSize: 9 },
  callisto: { parent: 'jupiter', color: '#79736b', kind: 'regolith', parentSize: 5.5 },
  titan: { parent: 'saturn', color: '#8e754c', kind: 'haze', parentSize: 7 },
  enceladus: { parent: 'saturn', color: '#e1e5e7', kind: 'ice', parentSize: 29 },
  rhea: { parent: 'saturn', color: '#9b9a94', kind: 'ice-rock', parentSize: 13 },
  iapetus: { parent: 'saturn', color: '#716c61', kind: 'regolith', parentSize: 2.8 },
  triton: { parent: 'neptune', color: '#c1c9c9', kind: 'ice', parentSize: 8 },
});

function textureFromCanvas(canvas, color = true) {
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function seeded(seed = 1138) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function cloudTexture() {
  // Illustrative cloud layer, deliberately separate from the dated NASA map.
  // There is no live weather claim and no baked-in sunlight in this alpha map.
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
  const ctx = canvas.getContext('2d'), rand = seeded(73119);
  for (let i = 0; i < 440; i++) {
    const x = rand() * canvas.width, latitude = rand() * Math.PI;
    const y = (0.14 + rand() * .72) * canvas.height;
    const width = 24 + rand() * 180, height = 6 + rand() * 27;
    const curl = Math.sin(latitude * 6) * .3;
    for (const wrap of [-canvas.width, 0, canvas.width]) {
      ctx.save(); ctx.translate(x + wrap, y); ctx.rotate(curl + (rand()-.5)*.2);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gradient.addColorStop(0, 'rgba(255,255,255,.67)');
      gradient.addColorStop(.45, 'rgba(255,255,255,.39)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.scale(width, height); ctx.fillStyle = gradient; ctx.fillRect(-1,-1,2,2); ctx.restore();
    }
  }
  return textureFromCanvas(canvas);
}

function atmosphere(radius, tint, strength = .22) {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    uniforms: { sunDirection: { value: new THREE.Vector3(-.8,.35,.6).normalize() }, tint: { value: new THREE.Color(tint) }, strength: { value: strength } },
    vertexShader: `varying vec3 worldNormal; varying vec3 worldPoint;
      void main(){ vec4 p=modelMatrix*vec4(position,1.0); worldPoint=p.xyz; worldNormal=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*p; }`,
    fragmentShader: `uniform vec3 sunDirection; uniform vec3 tint; uniform float strength;
      varying vec3 worldNormal; varying vec3 worldPoint;
      void main(){ vec3 n=normalize(worldNormal); vec3 v=normalize(cameraPosition-worldPoint);
        float rim=pow(1.0-clamp(dot(n,v),0.0,1.0),3.8);
        float day=smoothstep(-.18,.42,dot(n,sunDirection));
        float alpha=rim*day*strength;
        gl_FragColor=vec4(tint,alpha); }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), material);
}

function makeRingTexture() {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=4;
  const ctx=canvas.getContext('2d'), rand=seeded(1907);
  for(let i=0;i<1024;i++){
    const r=i/1024;
    const cassini=r>.58&&r<.635;
    const alpha=cassini?.05:(.2+.55*Math.pow(Math.sin(i*.043)*.5+.5,.6))*(.8+rand()*.2);
    ctx.fillStyle=`rgba(${174+Math.floor(rand()*27)},${162+Math.floor(rand()*24)},${132+Math.floor(rand()*18)},${alpha})`;
    ctx.fillRect(i,0,1,4);
  }
  return textureFromCanvas(canvas);
}

export function createCelestials(renderer, options = {}) {
  const textureCache=new Map(), resources=[];
  const loader=new THREE.TextureLoader();
  function getTexture(id) {
    if(textureCache.has(id))return textureCache.get(id);
    const highQuality=options.highQuality??(renderer.capabilities.maxTextureSize>=4096&&!window.matchMedia?.('(max-width: 700px)').matches);
    const path=BODY_TEXTURE_PATHS[highQuality&&id==='earth'&&renderer.capabilities.maxTextureSize>=8192?'earthHD':highQuality&&id==='moon'?'moonHD':highQuality&&id==='europa'?'europaHD':id];
    if(!path)return null;
    const texture=loader.load(new URL(path,document.baseURI).href,()=>{
      if(id==='earth')makeOceanRoughness(texture);
    },undefined,()=>options.onAssetWarning?.(`The local ${id} map could not be loaded.`));
    texture.colorSpace=id==='moonHeight'?THREE.NoColorSpace:THREE.SRGBColorSpace;
    texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
    textureCache.set(id,texture);return texture;
  }

  const earth=new THREE.Group();
  const earthSurface=new THREE.Mesh(new THREE.SphereGeometry(1900,128,80),new THREE.MeshStandardMaterial({
    map:getTexture('earth'), color:0xffffff, roughness:.9, metalness:0,
    envMapIntensity:.015, emissive:0x020507, emissiveIntensity:.12,
  }));earth.add(earthSurface);
  // The original composite's near-black open ocean needs a restrained display
  // lift under physical lighting. Land pixels retain their source color.
  earthSurface.material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    float water=step(diffuseColor.r*1.7,diffuseColor.b)*(1.0-step(.09,diffuseColor.r));
    diffuseColor.rgb=mix(diffuseColor.rgb,max(diffuseColor.rgb,vec3(.004,.021,.055)),water);`);};
  function makeOceanRoughness(texture) {
    if(!texture.image)return;
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(texture.image,0,0,1024,512);
    const image=ctx.getImageData(0,0,1024,512),data=image.data;
    for(let i=0;i<data.length;i+=4){
      const ocean=data[i+2]>data[i]*1.22&&data[i+2]>data[i+1]*.95&&data[i]<95;
      const rough=ocean?92:232;data[i]=data[i+1]=data[i+2]=rough;data[i+3]=255;
    }
    ctx.putImageData(image,0,0);const roughness=textureFromCanvas(canvas,false);resources.push(roughness);
    earthSurface.material.roughness=1;earthSurface.material.roughnessMap=roughness;earthSurface.material.needsUpdate=true;
  }
  const cloudsMap=cloudTexture();resources.push(cloudsMap);
  const earthClouds=new THREE.Mesh(new THREE.SphereGeometry(1903.5,128,80),new THREE.MeshStandardMaterial({
    map:cloudsMap,transparent:true,opacity:.28,roughness:1,metalness:0,envMapIntensity:0,depthWrite:false,
  }));earthClouds.renderOrder=2;earth.add(earthClouds);
  const earthAtmosphere=atmosphere(1912,0x74b3e0,.19);earthAtmosphere.renderOrder=3;earth.add(earthAtmosphere);

  const preview=new THREE.Group();
  const bodyPivot=new THREE.Group();preview.add(bodyPivot);
  const body=new THREE.Mesh(new THREE.SphereGeometry(17,128,80),new THREE.MeshStandardMaterial({roughness:1,metalness:0,envMapIntensity:0}));bodyPivot.add(body);
  const parentContext=new THREE.Group();preview.add(parentContext);
  const parentBody=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({roughness:.96,metalness:0,envMapIntensity:0}));parentContext.add(parentBody);
  const ringGeometry=new THREE.RingGeometry(1.22,2.36,128);
  const ringPositions=ringGeometry.attributes.position,ringUV=ringGeometry.attributes.uv;
  for(let i=0;i<ringPositions.count;i++){
    const x=ringPositions.getX(i),y=ringPositions.getY(i);
    ringUV.setXY(i,(Math.hypot(x,y)-1.22)/(2.36-1.22),(Math.atan2(y,x)+Math.PI)/(Math.PI*2));
  }
  const ringMap=makeRingTexture();resources.push(ringMap);
  const parentRings=new THREE.Mesh(ringGeometry,new THREE.MeshStandardMaterial({map:ringMap,transparent:true,opacity:.88,side:THREE.DoubleSide,roughness:1,metalness:0,envMapIntensity:0,depthWrite:false}));
  parentRings.rotation.x=-Math.PI/2;parentContext.add(parentRings);
  const titanHaze=atmosphere(17.35,0xcba776,.25);bodyPivot.add(titanHaze);titanHaze.visible=false;
  let destination='moon';
  function setDestination(next) {
    const id=typeof next==='string'?next:next?.id;
    if(!VISUAL_PROFILES[id]||id===destination&&body.material.map)return false;
    destination=id;const profile=VISUAL_PROFILES[id];
    body.material.map=getTexture(id);body.material.color.set(body.material.map?0xffffff:profile.color);
    body.material.bumpMap=id==='moon'?getTexture('moonHeight'):null;
    body.material.bumpScale=id==='moon'?.085:0;
    body.material.roughness=1;body.material.needsUpdate=true;
    body.geometry.dispose();body.geometry=new THREE.SphereGeometry(17,128,80);
    if(profile.shape){
      const positions=body.geometry.attributes.position;
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
        const relief=1+.021*Math.sin(x*.39+y*.44)*Math.cos(z*.42)+.012*Math.sin(y*.8+z*.23);
        positions.setXYZ(i,x*profile.shape[0]*relief,y*profile.shape[1]*relief,z*profile.shape[2]*relief);
      }
      positions.needsUpdate=true;body.geometry.computeVertexNormals();
    }
    bodyPivot.rotation.set(.11,-.8,.035);
    titanHaze.visible=id==='titan';
    parentBody.material.map=getTexture(profile.parent);parentBody.material.needsUpdate=true;
    parentContext.scale.setScalar(profile.parentSize);
    parentContext.position.set(-43,19,-116);
    parentContext.rotation.set(.2,-.4,-.32);
    parentRings.visible=profile.parent==='saturn';
    return true;
  }
  function update(time,rotation=0,reducedMotion=false){
    bodyPivot.rotation.y=-.8+rotation+(reducedMotion?0:time*.012);
    earthClouds.rotation.y=time*.000011;
  }
  function setSunDirection(direction){
    earthAtmosphere.material.uniforms.sunDirection.value.copy(direction).normalize();
    titanHaze.material.uniforms.sunDirection.value.copy(direction).normalize();
  }
  function dispose(){
    const geometries=new Set(),materials=new Set();
    for(const root of [earth,preview])root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textureCache.forEach(t=>t.dispose());resources.forEach(t=>t.dispose());
  }
  setDestination('moon');
  return {earth,earthSurface,earthClouds,earthAtmosphere,preview,body,bodyPivot,parentContext,setDestination,update,setSunDirection,getTexture,dispose,
    getDestination:()=>destination,getProfile:()=>VISUAL_PROFILES[destination]};
}

/** A separate depth pass keeps metre-scale hardware independent of celestial
 * distances. Earth and Moon preserve their angular radius and actual bearing;
 * the small other planets are explicitly symbolic static context markers.
 */
export function createFlightSky(celestials){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,5,90000);
  scene.background=new THREE.Color(0x000000);
  const key=new THREE.DirectionalLight(0xfffaf4,4.6);scene.add(key);scene.add(new THREE.AmbientLight(0xb5c6d7,.075));
  const earth=celestials.earth.clone(true);scene.add(earth);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(1,128,80),new THREE.MeshStandardMaterial({map:celestials.getTexture('moon'),roughness:1,metalness:0,envMapIntensity:0}));scene.add(moon);
  const sun=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshBasicMaterial({color:0xfff6df,toneMapped:false}));scene.add(sun);
  const context=[
    {id:'mercury',name:'Mercury',p:[-5.2e10,2.8e10,1.5e10],color:0xaaa29a},
    {id:'venus',name:'Venus',p:[-8.5e10,-6.3e10,-2e10],color:0xd3c8a5},
    {id:'mars',name:'Mars',p:[1.7e11,1.3e11,2e10],color:0xb58465},
    {id:'jupiter',name:'Jupiter',p:[-5.8e11,3.9e11,-7e10],color:0xc3b493},
    {id:'saturn',name:'Saturn',p:[8.9e11,-8.5e11,1e11],color:0xc8bb91},
    {id:'uranus',name:'Uranus',p:[-1.5e12,-2.2e12,2e11],color:0x9db6b8},
    {id:'neptune',name:'Neptune',p:[3.7e12,2.1e12,-2e11],color:0x6989b8},
  ];
  context.forEach(body=>{
    body.object=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshStandardMaterial({map:celestials.getTexture(body.id),color:body.color,roughness:1,metalness:0,envMapIntensity:0}));scene.add(body.object);
  });
  const positions=[];let seed=3109;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<2100;i++){const a=rand()*Math.PI*2,z=rand()*2-1,r=Math.sqrt(1-z*z);positions.push(Math.cos(a)*r*60000,z*60000,Math.sin(a)*r*60000);}
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xc2d0dd,size:14,transparent:true,opacity:.65,depthWrite:false}));scene.add(stars);
  const projected=new THREE.Vector3(),D=20000;
  function update(view,mainCamera){
    const p=Array.isArray(view.positionSI)?view.positionSI:[6371000+Math.max(0,view.altitude||(view.mode==='docking'?400000:0)),0];
    const mp=Array.isArray(view.moonPositionSI)?view.moonPositionSI:[384400000,0];
    const surface=['landing','finale'].includes(view.mode);
    const vertical=surface?[p[0]-mp[0],p[1]-mp[1]]:p;
    const angle=Number.isFinite(view.localFrameAngle)?view.localFrameAngle:Math.atan2(vertical[1],vertical[0]);
    const co=Math.cos(angle),si=Math.sin(angle);
    const local=(v)=>new THREE.Vector3(-si*v[0]+co*v[1],co*v[0]+si*v[1],v[2]||0);
    camera.fov=mainCamera.fov;camera.aspect=mainCamera.aspect;camera.quaternion.copy(mainCamera.quaternion);camera.position.set(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    const put=(object,vector,radius,baseRadius=1)=>{
      const length=Math.hypot(...vector);object.position.copy(local(vector).normalize().multiplyScalar(D));
      object.scale.setScalar(D*Math.min(.9996,radius/Math.max(radius+1,length))/baseRadius);return length;
    };
    // The globe fills beyond the finite local terrain from liftoff onward.
    // Hiding it below 3.5 km exposed a blue gap as the pad left the camera.
    put(earth,[-p[0],-p[1],0],6371000,1900);earth.visible=true;
    // Put the named launch site's latitude/longitude under the initial local
    // vertical. A Y-axis-only spin previously put the camera over a pole,
    // making an ocean/coast view look like a featureless gray cap.
    const latitude=(Number.isFinite(Number(view.site?.latitude))?Number(view.site.latitude):28.6084)*Math.PI/180;
    const longitude=(Number.isFinite(Number(view.site?.longitude))?Number(view.site.longitude):-80.6043)*Math.PI/180;
    const geoUp=new THREE.Vector3(Math.cos(longitude)*Math.cos(latitude),Math.sin(latitude),-Math.sin(longitude)*Math.cos(latitude));
    const east=new THREE.Vector3(-Math.sin(longitude),0,-Math.cos(longitude));
    const south=new THREE.Vector3(Math.cos(longitude)*Math.sin(latitude),-Math.cos(latitude),-Math.sin(longitude)*Math.sin(latitude));
    const basis=new THREE.Matrix4().makeBasis(east,geoUp,south).invert();
    const spin=Number(view.effectiveRotation)||7.2921159e-5*Math.cos(latitude);
    earth.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1),angle-spin*(view.time||0)).multiply(new THREE.Quaternion().setFromRotationMatrix(basis));
    put(moon,[mp[0]-p[0],mp[1]-p[1],0],1737400);moon.visible=!surface;moon.rotation.set(.02,-.8,-angle);
    const sunlight=Array.isArray(view.sunDirectionSI)?[...view.sunDirectionSI,.35]:[.55,.75,.5];
    const sunDirection=local(sunlight).normalize();key.position.copy(sunDirection).multiplyScalar(50);
    celestials.setSunDirection(sunDirection);
    sun.position.copy(sunDirection).multiplyScalar(43000);sun.scale.setScalar(200);
    const atmospheric=['launch','rollout'].includes(view.mode)?1-THREE.MathUtils.smoothstep(view.altitude||0,7000,80000):0;
    scene.background.set(0x000000).lerp(new THREE.Color(0x87aabd),atmospheric);
    stars.material.opacity=atmospheric>.95?0:(1-atmospheric)*.65;
    const markers=[{id:'earth',name:'Earth',object:earth,approximate:false},{id:'moon',name:'Moon',object:moon,approximate:false},{id:'sun',name:'Sun',object:sun,approximate:true}];
    context.forEach(body=>{
      body.object.position.copy(local([body.p[0]-p[0],body.p[1]-p[1],body.p[2]]).normalize().multiplyScalar(45000));
      body.object.scale.setScalar(body.id==='jupiter'?40:body.id==='saturn'?32:20);
      markers.push({...body,approximate:true});
    });
    return markers.map(body=>{projected.copy(body.object.position).project(camera);return{id:body.id,name:body.name,x:(projected.x+1)/2,y:(1-projected.y)/2,visible:body.object.visible&&projected.z<1&&Math.abs(projected.x)<1&&Math.abs(projected.y)<1,approximate:body.approximate};});
  }
  function dispose(){moon.geometry.dispose();moon.material.dispose();sun.geometry.dispose();sun.material.dispose();starGeometry.dispose();stars.material.dispose();context.forEach(b=>{b.object.geometry.dispose();b.object.material.dispose();});}
  return {scene,camera,update,dispose};
}
