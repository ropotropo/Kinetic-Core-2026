import test from 'node:test';
import assert from 'node:assert/strict';
import { createLaunch, stepLaunch, atmosphere, EARTH, FIXED_STEP, launchMass } from '../src/physics.js';
import { ASCENT_PRESSURE_LIMIT, getAscentLoadIndicator } from '../src/ascent-guidance.js';

function atmosphericFlight(airspeed, pitch = 0) {
  const flight = createLaunch(), radius = EARTH.radius + 10000;
  flight.position = [radius, 0];
  flight.velocity = [-airspeed, radius * flight.effectiveRotation];
  flight.liftoff = true; flight.pitch = pitch;
  return flight;
}
const coast = { throttle: 0, guidance: false };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) <= Math.max(1e-9, Math.abs(expected) * 1e-12), `${actual} != ${expected}`);

test('ascent pressure uses corotating airspeed and scales with its square', () => {
  const density = atmosphere(10000).density;
  for (const speed of [0, 150, 300]) {
    const flight = atmosphericFlight(speed);
    assert.ok(Math.hypot(...flight.velocity) > speed, 'inertial speed includes atmospheric rotation');
    stepLaunch(flight, coast, FIXED_STEP);
    close(flight.dynamicPressure, .5 * density * speed ** 2);
  }
});

test('quiet pressure colors precede the real strict 110 kPa failure boundary', () => {
  assert.equal(ASCENT_PRESSURE_LIMIT, 110000);
  for (const [q, expected] of [[0, 'normal'], [87999, 'normal'], [88000, 'caution'], [104499, 'caution'], [104500, 'danger']]) {
    assert.equal(getAscentLoadIndicator(q).state, expected);
  }
  for (const offset of [-1, 1]) {
    const pressure = ASCENT_PRESSURE_LIMIT + offset;
    const flight = atmosphericFlight(Math.sqrt(2 * pressure / atmosphere(10000).density));
    stepLaunch(flight, coast, FIXED_STEP);
    close(flight.dynamicPressure, pressure);
    assert.equal(getAscentLoadIndicator(flight.dynamicPressure).state, 'danger');
    assert.equal(flight.phase, offset < 0 ? 'launch' : 'failed');
    if (offset > 0) assert.match(flight.failure, /design limit \(110 kPa\)/);
  }
});

test('point-mass pressure has no artificial pitch penalty and proper load uses drag force', () => {
  const upright = atmosphericFlight(300), reversed = atmosphericFlight(300, 160 * Math.PI / 180);
  const stage = upright.stages[0], mass = launchMass(upright);
  const expectedQ = .5 * atmosphere(10000).density * 300 ** 2;
  const drag = expectedQ * Math.PI * stage.radius ** 2 * stage.dragCoefficient;
  for (const flight of [upright, reversed]) {
    stepLaunch(flight, coast, FIXED_STEP);
    close(flight.dynamicPressure, expectedQ);
    close(flight.loadG, drag / mass / EARTH.g0);
  }
  close(upright.dynamicPressure, reversed.dynamicPressure);
});

test('unknown pressure is not a fabricated zero or load warning', () => {
  for (const value of [undefined, null, NaN, Infinity, -1]) {
    const readout = getAscentLoadIndicator(value);
    assert.equal(readout.state, 'unknown'); assert.equal(readout.pressure, null); assert.equal(readout.fraction, null);
  }
});
