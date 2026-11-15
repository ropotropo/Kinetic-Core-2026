import test from 'node:test';
import assert from 'node:assert/strict';
import { DESTINATIONS, getDestination } from '../src/destinations.js';
import {
  LANDER, LANDING_LIMITS, createLanding, stepLanding, getLandingTelemetry,
  getLandingScenario, landingAtmosphere, validateLandingState, restoreLandingState,
} from '../src/landing.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const close = (actual, expected, tolerance) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} vs ${expected} (±${tolerance})`);
const clone = value => JSON.parse(JSON.stringify(value));
test('planet exercises have enough thrust to brake and Mars has thin atmospheric drag',()=>{
  for(const id of ['mars','mercury']){const s=createLanding(id);assert.ok(s.scenario.thrustLimit/(LANDER.dryMass+s.fuel)>s.gravity);assert.ok(s.gravity>3.6&&s.gravity<3.9);}
  assert.ok(landingAtmosphere('mars',0)>0&&landingAtmosphere('mars',0)<.03);
  assert.equal(landingAtmosphere('mercury',0),0);
});
function advance(state, seconds, input = {}, dt = 1 / 60) {
  for (let i = 0; i < Math.round(seconds / dt) && state.phase === 'landing'; i++) stepLanding(state, input, dt);
}

test('14 landing destinations have correctly scaled, finite physical parameters and primary sources', () => {
  assert.equal(DESTINATIONS.length, 14);
  assert.equal(new Set(DESTINATIONS.map(d => d.id)).size, 14);
  for (const destination of DESTINATIONS) {
    for (const key of ['radius', 'mu', 'gravity']) assert.ok(Number.isFinite(destination[key]) && destination[key] > 0);
    close(destination.gravity, destination.mu / destination.radius ** 2, 1e-12);
    assert.ok(destination.playable && destination.source.startsWith('https://ssd.jpl.nasa.gov/'));
    assert.ok(destination.factSource.startsWith('https://science.nasa.gov/'));
    assert.ok(destination.sampleMethod.startsWith('Proposed:'));
  }
  assert.ok(getDestination('moon').gravity > 1.6 && getDestination('moon').gravity < 1.65);
  assert.ok(getDestination('io').gravity > getDestination('moon').gravity);
  assert.ok(getDestination('deimos').gravity < getDestination('phobos').gravity);
  assert.ok(getDestination('phobos').gravity < 0.01);
});

test('microgravity scenarios expose their real initial conditions and thrust limitation', () => {
  const moon = getLandingScenario('moon'), phobos = getLandingScenario('phobos'), deimos = getLandingScenario('deimos');
  assert.equal(moon.initialAltitude, 800);
  assert.equal(moon.initialVerticalSpeed, -12);
  assert.equal(phobos.initialAltitude, 120);
  assert.equal(phobos.initialVerticalSpeed, -0.35);
  assert.ok(phobos.thrustLimit < moon.thrustLimit / 100);
  assert.ok(deimos.thrustLimit < phobos.thrustLimit);
  assert.ok(phobos.initialOffset > LANDING_LIMITS.padRadius, 'waiting without control must not complete the task');
});

test('ballistic vertical acceleration follows selected inverse-square gravity', () => {
  for (const id of ['moon', 'enceladus', 'deimos']) {
    const state = createLanding(id), initialVelocity = state.velocity[1];
    const destination = getDestination(id);
    const expectedGravity = destination.mu / (destination.radius + state.position[1]) ** 2;
    stepLanding(state, { throttle: 0, holdAttitude: false }, 0.1);
    close((initialVelocity - state.velocity[1]) / 0.1, expectedGravity, 0.00001);
    assert.equal(state.fuelUsed, 0);
  }
});

test('vacuum lateral momentum and free angular motion are not passively damped', () => {
  const state = createLanding('moon'); state.velocity = [2, 0]; state.position[1] = 3000;
  state.angularVelocity = 0.02;
  advance(state, 3, { throttle: 0, holdAttitude: false });
  close(state.velocity[0], 2, 1e-12);
  close(state.position[0], 86, 1e-9);
  close(state.angularVelocity, 0.02, 1e-12);
  close(state.angle, 0.06, 1e-10);
});

test('hover thrust consumes propellant according to thrust/(Isp*g0)', () => {
  const state = createLanding('moon'); state.velocity = [0, 0];
  const telemetry = getLandingTelemetry(state), throttle = telemetry.hoverThrottle;
  const thrust = throttle * state.scenario.thrustLimit;
  advance(state, 1, { throttle, holdAttitude: false });
  close(state.fuelUsed, thrust / (LANDER.isp * 9.80665), 0.00001);
  assert.ok(Math.abs(state.position[1] - 800) < 0.01);
  assert.ok(Math.abs(state.velocity[1]) < 0.01);
});

test('Titan has drag while exospheres and vacuum scenarios do not', () => {
  assert.ok(landingAtmosphere('titan', 0) > 5);
  assert.ok(landingAtmosphere('titan', 800) < landingAtmosphere('titan', 0));
  assert.equal(landingAtmosphere('triton', 800), 0);
  assert.equal(landingAtmosphere('moon', 0), 0);
  const state = createLanding('titan'); state.velocity = [10, 0];
  stepLanding(state, { throttle: 0, holdAttitude: false }, 1);
  assert.ok(state.velocity[0] < 10 && state.velocity[0] > 0);
});

test('attitude hold uses finite propellant and actually applies torque', () => {
  const state = createLanding('moon'); state.position[1] = 3000; state.angle = 0.1; state.velocity = [0, 0];
  advance(state, 8, { throttle: 0, holdAttitude: true });
  assert.ok(state.fuelUsed > 0);
  assert.ok(Math.abs(state.angle) < 0.03);
});

test('empty tanks cannot provide main thrust, attitude hold or commanded rotation', () => {
  const state = createLanding('moon'); state.fuel = 0.0001; state.fuelUsed = LANDER.propellant - state.fuel;
  advance(state, 1, { throttle: 1, turn: 1, holdAttitude: true });
  assert.equal(state.fuel, 0);
  const angularVelocity = state.angularVelocity, vx = state.velocity[0];
  advance(state, 1, { throttle: 1, turn: 1, holdAttitude: true });
  assert.equal(state.thrust, 0); assert.equal(state.torque, 0); assert.equal(state.engine, false);
  close(state.angularVelocity, angularVelocity, 1e-12); close(state.velocity[0], vx, 1e-12);
  assert.ok(state.fuelUsed <= LANDER.propellant + 1e-8);
});

test('gentle contact is resolved at the ground and preserves impact telemetry', () => {
  const state = createLanding('moon'); state.position = [0, 0.01]; state.velocity = [0.2, -0.5];
  stepLanding(state, { throttle: 0 }, 1);
  assert.equal(state.phase, 'landed'); assert.equal(state.position[1], 0);
  assert.deepEqual(state.velocity, [0, 0]);
  assert.ok(state.time < 0.03 && state.impact.verticalSpeed < -0.5);
  assert.ok(state.impact.horizontalSpeed > 0);
  assert.equal(state.engine, false);
});

test('excess speed, offset, tilt or spin independently rejects touchdown', () => {
  const fixtures = [
    state => { state.velocity[1] = -2.1; },
    state => { state.velocity[0] = 1.6; },
    state => { state.position[0] = 26; },
    state => { state.angle = 9 * Math.PI / 180; },
    state => { state.angularVelocity = 4 * Math.PI / 180; },
  ];
  for (const change of fixtures) {
    const state = createLanding('moon'); state.position = [0, 0.001]; state.velocity = [0, -0.5];
    change(state); assert.equal(getLandingTelemetry(state).safeToLand, false);
    stepLanding(state, { throttle: 0, holdAttitude: false }, 1);
    assert.equal(state.phase, 'failed');
    assert.ok(state.failure.startsWith('Unsafe touchdown:'));
  }
});

test('large caller steps cannot tunnel below terrain', () => {
  const state = createLanding('moon'); state.position = [0, 1]; state.velocity = [0, -500];
  stepLanding(state, { throttle: 0 }, 10);
  assert.equal(state.phase, 'failed'); assert.equal(state.position[1], 0);
  assert.ok(state.time < 0.003);
  assert.ok(state.impact.verticalSpeed < -500);
});

test('landing outcomes are stable across display-rate scheduling', () => {
  const a = createLanding('moon'), b = createLanding('moon');
  const input = { throttle: 0.4, turn: -0.15, holdAttitude: true };
  advance(a, 5, input, 1 / 30); advance(b, 5, input, 1 / 120);
  close(a.position[0], b.position[0], 1e-6); close(a.position[1], b.position[1], 1e-6);
  close(a.fuel, b.fuel, 1e-7);
});

test('all default scenarios require player input rather than completing by waiting', () => {
  for (const destination of DESTINATIONS) {
    const state = createLanding(destination.id);
    advance(state, 500, { throttle: 0, holdAttitude: false }, 0.25);
    assert.equal(state.phase, 'failed', destination.id);
    assert.ok(Math.abs(state.impact.offset) > LANDING_LIMITS.padRadius, destination.id);
  }
});

// Feasibility controller exists only in this test. It uses the same throttle and
// rotation inputs available to a pilot and never modifies evolving state.
function feasibilityInput(state) {
  const t = getLandingTelemetry(state), [x, y] = state.position, [vx, vy] = state.velocity;
  const up = t.maxThrust / t.mass - t.gravity;
  const desiredVy = -Math.max(0.25, Math.min(state.scenario.microgravity ? 0.8 : 12, y / 20, 0.4 * Math.sqrt(2 * up * Math.max(y, 0)) + 0.2));
  const maxVx = state.scenario.microgravity ? 0.25 : 2;
  const desiredVx = clamp(-x / 20, -maxVx, maxVx);
  const ax = clamp((desiredVx - vx) / 5, -t.gravity * 0.5, t.gravity * 0.5), ay = (desiredVy - vy) / 3;
  const vertical = Math.max(0, t.gravity + ay);
  let targetAngle = clamp(Math.atan2(ax, Math.max(0.0001, vertical)), -Math.PI / 6, Math.PI / 6);
  if (y < 12 && Math.abs(x) < 20) targetAngle = 0;
  return {
    throttle: clamp(t.mass * Math.hypot(ax, vertical) / t.maxThrust, 0, 1),
    turn: clamp((0.12 * (targetAngle - state.angle) - 0.65 * state.angularVelocity) * LANDER.inertia / LANDER.torque, -1, 1),
    holdAttitude: false,
  };
}

test('all 14 destinations can be landed using coarse ordinary control inputs', () => {
  for (const destination of DESTINATIONS) {
    const state = createLanding(destination.id);
    for (let i = 0; i < 9000 && state.phase === 'landing'; i++) stepLanding(state, feasibilityInput(state), 0.1);
    assert.equal(state.phase, 'landed', `${destination.id}: ${state.failure}`);
    assert.ok(state.fuel > 0 && state.time < 900);
    assert.ok(validateLandingState(state), destination.id);
  }
});

test('landing checkpoints restore dynamic state while rebuilding all trusted constants', () => {
  const state = createLanding('titan'); advance(state, 1, { throttle: 0.35 });
  assert.ok(validateLandingState(state));
  const raw = clone(state);
  raw.dryMass = 1; raw.scenario.thrustLimit = 1e25; raw.initialFuel = 1e25; raw.gravity = 1e12;
  const restored = restoreLandingState(raw), trusted = createLanding('titan');
  assert.equal(restored.dryMass, trusted.dryMass); assert.equal(restored.initialFuel, trusted.initialFuel);
  assert.equal(restored.scenario.thrustLimit, trusted.scenario.thrustLimit);
  assert.deepEqual(restored.position, state.position); assert.deepEqual(restored.velocity, state.velocity);
  assert.equal(restored.throttle, 0); assert.equal(restored.commandedThrottle, 0); assert.equal(restored.engine, false);
  assert.ok(validateLandingState(restored));
});

test('malformed or fabricated successful landing checkpoints are rejected', () => {
  const bad = createLanding('moon'); bad.fuel = -1; assert.equal(validateLandingState(bad), false);
  const unknown = createLanding('moon'); unknown.destination = 'jupiter'; assert.throws(() => restoreLandingState(unknown));
  const fake = createLanding('moon'); fake.phase = 'landed'; fake.position = [0, 0]; fake.velocity = [0, 0];
  assert.equal(validateLandingState(fake), false, 'successful contact needs a consistent impact record');
  const nonfinite = createLanding('moon'); nonfinite.angle = Infinity; assert.equal(validateLandingState(nonfinite), false);
});
