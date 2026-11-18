import { DESTINATIONS } from './destinations.js';

// The atlas's existing exact name/system match is the only landing gate.
// A globe thumbnail or a saved milestone never creates a playable destination.
export function atlasLandingDestination(body) {
  return DESTINATIONS.find(world => world.name === body?.name && world.parent === body?.system) ?? null;
}
export function atlasBodyMetadata(body, id, color = '#9b9690') {
  const landing = atlasLandingDestination(body);
  return { id: String(id), name: body.name, parent: body.system ?? 'Solar System', color,
    textureKey: body.name.toLowerCase(), landingId: landing?.id ?? null,
    subtitle: landing ? 'Landing practice' : body.name === 'Sun' ? 'Star · survey' : body.name === 'Pluto' ? 'Dwarf planet · survey' : 'Survey only' };
}
