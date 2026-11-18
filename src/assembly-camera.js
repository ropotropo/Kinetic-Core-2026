import { constrainWorkshopView } from './workshop-camera.js';

// Same clearances as the workshop, measured above the rendered platform top.
const CAMERA_CLEARANCE = .55, TARGET_CLEARANCE = .2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function assemblyOrbitPitch(pitch, radius, targetY, platformY) {
  const minimum = Math.asin(clamp((platformY + CAMERA_CLEARANCE - targetY) / Math.max(.001, radius), -1, 1));
  return Math.max(pitch, minimum);
}

export function constrainAssemblyView(position, target, platformY) {
  return constrainWorkshopView(position, target, {
    cameraFloor: platformY + CAMERA_CLEARANCE,
    targetFloor: platformY + TARGET_CLEARANCE,
  });
}
