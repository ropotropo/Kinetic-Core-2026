// Pure presentation rules. These never modify a spacecraft's physical state.
export function chaseDistance(radius, fovDegrees, aspect) {
  return Math.max(24, Math.max(1, radius) / Math.sin(fovDegrees * Math.PI / 360) / Math.min(1, Math.max(.2, aspect)) * 1.16);
}

export function atmosphericShake(altitude, dynamicPressure, throttle, paused = false, reducedMotion = false) {
  if (paused || reducedMotion || altitude >= 60000 || !(dynamicPressure > 0)) return 0;
  const fade = Math.max(0, 1 - Math.max(0, altitude - 25000) / 35000);
  return .022 * Math.min(1, dynamicPressure / 35000) * Math.min(1, Math.max(0, throttle)) * fade;
}

export function easeLaunchPitch(current, target, dt) {
  if (!Number.isFinite(current)) return target;
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + difference * (1 - Math.exp(-Math.max(0, dt) / .2));
}

export function aboveTerrain(cameraY, terrainY, clearance = 2.2) {
  return Math.max(cameraY, terrainY + clearance);
}
