// AI-assisted implementation. Original game concept: Nikita.
import { createLaunch, createDocking, evaluateVehicle, orbitalElements, validateState } from './physics.js';
import { DEFAULT_CONFIG, normalizeConfig, resolveConfig } from './catalog.js';
import { DESTINATIONS } from './destinations.js';
import { validateLandingState, restoreLandingState } from './landing.js';
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'kineti-core.checkpoint.v1';
const PHASES = new Set(['assembly', 'launch', 'orbit', 'docking', 'docked', 'landing', 'landed']);
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function finiteTree(value, depth = 0) {
  if (depth > 18) return false;
  if (typeof value === 'number') return Number.isFinite(value) && Math.abs(value) < 1e24;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= 4000;
  if (Array.isArray(value)) return value.length <= 1000 && value.every(v => finiteTree(v, depth + 1));
  if (typeof value !== 'object') return false;
  const keys = Object.keys(value);
  return keys.length <= 150 && keys.every(k => !UNSAFE_KEYS.has(k) && finiteTree(value[k], depth + 1));
}

export function validateCheckpoint(value, validateConfig = () => true) {
  try { return validateCheckpointTrusted(value, validateConfig); } catch { return false; }
}

function validateCheckpointTrusted(value, validateConfig) {
  if (!value || value.version !== SAVE_VERSION || !PHASES.has(value.phase)) return false;
  if (!value.config || !finiteTree(value) || !validateConfig(value.config)) return false;
  const normalized = normalizeConfig(value.config);
  if (!Object.keys(DEFAULT_CONFIG).every(k => value.config[k] === normalized[k])) return false;
  if (value.destination !== undefined && !DESTINATIONS.some(d => d.id === value.destination)) return false;
  if (!Number.isFinite(Date.parse(value.savedAt))) return false;
  if (!Array.isArray(value.log) || value.log.length > 80) return false;
  if (!value.log.every(entry => entry && typeof entry === 'object' && Number.isFinite(entry.time) && entry.time >= 0 && typeof entry.message === 'string' && entry.message.length <= 2000)) return false;
  if (value.phase === 'assembly') return value.flight === null;
  if (normalized.design && !evaluateVehicle(normalized).valid) return false;
  const flight = value.flight;
  if (value.phase === 'landing' || value.phase === 'landed') {
    return validateLandingState(flight) && flight.phase === value.phase &&
      (value.destination === undefined || value.destination === flight.destination);
  }
  if (!validateState(flight)) return false;
  if (!flight || !Array.isArray(flight.position) || !Array.isArray(flight.velocity)) return false;
  const dimensions = ['docking', 'docked'].includes(value.phase) ? 3 : 2;
  if (flight.kind !== (dimensions === 3 ? 'docking' : 'launch')) return false;
  if (flight.phase !== value.phase) return false;
  if (!Object.keys(DEFAULT_CONFIG).every(k => flight.config[k] === value.config[k])) return false;
  // Canonicalize attachment order before comparison; force constants still come
  // from the dimensions, never from the serialized flight's stage objects.
  const flightConfig = normalizeConfig(flight.config);
  if (JSON.stringify(flightConfig.design ?? null) !== JSON.stringify(normalized.design ?? null)) return false;
  const trusted = resolveConfig(normalized);
  if (flight.position.length !== dimensions || flight.velocity.length !== dimensions) return false;
  if (!Number.isFinite(flight.time) || flight.time < 0 || flight.time > 86400 * 100) return false;
  if (dimensions === 3) {
    if (!Array.isArray(flight.orientation) || flight.orientation.length !== 4) return false;
    const norm = Math.hypot(...flight.orientation);
    if (norm < 0.99 || norm > 1.01 || flight.position.some(v => Math.abs(v) > 100000)) return false;
    if (!Array.isArray(flight.angularVelocity) || flight.angularVelocity.length !== 3) return false;
    if (!Number.isFinite(flight.fuel) || flight.fuel < 0) return false;
    if (flight.fuel > trusted.service.rcsFuel) return false;
    if (flight.fuelUsed !== undefined && (!Number.isFinite(flight.fuelUsed) || flight.fuelUsed < 0)) return false;
  } else {
    if (!Array.isArray(flight.stages) || flight.stages.length !== 2 || !Number.isInteger(flight.stageIndex) || flight.stageIndex < 0 || flight.stageIndex > 2) return false;
    if (typeof flight.guidance !== 'boolean' || typeof flight.liftoff !== 'boolean') return false;
    for (const key of ['throttle', 'commandedThrottle', 'pitch', 'pitchTrim', 'maxQ', 'dynamicPressure', 'loadG', 'fuelUsed', 'deltaVUsed', 'dragLoss']) {
      if (flight[key] !== undefined && !Number.isFinite(flight[key])) return false;
    }
    const parts = trusted;
    if (!flight.stages.every((s, i) => s.fuel <= [parts.core, parts.upper][i].propellant && s.attached === (i >= flight.stageIndex))) return false;
    if (Math.hypot(...flight.position) < 6000000 || Math.hypot(...flight.position) > 1000000000 || Math.hypot(...flight.velocity) > 100000) return false;
  }
  return true;
}

// Rebuild all forces, masses, tolerances and component constants from trusted
// catalog entries. Saved files only supply the evolving physical state.
export function restoreCheckpointFlight(snapshot, validateConfig) {
  if (!validateCheckpoint(snapshot, validateConfig)) throw new Error('Invalid checkpoint.');
  if (snapshot.phase === 'assembly') return null;
  const raw = snapshot.flight;
  if (raw.kind === 'landing') return restoreLandingState(raw);
  if (raw.kind === 'docking') {
    const flight = createDocking(snapshot.config, { position: raw.position, velocity: raw.velocity, orientation: raw.orientation, angularVelocity: raw.angularVelocity, fuel: raw.fuel });
    if (raw.fuel > flight.initialFuel) throw new Error('Invalid propellant reserve.');
    flight.time = raw.time;
    flight.fuelUsed = raw.fuelUsed ?? 0;
    flight.phase = snapshot.phase;
    flight.event = 'Checkpoint restored. Controls released.';
    return flight;
  }
  const flight = createLaunch(snapshot.config);
  const dynamic = ['position', 'velocity', 'time', 'stageIndex', 'liftoff', 'throttle', 'commandedThrottle', 'pitch', 'pitchTrim', 'guidance', 'maxQ', 'dynamicPressure', 'loadG', 'fuelUsed', 'deltaVUsed', 'dragLoss'];
  for (const key of dynamic) if (raw[key] !== undefined) flight[key] = structuredClone(raw[key]);
  raw.stages.forEach((s, i) => { flight.stages[i].fuel = s.fuel; flight.stages[i].attached = s.attached; });
  flight.orbit = orbitalElements(flight.position, flight.velocity);
  flight.phase = snapshot.phase;
  flight.event = 'Checkpoint restored. Controls released.';
  return flight;
}

export function makeCheckpoint(config, phase, flight, log = [], destination = flight?.destination ?? 'moon') {
  return structuredClone({ version: SAVE_VERSION, savedAt: new Date().toISOString(), config, destination, phase, flight, log: log.slice(-80) });
}

export function readCheckpoint(storage, validateConfig) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return { checkpoint: null, error: null };
    if (raw.length > 750000) return { checkpoint: null, error: 'Checkpoint is too large.' };
    const checkpoint = JSON.parse(raw);
    if (!validateCheckpoint(checkpoint, validateConfig)) return { checkpoint: null, error: 'The saved checkpoint is incompatible or damaged.' };
    return { checkpoint, error: null };
  } catch {
    return { checkpoint: null, error: 'Saved checkpoints are unavailable in this browser.' };
  }
}

export function writeCheckpoint(storage, checkpoint, validateConfig) {
  if (!validateCheckpoint(checkpoint, validateConfig)) return false;
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(checkpoint));
    return Boolean(storage);
  } catch {
    return false;
  }
}
