import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const local = JSON.parse(await readFile(resolve(here, 'package.json'), 'utf8'));
if (local.version !== pkg.version) throw new Error('Desktop version must match the game version.');
await readFile(resolve(root, 'dist/index.html'));
await rm(resolve(here, 'game'), { recursive: true, force: true });
await mkdir(resolve(here, 'game'), { recursive: true });
await cp(resolve(root, 'dist'), resolve(here, 'game'), { recursive: true });
// The separate portable HTML duplicates the same textures and renderer.
await rm(resolve(here, 'game/Kineti-Core.html'), { force: true });
await cp(resolve(root, 'AUTHORS.md'), resolve(here, 'game/AUTHORS.md'));
console.log(`Staged Kinetic Core ${pkg.version} from dist/`);
