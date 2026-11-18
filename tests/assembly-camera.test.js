import test from 'node:test';
import assert from 'node:assert/strict';
import { assemblyOrbitPitch, constrainAssemblyView } from '../src/assembly-camera.js';

// The legacy setup's highest platform slab is centered at .83 m, .45 m tall.
const platformY = .83 + .45 / 2, cameraFloor = platformY + .55, targetFloor = platformY + .2;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('assembly orbit and zoom stay above the actual raised platform while preserving radius', () => {
  for (const targetY of [2, 26, 80]) for (const radius of [3, 20, 120, 480]) for (const requested of [-1.35, -.8, 0, 1.45]) {
    const pitch = assemblyOrbitPitch(requested, radius, targetY, platformY);
    for (const yaw of [0, Math.PI / 2, Math.PI, -2.7]) {
      const position = [radius * Math.cos(pitch) * Math.sin(yaw), targetY + radius * Math.sin(pitch), radius * Math.cos(pitch) * Math.cos(yaw)];
      assert.ok(position[1] >= cameraFloor - 1e-8);
      close(Math.hypot(position[0], position[1] - targetY, position[2]), radius);
      const constrained = constrainAssemblyView(position, [0, targetY, 0], platformY);
      constrained.position.forEach((value, i) => close(value, position[i]));
    }
  }
});

test('an upward drag responds immediately after reaching the assembly floor', () => {
  const radius = 120, targetY = 26;
  const atFloor = assemblyOrbitPitch(-1.35, radius, targetY, platformY);
  close(targetY + radius * Math.sin(atFloor), cameraFloor);
  const raised = assemblyOrbitPitch(atFloor + .01, radius, targetY, platformY);
  assert.ok(targetY + radius * Math.sin(raised) > cameraFloor);
});

test('a low pan raises camera and target together without changing horizontal framing', () => {
  const position = [8, -5, 12], target = [2, -3, -4];
  const constrained = constrainAssemblyView(position, target, platformY);
  assert.ok(constrained.position[1] >= cameraFloor); close(constrained.target[1], targetFloor);
  for (const axis of [0, 2]) { close(constrained.position[axis], position[axis]); close(constrained.target[axis], target[axis]); }
  assert.deepEqual(position, [8, -5, 12]); assert.deepEqual(target, [2, -3, -4]);
});

test('smooth return endpoints and every interpolated pose remain above the platform', () => {
  const start = [100, cameraFloor, 40], finish = [69, 30, 91], target = [0, 26, 0];
  for (let step = 0; step <= 100; step++) {
    const t = step / 100, weight = t * t * (3 - 2 * t);
    const position = start.map((value, i) => value + (finish[i] - value) * weight);
    const constrained = constrainAssemblyView(position, target, platformY);
    assert.ok(constrained.position[1] >= cameraFloor);
    constrained.position.forEach((value, i) => close(value, position[i]));
    assert.deepEqual(constrained.target, target);
  }
});
