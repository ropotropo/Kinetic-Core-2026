import test from 'node:test';
import assert from 'node:assert/strict';
import { fitMiniMapPoints } from '../src/mini-map-framing.js';

test('transfer map retains both bodies and an off-axis spacecraft with marker clearance', () => {
  for (const craft of [[210e6, 124e6], [-40e6, -800e6], [600e6, 0]]) {
    const points = fitMiniMapPoints([[0, 0], [384.4e6, 0], craft], 304, 168);
    for (const [x, y] of points) {
      assert.ok(x >= 18 && x <= 286);
      assert.ok(y >= 18 && y <= 150);
    }
    assert.ok(points[0][0] < points[1][0]);
  }
});
test('coincident schematic points stay finite and centered', () => {
  assert.deepEqual(fitMiniMapPoints([[0, 0], [0, 0]], 304, 168), [[152, 84], [152, 84]]);
});
