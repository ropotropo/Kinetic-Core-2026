import test from 'node:test';
import assert from 'node:assert/strict';
import {createEarthFlight, stepEarthFlight, earthFlightTelemetry} from '../src/earth-flight.js';

const ground = () => ({height: 0, kind: 'ground', ready: true});
const fresh = () => createEarthFlight({lat: 50, lng: 30});
function fly(s, input = {}, seconds = 1, provider = ground) {
  for (let i = 0; i < Math.round(seconds * 60); i++) stepEarthFlight(s, input, 1 / 60, provider);
  return s;
}
const near = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) < epsilon,
  `${actual} should be within ${epsilon} of ${expected}`);

test('initial local airborne state and no-input powered hover consume physical fuel', () => {
  const s = createEarthFlight({lat: 50, lng: 30, surface: 100});
  assert.equal(s.altitude, 220);
  assert.deepEqual(s.velocity, [0, 0, 0]);
  assert.equal(s.assist, true);
  fly(s, {}, 10, () => ({height: 100, kind: 'ground', ready: true}));
  near(s.altitude, 220);
  near(s.time, 10);
  // Hover mass flow m*g/(Isp*g): about 246 kg in ten seconds.
  assert.ok(s.fuel > 1750 && s.fuel < 1760);
  assert.equal(s.phase, 'flying');
  assert.ok(s.thrustFraction > 0 && s.thrustFraction < 1);
});

test('assist leaves lateral inertia with low physical drag; brake spends fuel to stop', () => {
  const coast = fresh();
  coast.velocity = [10, 0, 0];
  const stopped = structuredClone(coast);
  fly(coast);
  fly(stopped, {brake: true});
  assert.ok(coast.velocity[0] > 9.9 && coast.velocity[0] < 10);
  assert.ok(coast.lng > 30);
  assert.ok(stopped.velocity[0] < 2);
  assert.ok(stopped.fuel < coast.fuel);
});

test('assist off coasts ballistically and zero fuel cannot produce thrust', () => {
  const ballistic = fresh();
  fly(ballistic, {assist: false}, 0.5);
  assert.equal(ballistic.fuel, 2000);
  assert.ok(ballistic.velocity[2] < -4.8);
  const empty = fresh();
  empty.fuel = 0;
  fly(empty, {vertical: 1, forward: 1}, 0.5);
  assert.equal(empty.fuel, 0);
  assert.equal(empty.thrustFraction, 0);
  assert.equal(empty.velocity[1], 0);
  assert.ok(empty.velocity[2] < -4.8);
});

test('thrust is vector bounded and final partial fuel burn stays finite', () => {
  const s = fresh();
  stepEarthFlight(s, {forward: 10, right: 10, vertical: 10}, 1 / 60, ground);
  const applied = [s.velocity[0] * 60, s.velocity[1] * 60, s.velocity[2] * 60 + 9.80665];
  assert.ok(Math.hypot(...applied) <= 180000 / 8000 + 1e-10);
  near(s.thrustFraction, 1);
  s.fuel = 0.001;
  stepEarthFlight(s, {vertical: 1}, 1 / 60, ground);
  assert.equal(s.fuel, 0);
  assert.ok(Number.isFinite(s.altitude));
  assert.ok(s.thrustFraction > 0 && s.thrustFraction < 1);
});

test('safe contact lands, stays on pad without lateral movement, and relaunches explicitly', () => {
  const s = fresh();
  s.altitude = 0.01;
  s.velocity = [0.5, 0, -1];
  stepEarthFlight(s, {assist: false}, 1 / 60, ground);
  assert.equal(s.phase, 'landed');
  assert.equal(s.altitude, 0);
  const {lat, lng, fuel} = s;
  fly(s, {forward: 1, right: 1}, 2);
  assert.equal(s.lat, lat);
  assert.equal(s.lng, lng);
  assert.equal(s.fuel, fuel);
  fly(s, {vertical: 1, assist: true}, 0.5);
  assert.equal(s.phase, 'flying');
  assert.ok(s.altitude > 0);
  assert.ok(s.fuel < fuel);
});

test('hard vertical or lateral contact crashes permanently without resetting fuel or position', () => {
  for (const velocity of [[0, 0, -3], [3, 0, -1]]) {
    const s = fresh();
    s.altitude = 0.01;
    s.velocity = velocity;
    stepEarthFlight(s, {assist: false}, 1 / 60, ground);
    assert.equal(s.phase, 'crashed');
    const snapshot = structuredClone(s);
    fly(s, {vertical: 1}, 2);
    assert.deepEqual(s, snapshot);
  }
});

test('building side impacts crash even at safe contact speeds; roofs allow safe touchdown', () => {
  const s = fresh();
  s.velocity = [1, 0, 0];
  stepEarthFlight(s, {}, 1 / 60,
    (lat, lng) => ({height: lng > 30 ? 200 : 0, kind: lng > 30 ? 'building' : 'ground', ready: true}));
  assert.equal(s.phase, 'crashed');
  assert.equal(s.surfaceKind, 'building');
  near(s.altitude, 120); // A wall impact must not teleport onto the roof.
  const inside = fresh();
  stepEarthFlight(inside, {}, 1 / 60,
    () => ({height: 200, kind: 'building', ready: true}));
  assert.equal(inside.phase, 'crashed');
  const roof = fresh();
  roof.altitude = 200.01;
  roof.velocity = [0, 0, -1];
  stepEarthFlight(roof, {assist: false}, 1 / 60,
    () => ({height: 200, kind: 'building', ready: true}));
  assert.equal(roof.phase, 'landed');
  assert.equal(earthFlightTelemetry(roof).altitudeAGL, 0);
});

test('unknown initial and destination surfaces pause atomically, with no catch-up on resume', () => {
  const s = fresh();
  const before = structuredClone(s);
  stepEarthFlight(s, {vertical: 1}, 0.25, () => null);
  assert.equal(s.dataPending, true);
  for (const key of ['lat', 'lng', 'altitude', 'fuel', 'time', 'heading']) assert.equal(s[key], before[key]);
  assert.deepEqual(s.velocity, before.velocity);
  assert.equal(earthFlightTelemetry(s).status, 'data-pending');
  s.velocity = [10, 0, 0];
  stepEarthFlight(s, {yaw: 1}, 0.25, (lat, lng) => lng > 30 ? null : ground());
  assert.equal(s.time, 0);
  assert.equal(s.fuel, 2000);
  assert.equal(s.heading, 0);
  assert.equal(s.lng, 30);
  stepEarthFlight(s, {}, 1 / 60, ground);
  near(s.time, 1 / 60);
  assert.equal(s.dataPending, false);
  for (const provider of [undefined, () => ({height: 0, kind: 'ground', ready: false})]) {
    const unknown = fresh();
    stepEarthFlight(unknown, {}, 1, provider);
    assert.equal(unknown.dataPending, true);
    assert.equal(unknown.time, 0);
  }
});

test('fixed integration is frame independent and caps caller dt at a quarter second', () => {
  const a = fresh(), b = fresh();
  fly(a, {forward: 1}, 1);
  for (let i = 0; i < 120; i++) stepEarthFlight(b, {forward: 1}, 1 / 120, ground);
  assert.deepEqual(a, b);
  const capped = fresh();
  stepEarthFlight(capped, {}, 100, ground);
  near(capped.time, 0.25);
});

test('coordinates wrap longitude, clamp polar latitude, and yaw rotates body thrust', () => {
  const s = createEarthFlight({lat: 90, lng: 540});
  assert.equal(s.lat, 84.9);
  assert.equal(s.lng, -180);
  s.lng = 179.999999;
  s.velocity = [100, 100, 0];
  stepEarthFlight(s, {}, 1 / 60, ground);
  assert.ok(s.lng < 0 && s.lng >= -180);
  assert.equal(s.lat, 84.9);
  const east = fresh();
  east.heading = Math.PI / 2;
  stepEarthFlight(east, {forward: 1}, 1 / 60, ground);
  assert.ok(east.velocity[0] > 0);
  near(east.velocity[1], 0);
});

test('telemetry states SI units, speeds, surface, fuel, and phase explicitly', () => {
  const s = fresh();
  s.velocity = [3, 4, -2];
  const t = earthFlightTelemetry(s);
  assert.equal(t.altitudeAGL, 120);
  assert.equal(t.altitudeMSL, 120);
  assert.equal(t.horizontalSpeed, 5);
  assert.equal(t.verticalSpeed, -2);
  assert.equal(t.speed, Math.sqrt(29));
  assert.equal(t.fuel, 2000);
  assert.equal(t.fuelFraction, 1);
  assert.equal(t.status, 'flying');
  assert.equal(t.altitudeUnit, 'm');
  assert.equal(t.speedUnit, 'm/s');
});

test('MSL surface and initial 120 m clearance integrate vertical velocity in metres', () => {
  const s = createEarthFlight({lat: 50, lng: 30, surface: 450});
  const provider = () => ({height: 450, kind: 'ground', ready: true});
  assert.equal(s.altitude, 570);
  s.velocity = [0, 0, 6];
  const before = s.altitude;
  stepEarthFlight(s, {}, 1 / 60, provider);
  near(s.altitude - before, s.velocity[2] / 60);
  const t = earthFlightTelemetry(s);
  assert.equal(t.altitudeMSL, s.altitude);
  assert.equal(t.surfaceHeight, 450);
  near(t.altitudeAGL, 120 + s.velocity[2] / 60);
  assert.equal(t.altitudeUnit, 'm');
});
