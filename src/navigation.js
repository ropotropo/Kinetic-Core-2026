import { DESTINATIONS } from './destinations.js';
import { SATELLITES, SYSTEMS, SATELLITE_SOURCE } from './satellite-catalog.js';

// Layout coordinates are schematic, never ephemerides or transfer trajectories.
export function installNavigation({ state, selectDestination, resetCamera }) {
  const bar = document.createElement('div');
  bar.className = 'navigation-tools';
  bar.innerHTML = '<button class="quiet-button" id="open-map">Flight map</button><button class="quiet-button" id="reset-orbit">Reset camera</button><small>Drag: 360° view · Scroll: zoom</small>';
  document.querySelector('.flight-center').prepend(bar);
  const expand=document.createElement('button');expand.className='secondary-button';expand.textContent='Expand flight view';bar.prepend(expand);
  expand.onclick=()=>{const expanded=document.querySelector('.flight-center').classList.toggle('expanded-flight');expand.textContent=expanded?'Restore layout':'Expand flight view';window.dispatchEvent(new Event('resize'));};
  const dialog = document.createElement('dialog');
  dialog.className = 'guide-dialog navigation-map';
  dialog.innerHTML = `<div class="dialog-header"><div><p class="eyebrow">Kinetic Core / navigation</p><h2>Mission map</h2></div><button class="icon-button" aria-label="Close flight map">×</button></div><div class="guide-content"><p>Choose a destination system, then inspect its moons. System positions are a schematic itinerary, not current astronomical positions. Continuous interplanetary transfer is not simulated yet.</p><div class="map-systems" role="group" aria-label="Destination systems"></div><label>Target moon <select id="map-target"></select></label><p id="map-route"></p><canvas id="local-map" width="760" height="380" aria-label="Live local position, velocity and target diagram"></canvas><p id="map-telemetry" role="status"></p><button class="primary-button" id="map-select">Set mission destination</button><p id="map-note"></p></div>`;
  document.body.append(dialog);
  const systems=SYSTEMS;
  const catalog=SATELLITES.map((s,i)=>{const playable=DESTINATIONS.find(d=>d.name===s.name&&d.parent===s.parent);return {...s,id:playable?.id??`catalog-${i}`,playable:!!playable};});
  systems.forEach(s=>{const landing=DESTINATIONS.find(d=>d.name===s);catalog.push({id:landing?.id??`planet-${s}`,name:s,parent:s,planet:true,playable:!!landing});});
  const search=document.createElement('input');search.type='search';search.placeholder='Search planet, moon or provisional designation';search.setAttribute('aria-label','Search Solar System');dialog.querySelector('.map-systems').before(search);
  const results=document.createElement('div');results.className='catalog-results';search.after(results);
  search.oninput=()=>{const term=search.value.trim().toLowerCase();results.replaceChildren();if(!term)return;catalog.filter(b=>(b.name+' '+b.parent+' '+b.designation).toLowerCase().includes(term)).slice(0,60).forEach(b=>{const button=document.createElement('button');button.className='quiet-button';button.textContent=`${b.parent} / ${b.name}`;button.onclick=()=>{planned=b.id;chooseSystem(b.parent);};results.append(button);});};
  const summary=document.createElement('p');summary.textContent=`8 planets + Pluto · ${SATELLITES.length} satellite entries · JPL snapshot: 15 November 2026. Newly discovered bodies may be absent from this snapshot.`;search.before(summary);
  const source=document.createElement('a');source.href=SATELLITE_SOURCE;source.textContent='JPL satellite catalog and discovery records';source.target='_blank';source.rel='noopener';dialog.querySelector('.guide-content').append(source);
  const systemsNode=dialog.querySelector('.map-systems');
  const select=dialog.querySelector('select'), route=dialog.querySelector('#map-route');
  const set=dialog.querySelector('#map-select'), note=dialog.querySelector('#map-note');
  let planned=state.destination;
  function chooseSystem(system){
    const moons=catalog.filter(d=>d.parent===system);
    if(!moons.some(d=>d.id===planned))planned=moons[0].id;
    select.replaceChildren(...moons.map(d=>{const o=document.createElement('option');o.value=d.id;o.textContent=`${d.name}${d.planet?' — '+(d.name==='Pluto'?'dwarf planet':'planet'):d.playable?' — landing available':' — survey only'}`;return o;}));select.value=planned;
    systemsNode.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===system)));
    updateRoute();
  }
  systemsNode.innerHTML=systems.map(s=>`<button class="secondary-button">${s}</button>`).join('');
  systemsNode.querySelectorAll('button').forEach(b=>b.onclick=()=>chooseSystem(b.textContent));
  select.onchange=()=>{planned=select.value;updateRoute();};
  function updateRoute(){const d=catalog.find(d=>d.id===planned);route.textContent=`Earth launch → ${d.parent} system${d.planet?'':` → ${d.name}`} · ${d.playable?'Landing exercise available':'Survey target — landing model unavailable'}`;}
  document.getElementById('open-map').onclick=()=>{planned=state.destination;chooseSystem(DESTINATIONS.find(d=>d.id===planned).parent);dialog.showModal();};
  document.getElementById('reset-orbit').onclick=resetCamera;
  dialog.querySelector('[aria-label="Close flight map"]').onclick=()=>dialog.close();
  set.onclick=()=>{if(state.phase!=='assembly')return;selectDestination(planned);dialog.close();};
  const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d');
  function draw(){
    if(!dialog.open)return;
    const f=state.flight,kind=f?.kind;
    const selected=catalog.find(d=>d.id===planned);
    set.disabled=state.phase!=='assembly'||!selected?.playable;
    note.textContent=!selected?.playable?'This body is in the survey catalog. A verified landing exercise is not available. Giant planets have no solid landing surface; missing moon parameters are not invented.':state.phase!=='assembly'?'Target changes are available in vehicle assembly.':'Set a target, then use Surface landing practice to fly the separate descent exercise.';
    ctx.fillStyle='#050506';ctx.fillRect(0,0,760,380);
    ctx.strokeStyle='#242429';ctx.lineWidth=1;
    for(let x=40;x<760;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,380);ctx.stroke();}
    for(let y=30;y<380;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(760,y);ctx.stroke();}
    ctx.font='14px system-ui';ctx.fillStyle='#a1a1a8';
    const marker=(x,y,text,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.fillText(text,x+12,y-10);};
    const arrow=(x,y,dx,dy)=>{const a=Math.atan2(dy,dx);ctx.strokeStyle='#9bcaff';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y+dy);ctx.lineTo(x+dx-10*Math.cos(a-.5),y+dy-10*Math.sin(a-.5));ctx.moveTo(x+dx,y+dy);ctx.lineTo(x+dx-10*Math.cos(a+.5),y+dy-10*Math.sin(a+.5));ctx.stroke();};
    let description;
    if(kind==='docking'||kind==='landing'){
      const x=f.position[0],vertical=kind==='landing'?f.position[1]:f.position[2];
      const scale=Math.max(1,Math.abs(x)/240,Math.abs(vertical)/240);
      const sx=380+x/scale,sy=310-vertical/scale;
      marker(380,310,kind==='landing'?'Landing zone':'Docking port','#a8d8bd');marker(sx,sy,'Spacecraft','#f5f5f7');
      ctx.setLineDash([5,5]);ctx.strokeStyle='#a8d8bd';ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(380,310);ctx.stroke();ctx.setLineDash([]);
      const vx=f.velocity[0],vy=f.velocity[kind==='landing'?1:2];const magnitude=Math.hypot(vx,vy);if(magnitude>.001)arrow(sx,sy,vx/magnitude*55,-vy/magnitude*55);
      description=`Local ${kind==='landing'?'descent':'approach'} map · lateral offset ${x.toFixed(1)} m · ${kind==='landing'?'altitude':'axial range'} ${vertical.toFixed(1)} m · velocity (${vx.toFixed(2)}, ${vy.toFixed(2)}) m/s · scale ${scale.toFixed(1)} m/px. Dashed green: target bearing. Blue: current velocity. Docking Y offset is not shown in this X/Z projection.`;
    }else if(f?.position?.length===2){
      const r=Math.hypot(...f.position),s=r/130;ctx.strokeStyle='#a1a1a8';ctx.beginPath();ctx.arc(380,190,6371000/s,0,Math.PI*2);ctx.stroke();marker(380+f.position[0]/s,190-f.position[1]/s,'Spacecraft','#f5f5f7');description='Earth-centred launch map · altitude '+Math.round((r-6371000)/1000)+' km. Interplanetary transfer is not active.';
    }else{
      systems.forEach((s,i)=>{const x=60+(i%5)*145,y=i<5?105:255;marker(x,y,s,s===selected.parent?'#9bcaff':'#a1a1a8');ctx.fillStyle='#a1a1a8';ctx.fillText(`${SATELLITES.filter(m=>m.parent===s).length} moons`,x,y+30);});description=`Selected: ${selected.name} / ${selected.parent}. Schematic Solar System, not to scale; positions are not ephemerides. Mercury and Venus have no natural moons. Pluto is a dwarf planet.`;
    }
    dialog.querySelector('#map-telemetry').textContent=description;
  }
  // Pause and release held flight inputs while a modal blocks the controls.
  return {draw,dialog};
}
