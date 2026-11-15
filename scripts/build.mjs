import { build } from 'vite';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

await build({ base: './' });
const output = resolve('dist');
const notices = `THREE.JS 0.187.0\n\n${await readFile(resolve('node_modules/three/LICENSE'), 'utf8')}\n\nVITE 8.3.8 AND BUNDLED HELPER LICENSES\n\n${await readFile(resolve('node_modules/vite/LICENSE.md'), 'utf8')}`;
await writeFile(resolve(output, 'THIRD_PARTY_NOTICES.txt'), notices);
let html = await readFile(resolve(output, 'index.html'), 'utf8');
const scriptPath = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[1];
const stylePath = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1];
if (!scriptPath || !stylePath) throw new Error('Build output is missing its script or stylesheet.');
let script = await readFile(resolve(output, scriptPath), 'utf8');
const imageFiles = (await readdir(resolve(output, 'assets'))).filter(name => /\.(jpg|png|webp)$/.test(name));
let embedded = 0;
for (const name of imageFiles) {
  const mime = name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  const image = `data:${mime};base64,${(await readFile(resolve(output, 'assets', name))).toString('base64')}`;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('([\'"`])(?:\\.?\\/)?assets\\/' + escapedName + '\\1', 'g');
  if (pattern.test(script)) { pattern.lastIndex = 0; script = script.replace(pattern, () => JSON.stringify(image)); embedded++; }
}
if (embedded < 18) throw new Error(`Portable build embedded only ${embedded} images; expected the complete celestial texture set.`);
if (/assets\/[\w-]+\.(jpg|png|webp)/.test(script)) throw new Error('Portable build still references an external image.');
if (script.includes('import(')) throw new Error('Standalone build must not require dynamic chunks.');
const css = await readFile(resolve(output, stylePath), 'utf8');
if (notices.includes('*/')) throw new Error('License notice contains a comment terminator; update the embedding format.');
html = html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/, () => `<script type="module">/*\n${notices}\n*/\n${script.replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace(/<link[^>]+href="[^"]+\.css"[^>]*>/, () => `<style>${css}</style>`);
html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, '');
await writeFile(resolve(output, 'Kineti-Core.html'), html);
console.log('Portable build: dist/Kineti-Core.html (open directly, no installation needed)');
