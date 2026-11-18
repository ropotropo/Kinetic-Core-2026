import test from 'node:test';
import assert from 'node:assert/strict';
import { DESTINATIONS } from '../src/destinations.js';
import { atlasBodyMetadata, atlasLandingDestination } from '../src/atlas-bodies.js';

test('atlas thumbnail and landing button share the exact existing world/system gate', () => {
  for (const world of DESTINATIONS) {
    const body = { name: world.name, system: world.parent, moon: world.name !== world.parent };
    assert.equal(atlasLandingDestination(body), world);
    const item = atlasBodyMetadata(body, 4, world.color);
    assert.equal(item.id, '4'); assert.equal(item.landingId, world.id);
    assert.equal(item.subtitle, 'Landing practice');
  }
});
test('Sun, Earth, gas giants and survey moons never acquire landing or progress identifiers', () => {
  for (const name of ['Sun', 'Earth', 'Venus', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Charon']) {
    const body = { name, system: name === 'Charon' ? 'Pluto' : name };
    assert.equal(atlasLandingDestination(body), null);
    const item = atlasBodyMetadata(body, 0);
    assert.equal(item.landingId, null); assert.notEqual(item.subtitle, 'Landing practice');
    assert.equal(item.name, name);
  }
});
test('wrong-parent names cannot reuse a playable moon identity', () => {
  assert.equal(atlasLandingDestination({ name: 'Europa', system: 'Saturn' }), null);
  assert.equal(atlasLandingDestination({ name: 'Moon', system: 'Mars' }), null);
  assert.equal(atlasBodyMetadata({ name: 'Sun' }, 0).subtitle, 'Star · survey');
});
