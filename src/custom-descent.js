// A clearly separate surface rehearsal using the player's actual retained stage.
import { validateVehicleDesign, evaluateDesign } from './vehicle-design.js';
import { getPracticeSites } from './mission-sites.js';
import { createVehicleConfig, resolveConfig } from './catalog.js';
import { getDestination } from './destinations.js';
import { landingAtmosphere } from './landing.js';
const G0=9.80665,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createCustomDescent(design,destination='europa',siteId='survey-plain'){
  design=validateVehicleDesign(design);const p=resolveConfig(createVehicleConfig(design)),d=getDestination(destination);
  if(!d)throw new Error('Unknown destination.');if(!getPracticeSites(destination).some(site=>site.id===siteId))throw new Error('Unknown training site.');
  return {version:1,kind:'custom-descent',design,destination,siteId,phase:'landing',time:0,position:[80,d.gravity<.02?120:800],velocity:[0,d.gravity<.02?-.35:-12],angle:0,
    dryMass:p.capsule.dryMass+p.service.dryMass+p.cargo.dryMass+p.service.rcsFuel,fuel:p.service.propellant,initialFuel:p.service.propellant,
    maxThrust:p.service.thrustVac,isp:p.service.ispVac,throttle:0,fuelUsed:0,legCount:p.service.legCount,impact:null,event:'Local surface rehearsal. Interplanetary transfer has been skipped.',failure:null};
}
export function stepCustomDescent(s,input={},duration=1/60){
  if(s.phase!=='landing'||!Number.isFinite(duration)||duration<=0)return s;
  const d=getDestination(s.destination),count=Math.ceil(Math.min(duration,30)/(1/60)),dt=Math.min(duration,30)/count;
  for(let i=0;i<count&&s.phase==='landing';i++){
    const mass=s.dryMass+s.fuel,g=d.mu/(d.radius+Math.max(0,s.position[1]))**2,maxA=s.maxThrust/mass;
    let power=input.throttle??1,angle=s.angle;
    if(input.guidance!==false){
      const vx=clamp(-s.position[0]/20,-3,3),vy=-Math.max(.35,Math.min(10,s.position[1]/22,.45*Math.sqrt(2*Math.max(.01,maxA-g)*s.position[1])));
      const ax=(vx-s.velocity[0])/3,ay=g+(vy-s.velocity[1])/3;
      angle=Math.atan2(ax,ay);power=clamp(Math.hypot(ax,ay)/maxA,0,1)*(input.throttle??1);
    }else angle=clamp(angle+(input.turn??0)*dt*.3,-Math.PI*.6,Math.PI*.6);
    const wanted=s.maxThrust*clamp(power,0,1),burn=Math.min(s.fuel,wanted/(s.isp*G0)*dt),thrust=burn>0?burn/dt*s.isp*G0:0;
    s.fuel-=burn;s.fuelUsed+=burn;s.angle=angle;s.throttle=thrust/s.maxThrust;
    const density=landingAtmosphere(s.destination,s.position[1]),speed=Math.hypot(...s.velocity),drag=s.velocity.map(v=>-.5*density*1.2*12*speed*v/mass);
    const a=[Math.sin(angle)*thrust/mass+drag[0],Math.cos(angle)*thrust/mass-g+drag[1]];
    s.position=s.position.map((v,j)=>v+s.velocity[j]*dt+.5*a[j]*dt*dt);s.velocity=s.velocity.map((v,j)=>v+a[j]*dt);s.time+=dt;
    if(s.position[1]<=0){s.position[1]=0;s.impact={verticalSpeed:s.velocity[1],horizontalSpeed:s.velocity[0],offset:s.position[0],angle:s.angle,speed:Math.hypot(...s.velocity),time:s.time};
      const safe=Math.abs(s.velocity[1])<=2&&Math.abs(s.velocity[0])<=1.5&&Math.abs(s.position[0])<=25&&Math.abs(s.angle)<=8*Math.PI/180&&s.legCount>=3;
      s.phase=safe?'landed':'failed';s.failure=safe?null:'Unsafe contact: check contact speeds, pad offset, tilt and installed landing legs.';s.event=safe?'Touchdown confirmed. Your assembled spacecraft is secure.':s.failure;s.throttle=0;
    }else if(s.position[1]>10000||Math.abs(s.position[0])>4000){s.phase='failed';s.failure='The spacecraft left the local surface exercise.';s.event=s.failure;s.throttle=0;}
  }return s;
}
export function getCustomDescentTelemetry(s){const d=getDestination(s.destination),g=d.mu/(d.radius+Math.max(0,s.position[1]))**2,mass=s.dryMass+s.fuel;return {phase:s.phase,time:s.time,altitude:s.position[1],primary:s.destination,distanceToMoon:null,padOffset:s.position[0],verticalSpeed:s.velocity[1],horizontalSpeed:s.velocity[0],speed:Math.hypot(...s.velocity),mass,fuel:s.fuel,totalFuel:s.fuel,fuelUsed:s.fuelUsed,throttle:s.throttle,maxThrust:s.maxThrust,stageIndex:2,pitch:s.angle,craftAngle:s.angle,bodyGravity:g,impact:s.impact,failure:s.failure,event:s.event,positionLocal:s.position,velocityLocal:s.velocity,remainingDeltaV:s.isp*G0*Math.log(mass/s.dryMass),hoverThrottle:mass*g/s.maxThrust};}
export function restoreCustomDescent(raw){
  if(!raw||raw.kind!=='custom-descent'||raw.version!==1||raw.phase!=='landing')throw new Error('Invalid surface checkpoint.');
  const s=createCustomDescent(raw.design,raw.destination,raw.siteId);
  for(const key of ['position','velocity'])if(!Array.isArray(raw[key])||raw[key].length!==2||raw[key].some(v=>!Number.isFinite(v)||Math.abs(v)>1e6))throw new Error('Invalid saved motion.');
  if(raw.position[1]<0||raw.position[1]>10000||Math.abs(raw.position[0])>4000)throw new Error('Invalid saved altitude or offset.');
  if(!Number.isFinite(raw.fuel)||raw.fuel<0||raw.fuel>s.initialFuel||!Number.isFinite(raw.time)||raw.time<0||raw.time>86400||!Number.isFinite(raw.angle)||Math.abs(raw.angle)>Math.PI)throw new Error('Invalid saved resources.');
  for(const key of ['position','velocity','fuel','time','angle','phase'])s[key]=structuredClone(raw[key]);s.fuelUsed=s.initialFuel-s.fuel;s.event='Checkpoint restored. Controls released.';return s;
}
