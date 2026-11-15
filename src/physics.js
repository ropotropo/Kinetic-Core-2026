import { CATALOG, DEFAULT_CONFIG, normalizeConfig, resolveConfig } from './catalog.js';
import { evaluateDesign } from './vehicle-design.js';

export { CATALOG, DEFAULT_CONFIG };
export { createVehicleConfig } from './catalog.js';
export const EARTH = Object.freeze({ radius: 6371000, mu: 3.98600435507e14, rotation: 7.2921159e-5, g0: 9.80665 });
export const FIXED_STEP = 1 / 60;
export const ORBIT_TARGET = 200000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const norm = v => Math.hypot(...v);
const DEG = Math.PI / 180;
const finite = v => typeof v === 'number' && Number.isFinite(v);

function payloadMass(parts) { return parts.capsule.dryMass + parts.service.dryMass + (parts.service.propellant || 0) + parts.service.rcsFuel + parts.cargo.dryMass; }
export function launchMass(state) {
  return state.payloadMass + state.stages.reduce((sum, stage) => sum + (stage.attached ? stage.dryMass + stage.fuel : 0), 0);
}

export function evaluateVehicle(config = DEFAULT_CONFIG) {
  const normalized = normalizeConfig(config), parts = resolveConfig(normalized);
  const payload = payloadMass(parts), upperWet = parts.upper.dryMass + parts.upper.propellant;
  const wetMass = payload + upperWet + parts.core.dryMass + parts.core.propellant;
  const dryMass = parts.capsule.dryMass + parts.service.dryMass + parts.cargo.dryMass + parts.upper.dryMass + parts.core.dryMass;
  const ideal = (isp, wet, dry) => isp > 0 && dry > 0 && wet >= dry ? isp * EARTH.g0 * Math.log(wet / dry) : 0;
  const coreDeltaV = ideal(parts.core.ispVac, wetMass, wetMass - parts.core.propellant);
  const upperDeltaV = ideal(parts.upper.ispVac, payload + upperWet, payload + parts.upper.dryMass);
  const deltaV = coreDeltaV + upperDeltaV;
  const twr = wetMass > 0 ? parts.core.thrustSea / (wetMass * EARTH.g0) : 0;
  const warnings = [], errors = [];
  if (twr < 1.15) warnings.push('Low liftoff thrust-to-weight ratio: ascent losses may prevent orbital insertion.');
  if (deltaV < 9400) warnings.push('Tight ideal delta-v budget: gravity, drag and steering consume the margin.');
  if (payload > 20000) warnings.push('Heavy spacecraft: expect slower RCS response.');
  if (twr <= 1) errors.push('Sea-level thrust is insufficient to lift this vehicle.');
  if (deltaV <= 8000) errors.push('Ideal delta-v is below the minimum orbital training budget.');
  if (normalized.design) {
    const assessment = evaluateDesign(normalized.design);
    errors.push(...assessment.errors); warnings.push(...assessment.warnings);
  }
  const serviceDeltaV = ideal(parts.service.ispVac || 0, payload, payload - (parts.service.propellant || 0));
  return { config: normalized, parts, wetMass, mass: wetMass, dryMass, payloadMass: payload, propellantMass: parts.core.propellant + parts.upper.propellant + (parts.service.propellant || 0), rcsFuel: parts.service.rcsFuel, deltaV, idealDeltaV: deltaV, coreDeltaV, upperDeltaV, serviceDeltaV, twr, TWR: twr, height: parts.layout?.height || parts.capsule.height + parts.service.height + parts.upper.height + parts.core.height, radius: parts.layout?.radius || Math.max(parts.core.radius, parts.upper.radius, parts.service.radius, parts.capsule.radius), valid: errors.length === 0, warnings: [...new Set(warnings)], errors: [...new Set(errors)], synthetic: true };
}

/** Same physical payload that reached orbit. Main propellant and attitude-control
 * reserve are separate resources; an attached upper stage is never discarded here. */
export function getPostOrbitSpacecraft(state) {
  if (!state || state.kind !== 'launch') throw new Error('A launch state is required.');
  const parts = resolveConfig(state.config), service = parts.service;
  const dryMass = parts.capsule.dryMass + service.dryMass + parts.cargo.dryMass;
  const stageSnapshot = (stage, index) => stage?.attached ? { stageIndex: index, dryMass: stage.dryMass, propellant: stage.fuel, fuel: stage.fuel, thrustSea: stage.thrustSea, thrustVac: stage.thrustVac, ispSea: stage.ispSea, ispVac: stage.ispVac, radius: stage.radius, height: stage.height } : null;
  const coreStage = stageSnapshot(state.stages[0], 0), upperStage = stageSnapshot(state.stages[1], 1);
  return {
    dryMass, propellant: service.propellant || 0, thrustVac: service.thrustVac || 0, ispVac: service.ispVac || 0,
    rcsFuel: service.rcsFuel, rcsThrust: service.rcsThrust, rcsIsp: service.rcsIsp, torque: service.torque,
    radius: Math.max(parts.capsule.radius, service.radius), height: parts.capsule.height + service.height,
    legCount: service.legCount || 0, solarCount: service.solarCount || 0,
    coreStage, upperStage, attachedStages: [coreStage, upperStage].filter(Boolean), totalMass: launchMass(state),
    position: [...state.position], velocity: [...state.velocity], time: state.time,
  };
}

/** NASA Glenn three-layer atmosphere, truncated above 100 km. */
export function atmosphere(altitude) {
  const h = Math.max(0, altitude);
  if (h > 100000) return { density: 0, pressure: 0, temperature: 195.8 };
  let t, p;
  if (h < 11000) { t = 15.04 - 0.00649 * h; p = 101.29 * ((t + 273.1) / 288.08) ** 5.256; }
  else if (h < 25000) { t = -56.46; p = 22.65 * Math.exp(1.73 - 0.000157 * h); }
  else { t = -131.21 + 0.00299 * h; p = 2.488 * ((t + 273.1) / 216.6) ** -11.388; }
  return { density: p / (0.2869 * (t + 273.1)), pressure: p * 1000, temperature: t + 273.1 };
}

export function orbitalElements(position, velocity) {
  const r = norm(position), speed2 = velocity[0] ** 2 + velocity[1] ** 2;
  const angularMomentum = position[0] * velocity[1] - position[1] * velocity[0];
  const energy = speed2 / 2 - EARTH.mu / r;
  const eccentricity = Math.sqrt(Math.max(0, 1 + 2 * energy * angularMomentum ** 2 / EARTH.mu ** 2));
  const semiMajor = energy < 0 ? -EARTH.mu / (2 * energy) : Infinity;
  const parameter = angularMomentum ** 2 / EARTH.mu;
  const periapsis = parameter / (1 + eccentricity) - EARTH.radius;
  const apoapsis = energy < 0 ? semiMajor * (1 + eccentricity) - EARTH.radius : Infinity;
  return { energy, angularMomentum, eccentricity, semiMajor, periapsis, apoapsis };
}

export function createLaunch(config = DEFAULT_CONFIG) {
  const vehicle = evaluateVehicle(config), parts = vehicle.parts;
  if (vehicle.config.design && !vehicle.valid) throw new Error(`Custom vehicle is not ready for flight: ${vehicle.errors.join(' ')}`);
  const effectiveRotation = EARTH.rotation * Math.cos(parts.site.latitude * DEG);
  return {
    version: 1, kind: 'launch', phase: 'launch', config: vehicle.config, time: 0,
    position: [EARTH.radius, 0], velocity: [0, EARTH.radius * effectiveRotation], effectiveRotation,
    stages: [parts.core, parts.upper].map(part => ({ ...part, fuel: part.propellant, attached: true })),
    stageIndex: 0, payloadMass: vehicle.payloadMass, initialMass: vehicle.wetMass,
    throttle: 0, commandedThrottle: 1, pitch: 0, pitchTrim: 0, guidance: true, guidancePitch: 0,
    engineOn: false, liftoff: false, maxQ: 0, dynamicPressure: 0, loadG: 0, thrust: 0, acceleration: 0,
    fuelUsed: 0, deltaVUsed: 0, dragLoss: 0, events: [], event: 'Vehicle ready on the launch pad.', failure: null,
    orbit: orbitalElements([EARTH.radius, 0], [0, EARTH.radius * effectiveRotation]),
  };
}

function pushEvent(state, type, message) {
  state.event = message;
  state.events.push({ time: state.time, type, message });
  if (state.events.length > 80) state.events.shift();
}

export function separateStage(state) {
  if (!state || state.kind !== 'launch' || state.phase === 'failed') return { ok: false, message: 'No active launch vehicle.' };
  if (state.stageIndex >= 2) return { ok: false, message: 'All launch stages are already detached.' };
  if (!state.liftoff) return { ok: false, message: 'Stage separation is inhibited on the launch pad.' };
  const stage = state.stages[state.stageIndex];
  const discardedMass = stage.dryMass + stage.fuel;
  stage.attached = false;
  state.stageIndex++;
  state.engineOn = false;
  pushEvent(state, 'separation', `${stage.name} separated. ${Math.round(discardedMass).toLocaleString('en-US')} kg released.`);
  return { ok: true, message: state.event, discardedMass, remainingFuel: stage.fuel };
}

function guidanceCommand(state, acceleration, altitude, vr, vt, gravity) {
  if (altitude < 1200) return { pitch: 0, throttle: 1 };
  const orbit = orbitalElements(state.position, state.velocity);
  const target = ORBIT_TARGET;
  // A closed-loop radial-velocity command. It deliberately carries no automatic
  // stage separation and steers via thrust, never by directly changing velocity.
  let desiredVr = clamp((target - altitude) / 60, -120, 580);
  if (state.stageIndex === 0) desiredVr = clamp((target - altitude) / 180, 300, 580);
  const radialAcceleration = gravity - vt * vt / (EARTH.radius + altitude) + (desiredVr - vr) / 38;
  let radialFraction = clamp(radialAcceleration / Math.max(0.1, acceleration), -0.45, 1);
  let pitch = Math.acos(radialFraction);
  // Suppress aggressive low-altitude pitch-over and limit acceleration loads.
  pitch = Math.min(pitch, clamp((altitude - 1200) / 40000, 0, 1) * 82 * DEG);
  if (altitude > 150000) pitch = Math.acos(radialFraction);
  let throttle = clamp(3.8 * EARTH.g0 / Math.max(acceleration, 0.1), 0.18, 1);
  // Once both apsides are safely above the atmosphere, the engine is cut off.
  if (state.phase === 'orbit' || (orbit.energy < 0 && Number.isFinite(orbit.apoapsis) && orbit.periapsis >= 150000 && orbit.apoapsis >= 180000 && altitude >= 150000)) throttle = 0;
  return { pitch, throttle };
}

function launchSubstep(state, input, dt) {
  if (state.phase === 'failed') return;
  const radius = norm(state.position), altitude = radius - EARTH.radius;
  const radial = state.position.map(value => value / radius), tangent = [-radial[1], radial[0]];
  const vr = state.velocity[0] * radial[0] + state.velocity[1] * radial[1];
  const vt = state.velocity[0] * tangent[0] + state.velocity[1] * tangent[1];
  const air = atmosphere(altitude), mass = launchMass(state), gravity = EARTH.mu / radius ** 2;
  const current = state.stages[state.stageIndex];
  const pressureFraction = clamp(air.pressure / 101290, 0, 1);
  const thrustFull = current?.attached ? current.thrustVac - (current.thrustVac - current.thrustSea) * pressureFraction : 0;
  const isp = current?.attached ? current.ispVac - (current.ispVac - current.ispSea) * pressureFraction : 0;
  state.guidance = input.guidance ?? state.guidance;
  state.commandedThrottle = clamp(finite(input.throttle) ? input.throttle : state.commandedThrottle, 0, 1);
  const pitchInput = clamp(input.pitchTrim || 0, -1, 1);
  state.pitchTrim = clamp(state.pitchTrim + pitchInput * 1.5 * DEG * dt, -35 * DEG, 35 * DEG);
  const command = guidanceCommand(state, thrustFull / mass, altitude, vr, vt, gravity);
  state.guidancePitch = command.pitch;
  if (state.guidance) state.pitch = command.pitch + state.pitchTrim;
  else state.pitch = clamp(state.pitch + pitchInput * 3 * DEG * dt, -20 * DEG, 160 * DEG);
  const throttle = state.commandedThrottle * (state.guidance ? command.throttle : 1);
  const available = state.phase === 'launch' && current?.attached && current.fuel > 0 && state.stageIndex < 2;
  let thrust = available ? thrustFull * throttle : 0;
  const massFlow = thrust && isp ? thrust / (isp * EARTH.g0) : 0;
  let burned = available ? Math.min(current.fuel, massFlow * dt) : 0;
  if (massFlow * dt > burned && massFlow > 0) thrust *= burned / (massFlow * dt);
  state.throttle = available ? throttle : 0;
  state.engineOn = thrust > 0;
  // Half-step propellant mass makes impulse accounting accurate at fixed dt.
  const stepMass = mass - burned / 2;
  const pitch = state.pitch;
  const direction = [radial[0] * Math.cos(pitch) + tangent[0] * Math.sin(pitch), radial[1] * Math.cos(pitch) + tangent[1] * Math.sin(pitch)];
  const airVelocity = [-state.position[1] * state.effectiveRotation, state.position[0] * state.effectiveRotation];
  const relative = state.velocity.map((value, i) => value - airVelocity[i]);
  const airspeed = norm(relative);
  const area = Math.PI * (current?.radius ?? resolveConfig(state.config).capsule.radius) ** 2;
  const q = 0.5 * air.density * airspeed ** 2;
  const drag = q * area * (current?.dragCoefficient ?? 0.3);
  const forceAcceleration = direction.map((value, i) => thrust / stepMass * value - (airspeed > 0 ? drag / stepMass * relative[i] / airspeed : 0));
  const acceleration = forceAcceleration.map((value, i) => value - gravity * radial[i]);
  state.dynamicPressure = q;
  state.maxQ = Math.max(state.maxQ, q);
  state.loadG = norm(forceAcceleration) / EARTH.g0;
  state.thrust = thrust;
  state.acceleration = norm(acceleration);
  // Ground reaction holds a non-lifting rocket on the rotating launch pad.
  if (!state.liftoff && thrust * Math.cos(pitch) <= mass * gravity) {
    const angle = state.effectiveRotation * dt;
    const c = Math.cos(angle), s = Math.sin(angle), [px, py] = state.position;
    state.position = [px * c - py * s, px * s + py * c];
    state.velocity = [-state.position[1] * state.effectiveRotation, state.position[0] * state.effectiveRotation];
  } else {
    if (!state.liftoff) { state.liftoff = true; pushEvent(state, 'liftoff', 'Liftoff. Positive vertical acceleration.'); }
    state.position = state.position.map((value, i) => value + state.velocity[i] * dt + 0.5 * acceleration[i] * dt ** 2);
    const newRadius = norm(state.position), newGravity = state.position.map(value => -EARTH.mu * value / newRadius ** 3);
    state.velocity = state.velocity.map((value, i) => value + (forceAcceleration[i] + 0.5 * (-gravity * radial[i] + newGravity[i])) * dt);
  }
  if (available) {
    current.fuel = Math.max(0, current.fuel - burned);
    if (current.fuel < 1e-6 && burned > 0) pushEvent(state, 'burnout', `${current.name} propellant depleted. Separate the stage.`);
  }
  state.fuelUsed += burned;
  if (thrust > 0) state.deltaVUsed += thrust / stepMass * dt;
  state.dragLoss += drag / stepMass * dt;
  state.time += dt;
  state.orbit = orbitalElements(state.position, state.velocity);
  const newAltitude = norm(state.position) - EARTH.radius;
  if (state.liftoff && newAltitude < -2) {
    state.phase = 'failed'; state.failure = 'Surface impact. The trajectory returned below ground level.';
    pushEvent(state, 'failure', state.failure);
  } else if (state.liftoff && q > 110000) {
    state.phase = 'failed'; state.failure = 'Aerodynamic load exceeded the vehicle design limit (110 kPa).';
    pushEvent(state, 'failure', state.failure);
  } else if (state.orbit.energy < 0 && Number.isFinite(state.orbit.apoapsis) && state.orbit.periapsis >= 150000 && state.orbit.apoapsis >= 180000 && newAltitude >= 150000 && state.phase !== 'orbit') {
    state.phase = 'orbit'; state.throttle = 0; state.commandedThrottle = 0; state.engineOn = false; state.thrust = 0; state.loadG = 0; state.acceleration = EARTH.mu / norm(state.position) ** 2;
    pushEvent(state, 'orbit', 'A bound orbit with periapsis above 150 km is confirmed. Engine cutoff.');
  }
}

export function stepLaunch(state, input = {}, dt = FIXED_STEP) {
  if (!state || state.kind !== 'launch' || !finite(dt) || dt <= 0) return state;
  const count = Math.ceil(Math.min(dt, 60) / FIXED_STEP), substep = Math.min(dt, 60) / count;
  for (let i = 0; i < count && state.phase !== 'failed'; i++) launchSubstep(state, input, substep);
  return state;
}

export function getLaunchTelemetry(state) {
  const radius = norm(state.position), radial = state.position.map(value => value / radius), tangent = [-radial[1], radial[0]];
  const orbit = orbitalElements(state.position, state.velocity), stage = state.stages[state.stageIndex];
  const mass = launchMass(state);
  let remainingDeltaV = 0, futureMass = mass;
  for (let index = state.stageIndex; index < 2; index++) {
    const item = state.stages[index];
    if (!item.attached) continue;
    remainingDeltaV += item.ispVac * EARTH.g0 * Math.log(futureMass / (futureMass - item.fuel));
    futureMass -= item.fuel + item.dryMass;
  }
  return {
    phase: state.phase, time: state.time, altitude: radius - EARTH.radius, speed: norm(state.velocity),
    verticalSpeed: state.velocity[0] * radial[0] + state.velocity[1] * radial[1],
    horizontalSpeed: state.velocity[0] * tangent[0] + state.velocity[1] * tangent[1],
    mass, fuel: stage?.attached ? stage.fuel : 0, fuelFraction: stage?.attached ? stage.fuel / stage.propellant : 0,
    stageFuel: stage?.attached ? stage.fuel / stage.propellant : 0, remainingDeltaV, thrust: state.thrust, acceleration: state.acceleration,
    stageName: stage?.name ?? 'Spacecraft', stageIndex: state.stageIndex, stageCount: 2,
    throttle: state.throttle, pitch: state.pitch, pitchDegrees: state.pitch / DEG,
    dynamicPressure: state.dynamicPressure, maxQ: state.maxQ, loadG: state.loadG,
    apoapsis: orbit.apoapsis, periapsis: orbit.periapsis, eccentricity: orbit.eccentricity,
    orbit, guidance: state.guidance, stageReady: Boolean(stage && stage.fuel / stage.propellant < 0.005),
    fuelUsed: state.fuelUsed, deltaVUsed: state.deltaVUsed, event: state.event, failure: state.failure,
    canDock: state.phase === 'orbit' && state.stageIndex >= 2,
  };
}

export function quaternionMultiply(a, b) {
  const [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
  return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz];
}
export function rotateVector(q, v) {
  const p = quaternionMultiply(quaternionMultiply(q, [...v, 0]), [-q[0], -q[1], -q[2], q[3]]);
  return p.slice(0, 3);
}
function eulerQuaternion(pitch, yaw, roll) {
  const cx = Math.cos(pitch / 2), sx = Math.sin(pitch / 2), cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2), cz = Math.cos(roll / 2), sz = Math.sin(roll / 2);
  return [sx * cy * cz + cx * sy * sz, cx * sy * cz - sx * cy * sz, cx * cy * sz + sx * sy * cz, cx * cy * cz - sx * sy * sz];
}

export function createDocking(config = DEFAULT_CONFIG, options = {}) {
  const normalized = normalizeConfig(config), parts = resolveConfig(normalized);
  // Main-engine propellant remains aboard during this independent RCS exercise.
  const dryMass = parts.capsule.dryMass + parts.service.dryMass + (parts.service.propellant || 0) + parts.cargo.dryMass;
  const length = parts.capsule.height + parts.service.height;
  const radius = Math.max(parts.capsule.radius, parts.service.radius);
  const mass = dryMass + parts.service.rcsFuel;
  const meanMotion = Math.sqrt(EARTH.mu / (EARTH.radius + ORBIT_TARGET) ** 3);
  const orientation = options.orientation?.slice() ?? eulerQuaternion(2 * DEG, -3 * DEG, 2 * DEG);
  const frameSpinBody = rotateVector([-orientation[0], -orientation[1], -orientation[2], orientation[3]], [-meanMotion, 0, 0]);
  return {
    version: 1, kind: 'docking', phase: 'docking', config: normalized, time: 0,
    position: options.position?.slice() ?? [1.8, -1.2, 70], velocity: options.velocity?.slice() ?? [0, 0, 0],
    orientation, angularVelocity: options.angularVelocity?.slice() ?? frameSpinBody,
    dryMass, fuel: options.fuel ?? parts.service.rcsFuel, initialFuel: parts.service.rcsFuel,
    thrust: parts.service.rcsThrust, torque: parts.service.torque, isp: parts.service.rcsIsp,
    inertia: [mass * (3 * radius ** 2 + length ** 2) / 12, mass * (3 * radius ** 2 + length ** 2) / 12, 0.5 * mass * radius ** 2],
    meanMotion, orbitalAltitude: ORBIT_TARGET,
    event: 'Terminal approach training begins 70 m from the port. Manual RCS control.', failure: null,
    holdAttitude: false, brake: false, lastThrust: [0, 0, 0], lastTorque: [0, 0, 0], fuelUsed: 0,
    capture: { lateral: 0.35, speed: 0.2, closingSpeed: 0.15, angle: 5 * DEG, angularSpeed: 1 * DEG },
  };
}

export function dockingAttitude(state) {
  const q = state.orientation, [x, y, z, w] = q;
  const pitch = Math.atan2(2 * (w * x - y * z), 1 - 2 * (x * x + y * y));
  const yaw = Math.asin(clamp(2 * (w * y + z * x), -1, 1));
  const roll = Math.atan2(2 * (w * z - x * y), 1 - 2 * (y * y + z * z));
  const angle = 2 * Math.acos(clamp(Math.abs(w), -1, 1));
  return { pitch, yaw, roll, angle };
}

/** Body-axis angular velocity relative to the rotating station frame. */
export function relativeAngularVelocity(state) {
  const q = state.orientation;
  const frameSpinBody = rotateVector([-q[0], -q[1], -q[2], q[3]], [-state.meanMotion, 0, 0]);
  return state.angularVelocity.map((value, i) => value - frameSpinBody[i]);
}

function dockingSubstep(state, input, dt) {
  if (state.phase !== 'docking') return;
  state.holdAttitude = Boolean(input.holdAttitude);
  state.brake = Boolean(input.brake);
  const mass = state.dryMass + state.fuel;
  let bodyForce = [clamp(input.x || 0, -1, 1), clamp(input.y || 0, -1, 1), -clamp(input.z || 0, -1, 1)].map(v => v * state.thrust);
  let bodyTorque = [input.pitch || 0, input.yaw || 0, input.roll || 0].map(v => clamp(v, -1, 1) * state.torque);
  if (state.brake) {
    const localVelocity = rotateVector([-state.orientation[0], -state.orientation[1], -state.orientation[2], state.orientation[3]], state.velocity);
    bodyForce = bodyForce.map((force, i) => clamp(force - localVelocity[i] * mass / 3, -state.thrust, state.thrust));
  }
  if (state.holdAttitude) {
    const error = state.orientation[3] < 0 ? state.orientation.map(v => -v) : state.orientation;
    const relativeSpin = relativeAngularVelocity(state);
    bodyTorque = bodyTorque.map((torque, i) => clamp(torque - 2 * error[i] * state.inertia[i] * 0.035 - relativeSpin[i] * state.inertia[i] * 0.38, -state.torque, state.torque));
  }
  // A torque couple uses two opposing jets at a 2 m effective lever arm.
  const equivalentForce = bodyForce.reduce((s, v) => s + Math.abs(v), 0) + bodyTorque.reduce((s, v) => s + Math.abs(v), 0) / 2;
  const requestedFuel = equivalentForce / (state.isp * EARTH.g0) * dt;
  const fuelScale = requestedFuel > 0 ? Math.min(1, state.fuel / requestedFuel) : 1;
  bodyForce = bodyForce.map(v => v * fuelScale); bodyTorque = bodyTorque.map(v => v * fuelScale);
  const used = requestedFuel * fuelScale;
  state.fuel = Math.max(0, state.fuel - used); state.fuelUsed += used;
  state.lastThrust = bodyForce; state.lastTorque = bodyTorque;
  const worldForce = rotateVector(state.orientation, bodyForce);
  const n = state.meanMotion;
  // Right-handed UI coordinates map to HCW [radial,along,cross] = [y,-z,-x].
  const [x, y, z] = state.position, [vx, vy, vz] = state.velocity;
  const acceleration = [-n * n * x, 3 * n * n * y - 2 * n * vz, 2 * n * vy].map((v, i) => v + worldForce[i] / mass);
  state.position = state.position.map((v, i) => v + state.velocity[i] * dt + 0.5 * acceleration[i] * dt ** 2);
  const nextGravity = [-n * n * state.position[0], 3 * n * n * state.position[1] - 2 * n * vz, 2 * n * vy];
  state.velocity = state.velocity.map((v, i) => v + (0.5 * (acceleration[i] + nextGravity[i]) + 0.5 * worldForce[i] / mass) * dt);
  const w = state.angularVelocity, I = state.inertia;
  const gyroscopic = [(I[2] - I[1]) * w[1] * w[2], (I[0] - I[2]) * w[2] * w[0], (I[1] - I[0]) * w[0] * w[1]];
  state.angularVelocity = w.map((value, i) => value + (bodyTorque[i] - gyroscopic[i]) / I[i] * dt);
  const inertialDerivative = quaternionMultiply(state.orientation, [...state.angularVelocity, 0]);
  const frameDerivative = quaternionMultiply([-state.meanMotion, 0, 0, 0], state.orientation);
  const derivative = inertialDerivative.map((v, i) => 0.5 * (v - frameDerivative[i]));
  const q = state.orientation.map((value, i) => value + derivative[i] * dt), length = norm(q);
  state.orientation = q.map(v => v / length);
  state.time += dt;
  const range = state.position[2], lateral = Math.hypot(state.position[0], state.position[1]);
  if (range <= 0) {
    const attitude = dockingAttitude(state), speed = norm(state.velocity), angularSpeed = norm(relativeAngularVelocity(state));
    const c = state.capture;
    if (lateral <= c.lateral && speed <= c.speed && Math.abs(state.velocity[2]) <= c.closingSpeed && attitude.angle <= c.angle && angularSpeed <= c.angularSpeed) {
      state.phase = 'docked'; state.position = [0, 0, 0]; state.velocity = [0, 0, 0];
      const q = state.orientation;
      state.angularVelocity = rotateVector([-q[0], -q[1], -q[2], q[3]], [-state.meanMotion, 0, 0]);
      state.lastThrust = [0, 0, 0]; state.lastTorque = [0, 0, 0];
      state.event = 'Soft capture confirmed. Mechanical latches secured.';
    } else {
      state.phase = 'failed';
      state.failure = lateral > c.lateral ? 'Missed the capture corridor. Lateral offset exceeded 0.35 m.' : speed > c.speed || Math.abs(state.velocity[2]) > c.closingSpeed ? 'Hard contact. Approach exceeded the safe capture speed.' : 'Unsafe contact. Attitude or rotation exceeded capture limits.';
      state.event = state.failure;
    }
  } else if (norm(state.position) > 1500) {
    state.phase = 'failed'; state.failure = 'Lost the terminal approach area. Return to the checkpoint.'; state.event = state.failure;
  }
}

export function stepDocking(state, input = {}, dt = FIXED_STEP) {
  if (!state || state.kind !== 'docking' || !finite(dt) || dt <= 0) return state;
  const count = Math.ceil(Math.min(dt, 10) / FIXED_STEP), substep = Math.min(dt, 10) / count;
  for (let i = 0; i < count && state.phase === 'docking'; i++) dockingSubstep(state, input, substep);
  return state;
}

export function getDockingTelemetry(state) {
  const attitude = dockingAttitude(state);
  return {
    phase: state.phase, time: state.time, range: Math.max(0, state.position[2]), distance: norm(state.position),
    offsetX: state.position[0], offsetY: state.position[1], lateralOffset: Math.hypot(state.position[0], state.position[1]),
    velocityX: state.velocity[0], velocityY: state.velocity[1], velocityZ: state.velocity[2],
    closingSpeed: -state.velocity[2], relativeSpeed: norm(state.velocity),
    pitch: attitude.pitch, yaw: attitude.yaw, roll: attitude.roll, angle: attitude.angle,
    pitchDegrees: attitude.pitch / DEG, yawDegrees: attitude.yaw / DEG, rollDegrees: attitude.roll / DEG, angleDegrees: attitude.angle / DEG,
    angularSpeed: norm(relativeAngularVelocity(state)), angularSpeedDegrees: norm(relativeAngularVelocity(state)) / DEG,
    fuel: state.fuel, fuelFraction: state.fuel / state.initialFuel, fuelUsed: state.fuelUsed,
    mass: state.dryMass + state.fuel, holdAttitude: state.holdAttitude, brake: state.brake,
    lastThrust: state.lastThrust, lastTorque: state.lastTorque, capture: state.capture,
    captureReady: Math.hypot(state.position[0], state.position[1]) <= state.capture.lateral && norm(state.velocity) <= state.capture.speed && Math.abs(state.velocity[2]) <= state.capture.closingSpeed && attitude.angle <= state.capture.angle && norm(relativeAngularVelocity(state)) <= state.capture.angularSpeed,
    event: state.event, failure: state.failure,
  };
}

export function validateState(state) {
  if (!state || state.version !== 1 || !['launch', 'docking'].includes(state.kind)) return false;
  if (!finite(state.time) || state.time < 0 || !state.config || !Array.isArray(state.position) || !Array.isArray(state.velocity)) return false;
  const dimension = state.kind === 'launch' ? 2 : 3;
  if (state.position.length !== dimension || state.velocity.length !== dimension || !state.position.every(finite) || !state.velocity.every(finite)) return false;
  if (state.kind === 'launch') return Array.isArray(state.stages) && state.stages.length === 2 && state.stages.every(s => finite(s.fuel) && s.fuel >= 0 && s.fuel <= s.propellant && typeof s.attached === 'boolean') && [0, 1, 2].includes(state.stageIndex) && finite(state.payloadMass) && state.payloadMass > 0;
  return finite(state.fuel) && state.fuel >= 0 && state.fuel <= state.initialFuel && Array.isArray(state.orientation) && state.orientation.length === 4 && state.orientation.every(finite) && Math.abs(norm(state.orientation) - 1) < 0.02 && Array.isArray(state.angularVelocity) && state.angularVelocity.length === 3 && state.angularVelocity.every(finite);
}

export function cloneState(state) { return JSON.parse(JSON.stringify(state)); }
