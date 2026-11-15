import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, CATALOG } from '../src/catalog.js';
import {
  EARTH, FIXED_STEP, ORBIT_TARGET, atmosphere, createLaunch, stepLaunch,
  separateStage, getLaunchTelemetry, launchMass, evaluateVehicle,
  orbitalElements, createDocking, stepDocking, getDockingTelemetry,
  relativeAngularVelocity, validateState,
} from '../src/physics.js';

const close = (actual, expected, tolerance, message = '') => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected} (±${tolerance})`);
const advance = (state, step, seconds, input = {}, dt = FIXED_STEP) => {
  const count = Math.round(seconds / dt);
  for (let i = 0; i < count; i++) step(state, input, dt);
};

test('hardware choices change real mass, thrust-to-weight, delta-v and RCS reserve', () => {
  for (const category of ['capsule', 'service', 'core', 'upper']) assert.ok(CATALOG[category].length >= 2);
  const light = evaluateVehicle();
  const heavy = evaluateVehicle({ ...DEFAULT_CONFIG, capsule: 'horizon', cargo: 'supplies' });
  assert.ok(light.valid && heavy.valid);
  assert.ok(heavy.wetMass > light.wetMass);
  assert.ok(heavy.twr < light.twr);
  assert.ok(heavy.deltaV < light.deltaV);
  assert.ok(evaluateVehicle({ ...DEFAULT_CONFIG, service: 'endurance' }).rcsFuel > light.rcsFuel);
});

test('three-layer atmosphere is finite, falls with altitude and vanishes above 100 km', () => {
  assert.ok(atmosphere(0).density > 1.2 && atmosphere(0).density < 1.3);
  assert.ok(atmosphere(11000).density < atmosphere(1000).density);
  assert.ok(atmosphere(40000).density < atmosphere(25000).density);
  assert.equal(atmosphere(100001).density, 0);
});

test('a closed engine consumes no propellant and cannot lift the vehicle', () => {
  const state = createLaunch(), initialFuel = state.stages[0].fuel;
  advance(state, stepLaunch, 20, { throttle: 0 });
  close(state.stages[0].fuel, initialFuel, 1e-9);
  close(Math.hypot(...state.position), EARTH.radius, 0.001);
  assert.equal(state.liftoff, false);
});

test('burned propellant follows thrust/(Isp*g0), even while held on the pad', () => {
  const state = createLaunch(), core = state.stages[0], initial = core.fuel;
  advance(state, stepLaunch, 1, { throttle: 0.4, guidance: false });
  const expected = core.thrustSea * 0.4 / (core.ispSea * EARTH.g0);
  close(initial - core.fuel, expected, 0.002);
  assert.equal(state.liftoff, false);
});

test('stage separation releases dry structure and unburned propellant without changing velocity', () => {
  const state = createLaunch();
  assert.equal(separateStage(state).ok, false, 'staging is inhibited on the pad');
  advance(state, stepLaunch, 2, { throttle: 1 });
  const beforeMass = launchMass(state), velocity = state.velocity.slice();
  const discarded = state.stages[0].dryMass + state.stages[0].fuel;
  const result = separateStage(state);
  assert.ok(result.ok);
  close(beforeMass - launchMass(state), discarded, 1e-8);
  assert.deepEqual(state.velocity, velocity);
  assert.equal(state.stageIndex, 1);
  assert.equal(state.stages[0].attached, false);
});

test('ballistic circular orbit conserves energy and angular momentum in vacuum', () => {
  const state = createLaunch();
  const radius = EARTH.radius + 400000;
  state.position = [radius, 0]; state.velocity = [0, Math.sqrt(EARTH.mu / radius)]; state.liftoff = true;
  const before = orbitalElements(state.position, state.velocity);
  advance(state, stepLaunch, 600, { throttle: 0, guidance: false });
  const after = orbitalElements(state.position, state.velocity);
  assert.ok(Math.abs((after.energy - before.energy) / before.energy) < 1e-9);
  assert.ok(Math.abs((after.angularMomentum - before.angularMomentum) / before.angularMomentum) < 1e-10);
  close(Math.hypot(...state.position), radius, 0.03);
});

test('an escape trajectory is never described as a bound orbit', () => {
  const state = createLaunch();
  const radius = EARTH.radius + ORBIT_TARGET;
  state.position = [radius, 0]; state.velocity = [0, 1.6 * Math.sqrt(EARTH.mu / radius)]; state.liftoff = true;
  stepLaunch(state, { throttle: 0 }, FIXED_STEP);
  assert.ok(state.orbit.energy > 0);
  assert.equal(state.phase, 'launch');
});

test('guided default ascent reaches an actual orbit; staging remains a pilot action', () => {
  const state = createLaunch();
  let separationCount = 0;
  for (let i = 0; i < 700 * 60 && state.phase === 'launch'; i++) {
    stepLaunch(state, { throttle: 1, guidance: true }, FIXED_STEP);
    if (state.stages[state.stageIndex]?.fuel === 0) { separateStage(state); separationCount++; }
  }
  const t = getLaunchTelemetry(state);
  assert.equal(state.phase, 'orbit', state.failure || 'did not establish orbit');
  assert.equal(separationCount, 1, 'only exhausted core was manually jettisoned');
  assert.ok(t.periapsis >= 150000);
  assert.ok(t.apoapsis < 350000);
  assert.ok(t.orbit.energy < 0 && t.time < 600);
  assert.equal(state.engineOn, false);
  assert.equal(t.thrust, 0);
  assert.equal(t.canDock, false, 'upper-stage separation is still required');
  const initialFuel = state.stages[1].fuel;
  stepLaunch(state, { throttle: 1, guidance: false }, 1);
  close(state.stages[1].fuel, initialFuel, 1e-9, 'orbital cutoff is latched');
  separateStage(state);
  assert.equal(getLaunchTelemetry(state).canDock, true);
});

test('a depleted attached core does not auto-stage', () => {
  const state = createLaunch();
  advance(state, stepLaunch, 160, { throttle: 1, guidance: true });
  assert.equal(state.stageIndex, 0);
  assert.equal(state.stages[0].fuel, 0);
  assert.equal(state.stages[1].fuel, state.stages[1].propellant);
  assert.equal(state.engineOn, false);
});

test('launch outcomes are independent of display-rate scheduling', () => {
  const a = createLaunch(), b = createLaunch();
  advance(a, stepLaunch, 30, { throttle: 1 }, 1 / 30);
  advance(b, stepLaunch, 30, { throttle: 1 }, 1 / 120);
  close(getLaunchTelemetry(a).altitude, getLaunchTelemetry(b).altitude, 0.2);
  close(getLaunchTelemetry(a).speed, getLaunchTelemetry(b).speed, 0.03);
  close(a.stages[0].fuel, b.stages[0].fuel, 0.05);
});

test('vacuum translation retains momentum without RCS or artificial damping', () => {
  const state = createDocking(DEFAULT_CONFIG, { orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], position: [0, 0, 70], velocity: [0.2, -0.1, 0] });
  state.meanMotion = 0;
  const initialFuel = state.fuel;
  advance(state, stepDocking, 30);
  close(state.position[0], 6, 1e-8); close(state.position[1], -3, 1e-8);
  close(state.velocity[0], 0.2, 1e-12); close(state.velocity[1], -0.1, 1e-12);
  close(state.fuel, initialFuel, 1e-12);
  assert.equal(state.phase, 'docking');
});

test('RCS consumes finite propellant and cannot produce a force after depletion', () => {
  const state = createDocking(DEFAULT_CONFIG, { fuel: 0.01, orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0] });
  state.meanMotion = 0;
  advance(state, stepDocking, 1, { x: 1 });
  assert.equal(state.fuel, 0);
  const velocity = state.velocity.slice();
  advance(state, stepDocking, 5, { x: 1, pitch: 1, holdAttitude: true, brake: true });
  close(state.velocity[0], velocity[0], 1e-12);
  assert.ok(state.lastThrust.every(value => value === 0));
  assert.ok(state.lastTorque.every(value => value === 0));
});

test('hold attitude and translation brake are powered thruster actions', () => {
  const state = createDocking(DEFAULT_CONFIG, { velocity: [0.1, 0, 0] });
  const initialFuel = state.fuel, initialAngle = getDockingTelemetry(state).angle;
  advance(state, stepDocking, 30, { holdAttitude: true, brake: true });
  assert.ok(state.fuel < initialFuel);
  assert.ok(getDockingTelemetry(state).angle < initialAngle / 10);
  assert.ok(getDockingTelemetry(state).relativeSpeed < 0.005);
});

test('a nonspinning inertial body drifts in attitude relative to the orbital frame', () => {
  const state = createDocking(DEFAULT_CONFIG, { orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0] });
  advance(state, stepDocking, 30);
  close(getDockingTelemetry(state).angle, state.meanMotion * 30, 1e-8);
  close(Math.hypot(...state.angularVelocity), 0, 1e-14);
});

test('safe manual approach captures only at the port plane', () => {
  const state = createDocking(DEFAULT_CONFIG, { orientation: [0, 0, 0, 1], position: [0, 0, 0.05], velocity: [0, 0, -0.05] });
  state.meanMotion = 0; state.angularVelocity = [0, 0, 0];
  assert.equal(state.phase, 'docking');
  stepDocking(state, {}, 0.5); assert.equal(state.phase, 'docking');
  stepDocking(state, {}, 1); assert.equal(state.phase, 'docked');
});

test('excess closing speed, offset, attitude or rotation rejects capture', () => {
  const cases = [
    { position: [0, 0, 0.01], velocity: [0, 0, -0.5], orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0] },
    { position: [0.5, 0, 0.01], velocity: [0, 0, -0.05], orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0] },
    { position: [0, 0, 0.01], velocity: [0, 0, -0.05], orientation: [Math.sin(0.1), 0, 0, Math.cos(0.1)], angularVelocity: [0, 0, 0] },
    { position: [0, 0, 0.01], velocity: [0, 0, -0.05], orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0.05] },
  ];
  for (const fixture of cases) {
    const state = createDocking(DEFAULT_CONFIG, fixture); state.meanMotion = 0;
    assert.equal(getDockingTelemetry(state).captureReady, false);
    stepDocking(state, {}, 1);
    assert.equal(state.phase, 'failed', JSON.stringify(fixture));
  }
});

test('no-input default terminal scenario cannot complete itself', () => {
  const state = createDocking();
  advance(state, stepDocking, 180);
  assert.equal(state.phase, 'docking');
  assert.ok(state.position[2] > 60);
  assert.equal(state.fuelUsed, 0);
});

test('new physical state is serializable and malformed state is rejected', () => {
  assert.ok(validateState(JSON.parse(JSON.stringify(createLaunch()))));
  assert.ok(validateState(JSON.parse(JSON.stringify(createDocking()))));
  const state = createDocking(); state.position[0] = NaN;
  assert.equal(validateState(state), false);
  const noFuel = createDocking(); noFuel.fuel = -1;
  assert.equal(validateState(noFuel), false);
});
