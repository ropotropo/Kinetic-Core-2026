import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Export one reviewed commit. No browser data, developer history or local files.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
if (git('status', '--porcelain', '--untracked-files=normal')) {
  throw new Error('Commit the tested source and built artifacts before exporting. The export must match one clean commit.');
}
const { version, author } = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const files = git('ls-tree', '-r', '--name-only', 'HEAD').split('\n');
for (const required of ['AUTHORS.md', 'package-lock.json', 'src/main.js', 'dist/index.html', 'dist/Kineti-Core.html', 'dist/THIRD_PARTY_NOTICES.txt', 'public/assets/SOURCES.md', 'docs/REPOSITORY-TRANSFER.md', 'desktop/main.cjs', 'desktop/package-lock.json', 'android/app/src/main/AndroidManifest.xml', 'android/ANDROID-NOTICES.txt']) {
  if (!files.includes(required)) throw new Error(`Export is missing ${required}.`);
}
if (files.some(file => /(?:^|\/)(?:work|outputs|node_modules|\.git|\.gradle|\.cache)\//.test(file) || /^desktop\/(?:game|release)\//.test(file) || /^android\/.*\/build\//.test(file) || /(?:\.jks|\.keystore|(?:^|\/)local\.properties)$/.test(file))) {
  throw new Error('Private or generated working directories must not be tracked.');
}
const directory = resolve(root, 'outputs', `v${version}`, 'transfer');
await mkdir(directory, { recursive: true });
const filename = `Kinetic-Core-v${version}-source.zip`;
const archive = resolve(directory, filename);
execFileSync('git', ['-C', root, 'archive', '--format=zip', '--prefix=kinetic-core/', `--output=${archive}`, 'HEAD']);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const manifest = {
  game: 'Kinetic Core', author, version, sourceCommit: git('rev-parse', 'HEAD'),
  archive: filename, bytes: (await stat(archive)).size,
  sha256: sha256(await readFile(archive)),
  historyIncluded: false,
  files: await Promise.all(files.map(async path => ({ path, sha256: sha256(await readFile(resolve(root, path))) }))),
};
await writeFile(resolve(directory, 'EXPORT-MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Source export: ${archive}\nSHA-256: ${manifest.sha256}\n${files.length} committed files; author: ${author}`);
