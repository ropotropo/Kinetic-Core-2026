import './earth-online.css';
import {createEarthFlight,stepEarthFlight,earthFlightTelemetry} from './earth-flight.js';
import {createEarthCraftLayer} from './earth-craft-layer.js';
import {indexBuildings,buildingHeightAt} from './earth-surface.js';
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
  panel.innerHTML=`<header><div><small>KINETIC CORE / EARTH FLIGHT</small><h2>Fly your landing site.</h2></div><button class="secondary-button" data-close>Back to game</button></header>
  <div class="earth-toolbar"><label>Start location<select data-site><option value="kennedy">Kennedy Space Center</option><option value="kyiv">Kyiv</option><option value="newyork">New York / Central Park</option><option value="london">London</option><option value="tokyo">Tokyo</option><option value="custom">Custom coordinates</option></select></label><label>Latitude<input data-lat type="number" min="-84.9" max="84.9" step=".00001" value="28.6084"></label><label>Longitude<input data-lng type="number" min="-180" max="180" step=".00001" value="-80.6043"></label><button class="secondary-button" data-go>Load location</button><button class="primary-button" data-fly disabled>Start rocket flight</button><button class="secondary-button" data-plan hidden>End flight / choose site</button><button class="secondary-button" data-pause disabled>Pause flight</button><button class="secondary-button" data-camera disabled>Reset flight camera</button><button class="secondary-button" data-assist disabled aria-pressed="true">Hover assist on</button></div>
  <div class="earth-map"><div data-map></div><div class="earth-status" role="status">Loading real roads, buildings and terrain…</div><div class="earth-instruments" aria-label="Earth flight instruments"><div><small>Height above surface</small><output data-agl>—</output></div><div><small>Vertical speed</small><output data-vz>—</output></div><div><small>Ground speed</small><output data-speed>—</output></div><div><small>Propellant</small><output data-fuel>—</output></div><div><small>Engine</small><output data-earth-engine>—</output></div></div><div class="earth-readout"></div><div class="earth-outcome" hidden><h3 data-result></h3><p data-detail></p><button class="primary-button" data-retry>New flight at selected site</button></div>
  <div class="earth-touch" aria-label="Hold flight controls"><button data-control="KeyW">Forward W</button><button data-control="KeyS">Back S</button><button data-control="KeyA">Left A</button><button data-control="KeyD">Right D</button><button data-control="KeyR">Up R</button><button data-control="KeyF">Down F</button><button data-control="KeyQ">Turn left</button><button data-control="KeyE">Turn right</button><button data-control="Space">Brake</button><button data-fine aria-pressed="false">Fine thrust</button></div></div>
  <footer><strong>W/S forward/back · A/D strafe · R/F ascend/descend · Q/E turn · Space powered brake · Shift fine thrust · P pause · right-drag 360° view · scroll zoom.</strong><br>Land below 2 m/s vertically and sideways. Hold R to take off again. Hover assist uses fuel. Fictional VTOL training rocket; independent local flight, not an orbital transfer. OpenStreetMap/OpenFreeMap buildings and Mapzen terrain: coverage and heights vary. Building contact uses footprint roof prisms, not detailed wall meshes. Internet required. <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">Terrain data credits</a></footer>`;
  document.body.append(panel);
  const $=s=>panel.querySelector(s),status=$('.earth-status'),lat=$('[data-lat]'),lng=$('[data-lng]'),flyButton=$('[data-fly]');
  let map,lib,active=false,flight=null,paused=false,keys=new Set(),previous=0,animation,marker,bodyOverflow='',ready=false,buildings=[],cacheTime=-1,buildingsDirty=true,buildingsReady=false,accumulator=0,hudTime=0,pendingStart=false,fine=false,mapSettled=false,openGeneration=0;
  const controlled=['KeyW','KeyS','KeyA','KeyD','KeyR','KeyF','KeyQ','KeyE','Space','ShiftLeft','ShiftRight'];
  function clearKeys(){keys.clear();panel.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('is-held'));}
  function setPaused(value){paused=value;clearKeys();accumulator=0;$('[data-pause]').textContent=paused?'Resume flight':'Pause flight';}
  function close(){active=false;openGeneration++;setPaused(true);cancelAnimationFrame(animation);panel.hidden=true;document.querySelector('.game-shell').inert=false;document.body.style.overflow=bodyOverflow;onClose();}
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
    for(const sel of ['[data-site]','[data-lat]','[data-lng]','[data-go]'])$(sel).disabled=exists||pendingStart||!ready;
    for(const sel of ['[data-pause]','[data-camera]','[data-assist]'])$(sel).disabled=!exists;
    $('.earth-touch').hidden=!exists;$('.earth-instruments').hidden=!exists;
    $('[data-assist]').textContent=flight?.assist===false?'Hover assist off':'Hover assist on';$('[data-assist]').setAttribute('aria-pressed',String(flight?.assist!==false));
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
  $('[data-plan]').onclick=()=>{flight=null;pendingStart=false;setPaused(false);map.dragPan.enable();map.setCenterClampedToGround(true);$('.earth-outcome').hidden=true;syncControls();status.textContent='Choose another launch area. Click the map or enter coordinates, then load the location.';};
  function loadLocation(){const c=coordinates();if(!c||!ready||flight)return;pendingStart=false;mapSettled=false;syncControls();map.flyTo({center:[c[1],c[0]],zoom:17,pitch:65,bearing:0,duration:1000});status.textContent='Location selected. Start rocket flight to deploy 120 m above the local surface.';}
  $('[data-go]').onclick=loadLocation;$('[data-site]').onchange=e=>{const p=SITES[e.target.value];if(p){lat.value=p[0];lng.value=p[1];loadLocation();}};
  for(const field of [lat,lng])field.addEventListener('input',()=>{$('[data-site]').value='custom';});
  $('[data-fine]').onclick=()=>{fine=!fine;$('[data-fine]').setAttribute('aria-pressed',String(fine));};
  panel.querySelectorAll('[data-control]').forEach(button=>{button.addEventListener('pointerdown',e=>{if(!flight||paused)return;e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.control);button.classList.add('is-held');});const release=()=>{keys.delete(button.dataset.control);button.classList.remove('is-held');};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);});
  window.addEventListener('keydown',e=>{
    if(!active)return;if(e.code==='Escape'){e.stopImmediatePropagation();e.preventDefault();close();return;}
    if(/INPUT|SELECT/.test(document.activeElement?.tagName))return;
    if(e.code==='KeyP'&&flight){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)setPaused(!paused);return;}
    if(e.code==='KeyB'&&flight){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)$('[data-assist]').click();return;}
    if(controlled.includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(!paused)keys.add(e.code);}
  },true);
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{if(active)setPaused(true);});
  function input(){const scale=(fine||keys.has('ShiftLeft')||keys.has('ShiftRight'))?0.12:1;return {forward:(Number(keys.has('KeyW'))-Number(keys.has('KeyS')))*scale,right:(Number(keys.has('KeyD'))-Number(keys.has('KeyA')))*scale,vertical:(Number(keys.has('KeyR'))-Number(keys.has('KeyF')))*scale,yaw:Number(keys.has('KeyE'))-Number(keys.has('KeyQ')),brake:keys.has('Space'),assist:flight.assist};}
  function updateHUD(){
    if(!flight){$('.earth-readout').textContent='Select a real location → Start rocket flight → Fly, land and take off again.';return;}
    const t=earthFlightTelemetry(flight),surface=surfaceAt(flight.lat,flight.lng);
    $('[data-agl]').textContent=`${Math.max(0,flight.altitude-(surface?.height??flight.surfaceHeight??0)).toFixed(1)} m`;
    $('[data-vz]').textContent=`${flight.velocity[2].toFixed(2)} m/s`;$('[data-speed]').textContent=`${Math.hypot(...flight.velocity.slice(0,2)).toFixed(1)} m/s`;$('[data-fuel]').textContent=`${flight.fuel.toFixed(0)} kg`;$('[data-earth-engine]').textContent=`${Math.round((paused||flight.dataPending||flight.phase!=='flying'?0:flight.thrustFraction||0)*100)}%`;
    $('.earth-readout').textContent=`${flight.lat.toFixed(5)}°, ${flight.lng.toFixed(5)}° · ${Math.round((flight.heading*180/Math.PI+360)%360)}° · ${paused?'PAUSED':flight.dataPending?'WAITING FOR MAP DATA':flight.phase.toUpperCase()} · ${surface?.kind==='building'?'ROOF PRISM':'TERRAIN'} · ${t.status??''}`;
    if(flight.phase==='crashed'){status.textContent='Impact confirmed. This flight has ended at its contact coordinates.';$('.earth-outcome').hidden=false;$('[data-result]').textContent='Impact — flight ended';$('[data-detail]').textContent='The rocket remains at its contact location. Start a new flight to try again. Safe contact requires vertical and sideways speed below 2 m/s.';}
    else if(flight.phase==='landed'){status.textContent='Touchdown confirmed at your actual coordinates. Hold R to lift off again; fuel is preserved.';$('.earth-outcome').hidden=true;}
    else if(flight.dataPending)status.textContent='Flight held while local terrain/building data loads. Position and propellant are preserved.';
    else if(paused)status.textContent='Flight paused. Resume to continue from this exact position.';
    else status.textContent=flight.fuel<=0?'Propellant depleted. Rocket is falling under gravity.':'Fly freely. Right-drag to look around; Shift + F for a gentle final descent; Space cancels drift using thrust.';
  }
  function frame(time){
    if(!active||!map)return;const dt=Math.min(.1,Math.max(0,(time-previous)/1000||0));previous=time;refreshBuildings(time);
    if(pendingStart&&!flight&&surfaceAt(Number(lat.value),Number(lng.value)))beginFlight();
    if(flight&&!paused){accumulator+=dt;while(accumulator>=1/60){stepEarthFlight(flight,input(),1/60,surfaceAt);accumulator-=1/60;}map.jumpTo({center:[flight.lng,flight.lat],elevation:flight.altitude+7.5});map.triggerRepaint();}
    if(time-hudTime>100){hudTime=time;updateHUD();}animation=requestAnimationFrame(frame);
  }
  syncControls();
  return {close,pause(value=true){setPaused(value);},async open(){if(active)return;const generation=++openGeneration;onOpen();active=true;panel.hidden=false;bodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';document.querySelector('.game-shell').inert=true;$('[data-close]').focus();try{
    lib=await loadMapLibrary();if(!active||generation!==openGeneration)return;
    if(!map){map=new lib.Map({container:$('[data-map]'),style:'https://tiles.openfreemap.org/styles/liberty',center:[-80.6043,28.6084],zoom:17,pitch:65,maxPitch:80,attributionControl:true,canvasContextAttributes:{antialias:true}});map.addControl(new lib.NavigationControl(),'top-right');map.keyboard.disable();
      map.on('style.load',()=>{map.setProjection({type:'mercator'});map.addSource('earth-terrain',{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,encoding:'terrarium',maxzoom:15,attribution:'Terrain © <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Mapzen / source providers</a>'});map.setTerrain({source:'earth-terrain',exaggeration:1});map.addLayer(createEarthCraftLayer(lib,()=>active&&flight?{...flight,thrustFraction:paused||flight.dataPending?0:flight.thrustFraction}:null));ready=true;syncControls();status.textContent='Real map ready. Start rocket flight here or load a different location.';});
      map.on('sourcedata',e=>{if(e.sourceId==='openmaptiles'&&['content','metadata'].includes(e.sourceDataType)){buildingsDirty=true;buildingsReady=false;}});
      map.on('idle',()=>{mapSettled=true;});map.on('movestart',()=>{if(!flight)mapSettled=false;});
      map.on('error',e=>{status.textContent=`Map data unavailable: ${String(e.error?.message??'check internet connection').slice(0,100)}. Flight waits for required surface tiles.`;});
      map.on('click',e=>{if(flight)return;lat.value=e.lngLat.lat.toFixed(5);lng.value=e.lngLat.lng.toFixed(5);$('[data-site]').value='custom';marker?.remove();marker=new lib.Marker().setLngLat(e.lngLat).addTo(map);status.textContent='Start position selected. Load location, then start rocket flight.';});
    }else{map.resize();setPaused(!!flight);}
    previous=performance.now();accumulator=0;frame(previous);
  }catch(e){status.textContent=e.message;}}};
}
