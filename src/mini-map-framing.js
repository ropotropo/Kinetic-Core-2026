/** Fit every physical point with a safe margin for the marker radius. */
export function fitMiniMapPoints(points, width, height, padding = 18) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((width - 2 * padding) / Math.max(1, maxX - minX), (height - 2 * padding) / Math.max(1, maxY - minY));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return points.map(([x, y]) => [width / 2 + (x - cx) * scale, height / 2 - (y - cy) * scale]);
}
