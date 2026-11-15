// AI-assisted implementation. Original game concept: Nikita.
import { getDestination } from './destinations.js';

export const LANDER = Object.freeze({
  name: 'Pioneer terminal lander', dryMass: 4200, propellant: 1200,
  maxThrust: 26000, isp: 320, rcsIsp: 230, torque: 900,
  inertia: 16000, leverArm: 2.2, dragCoefficient: 1.2, referenceArea: 10,
});
export const LANDING_LIMITS = Object.freeze({ verticalSpeed: 2, horizontalSpeed: 1.5, angle: 8 * Math.PI / 180, angularSpeed: 3 * Math.PI / 180, padRadius: 25 });
export const LANDING_STEP = 1 / 120;
const G0 = 9.80665, DEG = Math.PI / 180;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = value => typeof value === 'number' && Number.isFinite(value);
const angleWrap = value => Math.atan2(Math.sin(value), Math.cos(value));

function requireDestination(id) {
  const destination = getDestination(id);
  if (!destination) throw new Error('Unknown landing destination.');
  return destination;
}

export function getLandingScenario(destinationId = 'moon') {
  const destination = requireDestination(destinationId);
  const microgravity = destination.gravity < 0.02;
  const initialMass = LANDER.dryMass + LANDER.propellant;
  const thrustLimit = Math.min(LANDER.maxThrust, initialMass * destination.gravity * 2.8);
  return {
    initialAltitude: microgravity ? 120 : 800,
    initialVerticalSpeed: microgravity ? -0.35 : -12,
    initialHorizontalSpeed: 0,
    initialOffset: microgravity ? 40 : 80,
    thrustLimit,
    thrustFraction: thrustLimit / LANDER.maxThrust,
    targetPadRadius: LANDING_LIMITS.padRadius,
    recommendedHoverThrottle: initialMass * destination.mu / (destination.radius + (microgravity ? 120 : 800)) ** 2 / thrustLimit,
    microgravity,
    description: microgravity ? 'Microgravity contact approach: 120 m altitude, gentle descent and a low-thrust engine mode.' : 'Terminal descent: 800 m above a surveyed flat landing zone.',
  };
}

export function createLanding(destinationId = 'moon') {
  const destination = requireDestination(destinationId), scenario = getLandingScenario(destinationId);
  return {
    version: 1, kind: 'landing', phase: 'landing', destination: destination.id,
    time: 0, position: [scenario.initialOffset, scenario.initialAltitude],
    velocity: [scenario.initialHorizontalSpeed, scenario.initialVerticalSpeed],
    angle: 0, angularVelocity: 0, dryMass: LANDER.dryMass,
    fuel: LANDER.propellant, initialFuel: LANDER.propellant, fuelUsed: 0,
    throttle: 0, commandedThrottle: 0, thrust: 0, engine: false,
    torque: 0, holdAttitude: true, gravity: destination.mu / (destination.radius + scenario.initialAltitude) ** 2,
    density: 0, dynamicPressure: 0, acceleration: [0, 0], scenario,
    maxImpact: 0, impact: null,
    event: `${destination.name} terminal descent. Choose thrust and attitude; there is no automatic translation.`,
    failure: null,
  };
}

/** A near-surface Titan approximation, not an entry/upper-atmosphere model. */
export function landingAtmosphere(destinationId, altitude) {
  if (destinationId === 'mars') return .020 * Math.exp(-Math.max(0, altitude) / 11000);
  if (destinationId !== 'titan') return 0;
  return 5.3 * Math.exp(-Math.max(0, altitude) / 20000);
}

function contactReady(position, velocity, angle, angularVelocity) {
  return Math.abs(position[0]) <= LANDING_LIMITS.padRadius &&
    Math.abs(velocity[1]) <= LANDING_LIMITS.verticalSpeed &&
    Math.abs(velocity[0]) <= LANDING_LIMITS.horizontalSpeed &&
    Math.abs(angleWrap(angle)) <= LANDING_LIMITS.angle &&
    Math.abs(angularVelocity) <= LANDING_LIMITS.angularSpeed;
}

function contactTime(height, verticalSpeed, acceleration, dt) {
  // Bisection avoids cancellation at very small gravity and prevents tunneling.
  if (height <= 0) return 0;
  let low = 0, high = dt;
  for (let i = 0; i < 32; i++) {
    const middle = (low + high) / 2;
    const y = height + verticalSpeed * middle + 0.5 * acceleration * middle ** 2;
    if (y > 0) low = middle; else high = middle;
  }
  return high;
}

function finishContact(state, velocity, angle, angularVelocity) {
  state.position[1] = 0;
  state.maxImpact = Math.hypot(...velocity);
  state.impact = { verticalSpeed: velocity[1], horizontalSpeed: velocity[0], angle, angularVelocity, offset: state.position[0], speed: state.maxImpact, time: state.time };
  state.throttle = 0; state.commandedThrottle = 0; state.thrust = 0; state.engine = false; state.torque = 0;
  if (contactReady(state.position, velocity, angle, angularVelocity)) {
    state.phase = 'landed'; state.velocity = [0, 0]; state.angularVelocity = 0;
    state.event = 'Touchdown confirmed. Landing struts are stable inside the surveyed zone.';
  } else {
    const reasons = [];
    if (Math.abs(state.position[0]) > LANDING_LIMITS.padRadius) reasons.push('outside the 25 m landing zone');
    if (Math.abs(velocity[1]) > LANDING_LIMITS.verticalSpeed) reasons.push('vertical contact speed exceeded 2 m/s');
    if (Math.abs(velocity[0]) > LANDING_LIMITS.horizontalSpeed) reasons.push('horizontal contact speed exceeded 1.5 m/s');
    if (Math.abs(angleWrap(angle)) > LANDING_LIMITS.angle) reasons.push('tilt exceeded 8°');
    if (Math.abs(angularVelocity) > LANDING_LIMITS.angularSpeed) reasons.push('rotation exceeded 3°/s');
    state.phase = 'failed'; state.failure = `Unsafe touchdown: ${reasons.join('; ')}.`; state.event = state.failure;
  }
}

function landingSubstep(state, input, dt, destination) {
  if (state.phase !== 'landing') return;
  const mass = LANDER.dryMass + state.fuel;
  const throttle = clamp(finite(input.throttle) ? input.throttle : state.commandedThrottle, 0, 1);
  const turn = clamp(finite(input.turn) ? input.turn : 0, -1, 1);
  state.commandedThrottle = throttle; state.holdAttitude = input.holdAttitude ?? state.holdAttitude;
  let thrust = state.scenario.thrustLimit * throttle;
  let torque = turn * LANDER.torque;
  if (state.holdAttitude) torque = clamp(torque - angleWrap(state.angle) * LANDER.inertia * 0.12 - state.angularVelocity * LANDER.inertia * 0.65, -LANDER.torque, LANDER.torque);
  const desiredMassFlow = thrust / (LANDER.isp * G0) + Math.abs(torque) / (LANDER.leverArm * LANDER.rcsIsp * G0);
  const scale = desiredMassFlow > 0 ? Math.min(1, state.fuel / (desiredMassFlow * dt)) : 1;
  thrust *= scale; torque *= scale;
  const massFlow = desiredMassFlow * scale;
  const midMass = mass - Math.min(state.fuel, massFlow * dt) / 2;
  const height = Math.max(0, state.position[1]);
  const gravity = destination.mu / (destination.radius + height) ** 2;
  const density = landingAtmosphere(destination.id, height), speed = Math.hypot(...state.velocity);
  const dynamicPressure = 0.5 * density * speed ** 2;
  const dragMagnitude = dynamicPressure * LANDER.dragCoefficient * LANDER.referenceArea;
  const drag = state.velocity.map(v => speed > 0 ? -dragMagnitude * v / speed : 0);
  const acceleration = [thrust * Math.sin(state.angle) / midMass + drag[0] / midMass, thrust * Math.cos(state.angle) / midMass - gravity + drag[1] / midMass];
  const angularAcceleration = torque / LANDER.inertia;
  const predictedY = state.position[1] + state.velocity[1] * dt + 0.5 * acceleration[1] * dt ** 2;
  const contact = predictedY <= 0;
  const h = contact ? contactTime(state.position[1], state.velocity[1], acceleration[1], dt) : dt;
  state.position = state.position.map((value, i) => value + state.velocity[i] * h + 0.5 * acceleration[i] * h ** 2);
  const gravityAfter = destination.mu / (destination.radius + Math.max(0, state.position[1])) ** 2;
  state.velocity = state.velocity.map((value, i) => value + (acceleration[i] + (i === 1 ? (gravity - gravityAfter) / 2 : 0)) * h);
  state.angle = angleWrap(state.angle + state.angularVelocity * h + 0.5 * angularAcceleration * h ** 2);
  state.angularVelocity += angularAcceleration * h;
  const previousFuel = state.fuel;
  const burned = Math.min(state.fuel, massFlow * h);
  state.fuel = Math.max(0, state.fuel - burned); state.fuelUsed += burned; state.time += h;
  state.thrust = thrust; state.throttle = state.scenario.thrustLimit > 0 ? thrust / state.scenario.thrustLimit : 0;
  state.engine = thrust > 0; state.torque = torque; state.gravity = gravityAfter;
  state.density = density; state.dynamicPressure = dynamicPressure; state.acceleration = acceleration;
  if (previousFuel > 0 && state.fuel <= 1e-10 && !contact) state.event = 'Descent propellant depleted. Thrust and attitude torque are unavailable.';
  if (contact) finishContact(state, state.velocity.slice(), state.angle, state.angularVelocity);
  else if (state.position[1] > 8000 || Math.abs(state.position[0]) > 3000) {
    state.phase = 'failed'; state.failure = 'The lander left the local terminal-descent training area.'; state.event = state.failure;
    state.thrust = 0; state.engine = false; state.throttle = 0; state.torque = 0;
  }
}

export function stepLanding(state, input = {}, dt = LANDING_STEP) {
  if (!state || state.kind !== 'landing' || state.phase !== 'landing' || !finite(dt) || dt <= 0) return state;
  const destination = getDestination(state.destination);
  if (!destination) return state;
  const duration = Math.min(dt, 10), count = Math.ceil(duration / LANDING_STEP), h = duration / count;
  for (let i = 0; i < count && state.phase === 'landing'; i++) landingSubstep(state, input, h, destination);
  return state;
}

export function getLandingTelemetry(state) {
  const destination = requireDestination(state.destination), mass = LANDER.dryMass + state.fuel;
  const height = Math.max(0, state.position[1]), gravity = destination.mu / (destination.radius + height) ** 2;
  return {
    phase: state.phase, destination: destination.id, destinationName: destination.name, parent: destination.parent,
    time: state.time, altitude: height, offset: state.position[0], padOffset: state.position[0],
    verticalSpeed: state.velocity[1], horizontalSpeed: state.velocity[0], groundSpeed: Math.abs(state.velocity[0]), speed: Math.hypot(...state.velocity),
    angle: state.angle, angleDegrees: state.angle / DEG, angularVelocity: state.angularVelocity, angularSpeedDegrees: Math.abs(state.angularVelocity) / DEG,
    gravity, surfaceGravity: destination.gravity, mass, dryMass: LANDER.dryMass, fuel: state.fuel, fuelFraction: state.fuel / LANDER.propellant, fuelUsed: state.fuelUsed,
    throttle: state.throttle, commandedThrottle: state.commandedThrottle, thrust: state.thrust, maxThrust: state.scenario.thrustLimit,
    twr: gravity > 0 ? state.thrust / (mass * gravity) : 0, maxTwr: state.scenario.thrustLimit / (mass * gravity),
    hoverThrottle: mass * gravity / state.scenario.thrustLimit,
    holdAttitude: state.holdAttitude, torque: state.torque, density: state.density, dynamicPressure: state.dynamicPressure,
    safeToLand: contactReady(state.position, state.velocity, state.angle, state.angularVelocity),
    brakingAltitude: state.velocity[1] < 0 ? state.velocity[1] ** 2 / (2 * Math.max(0.000001, state.scenario.thrustLimit / mass - gravity)) : 0,
    limits: LANDING_LIMITS, scenario: state.scenario, impact: state.impact, maxImpact: state.maxImpact,
    event: state.event, failure: state.failure,
  };
}

export function validateLandingState(state) {
  if (!state || state.version !== 1 || state.kind !== 'landing' || !['landing', 'landed', 'failed'].includes(state.phase) || !getDestination(state.destination)) return false;
  if (!Array.isArray(state.position) || state.position.length !== 2 || !state.position.every(finite) || state.position[1] < 0 || state.position[1] > 10000 || Math.abs(state.position[0]) > 4000) return false;
  if (!Array.isArray(state.velocity) || state.velocity.length !== 2 || !state.velocity.every(finite) || state.velocity.some(v => Math.abs(v) > 10000)) return false;
  for (const key of ['time', 'fuel', 'fuelUsed', 'angle', 'angularVelocity', 'commandedThrottle', 'throttle', 'maxImpact']) if (!finite(state[key])) return false;
  if (state.time < 0 || state.time > 86400 || state.fuel < 0 || state.fuel > LANDER.propellant || state.fuelUsed < 0 || state.fuelUsed > LANDER.propellant + 0.01) return false;
  if (Math.abs(state.fuel + state.fuelUsed - LANDER.propellant) > 0.02 || Math.abs(state.angle) > Math.PI + 0.001 || Math.abs(state.angularVelocity) > 100) return false;
  if (state.commandedThrottle < 0 || state.commandedThrottle > 1 || state.throttle < 0 || state.throttle > 1 || state.maxImpact < 0 || typeof state.holdAttitude !== 'boolean') return false;
  if (typeof state.event !== 'string' || state.event.length > 4000 || !(state.failure === null || typeof state.failure === 'string')) return false;
  if (state.phase === 'landed' && (state.position[1] !== 0 || state.velocity.some(v => v !== 0) || state.angularVelocity !== 0)) return false;
  if (state.impact !== null) {
    if (!state.impact || !['verticalSpeed', 'horizontalSpeed', 'angle', 'angularVelocity', 'offset', 'speed', 'time'].every(k => finite(state.impact[k]))) return false;
    if (state.impact.time < 0 || state.impact.time > state.time + 1e-6 || state.impact.speed < 0) return false;
  }
  if (state.phase === 'landed' && (!state.impact || Math.abs(state.position[0] - state.impact.offset) > 0.001 || !contactReady([state.impact.offset, 0], [state.impact.horizontalSpeed, state.impact.verticalSpeed], state.impact.angle, state.impact.angularVelocity))) return false;
  if (state.phase === 'failed' && !state.failure) return false;
  return true;
}

export function restoreLandingState(raw) {
  if (!validateLandingState(raw)) throw new Error('Invalid landing checkpoint.');
  const state = createLanding(raw.destination);
  // No saved mass, gravity, thrust limit, engine parameter or tolerance is trusted.
  for (const key of ['phase', 'time', 'fuel', 'fuelUsed', 'angle', 'angularVelocity', 'commandedThrottle', 'holdAttitude', 'maxImpact', 'event', 'failure']) state[key] = raw[key];
  state.position = raw.position.slice(); state.velocity = raw.velocity.slice();
  state.impact = raw.impact ? Object.fromEntries(['verticalSpeed', 'horizontalSpeed', 'angle', 'angularVelocity', 'offset', 'speed', 'time'].map(k => [k, raw.impact[k]])) : null;
  state.gravity = getDestination(state.destination).mu / (getDestination(state.destination).radius + state.position[1]) ** 2;
  state.event = 'Landing checkpoint restored. Controls released.';
  state.throttle = 0; state.commandedThrottle = 0; state.thrust = 0; state.engine = false; state.torque = 0;
  return state;
}
