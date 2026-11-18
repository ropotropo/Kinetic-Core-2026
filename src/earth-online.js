import './earth-online.css';
import {createEarthFlight,stepEarthFlight,earthFlightTelemetry} from './earth-flight.js';
import {createEarthCraftLayer} from './earth-craft-layer.js';
import {indexBuildings,buildingHeightAt} from './earth-surface.js';
import {icon} from './ui-icons.js';
let library;
function loadMapLibrary(){
  if(window.maplibregl)return Promise.resolve(window.maplibregl);
  if(library)return library;
  const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.css';document.head.append(css);
  library=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://unpkg.com/maplibre-gl@5.6.1/dist/maplibre-gl.js';const timer=setTimeout(()=>reject(Error('Online map timed out. Check your connection and retry.')),25000);script.onload=()=>{clearTimeout(timer);resolve(window.maplibregl);};script.onerror=()=>{clearTimeout(timer);reject(Error('Map library unavailable. Check your internet connection.'));};document.head.append(script);}).catch(e=>{library=null;throw e;});return library;
}
const SITES={kennedy:[28.6084,-80.6043],kyiv:[50.4501,30.5234],newyork:[40.7812,-73.9665],london:[51.5074,-.1278],tokyo:[35.6762,139.6503]};
export function createOnlineEarth({onOpen,onClose}){
  const panel=document.createElement('section');panel.className='earth-online';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Earth free flight');panel.setAttribute('aria-modal','true');
  panel.innerHTML=`<header><div><small data-earth-phase>Exploration · local flight</small><h2>Online Earth</h2></div><button type="button" class="kc-tool" data-close aria-label="Back to game" title="Back to game">${icon('back')}</button></header>
  <div class="earth-toolbar" aria-label="Choose a flight location"><h3>Choose a location</h3><label>Start location<select data-site><option value="kennedy">Kennedy Space Center</option><option value="kyiv">Kyiv</option><option value="newyork">New York / Central Park</option><option value="london">London</option><option value="tokyo">Tokyo</option><option value="custom">Custom coordinates</option></select></label><div class="earth-coordinates"><label>Latitude<input data-lat type="number" min="-84.9" max="84.9" step=".00001" value="28.6084"></label><label>Longitude<input data-lng type="number" min="-180" max="180" step=".00001" value="-80.6043"></label></div><div class="earth-plan-actions"><button type="button" class="kc-action" data-go>Load location</button><button type="button" class="kc-action kc-action-primary" data-fly disabled>${icon('rocket')} Start local flight</button></div><p>Start 120 m above the selected surface. This is a separate local exercise.</p></div>
  <div class="earth-map"><div data-map aria-label="Online terrain and building map"></div><div class="earth-status"><span data-earth-status role="status">Loading real roads, buildings and terrain…</span><button type="button" class="kc-action earth-map-retry" data-map-retry hidden>Retry map</button></div><div class="earth-instruments" aria-label="Earth flight instruments"><div><small>Above surface</small><output data-agl>—</output></div><div><small>Vertical speed</small><output data-vz>—</output></div><div><small>Ground speed</small><output data-speed>—</output></div><div><small>Propellant</small><output data-fuel>—</output></div><div><small>Engine</small><output data-earth-engine>—</output></div></div><div class="earth-outcome" hidden><h3 data-result></h3><p data-detail></p><button type="button" class="kc-action kc-action-primary" data-retry>Retry this location</button></div>
  <div class="earth-touch" role="group" aria-label="Hold flight controls"><button type="button" data-control="KeyW" aria-label="Hold to fly forward">Forward</button><button type="button" data-control="KeyS" aria-label="Hold to fly backward">Back</button><button type="button" data-control="KeyA" aria-label="Hold to move left">Left</button><button type="button" data-control="KeyD" aria-label="Hold to move right">Right</button><button type="button" data-control="KeyR" aria-label="Hold to ascend">Up</button><button type="button" data-control="KeyF" aria-label="Hold to descend">Down</button><button type="button" data-control="KeyQ" aria-label="Hold to turn left">Turn left</button><button type="button" data-control="KeyE" aria-label="Hold to turn right">Turn right</button><button type="button" data-control="Space" aria-label="Hold powered brake">Brake</button><button type="button" data-fine aria-pressed="false">Fine thrust</button></div><nav class="earth-view-tools" aria-label="Earth flight tools"><button type="button" class="kc-tool" data-pause disabled aria-label="Pause flight" title="Pause flight">${icon('pause')}<span class="kc-tool-label" data-pause-label>Pause</span></button><button type="button" class="kc-tool" data-camera disabled aria-label="Reset flight camera" title="Reset flight camera">${icon('camera')}<span class="kc-tool-label">Camera</span></button><button type="button" class="kc-tool" data-assist disabled aria-pressed="true" aria-label="Hover assist on" title="Hover assist on">${icon('sliders')}<span class="kc-tool-label">Hover</span></button><button type="button" class="kc-tool" data-plan hidden aria-label="End flight and choose another location" title="End flight / choose location">${icon('map')}<span class="kc-tool-label">Location</span></button><button type="button" class="kc-tool" data-info aria-label="Flight controls and information" title="Flight information" aria-haspopup="dialog">${icon('info')}<span class="kc-tool-label">Info</span></button></nav></div>
  <footer>Map <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> / <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">Mapzen terrain credits</a></footer><dialog class="earth-info" aria-labelledby="earth-info-title"><header><h3 id="earth-info-title">Local flight</h3><button type="button" class="kc-tool" data-info-close aria-label="Close flight information">${icon('close')}</button></header><div><p>Flight pauses while this information is open. Close it, then select <strong>Resume</strong> when ready.</p><dl><dt>W / S</dt><dd>Forward / back</dd><dt>A / D</dt><dd>Move left / right</dd><dt>R / F</dt><dd>Ascend / descend</dd><dt>Q / E</dt><dd>Turn left / right</dd><dt>Space</dt><dd>Powered brake</dd><dt>Shift</dt><dd>Fine thrust</dd><dt>P</dt><dd>Pause / resume</dd></dl><p>Touch: hold the labelled flight buttons. Hover assist and braking use propellant. Land below 2 m/s vertically and sideways; hold Up or R to take off again.</p><details><summary>Map, model and live details</summary><p>Right-drag to inspect; scroll or pinch to zoom the map. Camera resets the flight view. A fictional VTOL rocket flies independently of the Moon mission.</p><p>Internet is required. Terrain and building coverage and heights vary. Building contact uses footprint roof prisms, not detailed wall meshes. Flight waits when required map data is missing.</p><p class="earth-readout"></p></details></div></dialog>`;
  document.body.append(panel);
  const $=s=>panel.querySelector(s),status=$('[data-earth-status]'),lat=$('[data-lat]'),lng=$('[data-lng]'),flyButton=$('[data-fly]');
  let map,lib,active=false,flight=null,paused=false,keys=new Set(),previous=0,animation,marker,bodyOverflow='',ready=false,buildings=[],cacheTime=-1,buildingsDirty=true,buildingsReady=false,accumulator=0,hudTime=0,pendingStart=false,fine=false,mapSettled=false,openGeneration=0,previousFocus,previousInert=false,mapError='';
  const info=$('.earth-info'),pointers=new Map(),buttonKeys=new Set();
  const controlled=['KeyW','KeyS','KeyA','KeyD','KeyR','KeyF','KeyQ','KeyE','Space','ShiftLeft','ShiftRight'];
  function clearKeys(){keys.clear();pointers.clear();buttonKeys.clear();panel.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('is-held'));}
  function setPaused(value){paused=value;clearKeys();accumulator=0;$('[data-pause]').innerHTML=`${icon(paused?'play':'pause')}<span class="kc-tool-label">${paused?'Resume':'Pause'}</span>`;$('[data-pause]').setAttribute('aria-label',paused?'Resume flight':'Pause flight');$('[data-pause]').title=paused?'Resume flight':'Pause flight';$('[data-earth-phase]').textContent=flight?paused?'Local flight · paused':'Local flight · active':'Exploration · local flight';}
  function close(){if(!active)return;active=false;openGeneration++;setPaused(true);if(info.open)info.close();cancelAnimationFrame(animation);panel.hidden=true;document.querySelector('.game-shell').inert=previousInert;document.body.style.overflow=bodyOverflow;onClose();if(previousFocus?.isConnected&&!previousFocus.closest('[hidden],[inert]'))previousFocus.focus({preventScroll:true});}
  $('[data-close]').onclick=close;
  function coordinates(){const a=Number(lat.value),b=Number(lng.value);if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>84.9||Math.abs(b)>180){status.textContent='Use latitude −84.9…84.9 and longitude −180…180.';return null;}return [a,b];}
  function refreshBuildings(time){
    if(!ready||(!buildingsDirty&&time-cacheTime<250)||!map.isSourceLoaded('openmaptiles'))return;
    cacheTime=time;try{buildings=indexBuildings(map.querySourceFeatures('openmaptiles',{sourceLayer:'building'}));buildingsDirty=false;buildingsReady=true;}catch{buildingsReady=false;}
  }
  function surfaceAt(a,b){
    if(!ready||buildingsDirty||!buildingsReady||(!flight&&!mapSettled)||!map.getBounds().contains([b,a])||!map.isSourceLoaded('earth-terrain')||!map.isSourceLoaded('openmaptiles'))return null;
    const ground=map.queryTerrainElevation([b,a]);if(!Number.isFinite(ground))return null;
    const dy=1.8/111320,dx=dy/Math.max(.08,Math.cos(a*Math.PI/180));
    const roof=Math.max(...[[0,0],[dy,0],[-dy,0],[0,dx],[0,-dx]].map(([y,x])=>buildingHeightAt(buildings,a+y,b+x)));
    return {height:ground+roof,kind:roof>0?'building':'ground',ready:true};
  }
  function configureFlightCamera(){if(!flight)return;map.setCenterClampedToGround(false);map.jumpTo({center:[flight.lng,flight.lat],elevation:flight.altitude+7.5,zoom:19.2,pitch:65,bearing:flight.heading*180/Math.PI});}
  function syncControls(){
    const exists=!!flight;$('[data-plan]').hidden=!exists&&!pendingStart;flyButton.hidden=exists;flyButton.disabled=!ready||pendingStart;
    panel.classList.toggle('is-flight',exists);panel.classList.toggle('is-pending',pendingStart);$('.earth-toolbar').hidden=exists;
    for(const sel of ['[data-site]','[data-lat]','[data-lng]','[data-go]'])$(sel).disabled=exists||pendingStart||!ready;
    for(const sel of ['[data-pause]','[data-camera]','[data-assist]'])$(sel).disabled=!exists;
    $('.earth-touch').hidden=!exists;$('.earth-instruments').hidden=!exists;
    $('[data-assist]').setAttribute('aria-label',flight?.assist===false?'Hover assist off':'Hover assist on');$('[data-assist]').title=flight?.assist===false?'Hover assist off':'Hover assist on';$('[data-assist]').setAttribute('aria-pressed',String(flight?.assist!==false));
  }
  function beginFlight(){
    const c=coordinates();if(!c||!ready)return;
    if(!map.getBounds().contains([c[1],c[0]])){mapSettled=false;map.jumpTo({center:[c[1],c[0]],zoom:17,pitch:65});cacheTime=-1;}
    refreshBuildings(performance.now()+300);const surface=surfaceAt(...c);
    if(!surface){pendingStart=true;syncControls();status.textContent='Waiting for terrain and building tiles at this location. Flight will start when data is ready.';return;}
    pendingStart=false;flight=createEarthFlight({lat:c[0],lng:c[1],surface:surface.height});setPaused(false);$('.earth-outcome').hidden=true;
    map.dragPan.disable();map.keyboard.disable();configureFlightCamera();syncControls();status.textContent='You control the rocket. Hover assist is holding height; use W/A/S/D and R/F. Space brakes using fuel.';
  }
  flyButton.onclick=beginFlight;$('[data-retry]').onclick=()=>{flight=null;beginFlight();};
  $('[data-pause]').onclick=()=>setPaused(!paused);$('[data-camera]').onclick=configureFlightCamera;
  $('[data-assist]').onclick=()=>{flight.assist=!flight.assist;clearKeys();syncControls();};
  $('[data-plan]').onclick=()=>{clearKeys();flight=null;pendingStart=false;setPaused(false);map?.dragPan.enable();map?.setCenterClampedToGround(true);$('.earth-outcome').hidden=true;syncControls();status.textContent='Choose a location, then start local flight.';$('[data-site]').focus();};
  $('[data-info]').onclick=()=>{if(flight||pendingStart)setPaused(true);info.showModal();$('[data-info-close]').focus();};$('[data-info-close]').onclick=()=>info.close();info.addEventListener('close',()=>{if(active)$('[data-info]').focus({preventScroll:true});});
  function loadLocation(){const c=coordinates();if(!c||!ready||flight)return;pendingStart=false;mapSettled=false;syncControls();map.flyTo({center:[c[1],c[0]],zoom:17,pitch:65,bearing:0,duration:1000});status.textContent='Location selected. Start rocket flight to deploy 120 m above the local surface.';}
  $('[data-go]').onclick=loadLocation;$('[data-site]').onchange=e=>{const p=SITES[e.target.value];if(p){lat.value=p[0];lng.value=p[1];loadLocation();}};
  for(const field of [lat,lng])field.addEventListener('input',()=>{$('[data-site]').value='custom';});
  $('[data-fine]').onclick=()=>{fine=!fine;$('[data-fine]').setAttribute('aria-pressed',String(fine));};
  panel.querySelectorAll('[data-control]').forEach(button=>{const code=button.dataset.control;button.addEventListener('pointerdown',e=>{if(!flight||paused||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();button.setPointerCapture(e.pointerId);pointers.set(e.pointerId,code);button.classList.add('is-held');});const release=e=>{pointers.delete(e.pointerId);if(![...pointers.values()].includes(code)&&!buttonKeys.has(code))button.classList.remove('is-held');};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);button.addEventListener('keydown',e=>{if(!['Enter','Space'].includes(e.code))return;e.preventDefault();e.stopPropagation();if(flight&&!paused){buttonKeys.add(code);button.classList.add('is-held');}});button.addEventListener('keyup',e=>{if(!['Enter','Space'].includes(e.code))return;e.preventDefault();e.stopPropagation();buttonKeys.delete(code);if(![...pointers.values()].includes(code))button.classList.remove('is-held');});button.addEventListener('blur',()=>{buttonKeys.delete(code);if(![...pointers.values()].includes(code))button.classList.remove('is-held');});});
  window.addEventListener('keydown',e=>{
    if(!active)return;const focusedDialog=e.target.closest?.('dialog');if(focusedDialog&&focusedDialog!==info)return;if(e.code==='Escape'){e.stopImmediatePropagation();e.preventDefault();if(info.open)info.close();else close();return;}
    if(info.open)return;
    if(e.key==='Tab'){const items=[...panel.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),a[href]')].filter(el=>el.getClientRects().length&&!el.closest('dialog:not([open])'));const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
    if(document.activeElement?.closest('input,select,textarea,summary,a,[contenteditable="true"]')||(document.activeElement?.closest('button')&&['Space','Enter'].includes(e.code)))return;
    if(e.code==='KeyP'&&flight){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)setPaused(!paused);return;}
    if(e.code==='KeyB'&&flight){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)$('[data-assist]').click();return;}
    if(controlled.includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(!paused)keys.add(e.code);}
  },true);
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{if(active)setPaused(true);});document.addEventListener('visibilitychange',()=>{if(active&&document.hidden)setPaused(true);});
  const held=code=>keys.has(code)||buttonKeys.has(code)||[...pointers.values()].includes(code);
  function input(){const scale=(fine||held('ShiftLeft')||held('ShiftRight'))?0.12:1;return {forward:(Number(held('KeyW'))-Number(held('KeyS')))*scale,right:(Number(held('KeyD'))-Number(held('KeyA')))*scale,vertical:(Number(held('KeyR'))-Number(held('KeyF')))*scale,yaw:Number(held('KeyE'))-Number(held('KeyQ')),brake:held('Space'),assist:flight.assist};}
  function updateHUD(){
    if(!flight){$('.earth-readout').textContent='Select a real location → Start rocket flight → Fly, land and take off again.';return;}
    const t=earthFlightTelemetry(flight),surface=surfaceAt(flight.lat,flight.lng);
    $('[data-agl]').textContent=`${Math.max(0,flight.altitude-(surface?.height??flight.surfaceHeight??0)).toFixed(1)} m`;
    $('[data-vz]').textContent=`${flight.velocity[2].toFixed(2)} m/s`;$('[data-speed]').textContent=`${Math.hypot(...flight.velocity.slice(0,2)).toFixed(1)} m/s`;$('[data-fuel]').textContent=`${flight.fuel.toFixed(0)} kg`;$('[data-earth-engine]').textContent=`${Math.round((paused||flight.dataPending||flight.phase!=='flying'?0:flight.thrustFraction||0)*100)}%`;
    $('.earth-readout').textContent=`${flight.lat.toFixed(5)}°, ${flight.lng.toFixed(5)}° · ${Math.round((flight.heading*180/Math.PI+360)%360)}° · ${paused?'PAUSED':flight.dataPending?'WAITING FOR MAP DATA':flight.phase.toUpperCase()} · ${surface?.kind==='building'?'ROOF PRISM':'TERRAIN'} · ${t.status??''}`;
    if(mapError){status.textContent=`Map data unavailable: ${mapError}. Flight paused; retry when connected.`;return;}
    if(flight.phase==='crashed'){status.textContent='Impact confirmed.';$('.earth-outcome').hidden=false;$('[data-result]').textContent='Impact — flight ended';$('[data-detail]').textContent='Safe contact needs vertical and sideways speed below 2 m/s.';}
    else if(flight.phase==='landed'){status.textContent='Touchdown confirmed at your actual coordinates. Hold R to lift off again; fuel is preserved.';$('.earth-outcome').hidden=true;}
    else if(flight.dataPending)status.textContent='Flight held while local terrain/building data loads. Position and propellant are preserved.';
    else if(paused)status.textContent='Flight paused. Resume to continue from this exact position.';
    else status.textContent=flight.fuel<=0?'Propellant depleted. Rocket is falling under gravity.':'Control your descent. Brake to cancel drift; hover assist uses fuel.';
  }
  function frame(time){
    if(!active||!map)return;const dt=Math.min(.1,Math.max(0,(time-previous)/1000||0));previous=time;refreshBuildings(time);
    if(pendingStart&&!flight&&!info.open&&surfaceAt(Number(lat.value),Number(lng.value)))beginFlight();
    if(flight&&!paused){accumulator+=dt;while(accumulator>=1/60){stepEarthFlight(flight,input(),1/60,surfaceAt);accumulator-=1/60;}map.jumpTo({center:[flight.lng,flight.lat],elevation:flight.altitude+7.5});map.triggerRepaint();}
    if(time-hudTime>100){hudTime=time;updateHUD();}animation=requestAnimationFrame(frame);
  }
  syncControls();
  async function initializeMap(generation){
    $('[data-map]').setAttribute('aria-busy','true');$('[data-map-retry]').hidden=true;status.textContent='Loading terrain and buildings…';
    try{
      lib=await loadMapLibrary();if(!active||generation!==openGeneration)return;
      if(!map){
        map=new lib.Map({container:$('[data-map]'),style:'https://tiles.openfreemap.org/styles/liberty',center:flight?[flight.lng,flight.lat]:[Number(lng.value),Number(lat.value)],zoom:17,pitch:65,maxPitch:80,attributionControl:true,canvasContextAttributes:{antialias:true}});const activeMap=map;map.addControl(new lib.NavigationControl(),'top-right');map.keyboard.disable();
        map.on('style.load',()=>{if(activeMap!==map)return;map.setProjection({type:'mercator'});map.addSource('earth-terrain',{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,encoding:'terrarium',maxzoom:15,attribution:'Terrain © <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Mapzen / source providers</a>'});map.setTerrain({source:'earth-terrain',exaggeration:1});map.addLayer(createEarthCraftLayer(lib,()=>active&&flight?{...flight,thrustFraction:paused||flight.dataPending?0:flight.thrustFraction}:null));ready=true;syncControls();status.textContent=flight?'Map restored. Resume when ready.':'Choose a location, then start local flight.';if(flight){map.dragPan.disable();configureFlightCamera();}});
        map.on('sourcedata',e=>{if(activeMap!==map)return;if(e.sourceId==='openmaptiles'&&['content','metadata'].includes(e.sourceDataType)){buildingsDirty=true;buildingsReady=false;}});
        map.on('idle',()=>{if(activeMap!==map)return;mapSettled=true;if(map.isSourceLoaded('earth-terrain')&&map.isSourceLoaded('openmaptiles')){mapError='';$('[data-map-retry]').hidden=true;$('[data-map]').setAttribute('aria-busy','false');}});map.on('movestart',()=>{if(activeMap===map&&!flight)mapSettled=false;});
        map.on('error',e=>{if(activeMap!==map)return;mapError=String(e.error?.message??'check internet connection').slice(0,100);status.textContent=`Map data unavailable: ${mapError}. Retry when connected.`;$('[data-map-retry]').hidden=false;if(flight)setPaused(true);});
        map.on('click',e=>{if(activeMap!==map||flight)return;lat.value=e.lngLat.lat.toFixed(5);lng.value=e.lngLat.lng.toFixed(5);$('[data-site]').value='custom';marker?.remove();marker=new lib.Marker().setLngLat(e.lngLat).addTo(map);status.textContent='Location selected. Load location, then start local flight.';});
      }else{map.resize();setPaused(!!flight);$('[data-map]').setAttribute('aria-busy',String(!ready));status.textContent=mapError?`Map data unavailable: ${mapError}. Retry when connected.`:flight?'Flight paused. Resume when ready.':'Choose a location, then start local flight.';$('[data-map-retry]').hidden=!mapError;}
      previous=performance.now();accumulator=0;cancelAnimationFrame(animation);frame(previous);
    }catch(e){if(!active||generation!==openGeneration)return;mapError=e.message;status.textContent=`${e.message} Select Retry map when connected.`;$('[data-map-retry]').hidden=false;$('[data-map]').setAttribute('aria-busy','false');}
  }
  $('[data-map-retry]').onclick=()=>{setPaused(true);ready=false;mapSettled=false;buildingsDirty=true;buildingsReady=false;cacheTime=-1;mapError='';marker?.remove();marker=null;const oldMap=map;map=null;oldMap?.remove();cancelAnimationFrame(animation);syncControls();initializeMap(++openGeneration);};
  return {close,pause(value=true){setPaused(value);},async open(){if(active)return;const generation=++openGeneration;previousFocus=document.activeElement;previousInert=document.querySelector('.game-shell').inert;onOpen();active=true;panel.hidden=false;bodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';document.querySelector('.game-shell').inert=true;$('[data-close]').focus();await initializeMap(generation);}};
}
