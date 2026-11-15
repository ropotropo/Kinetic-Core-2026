/** Fictional educational hardware; no values describe certified hardware.
 * Geometry, loaded fuel and force constants share this model. SI throughout.
 * Cylinder V=πr²L; tank loading is 85% V at assumed bulk-mixture density 1000
 * kg/m³ (core kerolox), 350 kg/m³ (upper/service hydrolox). These are deliberate
 * design assumptions, not measured NASA specifications. Tank structure is
 * V×40/22/30 kg/m³ for core/upper/service. Engines scale thrust with r² and
 * dry mass with r²√L. Full reference force/mass/Isp values are in hardware().
 * Core boosters share the core's propellant feed, remain attached until core
 * jettison and use the effective Isp from summed mass flow. They do not simulate
 * separate solid motors. Solar/leg/fairing/separator mass stays with its stage;
 * electrical output, tank pressure, boiloff, structural flex and fairing release
 * are outside this first model. The fairing is an optional retained nose cone.
 * Mass flow F/(Isp g₀), ideal delta-v Isp g₀ ln(m₀/mf): NASA Glenn references
 * https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/
 * https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/
 */
export const DESIGN_FORMAT = 'kineti-core-rocket';
const G0 = 9.80665;
const meta = (label, radius, length) => Object.freeze({ label, radius, length, minRadius: .1, maxRadius: 5, minLength: .1, maxLength: 30 });
export const TYPES = Object.freeze({
  capsule: meta('Command capsule', 2, 3.4), tank: meta('Propellant tank', 2, 7),
  engine: meta('Engine assembly', 1.2, 2), booster: meta('Cross-fed booster', 1, 12),
  fairing: meta('Nose fairing', 2, 3), solar: meta('Solar wing', 1, 3),
  legs: meta('Landing leg', .35, 3), separator: meta('Stage separator', 3, .5),
});
const slot = (id, label, type, stage, group, radius, length) => Object.freeze({ id, label, accepts: Object.freeze([type]), stage, class: group, defaultDimensions: Object.freeze({ radius, length }) });
export const SLOTS = Object.freeze([
  slot('core-engine', 'Core engine', 'engine', 0, 'core', 2.6, 4),
  slot('core-tank-1', 'Core lower tank', 'tank', 0, 'core', 3, 18),
  slot('core-tank-2', 'Core upper tank', 'tank', 0, 'core', 3, 18),
  slot('core-separator', 'Core separation ring', 'separator', 0, 'core', 3, .5),
  slot('upper-engine', 'Upper-stage engine', 'engine', 1, 'upper', 1.8, 3),
  slot('upper-tank', 'Upper-stage tank', 'tank', 1, 'upper', 3, 18),
  slot('upper-separator', 'Spacecraft separation ring', 'separator', 1, 'upper', 2, .4),
  slot('service-engine', 'Spacecraft engine', 'engine', 2, 'service', 1.2, 2),
  slot('service-tank', 'Spacecraft tank', 'tank', 2, 'service', 2, 7),
  slot('capsule', 'Command capsule', 'capsule', 2, 'capsule', 2, 3.4),
  slot('nose', 'Nose fairing', 'fairing', 2, 'accessory', 2, 3),
  ...Array.from({ length: 4 }, (_, i) => slot(`booster-${i + 1}`, `Core booster ${i + 1}`, 'booster', 0, 'core', 1, 12)),
  ...Array.from({ length: 4 }, (_, i) => slot(`leg-${i + 1}`, `Landing leg ${i + 1}`, 'legs', 2, 'accessory', .35, 3)),
  ...Array.from({ length: 2 }, (_, i) => slot(`solar-${i + 1}`, `Solar wing ${i + 1}`, 'solar', 2, 'accessory', 1, 3)),
]);
const SLOT_BY_ID = Object.fromEntries(SLOTS.map(s => [s.id, s]));
const AXIAL = SLOTS.filter(s => !['booster', 'legs', 'solar'].includes(s.accepts[0]));
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const plain = value => value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function keysOnly(value, keys, label) {
  if (!plain(value) || Object.keys(value).some(k => !keys.includes(k))) throw new Error(`Invalid ${label} fields.`);
}
function cleanPart(part, s) {
  keysOnly(part, ['type', 'radius', 'length'], 'component');
  if (!s.accepts.includes(part.type)) throw new Error(`${s.label} accepts ${s.accepts.join(', ')} only.`);
  const t = TYPES[part.type];
  if (!Number.isFinite(part.radius) || part.radius < t.minRadius || part.radius > t.maxRadius || !Number.isFinite(part.length) || part.length < t.minLength || part.length > t.maxLength) throw new Error(`Invalid ${s.label} dimensions: radius 0.1–5 m, length 0.1–30 m.`);
  return { type: part.type, radius: part.radius, length: part.length };
}
export function createEmptyDesign() { return { format: DESIGN_FORMAT, version: 2, slots: {} }; }
export function createLunarDesign() {
  const design = createEmptyDesign();
  for (const s of SLOTS) if (!s.id.startsWith('booster-') && s.id !== 'nose') design.slots[s.id] = { type: s.accepts[0], ...s.defaultDimensions };
  return design;
}
export const createDefaultDesign = createLunarDesign;
const frozenDefault = createLunarDesign();
for (const part of Object.values(frozenDefault.slots)) Object.freeze(part);
Object.freeze(frozenDefault.slots);
export const DEFAULT_DESIGN = Object.freeze(frozenDefault);
export const defaultDesign = DEFAULT_DESIGN;
/** V1 had no attachments. Sort each type by dimensions, then assign a fixed list
 * of compatible slots. The migration is independent of original insertion order. */
function migrateLegacy(value) {
  keysOnly(value, ['format', 'version', 'parts'], 'legacy design');
  if (!Array.isArray(value.parts) || value.parts.length > SLOTS.length) throw new Error('Legacy design has too many components.');
  const result = createEmptyDesign();
  for (const type of Object.keys(TYPES)) {
    const parts = value.parts.filter(p => p?.type === type).sort((a, b) => b.radius - a.radius || b.length - a.length);
    const places = SLOTS.filter(s => s.accepts.includes(type));
    if (parts.length > places.length) throw new Error(`Legacy design has more ${type} components than compatible slots.`);
    parts.forEach((p, i) => { result.slots[places[i].id] = cleanPart(p, places[i]); });
  }
  if (Object.keys(result.slots).length !== value.parts.length) throw new Error('Unknown legacy component type.');
  validateBoosterClearance(result);
  return result;
}
export function validateVehicleDesign(value) {
  if (!plain(value) || value.format !== DESIGN_FORMAT) throw new Error('Expected a Kinetic Core rocket design.');
  if (value.version === 1) return migrateLegacy(value);
  keysOnly(value, ['format', 'version', 'slots'], 'design');
  if (value.version !== 2 || !plain(value.slots)) throw new Error('Expected a version 2 typed-slot design.');
  if (Object.keys(value.slots).some(id => !own(SLOT_BY_ID, id))) throw new Error('Unknown attachment slot.');
  const result = createEmptyDesign();
  for (const s of SLOTS) if (own(value.slots, s.id)) result.slots[s.id] = cleanPart(value.slots[s.id], s);
  validateBoosterClearance(result);
  return result;
}
export const normalizeDesign = validateVehicleDesign;

// Parallel booster cylinders must clear both neighbouring boosters and every
// installed axial cylinder. A slot alone cannot make oversized geometry fit.
function validateBoosterClearance(design) {
  let y = 0, coreRadius = 0;
  const axial = [];
  for (const s of AXIAL) {
    const p = design.slots[s.id]; if (!p) continue;
    axial.push({ radius: p.radius, min: y, max: y + p.length }); y += p.length;
    if (s.stage === 0) coreRadius = Math.max(coreRadius, p.radius);
  }
  coreRadius ||= 3;
  const boosters = SLOTS.filter(s => s.accepts[0] === 'booster' && design.slots[s.id]).map(s => {
    const p = design.slots[s.id], a = (Number(s.id.split('-')[1]) - 1) * Math.PI / 2;
    return { ...p, id: s.id, x: Math.cos(a) * (coreRadius + p.radius), z: Math.sin(a) * (coreRadius + p.radius) };
  });
  for (let i = 0; i < boosters.length; i++) {
    const b = boosters[i];
    if (axial.some(a => a.min < b.length - 1e-8 && a.max > 1e-8 && Math.hypot(b.x, b.z) < b.radius + a.radius - 1e-8)) throw new Error(`${b.id} overlaps an axial component. Reduce its dimensions.`);
    for (const a of boosters.slice(0, i)) if (Math.hypot(b.x - a.x, b.z - a.z) < b.radius + a.radius - 1e-8) throw new Error(`${b.id} overlaps ${a.id}. Reduce the booster radius.`);
  }
}

function hardware(part, s) {
  const { radius: r, length: l, type } = part, volume = Math.PI * r * r * l;
  let dryMass = 0, propellant = 0, thrustSea = 0, thrustVac = 0, ispSea = 0, ispVac = 0;
  if (type === 'tank') {
    const bulkDensity = s.stage === 0 ? 1000 : 350;
    propellant = volume * .85 * bulkDensity;
    dryMass = volume * (s.stage === 0 ? 40 : s.stage === 1 ? 22 : 30);
  } else if (type === 'engine') {
    const reference = s.stage === 0 ? { r: 2.6, l: 4, mass: 6500, sea: 20e6, vac: 22e6, is: 285, iv: 315 }
      : s.stage === 1 ? { r: 1.8, l: 3, mass: 2700, sea: 1.1e6, vac: 1.8e6, is: 300, iv: 450 }
        : { r: 1.2, l: 2, mass: 550, sea: 45000, vac: 90000, is: 280, iv: 450 };
    const area = (r / reference.r) ** 2;
    dryMass = reference.mass * area * Math.sqrt(l / reference.l);
    thrustSea = reference.sea * area; thrustVac = reference.vac * area;
    ispSea = reference.is; ispVac = reference.iv;
  } else if (type === 'booster') {
    propellant = volume * .85 * 1000; dryMass = volume * 65;
    thrustSea = 2e6 * r * r; thrustVac = 2.2e6 * r * r; ispSea = 280; ispVac = 310;
  } else if (type === 'capsule') dryMass = 5800 * (r / 2) ** 2 * (l / 3.4);
  else if (type === 'separator') dryMass = volume * 80;
  else if (type === 'fairing') dryMass = volume * 20;
  else if (type === 'solar') dryMass = 40 * (r / 1) * (l / 3);
  else if (type === 'legs') dryMass = 120 * (r / .35) ** 2 * (l / 3);
  return { dryMass, propellant, mass: dryMass + propellant, thrust: thrustVac, thrustSea, thrustVac, ispSea, ispVac };
}

export function getVehicleLayout(raw) {
  const design = validateVehicleDesign(raw), parts = [], points = [], bounds = [0, 1, 2].map(stage => ({ stage, minY: Infinity, maxY: 0, radius: 0 }));
  let cursor = 0;
  for (const s of AXIAL) {
    const part = design.slots[s.id], dimensions = part || s.defaultDimensions;
    const position = [0, cursor + dimensions.length / 2, 0];
    points.push({ id: s.id, slotId: s.id, label: s.label, accepts: [...s.accepts], stage: s.stage, class: s.class, occupied: Boolean(part), position });
    if (part) {
      parts.push({ slotId: s.id, ...part, stage: s.stage, class: s.class, position, rotation: [0, 0, 0], ...hardware(part, s) });
      const b = bounds[s.stage]; b.minY = Math.min(b.minY, cursor); b.maxY = cursor + part.length; b.radius = Math.max(b.radius, part.radius);
      cursor += part.length;
    }
  }
  const axialBounds = bounds.map(b => ({ ...b }));
  for (const s of SLOTS.filter(s => !AXIAL.includes(s))) {
    const part = design.slots[s.id], d = part || s.defaultDimensions, i = Number(s.id.split('-')[1]) - 1;
    const host = bounds[s.stage], base = axialBounds[s.stage], stageRadius = base.radius || (s.stage === 0 ? 3 : 2);
    const a = s.accepts[0] === 'solar' ? i * Math.PI : i * Math.PI / 2;
    const offset = stageRadius + (s.accepts[0] === 'legs' ? d.length * .35 : d.radius);
    const bottom = base.minY === Infinity ? 0 : base.minY;
    const y = s.accepts[0] === 'booster' ? d.length / 2 : s.accepts[0] === 'legs' ? bottom + d.length * .3 : bottom + Math.max(1, (base.maxY - bottom) * .45);
    const position = [Math.cos(a) * offset, y, Math.sin(a) * offset];
    points.push({ id: s.id, slotId: s.id, label: s.label, accepts: [...s.accepts], stage: s.stage, class: s.class, occupied: Boolean(part), position });
    if (part) {
      parts.push({ slotId: s.id, ...part, stage: s.stage, class: s.class, position, rotation: [0, -a, 0], ...hardware(part, s) });
      host.radius = Math.max(host.radius, offset + part.radius);
      host.maxY = Math.max(host.maxY, y + part.length / 2);
      host.minY = Math.min(host.minY, Math.max(0, y - part.length / 2));
    }
  }
  const order = new Map(SLOTS.map((s, i) => [s.id, i]));
  parts.sort((a, b) => order.get(a.slotId) - order.get(b.slotId)); points.sort((a, b) => order.get(a.slotId) - order.get(b.slotId));
  for (const b of bounds) if (!Number.isFinite(b.minY)) b.minY = 0;
  return { design, parts, height: Math.max(cursor, ...bounds.map(b => b.maxY)), radius: Math.max(0, ...bounds.map(b => b.radius)), stageBounds: bounds, attachmentPoints: points };
}
/** Editor blueprint: reserve the default envelope of every empty axial slot so
 * compatible click targets never collapse to the same point on an empty design.
 * Actual flight geometry uses only installed hardware (getVehicleLayout). */
export function getAttachmentPoints(raw) {
  const design = validateVehicleDesign(raw), actual = getVehicleLayout(design).attachmentPoints;
  const points = [], bounds = [0, 1, 2].map(() => ({ minY: Infinity, maxY: 0, radius: 0 }));
  let y = 0;
  for (const s of AXIAL) {
    const d = design.slots[s.id] || s.defaultDimensions, b = bounds[s.stage];
    points.push({ ...actual.find(p => p.id === s.id), position: [0, y + d.length / 2, 0], actualPosition: actual.find(p => p.id === s.id).position, preview: true });
    b.minY = Math.min(b.minY, y); b.maxY = y + d.length; b.radius = Math.max(b.radius, d.radius); y += d.length;
  }
  for (const s of SLOTS.filter(s => !AXIAL.includes(s))) {
    const d = design.slots[s.id] || s.defaultDimensions, b = bounds[s.stage], type = s.accepts[0], i = Number(s.id.split('-')[1]) - 1;
    const a = type === 'solar' ? i * Math.PI : i * Math.PI / 2, offset = b.radius + (type === 'legs' ? d.length * .35 : d.radius);
    const height = type === 'booster' ? d.length / 2 : type === 'legs' ? b.minY + d.length * .3 : b.minY + Math.max(1, (b.maxY - b.minY) * .45);
    const original = actual.find(p => p.id === s.id);
    points.push({ ...original, position: [Math.cos(a) * offset, height, Math.sin(a) * offset], actualPosition: original.position, preview: true });
  }
  const order = new Map(SLOTS.map((s, i) => [s.id, i]));
  return points.sort((a, b) => order.get(a.id) - order.get(b.id));
}

function combineStage(parts, stage, name) {
  const items = parts.filter(p => p.stage === stage), engines = items.filter(p => p.thrustVac > 0);
  const sum = field => items.reduce((n, p) => n + (p[field] || 0), 0);
  const thrustSea = sum('thrustSea'), thrustVac = sum('thrustVac');
  const ispSea = thrustSea ? thrustSea / engines.reduce((n, p) => n + p.thrustSea / p.ispSea, 0) : 0;
  const ispVac = thrustVac ? thrustVac / engines.reduce((n, p) => n + p.thrustVac / p.ispVac, 0) : 0;
  const minY = Math.min(...items.map(p => p.position[1] - p.length / 2), 0), maxY = Math.max(0, ...items.map(p => p.position[1] + p.length / 2));
  return { id: `custom-${stage}`, name, dryMass: sum('dryMass'), propellant: sum('propellant'), thrustSea, thrustVac, ispSea, ispVac, radius: Math.max(.1, ...items.map(p => Math.hypot(p.position[0], p.position[2]) + p.radius)), height: maxY - minY, dragCoefficient: .28 };
}
/** Trusted resolved parts compatible with the original two-stage ascent model. */
export function deriveVehicleParts(raw) {
  const layout = getVehicleLayout(raw), { parts } = layout;
  const capsulePart = parts.find(p => p.type === 'capsule');
  const capsule = { id: 'custom-capsule', name: 'Custom command capsule', dryMass: capsulePart?.dryMass || 0, radius: capsulePart?.radius || .1, height: capsulePart?.length || 0, crew: 2 };
  const service = combineStage(parts.filter(p => p.type !== 'capsule'), 2, 'Custom spacecraft');
  const accessories = parts.filter(p => p.stage === 2);
  service.rcsFuel = accessories.length ? 320 : 0; service.rcsThrust = 850; service.rcsIsp = 295; service.torque = 900;
  service.legCount = parts.filter(p => p.type === 'legs').length; service.solarCount = parts.filter(p => p.type === 'solar').length;
  service.height = Math.max(0, layout.stageBounds[2].maxY - layout.stageBounds[2].minY - capsule.height);
  const core = combineStage(parts, 0, 'Custom core stage'), upper = combineStage(parts, 1, 'Custom upper stage');
  core.height = layout.stageBounds[0].maxY - layout.stageBounds[0].minY;
  upper.height = layout.stageBounds[1].maxY - layout.stageBounds[1].minY;
  return { capsule, service, core, upper, layout };
}
export function evaluateDesign(raw) {
  const design = validateVehicleDesign(raw), derived = deriveVehicleParts(design), { core, upper, capsule, service, layout } = derived;
  const payload = capsule.dryMass + service.dryMass + service.propellant + service.rcsFuel;
  const upperWet = upper.dryMass + upper.propellant, wetMass = core.dryMass + core.propellant + upperWet + payload;
  const dryMass = core.dryMass + upper.dryMass + capsule.dryMass + service.dryMass;
  const dv = (isp, wet, dry) => isp && dry > 0 && wet >= dry ? isp * G0 * Math.log(wet / dry) : 0;
  const coreDeltaV = dv(core.ispVac, wetMass, wetMass - core.propellant), upperDeltaV = dv(upper.ispVac, upperWet + payload, payload + upper.dryMass);
  const serviceDeltaV = dv(service.ispVac, payload, capsule.dryMass + service.dryMass + service.rcsFuel);
  const twr = wetMass > 0 ? core.thrustSea / (wetMass * G0) : 0;
  const errors = [], warnings = [];
  for (const id of ['core-engine', 'core-tank-1', 'core-separator', 'upper-engine', 'upper-tank', 'upper-separator', 'service-engine', 'service-tank', 'capsule']) if (!design.slots[id]) errors.push(`Install ${SLOT_BY_ID[id].label.toLowerCase()}.`);
  if (wetMass && twr <= 1) errors.push('Core thrust cannot lift the loaded vehicle on Earth.');
  if (coreDeltaV + upperDeltaV < 8000) errors.push('The two launch stages have insufficient ideal delta-v for Earth orbit.');
  for (const [a, b] of [['booster-1', 'booster-3'], ['booster-2', 'booster-4']]) {
    const left = design.slots[a], right = design.slots[b];
    if (Boolean(left) !== Boolean(right) || left && right && (Math.abs(left.radius - right.radius) > 1e-8 || Math.abs(left.length - right.length) > 1e-8)) errors.push(`Balance ${a} and ${b} with matching hardware before launch.`);
  }
  if (twr > 0 && twr < 1.2) warnings.push('Low liftoff thrust margin increases gravity losses.');
  if (twr > 3) warnings.push('High liftoff acceleration: reduce throttle through dense atmosphere.');
  if (coreDeltaV + upperDeltaV < 10000) warnings.push('Small launch delta-v margin; an ascent may consume most upper-stage fuel.');
  if (service.legCount < 3) warnings.push('Fewer than three landing legs: unsuitable for a stable lunar landing.');
  if (serviceDeltaV < 4500) warnings.push('Limited spacecraft delta-v; lunar capture and descent may require upper-stage reserves.');
  return { valid: !errors.length, errors, warnings, design, parts: derived, wetMass, mass: wetMass, dryMass, payloadMass: payload, propellantMass: core.propellant + upper.propellant + service.propellant, rcsFuel: service.rcsFuel, thrust: core.thrustSea, twr, TWR: twr, deltaV: coreDeltaV + upperDeltaV, idealDeltaV: coreDeltaV + upperDeltaV, coreDeltaV, upperDeltaV, serviceDeltaV, missionDeltaV: coreDeltaV + upperDeltaV + serviceDeltaV, height: layout.height, radius: layout.radius, synthetic: true };
}
