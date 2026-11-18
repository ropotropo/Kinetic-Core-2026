import * as THREE from 'three';
import { BODY_TEXTURE_PATHS } from './celestial.js';

// A decorative illustration, not a lunar ephemeris. One sphere, no post FX,
// shadows or interaction; the flight renderer and physical state stay separate.
export function createMoonRenderLoop({render,requestFrame=callback=>requestAnimationFrame(callback),cancelFrame=id=>cancelAnimationFrame(id)}={}){
  let active=false,reduced=false,disposed=false,frame=null,lastTime=null,dirty=true;
  const schedule=()=>{if(active&&!disposed&&frame===null)frame=requestFrame(tick);};
  function stop(){if(frame!==null)cancelFrame(frame);frame=null;lastTime=null;}
  function tick(time){
    frame=null;if(!active||disposed)return;
    if(dirty||lastTime===null||time-lastTime>=1000/24){
      const dt=lastTime===null?0:Math.min(.1,Math.max(0,(time-lastTime)/1000));lastTime=time;dirty=false;
      if(render(reduced?0:dt)===false){active=false;stop();return;}
    }
    if(!reduced)schedule();
  }
  return{
    setActive(next,{reducedMotion=false}={}){
      if(disposed)return;
      const changed=active!==!!next||reduced!==!!reducedMotion;
      active=!!next;reduced=!!reducedMotion;
      if(!active){stop();return;}
      if(changed){lastTime=null;dirty=true;schedule();}
    },
    invalidate(){if(disposed)return;dirty=true;schedule();},
    dispose(){disposed=true;active=false;stop();}
  };
}

export function createHomeMoon(host){
  const canvas=host?.querySelector('canvas');if(!canvas)return{setOpen(){},dispose(){}};
  const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const textures=new Set();
  let renderer=null,scene=null,camera=null,moon=null,geometry=null,material=null;
  let open=false,disposed=false,failed=false,mapReady=false,contextLost=false,width=0,height=0,ratio=0;
  function fallback(){delete host.dataset.ready;}
  function release(){
    geometry?.dispose();material?.dispose();textures.forEach(texture=>texture.dispose());textures.clear();
    renderer?.dispose();renderer?.forceContextLoss();renderer=null;
  }
  function fail(){failed=true;fallback();loop.setActive(false);release();}
  function resize(){
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight),dpr=Math.min(window.devicePixelRatio||1,1.25);
    if(w===width&&h===height&&dpr===ratio)return;
    width=w;height=h;ratio=dpr;renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  const loop=createMoonRenderLoop({render(dt){
    if(!open||document.hidden||!renderer||!mapReady||contextLost||disposed||failed)return false;
    try{
      resize();moon.rotation.y+=dt*.003;renderer.render(scene,camera);
      // Reveal only after the local color map and the first completed draw.
      host.dataset.ready='true';return true;
    }catch{fail();return false;}
  }});
  function sync(){loop.setActive(open&&!document.hidden&&mapReady&&!contextLost&&!failed&&!disposed,{reducedMotion:motion?.matches??false});}
  function initialize(){
    if(renderer||failed||disposed)return;
    try{
      renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power',depth:true,stencil:false});
      renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setClearColor(0x000000,0);
      scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(32,1,.1,20);camera.position.set(0,.12,4.2);camera.lookAt(0,.12,0);
      geometry=new THREE.SphereGeometry(1,64,32);material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,bumpScale:.007});
      moon=new THREE.Mesh(geometry,material);moon.rotation.set(.11,-Math.PI/2,.035);scene.add(moon);
      const sunlight=new THREE.DirectionalLight(0xfff5e9,3.2);sunlight.position.set(-4,2.5,4.5);scene.add(sunlight,new THREE.AmbientLight(0xbac6d0,.045));
      const loader=new THREE.TextureLoader(),anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),2);
      const color=loader.load(new URL(BODY_TEXTURE_PATHS.moon,document.baseURI).href,texture=>{
        if(disposed||failed){texture.dispose();return;}material.map=texture;material.needsUpdate=true;mapReady=true;sync();loop.invalidate();
      },undefined,()=>{if(!disposed)fail();});
      color.colorSpace=THREE.SRGBColorSpace;color.anisotropy=anisotropy;textures.add(color);
      const relief=loader.load(new URL(BODY_TEXTURE_PATHS.moonHeight,document.baseURI).href,texture=>{
        if(disposed||failed){texture.dispose();return;}material.bumpMap=texture;material.needsUpdate=true;loop.invalidate();
      });
      relief.colorSpace=THREE.NoColorSpace;relief.anisotropy=anisotropy;textures.add(relief);
    }catch{fail();}
  }
  function invalidate(){if(open&&!document.hidden)loop.invalidate();}
  function onLost(event){event.preventDefault();contextLost=true;fallback();sync();}
  function onRestored(){if(disposed||failed)return;contextLost=false;sync();loop.invalidate();}
  function onMotion(){sync();loop.invalidate();}
  canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
  document.addEventListener('visibilitychange',sync);window.addEventListener('resize',invalidate);motion?.addEventListener?.('change',onMotion);
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(invalidate):null;observer?.observe(host);
  return{
    setOpen(next){if(disposed)return;open=!!next;if(open)initialize();sync();},
    dispose(){
      if(disposed)return;disposed=true;open=false;loop.dispose();observer?.disconnect();
      canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);
      document.removeEventListener('visibilitychange',sync);window.removeEventListener('resize',invalidate);motion?.removeEventListener?.('change',onMotion);
      fallback();release();
    }
  };
}
