import test from 'node:test';
import assert from 'node:assert/strict';
import { getMissionJourney, getRetainedSpacecraftBudget } from '../src/mission-journey.js';
import { createCustomDescent } from '../src/custom-descent.js';
import { DESTINATIONS } from '../src/destinations.js';
import { createLunarDesign } from '../src/vehicle-design.js';
import { createLunarMission, getLunarMissionTelemetry, stepLunarMission, separateMissionStage, beginLunarDeparture } from '../src/lunar-mission.js';
const lunar = (phase, extra = {}) => ({ kind: 'lunar-mission', phase, handedOver: true, resources: {}, primary: 'earth', ...extra });
const stateNames = result => result.steps.map(step => step.state);

test('the visible journey derives from flight phases, never elapsed time', () => {
  const groups = [
    ['rollout', 'countdown', 'launch'],
    ['orbit', 'window', 'departure', 'coast', 'lunar-approach', 'lunar-coast'],
    ['capture', 'lunar-orbit'],
    ['descent', 'landing'],
  ];
  groups.forEach((phases, index) => phases.forEach(phase => {
    const m = lunar(phase);
    const expected = groups.map((_, i) => i < index ? 'complete' : i === index ? 'current' : 'upcoming');
    assert.deepEqual(stateNames(getMissionJourney(m, { fuel: 10 })), expected, phase);
    assert.deepEqual(stateNames(getMissionJourney({ ...m, time: 1e9 }, { fuel: 10 })), expected, `${phase} after arbitrary elapsed time`);
  }));
  assert.deepEqual(stateNames(getMissionJourney(lunar('landed'))), ['complete', 'complete', 'complete', 'complete']);
});

test('a surface rehearsal never claims completed launch, transfer or orbit', () => {
  for (const phase of ['landing', 'landed', 'failed']) {
    const result = getMissionJourney({ kind: 'custom-descent', phase }, { fuel: 100 });
    assert.equal(result.rehearsal, true);
    assert.deepEqual(stateNames(result).slice(0, 3), ['skipped', 'skipped', 'skipped']);
  }
});

test('manual stage depletion takes precedence over pause and zero ceiling', () => {
  for (const phase of ['launch', 'departure']) {
    const result = getMissionJourney(lunar(phase), { stageReady: true, stageIndex: 1, fuel: 0 }, { paused: true, power: 0 });
    assert.equal(result.action, 'stage');
    assert.equal(result.label, 'Separate upper stage');
    assert.equal(result.urgent, true);
  }
  assert.equal(getMissionJourney(lunar('launch'), { stageReady: true, stageIndex: 0, fuel: 0 }).label, 'Separate booster');
  assert.equal(getMissionJourney(lunar('capture'), { stageReady: true, stageIndex: 2, fuel: 0 }, { paused: true }).action, 'restore');
});

test('Earth orbit with an attached core cannot present departure planning as ready', () => {
  const result = getMissionJourney(lunar('orbit', { resources: null }), { stageIndex: 0, fuel: 100 });
  assert.equal(result.action, 'stage');
  assert.equal(result.label, 'Release core stage');
  assert.equal(getMissionJourney(lunar('orbit'), { stageIndex: 1, fuel: 100 }).action, 'depart');
});

test('restore with zero ceiling asks for deliberate power before resuming a burn', () => {
  const mission = lunar('landing');
  assert.equal(getMissionJourney(mission, { fuel: 10 }, { power: 0, paused: true }).action, 'power');
  assert.equal(getMissionJourney(mission, { fuel: 10 }, { power: 1, paused: true }).action, 'resume');
});

test('coast actions recommend actual warp without inventing a burn or a completion', () => {
  for (const [phase, targetWarp] of [['window', 1000], ['coast', 50000], ['lunar-coast', 1000], ['lunar-orbit', 1000]]) {
    const slow = getMissionJourney(lunar(phase), {}, { warp: 1 });
    assert.equal(slow.action, 'warp'); assert.equal(slow.targetWarp, targetWarp);
    const fast = getMissionJourney(lunar(phase), {}, { warp: targetWarp });
    assert.equal(fast.action, null); assert.equal(fast.steps.at(-1).state, 'upcoming');
  }
});

test('failed flight retains the last observed phase and never infers lunar capture from a Moon frame', () => {
  assert.deepEqual(stateNames(getMissionJourney(lunar('failed', { primary: 'moon' }), {}, { lastPhase: 'lunar-approach' })), ['complete', 'failed', 'upcoming', 'upcoming']);
  assert.deepEqual(stateNames(getMissionJourney(lunar('failed', { primary: 'moon' }))), ['complete', 'failed', 'upcoming', 'upcoming']);
  assert.deepEqual(stateNames(getMissionJourney(lunar('failed'), {}, { lastPhase: 'landing' })), ['complete', 'complete', 'complete', 'failed']);
});

test('a real lunar mission presents staging, departure and physical phase transitions coherently', () => {
  const mission = createLunarMission(createLunarDesign());
  assert.equal(getMissionJourney(mission, getLunarMissionTelemetry(mission)).action, 'skip-rollout');
  let releases = 0;
  for (let i = 0; i < 700 && mission.phase !== 'orbit' && mission.phase !== 'failed'; i++) {
    const telemetry = getLunarMissionTelemetry(mission);
    const result = getMissionJourney(mission, telemetry);
    if (result.action === 'stage') { assert.equal(separateMissionStage(mission).ok, true); releases++; }
    stepLunarMission(mission, { throttle: 1, guidance: true }, 1);
  }
  assert.equal(mission.phase, 'orbit'); assert.equal(releases, 1);
  assert.equal(getMissionJourney(mission, getLunarMissionTelemetry(mission)).action, 'depart');
  assert.equal(beginLunarDeparture(mission), true);
  const window = getMissionJourney(mission, getLunarMissionTelemetry(mission), { warp: 1 });
  assert.equal(window.activeStep, 1); assert.equal(window.action, 'warp');
  assert.deepEqual(stateNames(window), ['complete', 'current', 'upcoming', 'upcoming']);
});


test('planner retained mass and surface TWR match the actual default lunar spacecraft', () => {
  const design = createLunarDesign();
  const moon = DESTINATIONS.find(destination => destination.id === 'moon');
  const flight = createCustomDescent(design, 'moon');
  const budget = getRetainedSpacecraftBudget(design, moon.gravity);
  const actualMass = flight.dryMass + flight.fuel;
  assert.equal(budget.retainedMass, actualMass);
  assert.equal(budget.surfaceTwr, flight.maxThrust / (actualMass * moon.gravity));
  assert.ok(Number.isFinite(budget.retainedMass) && budget.retainedMass > 0);
  assert.ok(Number.isFinite(budget.surfaceTwr) && budget.surfaceTwr > 1);
});

test('optional catalog cargo raises retained mass and reduces surface TWR', () => {
  const design = createLunarDesign(), gravity = DESTINATIONS.find(destination => destination.id === 'moon').gravity;
  const crew = getRetainedSpacecraftBudget(design, gravity);
  const science = getRetainedSpacecraftBudget(design, gravity, { cargo: 'science' });
  const supplies = getRetainedSpacecraftBudget(design, gravity, { cargo: 'supplies' });
  assert.equal(science.retainedMass - crew.retainedMass, 2000);
  assert.equal(supplies.retainedMass - crew.retainedMass, 8000);
  assert.ok(supplies.surfaceTwr < science.surfaceTwr && science.surfaceTwr < crew.surfaceTwr);
  assert.ok(Math.abs(science.surfaceTwr * science.retainedMass - crew.surfaceTwr * crew.retainedMass) < 1e-9);
});
