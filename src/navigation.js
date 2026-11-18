import { icon } from './ui-icons.js';
import { drawWorldDisc } from './map-world-disc.js';
import './navigation.css';
import { createMiniMap } from './mini-map.js';
export function installNavigation({state,resetCamera,zoomCamera=()=>{},inspectCamera=()=>{}}){
  const bar=document.createElement('div');bar.className='navigation-tools';bar.setAttribute('aria-label','Scene tools');
  bar.innerHTML=`<button class="kc-tool" id="open-time-controls" aria-label="Time controls">${icon('time')}<span class="kc-tool-label">Time</span></button><button class="kc-tool" id="open-camera-tools" aria-label="Open camera tools">${icon('camera')}<span class="kc-tool-label">Camera</span></button><button class="kc-tool" id="expand-flight-view" aria-label="Expand flight view" aria-pressed="false">${icon('expand')}<span class="kc-tool-label">View</span></button>`;
  document.querySelector('#viewport').append(bar);
  const dialog=document.createElement('dialog');dialog.className='guide-dialog navigation-map';dialog.setAttribute('aria-label','Local flight map');
  dialog.innerHTML=`<div class="dialog-header"><h2>Flight map</h2><button class="kc-tool" aria-label="Close flight map">${icon('close')}</button></div><canvas id="local-map" width="760" height="420" aria-label="Actual local spacecraft position and velocity"></canvas><p id="map-telemetry"></p><details><summary>Read this map</summary><p>White is your spacecraft. Green is the target. The blue arrow shows velocity; a dashed line is target bearing, not a planned trajectory.</p><p>Docking uses an X/Z projection; vertical Y offset remains in flight instruments. This is a local diagram, not live astronomical imagery.</p></details>`;
  const cameraDialog=document.createElement('dialog');cameraDialog.className='guide-dialog navigation-camera';cameraDialog.setAttribute('aria-label','Camera tools');
  cameraDialog.innerHTML=`<div class="dialog-header"><h2>Camera</h2><button class="kc-tool" aria-label="Close camera tools">${icon('close')}</button></div><p>Drag the scene to look around. Choose a mounted view in flight controls.</p><div class="camera-tool-grid"><button class="kc-action" id="reset-orbit">${icon('reset')}Reset view</button><button class="kc-action" data-inspect>${icon('orbit')}Inspect in 360°</button><button class="kc-action" data-zoom="0.8">${icon('plus')}Zoom in</button><button class="kc-action" data-zoom="1.25">${icon('minus')}Zoom out</button></div>`;
  document.body.append(dialog,cameraDialog);
  function pauseForTools(){document.dispatchEvent(new CustomEvent('kc:pause-practice'));document.getElementById('pause-button')?.getAttribute('aria-label')==='Pause simulation'&&document.getElementById('pause-button').click();}
  bar.querySelector('#open-camera-tools').onclick=()=>{cameraDialog.returnValue='';pauseForTools();cameraDialog.showModal();};
  cameraDialog.querySelector('[aria-label="Close camera tools"]').onclick=()=>cameraDialog.close('selected');
  cameraDialog.querySelector('#reset-orbit').onclick=()=>{resetCamera();cameraDialog.close('selected');};
  cameraDialog.querySelector('[data-inspect]').onclick=()=>{inspectCamera();cameraDialog.close('selected');};
  for(const button of cameraDialog.querySelectorAll('[data-zoom]'))button.onclick=()=>zoomCamera(Number(button.dataset.zoom));
  let expanded=false;
  const expand=bar.querySelector('#expand-flight-view');expand.onclick=()=>{expanded=!expanded;document.querySelector('.flight-center').classList.toggle('expanded-flight',expanded);expand.setAttribute('aria-pressed',String(expanded));expand.setAttribute('aria-label',expanded?'Restore flight layout':'Expand flight view');window.dispatchEvent(new Event('resize'));};
  const miniMap=createMiniMap(document.querySelector('#viewport'));
  bar.querySelector('#open-time-controls').onclick=()=>document.dispatchEvent(new CustomEvent('kc:time-practice'));
  dialog.querySelector('[aria-label="Close flight map"]').onclick=()=>dialog.close();
  const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d');let lastPhase;
  const marker=(x,y,label,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.font='14px system-ui';ctx.fillText(label,Math.min(610,x+14),Math.max(22,y-12));};
  function arrow(x,y,vx,vy){const length=Math.hypot(vx,vy);if(length<.001)return;const dx=vx/length*58,dy=vy/length*58,a=Math.atan2(dy,dx);ctx.strokeStyle='#9bcaff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y+dy);ctx.lineTo(x+dx-11*Math.cos(a-.5),y+dy-11*Math.sin(a-.5));ctx.moveTo(x+dx,y+dy);ctx.lineTo(x+dx-11*Math.cos(a+.5),y+dy-11*Math.sin(a+.5));ctx.stroke();}
  function draw(){
    miniMap.updatePractice(state);
    bar.querySelector('#open-time-controls').disabled=!state.flight||['assembly','landed','docked','failed'].includes(state.phase);
    if(!dialog.open)return;
    const f=state.flight;ctx.fillStyle='#08090b';ctx.fillRect(0,0,760,420);ctx.strokeStyle='#ffffff12';ctx.lineWidth=1;for(let x=60;x<760;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,420);ctx.stroke();}for(let y=50;y<420;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(760,y);ctx.stroke();}
    let description='Start a flight to see its position.';
    if(f?.kind==='docking'||f?.kind==='landing'){
      const landing=f.kind==='landing',x=f.position[0],z=f.position[landing?1:2],scale=Math.max(.5,Math.abs(x)/230,Math.abs(z)/270),sx=380+x/scale,sy=345-z/scale;
      marker(380,345,landing?'Landing zone':'Docking port','#a8d8bd');marker(sx,sy,'Spacecraft','#f5f5f7');ctx.setLineDash([4,6]);ctx.strokeStyle='#a8d8bd66';ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(380,345);ctx.stroke();ctx.setLineDash([]);arrow(sx,sy,f.velocity[0],-f.velocity[landing?1:2]);
      description=`${landing?'Altitude':'Port range'} ${z.toFixed(1)} m · ${landing?'pad offset':'X offset'} ${x.toFixed(1)} m · ${scale.toFixed(1)} m per pixel`;
    }else if(f?.position?.length===2){const r=Math.hypot(...f.position),scale=r/145;drawWorldDisc(ctx,380,210,6371000/scale,'earth','#152b3e');marker(380+f.position[0]/scale,210-f.position[1]/scale,'Spacecraft','#f5f5f7');description=`Earth-centred ascent · altitude ${((r-6371000)/1000).toFixed(1)} km`;}
    dialog.querySelector('#map-telemetry').textContent=description;
  }
  return{draw,dialog,cameraDialog};
}
