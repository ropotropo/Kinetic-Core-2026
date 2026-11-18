import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// Presentation bounds exclude exhaust and other hidden effects. No flight data
// or attachment layout is changed by editor framing.
export function workshopHardwareBounds(object) {
  const bounds = new THREE.Box3();
  if (!object) return bounds;
  object.updateWorldMatrix(true, true);
  object.traverse(child => {
    if (!child.isMesh || child.userData.effect || !child.geometry) return;
    for (let parent = child; parent; parent = parent.parent) if (!parent.visible) return;
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    bounds.union(child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld));
  });
  return bounds;
}

export function chooseWorkshopAttachment(slots, design, type, { preferredSlot, sourceSlot } = {}) {
  const candidates = slots.filter(slot => slot.accepts.includes(type));
  const preferred = candidates.find(slot => slot.id === preferredSlot && slot.id !== sourceSlot);
  if (preferred) return preferred.id;
  const empty = candidates.find(slot => slot.id !== sourceSlot && !design.slots[slot.id]);
  if (empty) return empty.id;
  const sourceIndex = candidates.findIndex(slot => slot.id === sourceSlot);
  return candidates[sourceIndex >= 0 ? (sourceIndex + 1) % candidates.length : 0]?.id ?? null;
}

/** Fit every corner into the usable perspective view, including narrow phone
 * aspect ratios and the space reserved for Frame vehicle and attachment labels.
 */
export function fitWorkshopBounds(bounds, { width, height, fov = 40, direction = [.65, .17, 1], minDistance = 4 } = {}) {
  if (bounds.isEmpty()) throw new Error('Camera framing needs nonempty hardware or attachment bounds.');
  width = Math.max(1, width || 1); height = Math.max(1, height || 1);
  const back = new THREE.Vector3(...direction);
  if (back.lengthSq() < 1e-8) back.set(.65, .17, 1);
  if (Math.hypot(back.x, back.z) < .01) back.z = .12;
  back.y = Math.max(.16, back.y); back.normalize();
  const right = new THREE.Vector3().crossVectors(UP, back).normalize();
  const up = new THREE.Vector3().crossVectors(back, right).normalize();
  const center = bounds.getCenter(new THREE.Vector3());
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2)), tanH = tanV * width / height;
  const insetX = Math.min(30, width * .16), top = Math.min(68, height * .34), bottom = Math.min(34, height * .17);
  const halfX = 1 - 2 * insetX / width;
  const upperY = 1 - 2 * top / height, lowerY = -1 + 2 * bottom / height;
  const centerY = (upperY + lowerY) / 2, halfY = (upperY - lowerY) / 2;
  let distance = minDistance;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = new THREE.Vector3(x, y, z).sub(center);
    const horizontal = point.dot(right), vertical = point.dot(up), depth = point.dot(back);
    distance = Math.max(distance, Math.abs(horizontal) / (tanH * halfX) + depth,
      (vertical / tanV + upperY * depth) / halfY,
      (-vertical / tanV - lowerY * depth) / halfY, depth + .2);
  }
  distance *= 1.1;
  const target = center.clone().addScaledVector(up, -centerY * distance * tanV);
  const position = target.clone().addScaledVector(back, distance);
  const constrained = constrainWorkshopView(position.toArray(), target.toArray());
  return { ...constrained, distance, center: center.toArray(), insets: { left: insetX, right: insetX, top, bottom } };
}

/** Keep manual pan, orbit and zoom above the assembly deck. */
export function constrainWorkshopView(position, target, { cameraFloor = .55, targetFloor = .2 } = {}) {
  const nextPosition = [...position], nextTarget = [...target];
  const lift = Math.max(0, targetFloor - nextTarget[1]);
  nextTarget[1] += lift; nextPosition[1] = Math.max(cameraFloor, nextPosition[1] + lift);
  const distance = Math.max(.01, Math.hypot(...nextPosition.map((value, i) => value - nextTarget[i])));
  return { position: nextPosition, target: nextTarget, maxPolarAngle: Math.acos(clamp((cameraFloor - nextTarget[1]) / distance, -1, 1)) };
}
