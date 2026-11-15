// Shared-resource Earth-to-Moon flight. Patched conics, 2D training plane,
// circular synthetic Moon epoch, finite-thrust guidance. No trajectory teleport.
// The spacecraft is a translational point mass with ideal thrust-vector pointing;
// this is not a structural, six-degree-of-freedom or historical Apollo guidance
// reconstruction. The Moon rotates synchronously at its assumed circular mean
// motion. Site longitude is projected into this plane; latitude is metadata.
// Conic relations: JPL Mission Planning Guide, chapter 7:
// https://spsweb.fltops.jpl.nasa.gov/portaldataops/mpg/MPG_Docs/MPG%20Book/Release/Chapter7-OrbitalMechanics.pdf
// Braking/approach/vertical-landing phases are inspired by NASA's Apollo record;
// the feedback law below is our own educational guidance, not Apollo software:
// https://www.nasa.gov/wp-content/uploads/static/history/alsj/nasa58040.pdf
import { EARTH, createLaunch, stepLaunch, separateStage, getLaunchTelemetry, getPostOrbitSpacecraft, orbitalElements } from './physics.js';
import { createVehicleConfig, normalizeConfig, resolveConfig } from './catalog.js';
import { validateVehicleDesign, evaluateDesign } from './vehicle-design.js';
import { getLunarSite, LUNAR_SITES } from './mission-sites.js';
import { makeCheckpoint, restoreCheckpointFlight } from './storage.js';
export const MOON = Object.freeze({ radius: 1737400, mu: 4.9028e12, distance: 384400000, soi: 66100000 });
export const MOON_RATE = Math.sqrt(EARTH.mu / MOON.distance ** 3);
export const MISSION_PHASES = ['rollout','countdown','launch','orbit','window','departure','coast','lunar-approach','lunar-coast','capture','lunar-orbit','descent','landing','landed','failed'];
const TAU = Math.PI * 2, G0 = 9.80665;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const len = v => Math.hypot(...v);
const wrap = a => Math.atan2(Math.sin(a),Math.cos(a));
const dot = (a,b) => a[0]*b[0]+a[1]*b[1];
const add = (a,b) => [a[0]+b[0],a[1]+b[1]];
const sub = (a,b) => [a[0]-b[0],a[1]-b[1]];
const scale = (v,k) => [v[0]*k,v[1]*k];
const unit = v => scale(v,1/Math.max(1e-12,len(v)));
export function moonState(time) {
  const a = .8 + MOON_RATE*time;
  return { position:[MOON.distance*Math.cos(a),MOON.distance*Math.sin(a)],velocity:[-MOON.distance*MOON_RATE*Math.sin(a),MOON.distance*MOON_RATE*Math.cos(a)],angle:a };
}
function event(m,text) { m.event=text; m.events.push({time:m.time,message:text}); if(m.events.length>80)m.events.shift(); }
export function createLunarMission(raw,siteId='tranquility') {
  const design=validateVehicleDesign(raw),e=evaluateDesign(design);
  if(!e.valid)throw new Error(e.errors.join(' '));
  const config=createVehicleConfig(design),launch=createLaunch(config);
  return {version:1,kind:'lunar-mission',design,config,siteId:getLunarSite(siteId).id,phase:'rollout',time:0,sequenceTime:0,
    launch,primary:'earth',position:launch.position.slice(),velocity:launch.velocity.slice(),stageIndex:0,resources:null,
    craftAngle:0,throttle:0,commandedThrottle:1,guide:true,handedOver:false,plan:null,windowError:null,
    fuelUsed:0,deltaVUsed:0,impact:null,failure:null,event:'Vehicle secured on the rollout platform.',events:[],track:[],lastTrack:0};
}
function syncLaunch(m) { m.position=m.launch.position.slice();m.velocity=m.launch.velocity.slice();m.time=m.launch.time;m.stageIndex=m.launch.stageIndex;m.throttle=m.launch.throttle;m.craftAngle=Math.atan2(m.position[1],m.position[0])+m.launch.pitch; }
function initResources(m) {
  if(m.resources)return true;
  const p=getPostOrbitSpacecraft(m.launch);
  if(p.coreStage)return false;
  m.resources={dryMass:p.dryMass,serviceFuel:p.propellant,rcsFuel:p.rcsFuel,serviceThrust:p.thrustVac,serviceIsp:p.ispVac,
    upperFuel:p.upperStage?.fuel??p.upperStage?.propellant??0,upperDry:p.upperStage?.dryMass??0,upperThrust:p.upperStage?.thrustVac??0,upperIsp:p.upperStage?.ispVac??450,
    upperAttached:m.launch.stageIndex<2,initialServiceFuel:p.propellant,initialUpperFuel:p.upperStage?.fuel??p.upperStage?.propellant??0};
  return true;
}
export function missionMass(m) {
  if(!m.resources)return getLaunchTelemetry(m.launch).mass;
  const r=m.resources;return r.dryMass+r.rcsFuel+r.serviceFuel+(r.upperAttached?r.upperDry+r.upperFuel:0);
}
function propulsion(m) { const r=m.resources;return r.upperAttached?{fuel:r.upperFuel,thrust:r.upperThrust,isp:r.upperIsp,key:'upperFuel'}:{fuel:r.serviceFuel,thrust:r.serviceThrust,isp:r.serviceIsp,key:'serviceFuel'}; }
export function separateMissionStage(m) {
  if(['rollout','countdown','landed','failed'].includes(m.phase))return {ok:false,message:'Stage release unavailable in this phase.'};
  if(!m.resources){const result=separateStage(m.launch);syncLaunch(m);if(result.ok){if(m.phase==='orbit')initResources(m);event(m,result.message);}return result;}
  if(!m.resources.upperAttached)return {ok:false,message:'Spacecraft already released.'};
  const discardedMass=m.resources.upperDry+m.resources.upperFuel;
  m.resources.upperAttached=false;m.stageIndex=2;m.launch.stageIndex=2;m.launch.stages[1].attached=false;
  event(m,`Upper stage released. ${Math.round(discardedMass)} kg discarded; spacecraft engine available.`);
  return {ok:true,discardedMass,message:m.event};
}
function accel(p,mu) { const r=len(p);return scale(p,-mu/Math.max(1,r**3)); }
// Velocity Verlet for gravity, thrust held over each short substep. Thrust
// acceleration uses mid-burn mass; all engine flow is charged to a real tank.
function integrate(m,dt,command,mu,groundRadius=0) {
  const engine=propulsion(m),mass=missionMass(m),throttle=clamp(command?.throttle??0,0,1);
  const flow=engine.fuel>0&&throttle>0&&engine.isp>0?engine.thrust*throttle/(engine.isp*G0):0;
  const propagate=h=>{
    const burned=Math.min(engine.fuel,flow*h),thrust=flow>0?engine.thrust*throttle*burned/(flow*h):0;
    const force=scale(command.direction,thrust/(mass-burned/2));
    const a=add(accel(m.position,mu),force),p=add(add(m.position,scale(m.velocity,h)),scale(a,.5*h*h));
    const b=add(accel(p,mu),force);
    return {burned,thrust,p,v:add(m.velocity,scale(add(a,b),h/2))};
  };
  let result=propagate(dt);
  if(groundRadius&&len(result.p)<=groundRadius&&len(m.position)>groundRadius){
    let low=0,high=dt;
    for(let i=0;i<28;i++){const mid=(low+high)/2;if(len(propagate(mid).p)>groundRadius)low=mid;else high=mid;}
    dt=high;result=propagate(dt);
  }
  m.resources[engine.key]=Math.max(0,m.resources[engine.key]-result.burned);
  if(engine.key==='upperFuel')m.launch.stages[1].fuel=m.resources.upperFuel;
  m.fuelUsed+=result.burned;
  if(result.burned>0)m.deltaVUsed+=engine.isp*G0*Math.log(mass/(mass-result.burned));
  m.position=result.p;m.velocity=result.v;m.time+=dt;
  m.throttle=engine.thrust?result.thrust/engine.thrust:0;
  if(result.thrust>0)m.craftAngle=Math.atan2(command.direction[1],command.direction[0]);
  return dt;
}
function transferElements(p,v) {
  const r=len(p),h=p[0]*v[1]-p[1]*v[0],energy=dot(v,v)/2-EARTH.mu/r;
  const ev=[v[1]*h/EARTH.mu-p[0]/r,-v[0]*h/EARTH.mu-p[1]/r];
  const e=len(ev),a=energy<0?-EARTH.mu/(2*energy):Infinity;
  const targetAngle=Math.atan2(-ev[1],-ev[0]);
  let timeToApo=Infinity;
  if(Number.isFinite(a)&&e>1e-7){const E=Math.acos(clamp((1-r/a)/e,-1,1));const anomaly=dot(p,v)>=0?E:TAU-E;timeToApo=(Math.PI-(anomaly-e*Math.sin(anomaly))+TAU)%TAU/Math.sqrt(EARTH.mu/a**3);}
  return {a,e,targetAngle,timeToApo,apoapsis:energy<0?a*(1+e):Infinity};
}
export function planLunarDeparture(m) {
  if(!m.resources||m.primary!=='earth')throw new Error('Reach Earth orbit before planning departure.');
  const preview=structuredClone(m),startTime=m.time,startAngle=Math.atan2(m.position[1],m.position[0]);
  preview.events=[];preview.track=[];
  for(let i=0;i<20000;i++){
    const engine=propulsion(preview);
    if(engine.fuel<=.001){if(preview.resources.upperAttached)separateMissionStage(preview);else throw new Error('Not enough propellant for lunar departure.');}
    integrate(preview,.5,{throttle:1,direction:unit(preview.velocity)},EARTH.mu);
    if(transferElements(preview.position,preview.velocity).apoapsis>=MOON.distance)break;
    if(i===19999)throw new Error('Departure engine is too weak for this transfer.');
  }
  const orbit=transferElements(preview.position,preview.velocity);
  if(!Number.isFinite(orbit.timeToApo))throw new Error('Departure plan is not a bound transfer.');
  return {burnDuration:preview.time-startTime,coastDuration:orbit.timeToApo,leadAngle:wrap(orbit.targetAngle-startAngle),
    targetApoapsis:MOON.distance,estimatedPropellant:preview.fuelUsed-m.fuelUsed,epoch:m.time};
}
export function beginLunarDeparture(m) {
  if(m.phase!=='orbit')return false;
  if(!initResources(m)){event(m,'Release the core stage before planning lunar departure. Its remaining mass is still attached.');return false;}
  m.plan=planLunarDeparture(m);m.phase='window';m.windowError=null;event(m,'Waiting for the aligned lunar departure window. Coast time can be accelerated.');return true;
}
function stepWindow(m,dt) {
  const angle=Math.atan2(m.position[1],m.position[0]);
  const expected=moonState(m.time+m.plan.burnDuration+m.plan.coastDuration).angle;
  const error=wrap(expected-angle-m.plan.leadAngle);
  // Prograde spacecraft outruns Moon; enter at a genuine alignment crossing.
  const crossed=m.windowError!==null&&m.windowError>0&&error<=0&&Math.abs(error)<.08;
  m.windowError=error;
  if(Math.abs(error)<.004||crossed){m.phase='departure';event(m,'Lunar departure burn. Prograde guidance uses engine thrust and finite propellant.');return;}
  integrate(m,dt,{throttle:0,direction:[1,0]},EARTH.mu);
}
function lunarTargetAngle(m) {
  // Project named-site longitude into the 2D training plane. Latitude remains
  // geographic reference metadata, not a claim of a 3D geodesic landing track.
  return moonState(m.time).angle+Math.PI+getLunarSite(m.siteId).longitude*Math.PI/180;
}
/** Two-body osculating elements, including time to periapsis for an inbound
 * ellipse/hyperbola. Conic energy and angular momentum are not progress timers.
 * Reference: JPL Mission Planning Guide, Chapter 7, Orbital Mechanics. */
export function lunarOrbitElements(position,velocity) {
  const r=len(position),vr=dot(position,velocity)/r,h=position[0]*velocity[1]-position[1]*velocity[0];
  const energy=dot(velocity,velocity)/2-MOON.mu/r,e=Math.sqrt(Math.max(0,1+2*energy*h*h/MOON.mu**2));
  const periapsis=h*h/(MOON.mu*(1+e)),a=Math.abs(energy)>1e-8?-MOON.mu/(2*energy):Infinity;
  let timeToPeriapsis=Infinity;
  if(vr<0&&e>1e-7){
    if(energy>0){const aa=-a,H=Math.acosh(Math.max(1,(r/aa+1)/e));timeToPeriapsis=Math.sqrt(aa**3/MOON.mu)*(e*Math.sinh(H)-H);}
    else if(energy<0){const E=Math.acos(clamp((1-r/a)/e,-1,1));timeToPeriapsis=Math.sqrt(a**3/MOON.mu)*(E-e*Math.sin(E));}
  }
  return {energy,angularMomentum:h,eccentricity:e,semiMajor:a,periapsis,apoapsis:energy<0?a*(1+e):Infinity,timeToPeriapsis};
}
function manualCommand(m,input,dt){
  m.craftAngle+=clamp(input.turn??0,-1,1)*.035*dt;
  return {throttle:clamp(input.throttle??0,0,1),direction:[Math.cos(m.craftAngle),Math.sin(m.craftAngle)]};
}
function forceCommand(vector,maxA,input){return {throttle:Math.min(1,len(vector)/Math.max(.01,maxA))*(input.throttle??1),direction:unit(vector)};}
function lunarCommand(m,input,dt) {
  const r=len(m.position),alt=r-MOON.radius,radial=unit(m.position),tangent=[-radial[1],radial[0]],vr=dot(m.velocity,radial),vt=dot(m.velocity,tangent);
  const engine=propulsion(m),maxA=engine.thrust/missionMass(m),g=MOON.mu/r**2;
  const orbit=lunarOrbitElements(m.position,m.velocity),sign=orbit.angularMomentum>=0?1:-1;
  if(m.phase==='lunar-approach'){
    // A finite cross-track-in-plane burn targets a 200 km lunar periapsis.
    // Solve energy and h at this radius for the required tangential velocity;
    // let radial velocity evolve ballistically instead of hovering for days.
    const rp=MOON.radius+200000;
    const targetH=Math.sqrt(Math.max(0,(vr*vr+2*MOON.mu*(1/rp-1/r))/(1/(rp*rp)-1/(r*r))));
    const targetVt=sign*targetH/r,error=targetVt-vt;
    if(Math.abs(error)<.08&&Math.abs(orbit.periapsis-rp)<5000){m.phase='lunar-coast';event(m,'Lunar periapsis targeted. Engine cutoff; ballistic approach to capture.');}
    if(!m.guide)return manualCommand(m,input,dt);
    return forceCommand(scale(tangent,error/40),maxA,input);
  }
  if(m.phase==='lunar-coast'){
    const speedPeri=Math.sqrt(Math.max(0,2*(orbit.energy+MOON.mu/orbit.periapsis))),circular=Math.sqrt(MOON.mu/orbit.periapsis);
    const burnSeconds=Math.max(0,(speedPeri-circular)/maxA);
    if(orbit.timeToPeriapsis<burnSeconds*.6+25){m.phase='capture';event(m,'Lunar capture burn. Braking into a bound local orbit.');}
    else return m.guide?{throttle:0,direction:[1,0]}:manualCommand(m,input,dt);
  }
  if(m.phase==='capture'){
    const targetVt=sign*Math.sqrt(MOON.mu/r);
    if(orbit.energy<0&&alt>80000&&Math.abs(vr)<1&&Math.abs(vt-targetVt)<1){m.phase='lunar-orbit';event(m,'Lunar orbit established. Coasting to the selected landing approach.');return {throttle:0,direction:[1,0]};}
    if(!m.guide)return manualCommand(m,input,dt);
    const ar=g-vt*vt/r-vr/35,at=(targetVt-vt)/22+vr*vt/r;
    return forceCommand(add(scale(radial,ar),scale(tangent,at)),maxA,input);
  }
  if(m.phase==='lunar-orbit'){
    const angleError=wrap(lunarTargetAngle(m)-Math.atan2(m.position[1],m.position[0]))*sign;
    const lead=clamp(1.3*vt*vt/(maxA*r),.15,.6);
    if(angleError>0&&angleError<lead){m.phase='descent';event(m,'Powered descent begins. Braking orbital motion toward the chosen pad.');}
    else return m.guide?{throttle:0,direction:[1,0]}:manualCommand(m,input,dt);
  }
  if(!m.guide)return manualCommand(m,input,dt);
  // Braking curves couple the available acceleration to distance-to-go. While
  // high above this curve, radial thrust is zero and gravity does the work.
  const error=wrap(lunarTargetAngle(m)-Math.atan2(m.position[1],m.position[0]))*r;
  const floor=Math.max(Math.min(100000,Math.max(0,Math.abs(error)-2000)*.08),Math.min(2000,Math.max(0,Math.abs(error)-3)*.3)),height=Math.max(0,alt-floor);
  const desiredVr=alt<floor?clamp((floor-alt)/15,0,100):-Math.max(.45,Math.min(.65*Math.sqrt(2*Math.max(.1,maxA-g)*height),height/16+.45));
  const horizontalA=Math.max(.2,maxA*.6),limit=.55*Math.sqrt(2*horizontalA*Math.abs(error));
  const desiredVt=MOON_RATE*r+clamp(error/12,-limit,limit);
  const tau=clamp(Math.sqrt(Math.max(0,alt))/12,1.5,15);
  const ar=Math.max(0,g-vt*vt/r+(desiredVr-vr)/tau),at=(desiredVt-vt)/Math.min(12,tau)+vr*vt/r;
  return forceCommand(add(scale(radial,ar),scale(tangent,at)),maxA,input);
}
function contact(m) {
  const radial=unit(m.position),tangent=[-radial[1],radial[0]],radius=len(m.position);
  const vertical=dot(m.velocity,radial),lateral=dot(m.velocity,tangent)-MOON_RATE*radius;
  const offset=wrap(Math.atan2(m.position[1],m.position[0])-lunarTargetAngle(m))*MOON.radius;
  const tilt=wrap(m.craftAngle-Math.atan2(radial[1],radial[0]));
  m.impact={verticalSpeed:vertical,horizontalSpeed:lateral,offset,angle:tilt,time:m.time,speed:Math.hypot(vertical,lateral)};
  m.throttle=0;
  if(Math.abs(vertical)<=2&&Math.abs(lateral)<=1.5&&Math.abs(offset)<=25&&Math.abs(tilt)<8*Math.PI/180&&evaluateDesign(m.design).parts.service.legCount>=3){
    m.phase='landed';event(m,'Touchdown confirmed. Same spacecraft, same remaining fuel.');
  }else{m.phase='failed';m.failure=`Unsafe lunar contact: vertical ${Math.abs(vertical).toFixed(2)} m/s, lateral ${Math.abs(lateral).toFixed(2)} m/s, pad offset ${Math.abs(offset).toFixed(1)} m, tilt ${(Math.abs(tilt)*180/Math.PI).toFixed(1)}°.`;event(m,m.failure);}
  // Stop at the solved contact instant. Only a safe touchdown establishes the
  // ground constraint; failure retains the actual impact velocity for review.
  m.position=scale(radial,MOON.radius);
  if(m.phase==='landed')m.velocity=scale(tangent,MOON_RATE*MOON.radius);
}
/** A translation of origin and velocity, not a trajectory manoeuvre. */
export function enterLunarFrame(m){
  if(m.primary!=='earth'||m.phase!=='coast'||!m.resources)return false;
  const moon=moonState(m.time),relative=sub(m.position,moon.position);
  if(len(relative)>MOON.soi)return false;
  m.primary='moon';m.position=relative;m.velocity=sub(m.velocity,moon.velocity);m.phase='lunar-approach';
  event(m,'Lunar sphere of influence. Coordinates changed; world position and velocity are continuous.');
  return true;
}
export function stepLunarMission(m,input={},duration=1/60) {
  if(!Number.isFinite(duration)||duration<=0||['landed','failed'].includes(m.phase))return m;
  if(input.guidance!==undefined)m.guide=Boolean(input.guidance);
  let remaining=Math.min(duration,100000);
  while(remaining>1e-8&&!['landed','failed'].includes(m.phase)){
    if(m.phase==='rollout'||m.phase==='countdown'){
      const limit=m.phase==='rollout'?3:5,dt=Math.min(remaining,limit-m.sequenceTime);
      m.sequenceTime+=dt;remaining-=dt;
      if(m.sequenceTime>=limit-1e-8){m.sequenceTime=0;m.phase=m.phase==='rollout'?'countdown':'launch';event(m,m.phase==='countdown'?'Rollout complete. Ignition countdown armed.':'Ignition. Flight director controls the first 100 metres.');}continue;
    }
    if(m.phase==='launch'){
      const dt=Math.min(remaining,1/60),pilot=m.handedOver;
      stepLaunch(m.launch,{throttle:pilot?input.throttle??1:1,guidance:pilot?m.guide:true,pitchTrim:pilot?input.turn??0:0},dt);syncLaunch(m);remaining-=dt;
      const t=getLaunchTelemetry(m.launch);
      if(t.altitude>=100&&!m.handedOver){m.handedOver=true;event(m,'100 metres. Flight controls are yours. Guidance is optional; staging remains manual.');}
      if(m.launch.phase==='failed'){m.phase='failed';m.failure=m.launch.failure;event(m,m.failure);}
      else if(m.launch.phase==='orbit'){const ready=initResources(m);m.phase='orbit';event(m,ready?'Bound Earth orbit confirmed. Plan lunar departure when ready.':'Bound Earth orbit confirmed. Release the attached core before departure.');}
      continue;
    }
    if(m.phase==='orbit'&&!m.resources){const dt=Math.min(remaining,1/60);stepLaunch(m.launch,{throttle:0},dt);syncLaunch(m);remaining-=dt;continue;}
    const distance=len(m.position),mu=m.primary==='earth'?EARTH.mu:MOON.mu;
    const active=['capture','descent','landing','lunar-approach'].includes(m.phase);
    const dtMax=m.phase==='departure'?.25:m.primary==='moon'?active?Math.max(1/60,Math.min(m.phase==='lunar-approach'?2:.25,(distance-MOON.radius)/Math.max(1,len(m.velocity))*.015)):Math.min(30,Math.max(.25,distance/Math.max(1,len(m.velocity))*.005)):distance<10000000?2:30;
    const dt=Math.min(remaining,dtMax);remaining-=dt;
    if(m.phase==='window'){stepWindow(m,dt);continue;}
    if(m.phase==='orbit'){integrate(m,dt,{throttle:0,direction:[1,0]},EARTH.mu);}
    else if(m.phase==='departure'){
      const engine=propulsion(m);
      if(engine.fuel<=.001){m.throttle=0;const text=m.resources.upperAttached?'Upper propellant depleted. Separate the upper stage to continue.':'Spacecraft propellant depleted.';if(m.event!==text)event(m,text);
        integrate(m,dt,{throttle:0,direction:[1,0]},EARTH.mu);
      }else{
        const pro=unit(m.velocity),turn=(input.turn??0)*.08,angle=Math.atan2(pro[1],pro[0])+turn;
        const command=m.guide?{throttle:input.throttle??1,direction:[Math.cos(angle),Math.sin(angle)]}:manualCommand(m,input,dt);
        integrate(m,dt,command,EARTH.mu);
      }
      if(transferElements(m.position,m.velocity).apoapsis>=MOON.distance){m.phase='coast';event(m,'Departure cutoff. Coasting toward the moving Moon; no engine or fuel is needed to coast.');}
    }else if(m.phase==='coast')integrate(m,dt,{throttle:0,direction:[1,0]},EARTH.mu);
    else if(['lunar-approach','lunar-coast','capture','lunar-orbit','descent','landing'].includes(m.phase)){
      integrate(m,dt,lunarCommand(m,input,dt),MOON.mu,MOON.radius);
      if(m.phase==='descent'&&len(m.position)-MOON.radius<30000){m.phase='landing';event(m,'Terminal descent. Cancel lateral drift and follow the selected pad.');}
      if(len(m.position)<=MOON.radius+1e-6)contact(m);
    }
    if(m.primary==='earth'){
      enterLunarFrame(m);
      if(m.primary==='earth'&&len(m.position)<EARTH.radius){m.phase='failed';m.failure='Earth re-entry: this lunar demonstrator does not model atmospheric recovery.';event(m,m.failure);}
      if(m.primary==='earth'&&m.phase==='coast'&&m.time>14*86400){m.phase='failed';m.failure='The flight missed the lunar encounter. Restore the orbital checkpoint and replan.';event(m,m.failure);}
    }
    if(m.primary==='moon'&&len(m.position)>MOON.soi*2){m.phase='failed';m.failure='The spacecraft escaped the local lunar approach region.';event(m,m.failure);}
    if(m.time-m.lastTrack>Math.max(2,m.time>10000?120:2)){const w=getMissionWorldState(m);m.track.push(w.position);if(m.track.length>1800)m.track.shift();m.lastTrack=m.time;}
  }
  return m;
}
export function getMissionWorldState(m) {
  if(m.primary==='earth')return {position:m.position.slice(),velocity:m.velocity.slice()};
  const moon=moonState(m.time);return {position:add(m.position,moon.position),velocity:add(m.velocity,moon.velocity)};
}
export function getLunarMissionTelemetry(m) {
  const world=getMissionWorldState(m),moon=moonState(m.time),r=len(m.position),radial=unit(m.position),tangent=[-radial[1],radial[0]],site=getLunarSite(m.siteId);
  const engine=m.resources?propulsion(m):null,mass=missionMass(m),alt=r-(m.primary==='earth'?EARTH.radius:MOON.radius);
  const padOffset=m.primary==='moon'?wrap(Math.atan2(m.position[1],m.position[0])-lunarTargetAngle(m))*MOON.radius:0;
  const launch=!m.resources?getLaunchTelemetry(m.launch):null;
  return {phase:m.phase,time:m.time,sequenceTime:m.sequenceTime,altitude:alt,primary:m.primary,positionSI:world.position,velocitySI:world.velocity,moonPositionSI:moon.position,
    positionLocal:m.primary==='moon'?[padOffset,Math.max(0,alt)]:undefined,velocityLocal:m.primary==='moon'?[dot(m.velocity,tangent)-MOON_RATE*r,dot(m.velocity,radial)]:undefined,
    distanceToMoon:len(sub(world.position,moon.position))-MOON.radius,padOffset,verticalSpeed:dot(m.velocity,radial),horizontalSpeed:dot(m.velocity,tangent)-(m.primary==='moon'?MOON_RATE*r:0),
    speed:len(m.velocity),mass,throttle:m.throttle,craftAngle:m.craftAngle,pitch:launch?.pitch??wrap(m.craftAngle-Math.atan2(radial[1],radial[0])),
    fuel:engine?.fuel??launch?.fuel??0,totalFuel:m.resources?m.resources.serviceFuel+(m.resources.upperAttached?m.resources.upperFuel:0):m.launch.stages.reduce((n,s)=>n+(s.attached?s.fuel:0),0)+evaluateDesign(m.design).parts.service.propellant,
    fuelUsed:m.launch.fuelUsed+m.fuelUsed,maxThrust:engine?.thrust??launch?.thrust??0,stageIndex:m.stageIndex,stageReady:engine?engine.fuel<=.01:launch?.stageReady,
    bodyGravity:(m.primary==='moon'?MOON.mu:EARTH.mu)/r**2,site,impact:m.impact,event:m.event,failure:m.failure,plan:m.plan,windowError:m.windowError,handedOver:m.handedOver,
    remainingDeltaV:engine&&engine.fuel>0?engine.isp*G0*Math.log(mass/(mass-engine.fuel)):launch?.remainingDeltaV??0,
    rcsFuel:m.resources?.rcsFuel??evaluateDesign(m.design).parts.service.rcsFuel,guidance:m.phase==='launch'&&!m.handedOver||m.guide,flightDirector:m.phase==='launch'&&!m.handedOver,
    discardedMass:m.launch.stages.reduce((sum,s)=>sum+(!s.attached?s.dryMass+s.fuel:0),0),
    discardedFuel:m.launch.stages.reduce((sum,s)=>sum+(!s.attached?s.fuel:0),0),
    orbit:m.primary==='earth'?orbitalElements(m.position,m.velocity):null,
    lunarOrbit:m.primary==='moon'?lunarOrbitElements(m.position,m.velocity):null};
}

const finite = v => typeof v==='number'&&Number.isFinite(v);
const bounded = (v,low,high) => finite(v)&&v>=low&&v<=high;
const vector = (v,limit=1e12) => Array.isArray(v)&&v.length===2&&v.every(n=>bounded(n,-limit,limit));
function jsonTree(value,depth=0){
  if(depth>16)return false;
  if(value===null||typeof value==='boolean')return true;
  if(typeof value==='number')return finite(value)&&Math.abs(value)<1e24;
  if(typeof value==='string')return value.length<=4000;
  if(Array.isArray(value))return value.length<=5000&&value.every(v=>jsonTree(v,depth+1));
  if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;
  return Object.keys(value).length<=150&&Object.keys(value).every(k=>!['__proto__','constructor','prototype'].includes(k)&&jsonTree(value[k],depth+1));
}
function requireState(condition,message){if(!condition)throw new Error(`Invalid lunar checkpoint: ${message}.`);}

/** Restore only evolving data. Hardware, forces, capacities, safety limits,
 * celestial constants and derived conics are rebuilt from the canonical design.
 * The departure plan is bounded dynamic navigation data; target radius is trusted. */
export function restoreLunarMission(raw){
  requireState(jsonTree(raw)&&raw.version===1&&raw.kind==='lunar-mission','unsupported format');
  requireState(MISSION_PHASES.includes(raw.phase)&&['earth','moon'].includes(raw.primary),'unknown phase or frame');
  requireState(LUNAR_SITES.some(s=>s.id===raw.siteId),'unknown landing site');
  const m=createLunarMission(raw.design,raw.siteId),parts=resolveConfig(m.config);
  requireState(JSON.stringify(normalizeConfig(raw.config))===JSON.stringify(m.config),'configuration differs from design');
  requireState(vector(raw.position)&&vector(raw.velocity,200000)&&bounded(raw.time,0,86400*100),'invalid position, velocity or time');
  requireState(len(raw.position)>(raw.primary==='earth'?EARTH.radius*.95:MOON.radius-.01),'position is inside the primary');
  requireState(bounded(raw.sequenceTime,0,5)&&[0,1,2].includes(raw.stageIndex),'invalid sequence or stage');
  requireState(typeof raw.guide==='boolean'&&typeof raw.handedOver==='boolean','invalid control modes');
  requireState(bounded(raw.throttle,0,1)&&bounded(raw.commandedThrottle,0,1)&&bounded(raw.craftAngle,-1e6,1e6),'invalid controls');
  requireState(bounded(raw.fuelUsed,0,parts.upper.propellant+parts.service.propellant)&&bounded(raw.deltaVUsed,0,100000),'invalid resource ledger');
  requireState(raw.launch&&['launch','orbit','failed'].includes(raw.launch.phase),'invalid ascent state');
  const launchPhase=raw.launch.phase==='failed'?'launch':raw.launch.phase;
  const launchRaw=structuredClone(raw.launch);launchRaw.phase=launchPhase;
  m.launch=restoreCheckpointFlight(makeCheckpoint(m.config,launchPhase,launchRaw));
  m.launch.phase=raw.launch.phase;
  requireState(bounded(m.launch.fuelUsed,0,parts.core.propellant+parts.upper.propellant)&&bounded(m.launch.deltaVUsed,0,100000),'invalid ascent ledger');
  if(raw.launch.phase==='orbit')requireState(m.launch.orbit.energy<0&&m.launch.orbit.periapsis>=149000,'invalid orbital confirmation');
  requireState(raw.time>=m.launch.time&&raw.stageIndex===m.launch.stageIndex,'inconsistent ascent timeline');
  if(raw.primary==='moon')requireState(!['rollout','countdown','launch','orbit','window','departure','coast'].includes(raw.phase),'phase does not match lunar frame');
  else requireState(!['lunar-approach','lunar-coast','capture','lunar-orbit','descent','landing','landed'].includes(raw.phase),'phase does not match Earth frame');
  if(['rollout','countdown','launch'].includes(raw.phase))requireState(raw.resources===null&&raw.primary==='earth'&&raw.time===m.launch.time&&len(sub(raw.position,m.launch.position))<1e-6&&len(sub(raw.velocity,m.launch.velocity))<1e-6,'inconsistent active ascent');
  if(['rollout','countdown'].includes(raw.phase))requireState(raw.time===0&&raw.stageIndex===0&&!raw.handedOver&&!m.launch.liftoff,'invalid prelaunch state');
  if(raw.resources!==null){
    requireState(raw.launch.phase==='orbit','resource handoff before orbit');
    requireState(!m.launch.stages[0].attached,'core mass was omitted');
    const r=raw.resources;
    requireState(typeof r.upperAttached==='boolean'&&r.upperAttached===m.launch.stages[1].attached,'stage attachment differs');
    requireState(bounded(r.serviceFuel,0,parts.service.propellant)&&bounded(r.rcsFuel,0,parts.service.rcsFuel)&&bounded(r.upperFuel,0,parts.upper.propellant),'invalid tank contents');
    requireState(Math.abs(r.upperFuel-m.launch.stages[1].fuel)<1e-7,'upper fuel differs from ascent ledger');
    requireState(bounded(r.initialUpperFuel,r.upperFuel,parts.upper.propellant),'invalid initial upper reserve');
    m.resources={dryMass:parts.capsule.dryMass+parts.service.dryMass+parts.cargo.dryMass,serviceFuel:r.serviceFuel,rcsFuel:r.rcsFuel,
      serviceThrust:parts.service.thrustVac,serviceIsp:parts.service.ispVac,upperFuel:r.upperFuel,upperDry:parts.upper.dryMass,upperThrust:parts.upper.thrustVac,upperIsp:parts.upper.ispVac,
      upperAttached:r.upperAttached,initialServiceFuel:parts.service.propellant,initialUpperFuel:r.initialUpperFuel};
  }else requireState(['rollout','countdown','launch','orbit','failed'].includes(raw.phase),'missing resource state');
  const currentService=raw.resources?raw.resources.serviceFuel+raw.resources.rcsFuel:parts.service.propellant+parts.service.rcsFuel;
  const consumed=parts.core.propellant+parts.upper.propellant+parts.service.propellant+parts.service.rcsFuel-m.launch.stages[0].fuel-m.launch.stages[1].fuel-currentService;
  requireState(Math.abs(consumed-m.launch.fuelUsed-raw.fuelUsed)<.01,'fuel ledger does not conserve propellant');
  if(raw.phase==='orbit')requireState(raw.launch.phase==='orbit','missing confirmed Earth orbit');
  if(raw.plan!==null){
    const p=raw.plan;
    requireState(bounded(p.burnDuration,0,20000)&&bounded(p.coastDuration,0,86400*30)&&bounded(p.leadAngle,-Math.PI,Math.PI)&&bounded(p.epoch,0,raw.time)&&bounded(p.estimatedPropellant,0,parts.upper.propellant+parts.service.propellant),'invalid navigation plan');
    m.plan={burnDuration:p.burnDuration,coastDuration:p.coastDuration,leadAngle:p.leadAngle,targetApoapsis:MOON.distance,estimatedPropellant:p.estimatedPropellant,epoch:p.epoch};
  }else requireState(!['window','departure','coast','lunar-approach','lunar-coast','capture','lunar-orbit','descent','landing','landed'].includes(raw.phase),'missing navigation plan');
  requireState(raw.windowError===null||bounded(raw.windowError,-Math.PI,Math.PI),'invalid window error');
  if(raw.impact!==null){
    const p=raw.impact;
    requireState(['verticalSpeed','horizontalSpeed','offset','angle','time','speed'].every(k=>finite(p[k]))&&bounded(p.time,0,raw.time),'invalid impact record');
    m.impact=Object.fromEntries(['verticalSpeed','horizontalSpeed','offset','angle','time','speed'].map(k=>[k,p[k]]));
  }
  if(raw.phase==='landed'){
    const p=m.impact;
    requireState(raw.primary==='moon'&&p&&Math.abs(len(raw.position)-MOON.radius)<.01&&Math.abs(p.verticalSpeed)<=2&&Math.abs(p.horizontalSpeed)<=1.5&&Math.abs(p.offset)<=25&&Math.abs(p.angle)<8*Math.PI/180&&parts.service.legCount>=3,'invalid touchdown claim');
    const radial=unit(raw.position),tangent=[-radial[1],radial[0]],offset=wrap(Math.atan2(radial[1],radial[0])-lunarTargetAngle(raw))*MOON.radius;
    requireState(Math.abs(offset-p.offset)<.01&&Math.abs(p.time-raw.time)<1e-6&&Math.abs(wrap(raw.craftAngle-Math.atan2(radial[1],radial[0]))-p.angle)<1e-6&&len(sub(raw.velocity,scale(tangent,MOON_RATE*MOON.radius)))<1e-6,'touchdown record differs from physical state');
  }
  requireState(raw.failure===null||typeof raw.failure==='string'&&raw.failure.length<=2000,'invalid failure message');
  requireState(typeof raw.event==='string'&&raw.event.length<=2000&&Array.isArray(raw.events)&&raw.events.length<=80,'invalid event history');
  requireState(raw.events.every(e=>e&&bounded(e.time,0,raw.time)&&typeof e.message==='string'&&e.message.length<=2000),'invalid event entry');
  requireState(Array.isArray(raw.track)&&raw.track.length<=1800&&raw.track.every(p=>vector(p))&&bounded(raw.lastTrack,0,raw.time),'invalid trajectory history');
  for(const k of ['phase','primary','time','sequenceTime','stageIndex','position','velocity','craftAngle','commandedThrottle','guide','handedOver','windowError','fuelUsed','deltaVUsed','failure','event','events','track','lastTrack'])m[k]=structuredClone(raw[k]);
  m.throttle=0; // Restored checkpoints wait for a fresh control input.
  return m;
}
export function validateLunarMission(raw){try{restoreLunarMission(raw);return true;}catch{return false;}}
export function serializeLunarMission(m){const value=JSON.parse(JSON.stringify(m));restoreLunarMission(value);return value;}
