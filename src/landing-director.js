import { LANDER, LANDING_LIMITS } from './landing.js';

// Guidance only: these measurements never change the physical state.
export function installLandingDirector(){
  const node=document.createElement('div');node.className='landing-director';node.hidden=true;node.setAttribute('aria-label','Landing guidance');
  document.getElementById('viewport').append(node);
  let last='';
  return function update(state){
    const f=state.flight;node.hidden=f?.kind!=='landing'||state.phase!=='landing'||state.paused;if(node.hidden)return;
    const mass=LANDER.dryMass+f.fuel,net=f.scenario.thrustLimit/mass-f.gravity;
    const down=Math.max(0,-f.velocity[1]),brake=net>0?down*down/(2*net):Infinity;
    const x=f.position[0],vx=f.velocity[0],height=f.position[1];
    const speedOK=Math.abs(f.velocity[1])<=LANDING_LIMITS.verticalSpeed,offsetOK=Math.abs(x)<=LANDING_LIMITS.padRadius;
    const warning=height<brake*1.25+8&&!speedOK?'BRAKE NOW':height<80?'FINAL DESCENT':'CONTROL DESCENT';
    const lateral=offsetOK?'Inside landing zone':x>0?'Landing zone ← LEFT':'Landing zone RIGHT →';
    const html=`<strong>${warning}</strong><span>${lateral} · ${Math.abs(x).toFixed(1)} m offset</span><span>Drift ${vx.toFixed(2)} m/s · descent ${down.toFixed(1)} m/s</span><span>Full-power stopping distance: ${Number.isFinite(brake)?brake.toFixed(0)+' m':'insufficient thrust'}</span><span>Touchdown limits: vertical ≤ 2 m/s · lateral ≤ 1.5 m/s</span>`;
    if(html!==last){node.innerHTML=html;last=html;}node.dataset.warning=warning==='BRAKE NOW'?'true':'false';
  };
}
