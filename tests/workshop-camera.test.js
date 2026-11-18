import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SLOTS, createLunarDesign, createEmptyDesign, getAttachmentPoints } from '../src/vehicle-design.js';
import { createVehicleGeometry } from '../src/vehicle-geometry.js';
import { chooseWorkshopAttachment, fitWorkshopBounds, constrainWorkshopView, workshopHardwareBounds } from '../src/workshop-camera.js';

function assertFits(bounds, width, height) {
  const frame = fitWorkshopBounds(bounds, { width, height });
  const camera = new THREE.PerspectiveCamera(40, width / height, .05, 20000);
  camera.position.fromArray(frame.position); camera.lookAt(new THREE.Vector3(...frame.target)); camera.updateMatrixWorld(true);
  const { insets } = frame;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = new THREE.Vector3(x, y, z).project(camera);
    assert.ok(point.x >= -1 + 2 * insets.left / width - 1e-8 && point.x <= 1 - 2 * insets.right / width + 1e-8, 'hardware corner fits horizontally');
    assert.ok(point.y >= -1 + 2 * insets.bottom / height - 1e-8 && point.y <= 1 - 2 * insets.top / height + 1e-8, 'hardware corner fits vertically below tools');
    assert.ok(point.z > -1 && point.z < 1, 'hardware is in front of the camera');
  }
  assert.ok(frame.position[1] >= .55, 'camera stays above platform');
  return frame;
}

test('command capsule frames the top hardware rather than the full lunar vehicle, including phones', () => {
  const model = createVehicleGeometry(createLunarDesign());
  const capsule = workshopHardwareBounds(model.userData.parts.get('capsule'));
  const whole = workshopHardwareBounds(model);
  for (const [width, height] of [[900, 650], [390, 260], [320, 180], [450, 220]]) {
    const local = assertFits(capsule, width, height), full = assertFits(whole, width, height);
    assert.ok(local.distance < full.distance * .3, 'component framing visibly zooms into the capsule');
    assert.ok(local.target[1] > whole.getCenter(new THREE.Vector3()).y + 20, 'focus follows the top attachment region');
  }
  model.userData.dispose();
});

test('every installed component fits wide, tall and narrow editor views without exhaust bounds', () => {
  const model = createVehicleGeometry(createLunarDesign());
  for (const part of model.userData.parts.values()) for (const [width, height] of [[390, 240], [650, 700], [420, 180]]) assertFits(workshopHardwareBounds(part), width, height);
  const engine = model.userData.parts.get('core-engine');
  assert.ok(new THREE.Box3().setFromObject(engine).getSize(new THREE.Vector3()).y > workshopHardwareBounds(engine).getSize(new THREE.Vector3()).y * 3, 'invisible plume was excluded');
  model.userData.dispose();
});

test('hardware choice respects a compatible selected slot; copy prefers a different empty attachment', () => {
  const design = createLunarDesign();
  assert.equal(chooseWorkshopAttachment(SLOTS, design, 'capsule'), 'capsule');
  assert.equal(chooseWorkshopAttachment(SLOTS, design, 'engine', { preferredSlot: 'service-engine' }), 'service-engine');
  assert.equal(chooseWorkshopAttachment(SLOTS, design, 'tank', { sourceSlot: 'core-tank-1' }), 'core-tank-2');
  delete design.slots['upper-tank'];
  assert.equal(chooseWorkshopAttachment(SLOTS, design, 'tank', { sourceSlot: 'core-tank-1' }), 'upper-tank');
  assert.equal(chooseWorkshopAttachment(SLOTS, createEmptyDesign(), 'capsule'), 'capsule');
  assert.equal(getAttachmentPoints(createEmptyDesign()).find(point => point.id === 'capsule').occupied, false);
});

test('manual orbit and pan cannot put the camera beneath the assembly deck', () => {
  for (const [position, target] of [[[0, -5, 5], [0, -3, 0]], [[3, -.1, 1], [0, 2, 0]], [[0, 80, 10], [0, 75, 0]]]) {
    const next = constrainWorkshopView(position, target);
    assert.ok(next.position[1] >= .55); assert.ok(next.target[1] >= .2);
    assert.ok(Number.isFinite(next.maxPolarAngle) && next.maxPolarAngle >= 0 && next.maxPolarAngle <= Math.PI);
    assert.equal(next.position[0], position[0]); assert.equal(next.target[0], target[0]);
  }
});
