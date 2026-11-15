// AI-assisted curation. Original game concept: Nikita.
// Physical facts are separate from proposed sampling gameplay and visual colors.
export const DESTINATION_SOURCE = 'https://ssd.jpl.nasa.gov/sats/phys_par/sep.html';
export const DESTINATIONS_CHECKED_ON = '2026-11-15';

const facts = [
  { id:'mercury', name:'Mercury', parent:'Mercury', radiusKm:2439.4, muKm:22031.86855, atmosphere:'No useful atmosphere; powered descent required', surface:'Illustrative cratered rock and dust', hazard:'No aerodynamic braking; thermal survival is not simulated', sampleMethod:'Proposed: rock and regolith sampling', color:'#91867b', factSource:'https://science.nasa.gov/mercury/facts/' },
  { id:'mars', name:'Mars', parent:'Mars', radiusKm:3389.5, muKm:42828.375214, atmosphere:'Simplified thin near-surface atmosphere; no entry or parachute simulation', surface:'Illustrative basaltic rock and rust-colored dust', hazard:'Higher gravity than the Moon; limited thrust margin', sampleMethod:'Proposed: sealed regolith and rock core', color:'#ae7051', factSource:'https://science.nasa.gov/mars/facts/' },
  { id: 'moon', name: 'Moon', parent: 'Earth', radiusKm: 1737.4, muKm: 4902.800,
    atmosphere: 'Extremely tenuous exosphere; no useful aerodynamic braking', surface: 'Rock, regolith and impact craters', hazard: 'Vacuum, abrasive dust and large temperature contrasts', sampleMethod: 'Proposed: scoop regolith and collect a shallow rock core', color: '#a9adb1', factSource: 'https://science.nasa.gov/moon/facts/' },
  { id: 'phobos', name: 'Phobos', parent: 'Mars', radiusKm: 11.08, muKm: 0.0007087,
    atmosphere: 'No significant atmosphere', surface: 'Dark, irregular and heavily cratered regolith', hazard: 'Very weak, irregular gravity; loose material can escape', sampleMethod: 'Proposed: gentle anchored scoop or contact sampler', color: '#8d8074', factSource: 'https://science.nasa.gov/mars/moons/phobos/' },
  { id: 'deimos', name: 'Deimos', parent: 'Mars', radiusKm: 6.2, muKm: 0.0000962,
    atmosphere: 'No significant atmosphere', surface: 'Dusty regolith over an irregular, cratered body', hazard: 'Tiny gravity makes rebound and disturbance important', sampleMethod: 'Proposed: low-force contact sampler with anchoring', color: '#9d9182', factSource: 'https://science.nasa.gov/mars/moons/deimos/' },
  { id: 'io', name: 'Io', parent: 'Jupiter', radiusKm: 1821.49, muKm: 5959.91547,
    atmosphere: 'Thin sulfur-dioxide atmosphere; drag neglected here', surface: 'Volcanic rock, sulfur compounds and lava-covered terrain', hazard: 'Active volcanism, hot terrain and intense radiation', sampleMethod: 'Proposed: robotic rock sampling away from active vents', color: '#c6a354', factSource: 'https://science.nasa.gov/jupiter/jupiter-moons/io/facts/' },
  { id: 'europa', name: 'Europa', parent: 'Jupiter', radiusKm: 1560.80, muKm: 3202.71210,
    atmosphere: 'Extremely thin oxygen exosphere; drag neglected', surface: 'Fractured water-ice crust', hazard: 'Radiation, cold and fractured ice; planetary protection matters', sampleMethod: 'Proposed: sterile shallow surface-ice core; no ocean access', color: '#c8c0a5', factSource: 'https://science.nasa.gov/jupiter/jupiter-moons/europa/' },
  { id: 'ganymede', name: 'Ganymede', parent: 'Jupiter', radiusKm: 2631.20, muKm: 9887.83275,
    atmosphere: 'Tenuous oxygen exosphere; drag neglected', surface: 'Icy crust with dark cratered and brighter grooved terrain', hazard: 'Rough ice, deep cold and the Jovian radiation environment', sampleMethod: 'Proposed: shallow ice core with a separate dark-regolith scoop', color: '#9c9688', factSource: 'https://science.nasa.gov/jupiter/jupiter-moons/ganymede/' },
  { id: 'callisto', name: 'Callisto', parent: 'Jupiter', radiusKm: 2410.30, muKm: 7179.28340,
    atmosphere: 'Extremely tenuous atmosphere; drag neglected', surface: 'Ancient, heavily cratered ice and dark surface material', hazard: 'Crater rims, rubble and very low temperatures', sampleMethod: 'Proposed: paired ice and dark-regolith surface samples', color: '#8d8578', factSource: 'https://science.nasa.gov/jupiter/jupiter-moons/callisto/' },
  { id: 'titan', name: 'Titan', parent: 'Saturn', radiusKm: 2574.76, muKm: 8978.13710,
    atmosphere: 'Dense nitrogen-rich atmosphere with methane; drag modeled', surface: 'Water-ice bedrock, organic sediment and hydrocarbon lakes', hazard: 'Cryogenic conditions, haze and liquid-hydrocarbon terrain', sampleMethod: 'Proposed: sealed cryogenic sediment sampler on solid terrain', color: '#c99b59', factSource: 'https://science.nasa.gov/saturn/moons/titan/facts/' },
  { id: 'enceladus', name: 'Enceladus', parent: 'Saturn', radiusKm: 252.10, muKm: 7.21037,
    atmosphere: 'Very tenuous plume-fed gas; drag neglected', surface: 'Bright water ice with fractures and plume-source regions', hazard: 'Weak gravity, ice fractures and active plume terrain', sampleMethod: 'Proposed: shallow ice sampling away from active fissures', color: '#d5e1e3', factSource: 'https://science.nasa.gov/saturn/moons/enceladus/' },
  { id: 'rhea', name: 'Rhea', parent: 'Saturn', radiusKm: 763.50, muKm: 153.94175,
    atmosphere: 'Extremely thin oxygen/carbon-dioxide exosphere; drag neglected', surface: 'Cold water ice, impact craters and fracture cliffs', hazard: 'Cold, cratered terrain and low surface gravity', sampleMethod: 'Proposed: shallow ice-regolith core on a surveyed plain', color: '#b8b9b5', factSource: 'https://science.nasa.gov/saturn/moons/rhea/' },
  { id: 'iapetus', name: 'Iapetus', parent: 'Saturn', radiusKm: 734.30, muKm: 120.51511,
    atmosphere: 'No significant atmosphere', surface: 'Contrasting dark and bright icy terrain with a large ridge', hazard: 'Steep relief, cold and weak gravity', sampleMethod: 'Proposed: compare a dark coating with bright icy material', color: '#a69f90', factSource: 'https://science.nasa.gov/saturn/moons/iapetus/' },
  { id: 'triton', name: 'Triton', parent: 'Neptune', radiusKm: 1352.60, muKm: 1428.49546,
    atmosphere: 'Thin nitrogen atmosphere; terminal drag neglected', surface: 'Nitrogen frost, icy plains and geologically active terrain', hazard: 'Extreme cold, volatile ices and geyser regions', sampleMethod: 'Proposed: sealed volatile-ice surface sampler', color: '#b1bbb9', factSource: 'https://science.nasa.gov/neptune/moons/triton/' },
];

export const DESTINATIONS = Object.freeze(facts.map(({ radiusKm, muKm, ...item }) => {
  const radius = radiusKm * 1000, mu = muKm * 1e9;
  return Object.freeze({ ...item, radius, mu, gravity: mu / radius ** 2, source: ['mars','mercury'].includes(item.id)?'https://ssd.jpl.nasa.gov/astro_par.html':DESTINATION_SOURCE, playable: true });
}));

export function getDestination(id = 'moon') {
  return DESTINATIONS.find(destination => destination.id === id) ?? null;
}
