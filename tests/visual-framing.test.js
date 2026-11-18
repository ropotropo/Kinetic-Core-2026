import test from 'node:test';
import assert from 'node:assert/strict';
import { chaseDistance, atmosphericShake, easeLaunchPitch, aboveTerrain } from '../src/visual-framing.js';

test('chase framing fits the same hardware at narrow aspect without a plume input', () => {
  assert.ok(chaseDistance(30, 38, .5) > chaseDistance(30, 38, 1.5));
  assert.equal(chaseDistance(30, 38, 1), chaseDistance(30, 38, 1.5));
});
test('presentation shake is bounded, pressure-driven and absent in vacuum or pause', () => {
  assert.equal(atmosphericShake(100000, 35000, 1), 0);
  assert.equal(atmosphericShake(1000, 0, 1), 0);
  assert.equal(atmosphericShake(1000, 35000, 1, true), 0);
  assert.equal(atmosphericShake(1000, 35000, 1, false, true), 0);
  assert.ok(atmosphericShake(1000, 1e8, 1) <= .022);
});
test('launch-only pitch presentation softens a pointing jump and wraps the short way', () => {
  const initial = 82 * Math.PI / 180, target = 27 * Math.PI / 180;
  const first = easeLaunchPitch(initial, target, 1 / 60);
  assert.ok(first < initial && first > 75 * Math.PI / 180);
  assert.ok(Math.abs(easeLaunchPitch(initial, target, .6) - target) < 3 * Math.PI / 180);
  assert.ok(easeLaunchPitch(179 * Math.PI / 180, -179 * Math.PI / 180, .1) > 179 * Math.PI / 180);
});
test('inspection camera stays above the sampled illustrative ground', () => {
  assert.equal(aboveTerrain(-15, 7), 9.2);
  assert.equal(aboveTerrain(20, 7), 20);
});
