import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BODY_TEXTURE_PATHS } from './celestial.js';
import { SATELLITES, SYSTEMS } from './satellite-catalog.js';
import { DESTINATIONS } from './destinations.js';
import { icon } from './ui-icons.js';
import { installDestinationCarousel } from './destination-carousel.js';
import { atlasBodyMetadata, atlasLandingDestination } from './atlas-bodies.js';

// An explorable schematic atlas, not physical spacecraft coordinates or ephemerides.
export function createSolarView({ onLanding, onOpen, onClose }) {
  const panel=document.createElement('section');panel.className='solar-explorer';panel.hidden=true;
  panel.setAttribute('aria-label','Three-dimensional Solar System explorer');
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
  panel.innerHTML=`<header><div><small>Exploration · schematic atlas</small><h2>Solar System</h2></div><button type="button" class="kc-tool" data-exit aria-label="Back to game" title="Back to game">${icon('back')}</button></header><div class="solar-controls"><label>System<select data-system><option value="all">Whole Solar System</option>${SYSTEMS.map(s=>`<option>${s}</option>`).join('')}</select></label><label>Body<select data-body></select></label><button type="button" class="kc-action kc-action-primary" data-land disabled>${icon('land')}<span>Landing practice</span></button></div><div class="solar-space"><canvas aria-label="3D planets and satellites. Drag to orbit; use the zoom buttons or pinch to zoom."></canvas><div class="solar-caption"><strong data-target>Sun</strong><span data-info>Choose a system, then a body.</span><small data-availability>Survey only</small></div><nav class="solar-view-tools" aria-label="Atlas view tools"><button type="button" class="kc-tool" data-focus aria-label="Focus selected body" title="Focus selected body">${icon('camera')}<span class="kc-tool-label">Focus</span></button><button type="button" class="kc-tool" data-zoom-in aria-label="Zoom in" title="Zoom in">${icon('plus')}<span class="kc-tool-label">Zoom in</span></button><button type="button" class="kc-tool" data-zoom-out aria-label="Zoom out" title="Zoom out">${icon('minus')}<span class="kc-tool-label">Zoom out</span></button><button type="button" class="kc-tool" data-about aria-label="Atlas information and controls" title="Atlas information" aria-haspopup="dialog">${icon('info')}<span class="kc-tool-label">Info</span></button></nav></div><dialog class="solar-info" aria-labelledby="solar-info-title"><header><h3 id="solar-info-title">About this atlas</h3><button type="button" class="kc-tool" data-info-close aria-label="Close atlas information">${icon('close')}</button></header><div><p>Explore a system, choose a body, then use <strong>Focus</strong> or the zoom buttons. Drag to orbit; pinch to zoom on touch screens. A mouse also supports right-drag to pan and double-click to focus a body.</p><p><strong>Landing practice</strong> starts a separate local descent with the standard training lander. It skips launch and transfer. Survey-only bodies have no verified landing exercise.</p><details><summary>Scale, source data and limitations</summary><p>Distances, body sizes and satellite spacing are compressed for visibility. Positions are schematic, not current ephemerides. Camera travel never moves your spacecraft.</p><p>The satellite catalog is the JPL snapshot retrieved on 15 November 2026. Credited NASA/JPL image maps are used where available; unmapped moons use neutral procedural surfaces. These globes do not certify local landing terrain.</p></details></div></dialog>`;
  document.body.append(panel);
  const canvas=panel.querySelector('canvas'),systemSelect=panel.querySelector('[data-system]'),bodySelect=panel.querySelector('[data-body]');
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);
  const camera=new THREE.PerspectiveCamera(48,1,.05,20000);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=2200;
  const lighting=new THREE.DirectionalLight(0xfff3dc,3);lighting.position.set(90,100,120);scene.add(lighting,new THREE.AmbientLight(0x8099ba,.9));
  const root=new THREE.Group();scene.add(root);let labels=[],objects=[],selected=null,active=false,animation=null,lastWidth=0,lastHeight=0,previousFocus,previousInert=false,previousOverflow='';
  const info=panel.querySelector('.solar-info');
  const textureCache=new Map(),loader=new THREE.TextureLoader();
  const colors={Sun:0xffbf51,Mercury:0x91897d,Venus:0xd9b176,Earth:0x5b93cd,Mars:0xb06a48,Jupiter:0xd6b590,Saturn:0xd3c39f,Uranus:0x9edbdc,Neptune:0x477dc7,Pluto:0xb8a797};
  let bodyCarousel = null;
  const overviewMoons=new Set(['Moon','Phobos','Deimos','Io','Europa','Ganymede','Callisto','Titan','Enceladus','Rhea','Iapetus','Titania','Oberon','Umbriel','Ariel','Triton','Proteus','Nereid','Larissa','Charon','Nix','Hydra','Kerberos']);
  function texture(name){const key=name.toLowerCase();if(!BODY_TEXTURE_PATHS[key])return null;if(!textureCache.has(key))textureCache.set(key,loader.load(new URL(BODY_TEXTURE_PATHS[key],document.baseURI).href,t=>{t.colorSpace=THREE.SRGBColorSpace;}));return textureCache.get(key);}
  function label(name,pos,body){const c=document.createElement('canvas');c.width=384;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#f5f5f7';ctx.font='26px system-ui';ctx.textAlign='center';ctx.fillText(name,192,42);const t=new THREE.CanvasTexture(c),m=new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false});const s=new THREE.Sprite(m);s.position.copy(pos);s.scale.set(23,4,1);s.userData={body,textWidth:ctx.measureText(name).width};root.add(s);labels.push(s);}
  function sphere(name,radius,pos,extra={}){const map=texture(name);const o=new THREE.Mesh(new THREE.SphereGeometry(radius,36,24),new THREE.MeshStandardMaterial({map,color:map?0xffffff:colors[name]??0x9b9690,roughness:.9,emissive:name==='Sun'?0xff8a10:0,emissiveIntensity:name==='Sun'?1:0}));o.position.copy(pos);o.userData={name,radius,...extra};root.add(o);objects.push(o);label(name,pos.clone().add(new THREE.Vector3(0,radius+3,0)),o);if(name==='Saturn'){const ring=new THREE.Mesh(new THREE.RingGeometry(radius*1.4,radius*2.2,96),new THREE.MeshStandardMaterial({color:0xc2b18b,side:THREE.DoubleSide,transparent:true,opacity:.75}));ring.rotation.x=-Math.PI*.4;ring.position.copy(pos);root.add(ring);}return o;}
  function orbit(radius,center=new THREE.Vector3()){const points=[];for(let i=0;i<=128;i++){let a=i/128*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius).add(center));}const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x283746,transparent:true,opacity:.7}));root.add(line);}
  function clear(){root.traverse(o=>{o.geometry?.dispose();if(o.material){if(o.isSprite)o.material.map?.dispose();o.material.dispose();}});root.clear();objects=[];labels=[];}
  const stars=new Float32Array(5400);let seed=42;for(let i=0;i<stars.length;i++){seed=(seed*1664525+1013904223)>>>0;stars[i]=(seed/4294967296-.5)*6000;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(stars,3));scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xa2b5ca,size:1.5})));
  function populate(){clear();const system=systemSelect.value;
    if(system==='all'){sphere('Sun',15,new THREE.Vector3());SYSTEMS.forEach((name,i)=>{const r=38+i*26,a=.38+i*1.65;orbit(r);sphere(name,name==='Jupiter'?10:name==='Saturn'?8:4+Math.min(i,3),new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r),{system:name});});camera.position.set(0,300,380);controls.target.set(0,0,0);}
    else{sphere(system,14,new THREE.Vector3(),{system});const moons=SATELLITES.filter(m=>m.parent===system);moons.forEach((m,i)=>{const band=Math.floor(i/24),r=36+band*16,a=(i%24)/24*Math.PI*2+band*.2;const pos=new THREE.Vector3(Math.cos(a)*r,(i%5-2)*2,Math.sin(a)*r);sphere(m.name,DESTINATIONS.some(d=>d.name===m.name)?2.5:1.2,pos,{system,moon:true});});for(let i=0;i<Math.ceil(moons.length/24);i++)orbit(36+i*16);const far=75+Math.ceil(moons.length/24)*22;camera.position.set(far*.5,far*.8,far);controls.target.set(0,0,0);}
    bodySelect.replaceChildren(...objects.map((o,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=o.userData.name;return opt;}));selectObject(objects[0]);bodyCarousel?.render(true);controls.update();}
  function selectObject(o){selected=o;bodySelect.value=objects.indexOf(o);panel.querySelector('[data-target]').textContent=o.userData.name;const d=atlasLandingDestination(o.userData);panel.querySelector('[data-land]').disabled=!d;panel.querySelector('[data-land]').title=d?`Start a separate local landing exercise on ${d.name}`:'No verified landing exercise for this body';panel.querySelector('[data-availability]').textContent=d?'Local landing available · transfer skipped':'Survey only';panel.querySelector('[data-availability]').classList.toggle('is-playable',!!d);bodyCarousel?.sync(true);panel.querySelector('[data-land]').setAttribute('aria-label',d?`Start landing practice on ${d.name}`:'Landing practice unavailable for this survey body');panel.querySelector('[data-info]').textContent=d?`${d.parent} system · gravity ${d.gravity.toFixed(4)} m/s²`:o.userData.moon?`${o.userData.system} system · illustrative surface`:o.userData.name==='Sun'?'Eight planets and Pluto':`${SATELLITES.filter(m=>m.parent===o.userData.name).length} catalog satellites`;}
  function focus(){if(!selected)return;const p=selected.position,r=selected.userData.radius;controls.target.copy(p);camera.position.copy(p).add(new THREE.Vector3(r*3,r*2,r*4));controls.update();}
  systemSelect.onchange=populate;bodySelect.onchange=()=>{const body=objects[Number(bodySelect.value)];if(body){selectObject(body);focus();}};panel.querySelector('[data-focus]').onclick=focus;
  function zoom(factor){const offset=camera.position.clone().sub(controls.target),distance=offset.length();if(!distance)return;const next=THREE.MathUtils.clamp(distance*factor,controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset.multiplyScalar(next/distance));controls.update();}
  panel.querySelector('[data-zoom-in]').onclick=()=>zoom(.75);panel.querySelector('[data-zoom-out]').onclick=()=>zoom(1.3333333333);
  panel.querySelector('[data-about]').onclick=()=>{info.showModal();panel.querySelector('[data-info-close]').focus();};panel.querySelector('[data-info-close]').onclick=()=>info.close();
  info.addEventListener('close',()=>{if(active)panel.querySelector('[data-about]').focus({preventScroll:true});});
  panel.querySelector('[data-land]').onclick=()=>{const d=atlasLandingDestination(selected?.userData);if(d){close();onLanding(d.id);}};
  const ray=new THREE.Raycaster();canvas.ondblclick=e=>{const b=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);const hit=ray.intersectObjects(objects)[0];if(hit){selectObject(hit.object);focus();}};
  bodyCarousel = installDestinationCarousel({ select: bodySelect, dialog: panel, heading: 'Choose a body', ariaLabel: 'Solar System bodies',
    bodies: () => objects.map((object, index) => atlasBodyMetadata(object.userData, index, '#' + (colors[object.userData.name] ?? 0x9b9690).toString(16).padStart(6, '0'))),
    actionLabel: body => `Inspect ${body.name}. ${body.landingId ? 'Landing practice available' : 'Survey only'}`, isOpen: () => active });
  bodyCarousel.element.classList.add('solar-body-carousel');
  panel.querySelector('.solar-controls').after(bodyCarousel.element);
  function updateLabels(w,h){
    labels.forEach(sprite=>{sprite.visible=false;});
    // The fixed DOM caption names the body during close inspection.
    if(!selected||camera.position.distanceTo(selected.position)<selected.userData.radius*12)return;
    camera.updateMatrixWorld();
    const narrow=w<600,budget=narrow?8:12,textHeight=narrow?12:13,placed=[];
    const candidates=labels.filter(sprite=>!sprite.userData.body.userData.moon||overviewMoons.has(sprite.userData.body.userData.name)||sprite.userData.body===selected);
    candidates.sort((a,b)=>Number(b.userData.body===selected)-Number(a.userData.body===selected)||Number(!!a.userData.body.userData.moon)-Number(!!b.userData.body.userData.moon));
    for(const sprite of candidates){
      if(placed.length>=budget)break;
      const p=sprite.position.clone().project(camera);if(p.z< -1||p.z>1||Math.abs(p.x)>.96||Math.abs(p.y)>.94)continue;
      const x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h,halfWidth=sprite.userData.textWidth/26*textHeight/2+8;
      const box={left:x-halfWidth,right:x+halfWidth,top:y-textHeight/2-5,bottom:y+textHeight/2+5};
      if(box.left<12||box.right>w-12||box.top<105&&box.left<Math.min(w-12,390)||box.bottom>h-110&&box.right>w-260)continue;
      if(placed.some(other=>box.left<other.right&&box.right>other.left&&box.top<other.bottom&&box.bottom>other.top))continue;
      const viewHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.distanceTo(sprite.position),height=textHeight*64/26/Math.max(h,1)*viewHeight;
      sprite.scale.set(height*6,height,1);sprite.visible=true;placed.push(box);
    }
  }
  function frame(){if(!active)return;const w=canvas.clientWidth,h=canvas.clientHeight;if(w!==lastWidth||h!==lastHeight){lastWidth=w;lastHeight=h;renderer.setSize(w,h,false);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();}controls.update();updateLabels(w,h);renderer.render(scene,camera);animation=requestAnimationFrame(frame);}
  function close(){if(!active)return;active=false;if(info.open)info.close();panel.hidden=true;document.querySelector('.game-shell').inert=previousInert;document.documentElement.style.overflow=previousOverflow;cancelAnimationFrame(animation);onClose();if(previousFocus?.isConnected&&!previousFocus.closest('[hidden],[inert]'))previousFocus.focus({preventScroll:true});}
  panel.querySelector('[data-exit]').onclick=close;
  window.addEventListener('keydown',e=>{if(!active)return;const focusedDialog=e.target.closest?.('dialog');if(focusedDialog&&focusedDialog!==info)return;if(e.code==='Escape'){e.stopImmediatePropagation();e.preventDefault();if(info.open)info.close();else close();return;}if(info.open)return;if(e.key==='Tab'){const items=[...panel.querySelectorAll('button:not(:disabled),select,input,[tabindex="0"]')].filter(el=>el.getClientRects().length&&!el.closest('dialog:not([open])'));const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}},true);
  return {open(){if(active)return;previousFocus=document.activeElement;previousInert=document.querySelector('.game-shell').inert;previousOverflow=document.documentElement.style.overflow;onOpen();active=true;panel.hidden=false;document.querySelector('.game-shell').inert=true;document.documentElement.style.overflow='hidden';populate();panel.querySelector('[data-exit]').focus();frame();},close};
}
