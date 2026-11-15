import { validateVehicleDesign, deriveVehicleParts } from './vehicle-design.js';

/**
 * Fictional, physically plausible training hardware. These are design inputs,
 * not NASA-certified vehicle specifications. SI units throughout.
 */
export const CATALOG = Object.freeze({
  capsule: [
    { id: 'pioneer', name: 'Pioneer CM', description: 'A compact two-seat command capsule.', dryMass: 5800, crew: 2, radius: 1.85, height: 3.4, color: '#e4e9ed' },
    { id: 'horizon', name: 'Horizon CM', description: 'Four seats and a larger pressure vessel.', dryMass: 8700, crew: 4, radius: 2.25, height: 4.0, color: '#d4dce3' },
  ],
  service: [
    { id: 'survey', name: 'Survey SM', description: 'Light service module with a modest RCS reserve.', dryMass: 1800, rcsFuel: 320, rcsThrust: 550, rcsIsp: 285, torque: 650, radius: 1.85, height: 3.2 },
    { id: 'endurance', name: 'Endurance SM', description: 'More maneuvering propellant, power and mission mass.', dryMass: 2600, rcsFuel: 680, rcsThrust: 850, rcsIsp: 295, torque: 900, radius: 2.0, height: 4.2 },
  ],
  core: [
    { id: 'atlas', name: 'Atlas C1', description: 'A balanced kerosene/oxygen first stage.', dryMass: 23000, propellant: 400000, thrustSea: 7600000, thrustVac: 8300000, ispSea: 282, ispVac: 311, radius: 2.05, height: 40, dragCoefficient: 0.28 },
    { id: 'aegis', name: 'Aegis C2', description: 'A larger core for heavier payloads.', dryMass: 32000, propellant: 510000, thrustSea: 9800000, thrustVac: 10700000, ispSea: 286, ispVac: 315, radius: 2.6, height: 45, dragCoefficient: 0.28 },
  ],
  upper: [
    { id: 'swift', name: 'Swift U1', description: 'A vacuum-optimized upper stage.', dryMass: 4500, propellant: 105000, thrustSea: 750000, thrustVac: 1050000, ispSea: 260, ispVac: 360, radius: 2.05, height: 13.5, dragCoefficient: 0.25 },
    { id: 'vector', name: 'Vector U2', description: 'A lighter, lower-reserve upper stage.', dryMass: 3200, propellant: 62000, thrustSea: 520000, thrustVac: 760000, ispSea: 255, ispVac: 345, radius: 1.85, height: 11.2, dragCoefficient: 0.25 },
  ],
  cargo: [
    { id: 'none', name: 'Crew only', description: 'No additional mission cargo.', dryMass: 0 },
    { id: 'science', name: 'Science package', description: 'A 2,000 kg research payload.', dryMass: 2000 },
    { id: 'supplies', name: 'Outpost supplies', description: 'An 8,000 kg cargo delivery.', dryMass: 8000 },
  ],
  site: [
    { id: 'kennedy', name: 'Kennedy Space Center', latitude: 28.5729, longitude: -80.649, description: 'Florida · eastbound training ascent' },
    { id: 'wallops', name: 'Wallops Flight Facility', latitude: 37.9402, longitude: -75.4664, description: 'Virginia · eastbound training ascent' },
  ],
});

export const DEFAULT_CONFIG = Object.freeze({ capsule: 'pioneer', service: 'survey', core: 'atlas', upper: 'swift', cargo: 'none', site: 'kennedy' });

export function normalizeConfig(config = {}) {
  const result = {};
  for (const category of Object.keys(DEFAULT_CONFIG)) {
    const candidate = config[category] ?? DEFAULT_CONFIG[category];
    result[category] = CATALOG[category].some(item => item.id === candidate) ? candidate : DEFAULT_CONFIG[category];
  }
  if (config.design !== undefined) result.design = validateVehicleDesign(config.design);
  return result;
}

export function resolveConfig(config = {}) {
  const normalized = normalizeConfig(config);
  const parts = Object.fromEntries(Object.keys(DEFAULT_CONFIG).map(key => [key, CATALOG[key].find(item => item.id === normalized[key])]));
  if (normalized.design) {
    const derived = deriveVehicleParts(normalized.design);
    Object.assign(parts, { capsule: derived.capsule, service: derived.service, core: derived.core, upper: derived.upper, layout: derived.layout });
  }
  return parts;
}

export function createVehicleConfig(design, options = {}) {
  return normalizeConfig({ ...DEFAULT_CONFIG, ...options, design: validateVehicleDesign(design) });
}
