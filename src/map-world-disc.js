import { BODY_TEXTURE_PATHS } from './celestial.js';
const cache = new Map();
// Orthographic thumbnail of credited display imagery, never an ephemeris or DEM.
function thumbnail(id) {
  if (cache.has(id)) return cache.get(id);
  const entry = { canvas: null }; cache.set(id, entry);
  const path = BODY_TEXTURE_PATHS[id]; if (!path) return entry;
  const image = new Image(); image.crossOrigin = 'anonymous';
  image.onload = () => {
    try {
      const source = document.createElement('canvas'); source.width = 512; source.height = 256;
      const s = source.getContext('2d', { willReadFrequently: true }); s.drawImage(image, 0, 0, 512, 256);
      const pixels = s.getImageData(0, 0, 512, 256).data;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const c = canvas.getContext('2d'), out = c.createImageData(256, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const nx = (x - 127.5) / 127.5, ny = -(y - 127.5) / 127.5, rr = nx * nx + ny * ny;
        if (rr > 1) continue;
        const z = Math.sqrt(1 - rr), u = ((.5 + Math.atan2(nx, z) / (2 * Math.PI) + (id === 'earth' ? -.12 : 0)) % 1 + 1) % 1;
        const v = .5 - Math.asin(ny) / Math.PI;
        const from = (Math.min(255, Math.floor(v * 256)) * 512 + Math.min(511, Math.floor(u * 512))) * 4, to = (y * 256 + x) * 4;
        const light = .16 + .84 * Math.max(0, -.45 * nx + .4 * ny + .79 * z);
        for (let k = 0; k < 3; k++) out.data[to + k] = pixels[from + k] * light;
        out.data[to + 3] = 255;
      }
      c.putImageData(out, 0, 0); entry.canvas = canvas;
    } catch { /* A texture failure must never prevent reading the flight map. */ }
  };
  image.src = new URL(path, document.baseURI).href; return entry;
}
export function drawWorldDisc(c, x, y, radius, id, fallback = '#526c83') {
  const r = Math.max(2, radius), world = thumbnail(id);
  if (world.canvas && r >= 8) c.drawImage(world.canvas, x - r, y - r, r * 2, r * 2);
  else { c.fillStyle = fallback; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  if (id === 'earth' && r >= 8) { c.strokeStyle = '#76b6e988'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r + 1, 0, Math.PI * 2); c.stroke(); }
}
