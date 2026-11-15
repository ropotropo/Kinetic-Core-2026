import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_KEY, makeCheckpoint, validateCheckpoint, readCheckpoint, writeCheckpoint, restoreCheckpointFlight } from '../src/storage.js';
import { createLaunch, createDocking } from '../src/physics.js';
import { DEFAULT_CONFIG } from '../src/catalog.js';
import { createLanding, stepLanding, LANDER } from '../src/landing.js';

const config = { ...DEFAULT_CONFIG };
const validConfig = c => c.capsule === 'pioneer';

test('checkpoint keeps an independent design snapshot and restores it', () => {
  const original = { ...config };
  const checkpoint = makeCheckpoint(original, 'assembly', null, [{ message: 'Ready', time: 0 }]);
  original.cargo = 200;
  assert.equal(checkpoint.config.cargo, 'none');
  const values = new Map();
  const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) };
  assert.equal(writeCheckpoint(storage, checkpoint, validConfig), true);
  assert.deepEqual(readCheckpoint(storage, validConfig).checkpoint, checkpoint);
});

test('damaged, nonfinite, incompatible and untrusted saves are rejected', () => {
  const checkpoint = makeCheckpoint(config, 'assembly', null);
  assert.equal(validateCheckpoint({ ...checkpoint, version: 99 }, validConfig), false);
  assert.equal(validateCheckpoint({ ...checkpoint, savedAt: 'not a date' }, validConfig), false);
  assert.equal(validateCheckpoint({ ...checkpoint, config: { ...config, cargo: Infinity } }, validConfig), false);
  assert.equal(validateCheckpoint({ ...checkpoint, config: { ...config, capsule: 'unknown' } }, validConfig), false);
  const unsafe = JSON.parse(JSON.stringify(checkpoint).replace('"cargo":"none"', '"cargo":"none","__proto__":{}'));
  assert.equal(validateCheckpoint(unsafe, validConfig), false);
  const badStorage = { getItem: () => '{not json' };
  assert.equal(readCheckpoint(badStorage, validConfig).checkpoint, null);
});

test('storage denial does not throw or stop a new mission', () => {
  const storage = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
  assert.equal(readCheckpoint(storage, validConfig).checkpoint, null);
  assert.equal(writeCheckpoint(storage, makeCheckpoint(config, 'assembly', null), validConfig), false);
  assert.equal(readCheckpoint(null, validConfig).checkpoint, null);
});

test('flight save must contain a physical state of the correct dimension', () => {
  const launch = createLaunch(config);
  assert.equal(validateCheckpoint(makeCheckpoint(config, 'launch', launch), validConfig), true);
  assert.equal(validateCheckpoint(makeCheckpoint(config, 'launch', { ...launch, position: [0] }), validConfig), false);
  assert.equal(validateCheckpoint(makeCheckpoint(config, 'launch', { ...launch, stages: [] }), validConfig), false);
  assert.equal(validateCheckpoint(makeCheckpoint(config, 'launch', { ...launch, position: ['bad', 0] }), validConfig), false);
  assert.equal(validateCheckpoint(makeCheckpoint(config, 'launch', { ...launch, pitch: 'bad' }), validConfig), false);
  const docking = createDocking(config);
  assert.equal(validateCheckpoint(makeCheckpoint(config, 'docking', docking), validConfig), true);
  assert.equal(validateCheckpoint(makeCheckpoint(config, 'docking', { ...docking, orientation: [0, 0, 0, 0] }), validConfig), false);
  assert.equal(validateCheckpoint(makeCheckpoint(config, 'docking', { ...docking, fuel: -1 }), validConfig), false);
});

test('restoration rebuilds force constants and safety tolerances from the catalog', () => {
  const docking = createDocking(config);
  docking.fuel = 200;
  docking.thrust = 999999999;
  docking.capture.speed = 99999;
  const restored = restoreCheckpointFlight(makeCheckpoint(config, 'docking', docking), validConfig);
  assert.equal(restored.thrust, createDocking(config).thrust);
  assert.equal(restored.capture.speed, createDocking(config).capture.speed);
  assert.equal(restored.fuel, 200);
  const mismatched = makeCheckpoint(config, 'launch', createLaunch(config));
  mismatched.flight.config.capsule = 'horizon';
  assert.equal(validateCheckpoint(mismatched, validConfig), false);
});

test('malformed flight log entries cannot break the restored interface', () => {
  const checkpoint = makeCheckpoint(config, 'assembly', null);
  for (const entry of [null, 'bad', {}, { time: '0', message: 'bad' }, { time: -1, message: 'bad' }, { time: 0, message: {} }]) {
    assert.equal(validateCheckpoint({ ...checkpoint, log: [entry] }, validConfig), false);
  }
  assert.equal(validateCheckpoint({ ...checkpoint, log: [{ time: 12.5, message: 'Stage separated.' }] }, validConfig), true);
});

test('landing checkpoints preserve the destination and rebuild trusted lander parameters', () => {
  const flight = createLanding('europa');
  stepLanding(flight, { throttle: .5, turn: .2 }, 1);
  const checkpoint = makeCheckpoint(config, 'landing', flight);
  assert.equal(validateCheckpoint(checkpoint, validConfig), true);
  checkpoint.flight.dryMass = 1;
  checkpoint.flight.scenario.thrustLimit = 1e12;
  const restored = restoreCheckpointFlight(checkpoint, validConfig);
  assert.equal(restored.destination, 'europa');
  assert.equal(restored.dryMass, LANDER.dryMass);
  assert.equal(restored.scenario.thrustLimit, createLanding('europa').scenario.thrustLimit);
  assert.deepEqual(restored.position, flight.position);
  assert.equal(restored.fuel, flight.fuel);
  assert.equal(restored.thrust, 0);
  assert.equal(restored.commandedThrottle, 0);
});

test('landing saves reject invalid destinations, missing motion and phase mismatches', () => {
  const checkpoint = makeCheckpoint(config, 'landing', createLanding('titan'));
  assert.equal(validateCheckpoint({ ...checkpoint, destination: 'jupiter' }, validConfig), false);
  assert.equal(validateCheckpoint({ ...checkpoint, destination: 'moon' }, validConfig), false);
  for (const field of [{ position: [0] }, { velocity: [0, NaN] }, { fuel: -1 }, { phase: 'landed' }, { destination: 'unknown' }, { holdAttitude: 'yes' }]) {
    assert.equal(validateCheckpoint({ ...checkpoint, flight: { ...checkpoint.flight, ...field } }, validConfig), false);
  }
  // Additive destination data does not invalidate the existing v1 launch schema.
  const oldSave = makeCheckpoint(config, 'launch', createLaunch(config));
  delete oldSave.destination;
  assert.equal(validateCheckpoint(oldSave, validConfig), true);
});
