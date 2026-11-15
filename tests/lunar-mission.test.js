import test from 'node:test';
import assert from 'node:assert/strict';
import { createLunarDesign, getVehicleLayout } from '../src/vehicle-design.js';
import { resolveConfig } from '../src/catalog.js';
import { EARTH, evaluateVehicle } from '../src/physics.js';
import { LUNAR_SITES } from '../src/mission-sites.js';
import {
  MOON, createLunarMission, stepLunarMission, separateMissionStage,
  beginLunarDeparture, getLunarMissionTelemetry, getMissionWorldState,
  missionMass, moonState, enterLunarFrame, lunarOrbitElements,
  restoreLunarMission, serializeLunarMission, validateLunarMission,
} from '../src/lunar-mission.js';

const close = (a,b,tolerance=1e-7) => assert.ok(Math.abs(a-b)<=tolerance,`${a} vs ${b} (±${tolerance})`);
const vecClose = (a,b,tolerance=1e-7) => a.forEach((value,i)=>close(value,b[i],tolerance));
function pilotStages(m){
  if(m.phase==='launch'&&m.launch.stages[m.stageIndex]?.fuel<=1e-8)return separateMissionStage(m).ok?1:0;
  if(m.resources?.upperAttached&&m.resources.upperFuel<=1e-8)return separateMissionStage(m).ok?1:0;
  return 0;
}
function reachOrbit(site='tranquility'){
  const m=createLunarMission(createLunarDesign(),site);
  for(let i=0;i<700&&m.phase!=='orbit'&&m.phase!=='failed';i++){
    pilotStages(m);stepLunarMission(m,{throttle:1,guidance:true},1);
  }
  assert.equal(m.phase,'orbit',m.failure||'did not reach orbit');
  return m;
}
function checkMassLedger(m,initialMass){
  const t=getLunarMissionTelemetry(m);
  close(initialMass-t.fuelUsed-t.discardedMass,missionMass(m),.001);
  if(m.resources){assert.ok(m.resources.serviceFuel>=0&&m.resources.upperFuel>=0);}
}
function flyMission(site,moonStep=1000,restoreTransitions=false){
  let m=createLunarMission(createLunarDesign(),site),last=m.phase,separations=0;
  const initialMass=missionMass(m),phases=new Set([m.phase]);
  for(let i=0;i<30000&&!['landed','failed'].includes(m.phase);i++){
    if(m.phase==='orbit')assert.equal(beginLunarDeparture(m),true);
    separations+=pilotStages(m);
    const dt=['rollout','countdown','launch','departure'].includes(m.phase)?1:m.phase==='window'?10:moonStep;
    stepLunarMission(m,{throttle:1,guidance:true},dt);
    checkMassLedger(m,initialMass);phases.add(m.phase);
    if(restoreTransitions&&m.phase!==last){
      const before=getMissionWorldState(m),mass=missionMass(m);
      m=restoreLunarMission(serializeLunarMission(m));
      vecClose(getMissionWorldState(m).position,before.position,1e-6);
      vecClose(getMissionWorldState(m).velocity,before.velocity,1e-10);
      close(missionMass(m),mass);assert.equal(m.throttle,0);
    }
    last=m.phase;
    assert.ok(m.time<14*86400,'mission did not finish inside the encounter window');
  }
  return {m,phases,separations};
}
function localFixture(phase='landing'){
  const m=reachOrbit();separateMissionStage(m);
  m.primary='moon';m.phase=phase;m.time=10000;
  m.position=[MOON.radius+200000,0];m.velocity=[0,Math.sqrt(MOON.mu/(MOON.radius+200000))];
  m.craftAngle=0;m.guide=false;
  return m;
}

test('rollout and countdown are exactly 3+5 seconds with no engine burn',()=>{
  const m=createLunarMission(createLunarDesign()),fuel=m.launch.stages[0].fuel,position=[...m.position];
  assert.equal(separateMissionStage(m).ok,false);
  stepLunarMission(m,{throttle:0,guidance:false},3);
  assert.equal(m.phase,'countdown');close(m.sequenceTime,0);close(m.time,0);
  stepLunarMission(m,{throttle:0,guidance:false},5);
  assert.equal(m.phase,'launch');close(m.time,0);close(m.launch.stages[0].fuel,fuel);
  assert.equal(m.launch.engineOn,false);assert.deepEqual(m.position,position);
  for(let i=0;i<1000&&!m.handedOver;i++)stepLunarMission(m,{throttle:0,guidance:false},1/60);
  assert.equal(m.handedOver,true);
  const t=getLunarMissionTelemetry(m);assert.ok(t.altitude>=100&&t.altitude<102);
  assert.ok(m.launch.stages[0].fuel<fuel,'the first 100m use actual rocket thrust');
  const remaining=m.launch.stages[0].fuel;
  stepLunarMission(m,{throttle:0,guidance:false},1);
  close(m.launch.stages[0].fuel,remaining,1e-7,'the pilot can close the engine after handover');
});

test('actual Earth orbit preserves the loaded spacecraft and requires manual staging',()=>{
  const m=reachOrbit(),t=getLunarMissionTelemetry(m),craft=resolveConfig(m.config);
  assert.equal(m.stageIndex,1);assert.equal(m.resources.upperAttached,true);
  assert.ok(t.orbit.energy<0&&t.orbit.periapsis>=150000);
  assert.ok(m.time>400&&m.time<600);
  close(m.resources.serviceFuel,craft.service.propellant);
  close(missionMass(m),m.launch.payloadMass+m.launch.stages[1].dryMass+m.launch.stages[1].fuel);
  const fuel=m.resources.serviceFuel+m.resources.upperFuel;
  stepLunarMission(m,{throttle:1,guidance:true},50);
  close(m.resources.serviceFuel+m.resources.upperFuel,fuel);
  assert.equal(m.stageIndex,1,'coasting never auto-jettisons a stage');
});

test('an attached core in a reference orbit is retained until explicit pilot separation',()=>{
  const m=createLunarMission(createLunarDesign());
  // Reference orbital initial condition, exercising a high-performance custom
  // core edge case without pretending the default core could fly this ascent.
  const r=EARTH.radius+200000;
  m.launch.position=[r,0];m.launch.velocity=[0,Math.sqrt(EARTH.mu/r)];m.launch.liftoff=true;
  stepLunarMission(m,{throttle:0,guidance:true},8);
  m.handedOver=true;stepLunarMission(m,{throttle:0,guidance:true},.1);
  assert.equal(m.phase,'orbit');assert.equal(m.resources,null);
  const mass=missionMass(m),position=[...m.position],velocity=[...m.velocity];
  assert.equal(beginLunarDeparture(m),false);close(missionMass(m),mass);
  const result=separateMissionStage(m);
  assert.equal(result.ok,true);assert.ok(m.resources&&m.resources.upperAttached);
  close(mass-missionMass(m),result.discardedMass);
  vecClose(m.position,position);vecClose(m.velocity,velocity);
  assert.equal(beginLunarDeparture(m),true);
});

test('all four named pads are reached by the same finite-fuel vehicle, including restored checkpoints',()=>{
  for(const [i,site] of LUNAR_SITES.entries()){
    const {m,phases,separations}=flyMission(site.id,i===0?120:1000,i===0);
    assert.equal(m.phase,'landed',`${site.id}: ${m.failure}`);
    assert.equal(separations,2,'the test pilot releases only the exhausted core and upper stages');
    assert.ok(m.time>48*3600&&m.time<6*86400);
    assert.ok(m.resources.serviceFuel>1800&&m.resources.serviceFuel<2300);
    assert.equal(m.resources.upperFuel,0);assert.equal(m.resources.upperAttached,false);
    assert.ok(Math.abs(m.impact.verticalSpeed)<1&&Math.abs(m.impact.horizontalSpeed)<.2);
    assert.ok(Math.abs(m.impact.offset)<2&&Math.abs(m.impact.angle)<Math.PI/180);
    close(Math.hypot(...m.position),MOON.radius,1e-6);
    assert.deepEqual(getVehicleLayout(m.design),getVehicleLayout(createLunarDesign()));
    assert.ok(phases.has('capture')||m.events.some(e=>e.message.includes('capture burn')));
    assert.ok(m.events.some(e=>e.message.includes('ballistic approach')));
    assert.ok(m.events.some(e=>e.message.includes('Lunar orbit established')));
    assert.ok(m.events.some(e=>e.message.includes('Powered descent begins')));
    assert.equal(validateLunarMission(serializeLunarMission(m)),true);
  }
});

test('changing lunar coordinates preserves inertial position, velocity, time and fuel exactly',()=>{
  const m=reachOrbit();assert.equal(beginLunarDeparture(m),true);
  // A reference fixture exactly on the SOI; production never writes these states.
  m.phase='coast';m.time=123456;
  const moon=moonState(m.time);
  m.position=[moon.position[0]-MOON.soi,moon.position[1]];
  m.velocity=[moon.velocity[0]+900,moon.velocity[1]-200];
  const before=getMissionWorldState(m),fuel=JSON.stringify(m.resources),mass=missionMass(m),time=m.time;
  assert.equal(enterLunarFrame(m),true);assert.equal(m.primary,'moon');
  const after=getMissionWorldState(m);
  vecClose(after.position,before.position,1e-7);vecClose(after.velocity,before.velocity,1e-12);
  assert.equal(m.time,time);assert.equal(JSON.stringify(m.resources),fuel);close(missionMass(m),mass);
});

test('48 hours of local ballistic coast conserve energy and angular momentum without fuel',()=>{
  const m=localFixture('lunar-coast'),before=lunarOrbitElements(m.position,m.velocity),fuel=m.resources.serviceFuel;
  stepLunarMission(m,{guidance:false,throttle:0},86400);
  stepLunarMission(m,{guidance:false,throttle:0},86400);
  const after=lunarOrbitElements(m.position,m.velocity);
  assert.ok(Math.abs((after.energy-before.energy)/before.energy)<1e-7);
  assert.ok(Math.abs((after.angularMomentum-before.angularMomentum)/before.angularMomentum)<1e-11);
  close(m.resources.serviceFuel,fuel);close(m.time,10000+172800,1e-5);
});

test('vacuum thrust uses actual mass flow and a depleted tank cannot make force',()=>{
  const m=localFixture(),fuel=m.resources.serviceFuel,mass=missionMass(m),burn=m.fuelUsed;
  const expected=m.resources.serviceThrust*.4/(m.resources.serviceIsp*EARTH.g0)*2;
  stepLunarMission(m,{guidance:false,throttle:.4},2);
  close(fuel-m.resources.serviceFuel,expected,1e-7);close(mass-missionMass(m),expected,1e-7);
  close(m.fuelUsed-burn,expected,1e-7);
  m.resources.serviceFuel=0;
  const emptyMass=missionMass(m);
  stepLunarMission(m,{guidance:false,throttle:1},2);
  assert.equal(m.resources.serviceFuel,0);assert.equal(m.throttle,0);close(missionMass(m),emptyMass);
});

test('manual departure preserves the pilot pointing direction instead of enforcing prograde guidance',()=>{
  const m=reachOrbit();beginLunarDeparture(m);m.phase='departure';m.craftAngle=0;
  const fuel=m.resources.upperFuel;
  stepLunarMission(m,{guidance:false,throttle:.2,turn:0},.5);
  assert.equal(m.guide,false);close(m.craftAngle,0);
  assert.ok(m.resources.upperFuel<fuel);
});

test('ground contact is solved at the crossing time and preserves unsafe impact speed',()=>{
  const m=localFixture();m.position=[MOON.radius+10,0];m.velocity=[-5,0];m.resources.serviceFuel=0;
  const start=m.time,g=MOON.mu/MOON.radius**2,expected=(Math.sqrt(25+2*g*10)-5)/g;
  stepLunarMission(m,{guidance:false,throttle:1},100);
  assert.equal(m.phase,'failed');close(m.time-start,expected,.0001);
  close(Math.hypot(...m.position),MOON.radius,1e-6);
  assert.ok(m.impact.verticalSpeed<-7&&Math.hypot(...m.velocity)>7);
  close(m.impact.time,m.time);assert.equal(m.resources.serviceFuel,0);
});

test('manual no-input flight fails physically after the mandatory first-100m handover',()=>{
  const m=createLunarMission(createLunarDesign());
  for(let i=0;i<300&&m.phase!=='failed';i++)stepLunarMission(m,{guidance:false,throttle:0,turn:0},1);
  assert.equal(m.handedOver,true);assert.equal(m.phase,'failed');
  assert.match(m.launch.failure,/surface impact/i);
  assert.ok(m.time<100);assert.ok(m.launch.fuelUsed>0);
});

test('mission restoration preserves physical state and rebuilds untrusted hardware constants',()=>{
  const m=reachOrbit(),raw=serializeLunarMission(m),mass=missionMass(m),parts=resolveConfig(m.config);
  raw.resources.dryMass=1;raw.resources.serviceThrust=1e20;raw.resources.serviceIsp=99999;
  raw.resources.upperThrust=1;raw.resources.upperDry=1;raw.launch.stages[0].dryMass=1;
  const restored=restoreLunarMission(raw);
  close(missionMass(restored),mass);vecClose(restored.position,m.position);vecClose(restored.velocity,m.velocity);
  assert.equal(restored.resources.serviceThrust,parts.service.thrustVac);
  assert.equal(restored.resources.upperDry,parts.upper.dryMass);
  assert.deepEqual(restored.design,m.design);assert.equal(restored.throttle,0);
  for(const change of [
    v=>{v.resources.serviceFuel=-1;},v=>{v.resources.upperFuel+=10;},
    v=>{v.resources.rcsFuel=1e9;},v=>{v.resources.serviceFuel+=1;v.fuelUsed=0;},
    v=>{v.position=[NaN,0];},v=>{v.position=[0,0];},v=>{v.primary='sun';},
    v=>{v.siteId='unknown';},v=>{v.phase='landed';v.primary='moon';},
    v=>{v.design.slots.capsule.radius+=.1;},v=>{v.launch.config.design.slots['core-engine'].thrustVac=1e9;},
    v=>{v.resources=null;v.phase='coast';},v=>{v.time=-1;},
  ]){
    const bad=serializeLunarMission(m);change(bad);
    assert.equal(validateLunarMission(bad),false);
    assert.throws(()=>restoreLunarMission(bad),/checkpoint|design|fields|Invalid/i);
  }
});
