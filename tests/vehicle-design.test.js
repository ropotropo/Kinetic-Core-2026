import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, TYPES, createLunarDesign, createEmptyDesign, validateVehicleDesign, normalizeDesign, getVehicleLayout, getAttachmentPoints, evaluateDesign } from '../src/vehicle-design.js';
import { createVehicleConfig, resolveConfig, normalizeConfig, DEFAULT_CONFIG } from '../src/catalog.js';
import { EARTH, createLaunch, stepLaunch, separateStage, evaluateVehicle, launchMass, getPostOrbitSpacecraft, getLaunchTelemetry } from '../src/physics.js';
import { makeCheckpoint, validateCheckpoint, restoreCheckpointFlight } from '../src/storage.js';
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);

test('typed attachment order canonicalizes geometry and physical performance', () => {
  const a = createLunarDesign(), b = { ...a, slots: Object.fromEntries(Object.entries(a.slots).reverse()) };
  assert.deepEqual(validateVehicleDesign(a), validateVehicleDesign(b));
  assert.deepEqual(getVehicleLayout(a), getVehicleLayout(b));
  assert.deepEqual(evaluateDesign(a), evaluateDesign(b));
  assert.deepEqual(createVehicleConfig(a), createVehicleConfig(b));
  assert.deepEqual(normalizeConfig(DEFAULT_CONFIG), DEFAULT_CONFIG, 'old selectors are unchanged');
  const layout = getVehicleLayout(a);
  const legs = layout.parts.filter(p => p.type === 'legs');
  assert.ok(legs.every(p => p.position[1] === legs[0].position[1]));
  assert.ok(legs.every(p => Math.abs(Math.hypot(p.position[0], p.position[2]) - 3.05) < 1e-10));
  assert.equal(getAttachmentPoints(a).length, SLOTS.length);
  assert.equal(getAttachmentPoints(a).find(p => p.id === 'nose').occupied, false);
  const emptyPoints = getAttachmentPoints(createEmptyDesign()).filter(p => p.accepts[0] === 'engine');
  assert.equal(new Set(emptyPoints.map(p => p.position.join(','))).size, 3, 'empty blueprint engines have distinct placement targets');
});

test('the editable empty vehicle is finite and cannot start a physical flight', () => {
  const empty = createEmptyDesign(), e = evaluateDesign(empty);
  assert.deepEqual(normalizeDesign(empty), empty);
  assert.equal(e.valid, false); assert.equal(e.wetMass, 0); assert.equal(e.deltaV, 0);
  assert.throws(() => createLaunch(createVehicleConfig(empty)), /not ready/);
  assert.equal(Object.keys(TYPES).length, 8);
});

test('untrusted imports reject unknown slots, wrong attachments, overlaps and force fields', () => {
  const mutate = fn => { const d = createLunarDesign(); fn(d); return d; };
  for (const d of [
    mutate(d => { d.slots['random-slot'] = { type: 'tank', radius: 1, length: 2 }; }),
    mutate(d => { d.slots.capsule.type = 'tank'; }),
    mutate(d => { d.slots.capsule.radius = -1; }),
    mutate(d => { d.slots.capsule.length = Infinity; }),
    mutate(d => { d.slots['upper-engine'].thrustVac = 1e20; }),
    mutate(d => { d.slots.capsule = [d.slots.capsule, d.slots.capsule]; }),
    mutate(d => { d.slots = []; }),
    mutate(d => { d.extra = true; }),
  ]) assert.throws(() => validateVehicleDesign(d));
  const unsafe = JSON.parse('{"format":"kineti-core-rocket","version":2,"slots":{"__proto__":{"type":"tank","radius":1,"length":1}}}');
  assert.throws(() => validateVehicleDesign(unsafe));
});

test('legacy dimension arrays migrate by type and size independent of insertion order', () => {
  const parts = [
    { type: 'tank', radius: 1, length: 3 }, { type: 'engine', radius: 1, length: 2 },
    { type: 'capsule', radius: 2, length: 3.4 }, { type: 'tank', radius: 3, length: 12 },
    { type: 'engine', radius: 2, length: 3 }, { type: 'tank', radius: 2, length: 8 },
  ];
  const legacy = { format: 'kineti-core-rocket', version: 1, parts };
  const a = validateVehicleDesign(legacy), b = validateVehicleDesign({ ...legacy, parts: [...parts].reverse() });
  assert.deepEqual(a, b); assert.equal(a.version, 2);
  assert.equal(a.slots['core-tank-1'].radius, 3);
  assert.equal(a.slots['core-engine'].radius, 2);
  assert.throws(() => validateVehicleDesign({ ...legacy, parts: [...parts, { type: 'unknown', radius: 1, length: 1 }] }));
  assert.throws(() => validateVehicleDesign({ ...legacy, parts: Array.from({ length: 5 }, () => ({ type: 'tank', radius: 1, length: 1 })) }));
});

test('boosters require cylinder clearance and balanced paired thrust; fuel stays with core', () => {
  const design = createLunarDesign();
  design.slots['booster-1'] = { type: 'booster', radius: 1, length: 12 };
  assert.equal(evaluateDesign(design).valid, false);
  design.slots['booster-3'] = { ...design.slots['booster-1'] };
  const e = evaluateDesign(design), normal = evaluateDesign(createLunarDesign());
  assert.ok(e.valid); close(e.parts.core.thrustSea - normal.parts.core.thrustSea, 4e6);
  assert.ok(e.parts.core.propellant > normal.parts.core.propellant);
  const crowded = createEmptyDesign();
  crowded.slots['core-tank-1'] = { type: 'tank', radius: .2, length: 10 };
  for (const id of ['booster-1', 'booster-2']) crowded.slots[id] = { type: 'booster', radius: 5, length: 10 };
  assert.throws(() => validateVehicleDesign(crowded), /overlaps/);
});

test('hardware dimensions determine the mass, loaded fuel, thrust and finite burn rate', () => {
  const design = createLunarDesign(), config = createVehicleConfig(design), parts = resolveConfig(config);
  const estimate = evaluateDesign(design), vehicle = evaluateVehicle(config), layout = getVehicleLayout(design);
  assert.ok(estimate.valid && vehicle.valid);
  close(vehicle.wetMass, estimate.wetMass);
  close(vehicle.wetMass, layout.parts.reduce((n, p) => n + p.mass, 0) + parts.service.rcsFuel, 1e-7);
  close(vehicle.dryMass, estimate.dryMass);
  close(vehicle.payloadMass, parts.capsule.dryMass + parts.service.dryMass + parts.service.propellant + parts.service.rcsFuel);
  const modified = structuredClone(design);
  modified.slots['core-engine'].radius *= .9;
  const small = evaluateVehicle(createVehicleConfig(modified));
  close(small.parts.core.thrustSea, vehicle.parts.core.thrustSea * .81);
  assert.ok(small.twr < vehicle.twr);
  const biggerTank = structuredClone(design); biggerTank.slots['service-tank'].length *= 1.25;
  const large = evaluateVehicle(createVehicleConfig(biggerTank));
  assert.ok(large.payloadMass > vehicle.payloadMass && large.serviceDeltaV > vehicle.serviceDeltaV);
  assert.ok(large.deltaV < vehicle.deltaV, 'spacecraft fuel is real mass during ascent');
  const flight = createLaunch(config), before = launchMass(flight), fuel = flight.stages[0].fuel;
  const loaded = getPostOrbitSpacecraft(flight);
  close(loaded.totalMass, before); assert.ok(loaded.coreStage && loaded.attachedStages.length === 2);
  stepLaunch(flight, { throttle: .2, guidance: false }, 1);
  const expected = parts.core.thrustSea * .2 / (parts.core.ispSea * EARTH.g0);
  close(fuel - flight.stages[0].fuel, expected, .01);
  close(before - launchMass(flight), expected, .01);
  close(flight.payloadMass, vehicle.payloadMass, 1e-8, 'main spacecraft reserve remains aboard');
});

test('lunar design reaches Earth orbit with actual upper and service reserves for onward flight', () => {
  const flight = createLaunch(createVehicleConfig(createLunarDesign()));
  let separations = 0;
  for (let i = 0; i < 700 * 60 && flight.phase === 'launch'; i++) {
    stepLaunch(flight, { throttle: 1, guidance: true }, 1 / 60);
    if (flight.stages[flight.stageIndex]?.fuel === 0) { separateStage(flight); separations++; }
  }
  const t = getLaunchTelemetry(flight), craft = getPostOrbitSpacecraft(flight);
  assert.equal(flight.phase, 'orbit', flight.failure || 'orbit not reached');
  assert.equal(separations, 1); assert.ok(t.periapsis >= 150000 && t.apoapsis < 350000);
  assert.ok(flight.time < 600 && flight.maxQ < 110000);
  assert.ok(craft.upperStage.propellant > 20000);
  const stage = craft.upperStage, wetCraft = craft.dryMass + craft.propellant + craft.rcsFuel;
  const upperDV = stage.ispVac * EARTH.g0 * Math.log((wetCraft + stage.dryMass + stage.propellant) / (wetCraft + stage.dryMass));
  const serviceDV = craft.ispVac * EARTH.g0 * Math.log(wetCraft / (craft.dryMass + craft.rcsFuel));
  assert.ok(upperDV + serviceDV > 7000, 'finite reserves cover TLI, capture and descent with margin');
  close(launchMass(flight), wetCraft + stage.dryMass + stage.propellant, 1e-7);
  assert.deepEqual(craft.position, flight.position); assert.deepEqual(craft.velocity, flight.velocity);
  const mass = launchMass(flight); separateStage(flight);
  close(mass - launchMass(flight), stage.dryMass + stage.propellant, 1e-7);
  assert.equal(getPostOrbitSpacecraft(flight).upperStage, null);
});

test('custom checkpoint restores identical geometry and mass while rebuilding all force constants', () => {
  const design = createLunarDesign(); design.slots['core-engine'].radius = 2.5;
  const config = createVehicleConfig(design), flight = createLaunch(config);
  stepLaunch(flight, { throttle: 1, guidance: true }, 10);
  const checkpoint = makeCheckpoint(config, 'launch', flight);
  assert.equal(validateCheckpoint(checkpoint), true);
  checkpoint.flight.stages[0].thrustSea = 1; checkpoint.flight.stages[0].dryMass = 1;
  checkpoint.flight.payloadMass = 1;
  const restored = restoreCheckpointFlight(JSON.parse(JSON.stringify(checkpoint)));
  assert.deepEqual(restored.config, config);
  assert.deepEqual(getVehicleLayout(restored.config.design), getVehicleLayout(design));
  close(launchMass(restored), launchMass(flight));
  assert.equal(restored.stages[0].thrustSea, resolveConfig(config).core.thrustSea);
  assert.deepEqual(restored.position, flight.position);
  assert.equal(restored.stages[0].fuel, flight.stages[0].fuel);
  const mismatched = structuredClone(checkpoint); mismatched.flight.config.design.slots.capsule.radius += .1;
  assert.equal(validateCheckpoint(mismatched), false);
  const invalid = structuredClone(checkpoint); invalid.config.design.slots['core-engine'].thrustVac = 1e15;
  assert.equal(validateCheckpoint(invalid), false);
  const overfilled = structuredClone(checkpoint); overfilled.flight.stages[0].propellant *= 10; overfilled.flight.stages[0].fuel *= 2;
  assert.equal(validateCheckpoint(overfilled), false);
});
