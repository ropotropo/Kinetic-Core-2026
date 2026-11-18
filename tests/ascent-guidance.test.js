import test from 'node:test';
import assert from 'node:assert/strict';
import { createLaunch, stepLaunch, separateStage, getLaunchTelemetry, EARTH, ORBIT_TARGET } from '../src/physics.js';
import { createLunarDesign } from '../src/vehicle-design.js';
import { createLunarMission, stepLunarMission, getLunarMissionTelemetry, separateMissionStage, beginLunarDeparture } from '../src/lunar-mission.js';
import { advanceToStageBoundary, needsStageRelease, getEngineReadout, getAscentGuidance } from '../src/ascent-guidance.js';
const input = { throttle: 1, guidance: true };
function holdAtBurnout(warp) {
  const flight = createLaunch();
  for (let i = 0; i < 20000; i++) {
    const result = advanceToStageBoundary(flight, input, warp / 30);
    if (result.held) return flight;
    assert.notEqual(flight.phase, 'failed');
  }
  assert.fail('No depletion boundary');
}
test('1× and 10× caller frames stop at the same physical burnout before failure', () => {
  const normal = holdAtBurnout(1), fast = holdAtBurnout(10);
  for (const flight of [normal, fast]) {
    assert.equal(flight.phase, 'launch'); assert.equal(flight.stageIndex, 0); assert.equal(flight.stages[0].fuel, 0);
    const snapshot = structuredClone(flight);
    assert.equal(advanceToStageBoundary(flight, input, 10).advanced, 0);
    assert.deepEqual(flight, snapshot, 'the held boundary cannot coast to impact or burn another stage');
  }
  assert.ok(Math.abs(normal.time - fast.time) < 1e-8);
  assert.ok(Math.abs(getLaunchTelemetry(normal).altitude - getLaunchTelemetry(fast).altitude) < 1e-6);
});
test('manual release resumes a finite-fuel ascent to the existing physical orbit condition', () => {
  const flight = holdAtBurnout(10), velocity = flight.velocity.slice();
  assert.equal(separateStage(flight).ok, true); assert.deepEqual(flight.velocity, velocity); assert.equal(needsStageRelease(flight), false);
  for (let i = 0; i < 2000 && flight.phase === 'launch'; i++) advanceToStageBoundary(flight, input, 1 / 3);
  assert.equal(flight.phase, 'orbit', flight.failure); assert.ok(getAscentGuidance(flight).orbitConfirmed);
  assert.ok(flight.stages[1].fuel > 0); assert.equal(flight.stageIndex, 1, 'no automatic upper-stage separation');
});
test('burn estimate uses actual active-stage fuel and instantaneous physical mass flow', () => {
  const flight = createLaunch(); stepLaunch(flight, input, 10);
  const telemetry = getLaunchTelemetry(flight), readout = getEngineReadout(flight, telemetry);
  assert.equal(readout.fuel, flight.stages[0].fuel); assert.ok(readout.burnSeconds > 0);
  const before = readout.fuel; stepLaunch(flight, input, 1 / 60);
  assert.ok(Math.abs((before - flight.stages[0].fuel) / (1 / 60) - readout.massFlow) / readout.massFlow < .001);
  const off = getEngineReadout(flight, { ...getLaunchTelemetry(flight), thrust: 0 }); assert.equal(off.burnSeconds, null);
});
test('high altitude and an escape trajectory never become a completed orbit reference', () => {
  const flight = createLaunch(), radius = EARTH.radius + ORBIT_TARGET * 2;
  flight.position = [radius, 0]; flight.velocity = [0, Math.sqrt(EARTH.mu / radius) * 1.6]; flight.liftoff = true;
  const guide = getAscentGuidance(flight);
  assert.equal(guide.altitudeFraction, 1); assert.equal(guide.orbitConfirmed, false); assert.match(guide.next, /altitude alone is not orbit/);
});
test('integrated ascent also splits 10× frames at depletion and requires explicit release', () => {
  const mission = createLunarMission(createLunarDesign()); stepLunarMission(mission, input, 8);
  for (let i = 0; i < 2000 && !needsStageRelease(mission); i++) advanceToStageBoundary(mission, input, 1 / 3, stepLunarMission);
  assert.equal(needsStageRelease(mission), true); assert.equal(mission.phase, 'launch');
  const snapshot = structuredClone(mission); assert.equal(advanceToStageBoundary(mission, input, 1, stepLunarMission).advanced, 0);
  assert.deepEqual(mission, snapshot); assert.equal(separateMissionStage(mission).ok, true);
  advanceToStageBoundary(mission, input, 1 / 60, stepLunarMission);
  assert.ok(getLunarMissionTelemetry(mission).throttle > 0); assert.equal(needsStageRelease(mission), false);
});

test('critical phases cap actual time at 1× without discarding the selected coast rate', async () => {
  const { getFlightTimePolicy } = await import('../src/ascent-guidance.js');
  for (const phase of ['rollout', 'countdown', 'launch', 'departure', 'lunar-approach', 'capture', 'descent', 'landing']) {
    const policy = getFlightTimePolicy({ kind: 'lunar-mission', phase }, 50000);
    assert.equal(policy.requested, 50000); assert.equal(policy.applied, 1, phase); assert.equal(policy.coasting, false);
  }
  for (const kind of ['launch', 'landing', 'custom-descent', 'docking']) assert.equal(getFlightTimePolicy({ kind, phase: kind }, 10).applied, 1);
});
test('safe coast can accelerate, then capture restores 1× with the selected coast rate intact', async () => {
  const { getFlightTimePolicy } = await import('../src/ascent-guidance.js');
  const mission = { kind: 'lunar-mission', phase: 'coast', primary: 'earth' };
  assert.equal(getFlightTimePolicy(mission, 50000).applied, 50000);
  mission.phase = 'lunar-coast'; mission.primary = 'moon';
  assert.equal(getFlightTimePolicy(mission, 50000, { altitude: 200000, guidance: true }).applied, 5000);
  assert.equal(getFlightTimePolicy(mission, 50000, { altitude: 200000, guidance: false }).applied, 1);
  mission.phase = 'capture'; const capture = getFlightTimePolicy(mission, 50000);
  assert.equal(capture.applied, 1); assert.equal(capture.requested, 50000);
});


test('a large coast budget stops at departure rather than applying warp to the burn', async () => {
  const { getFlightTimePolicy } = await import('../src/ascent-guidance.js');
  const mission = createLunarMission(createLunarDesign());
  for (let i = 0; i < 1000 && mission.phase !== 'orbit'; i++) {
    if (needsStageRelease(mission)) separateMissionStage(mission);
    advanceToStageBoundary(mission, input, 1, stepLunarMission);
  }
  assert.equal(mission.phase, 'orbit'); assert.equal(beginLunarDeparture(mission), true);
  const beforeFuel = getLunarMissionTelemetry(mission).totalFuel;
  let result;
  for (let i = 0; i < 20 && mission.phase === 'window'; i++) result = advanceToStageBoundary(mission, input, 10000, stepLunarMission);
  assert.equal(mission.phase, 'departure'); assert.equal(result.phaseChanged, true);
  assert.ok(beforeFuel - getLunarMissionTelemetry(mission).totalFuel < 1, 'only the sub-millisecond transition boundary may enter the burn');
  const policy = getFlightTimePolicy(mission, 50000); assert.equal(policy.applied, 1); assert.equal(policy.requested, 50000);
  const beforeTime = mission.time; advanceToStageBoundary(mission, input, policy.applied / 60, stepLunarMission);
  assert.ok(Math.abs(mission.time - beforeTime - 1 / 60) < 1e-8);
});
