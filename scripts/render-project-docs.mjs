import { readFile, readdir, mkdir, writeFile, lstat, realpath } from 'node:fs/promises';
import { dirname, resolve, relative, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Render documentation locally. No API, network, Git, deployment or credentials.
const project = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const args = process.argv.slice(2);
const options = { '--config': 'project-links.json', '--output': 'work/generated-docs' };
for (let i = 0; i < args.length; i += 2) {
  if (!(args[i] in options) || !args[i + 1]) throw new Error('Usage: node scripts/render-project-docs.mjs [--config file.json] [--output directory]');
  options[args[i]] = args[i + 1];
}
const configPath = resolve(project, options['--config']);
const config = JSON.parse(await readFile(configPath, 'utf8'));
const validRepo = value => typeof value === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);
if (config.schemaVersion !== 1 || !validRepo(config.repository) || !validRepo(config.canonicalRepository)) throw new Error('Invalid repository configuration.');
if (!['development-archive', 'publication'].includes(config.role)) throw new Error('Invalid repository role.');
for (const key of ['sourceRef', 'materialsRef']) {
  if (typeof config[key] !== 'string' || !/^[A-Za-z0-9_./-]+$/.test(config[key]) || config[key].split('/').includes('..')) throw new Error(`Invalid ${key}.`);
}
for (const key of ['gameURL', 'canonicalGameURL', 'videoURL', 'videoSourceURL', 'videoNotesURL', 'presentationURL', 'submittedPresentationURL']) {
  const url = new URL(config[key]);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`Invalid HTTPS ${key}.`);
}
const repository = `https://github.com/${config.repository}`;
const canonical = `https://github.com/${config.canonicalRepository}`;
const values = {
  REPOSITORY_URL: repository,
  WIKI_URL: `${repository}/wiki`,
  GAME_URL: config.gameURL,
  CANONICAL_REPOSITORY_URL: canonical,
  CANONICAL_REPOSITORY_NAME: config.canonicalRepository,
  CANONICAL_GAME_URL: config.canonicalGameURL,
  VIDEO_URL: config.videoURL,
  VIDEO_SOURCE_URL: config.videoSourceURL,
  VIDEO_NOTES_URL: config.videoNotesURL,
  PRESENTATION_URL: config.presentationURL,
  SUBMITTED_PDF_URL: config.submittedPresentationURL,
  SOURCE_TREE_URL: `${repository}/tree/${config.sourceRef}`,
  SOURCE_BLOB_URL: `${repository}/blob/${config.sourceRef}/`,
  MATERIALS_BLOB_URL: `${repository}/blob/${config.materialsRef}/presentation/`,
  MATERIALS_TREE_URL: `${repository}/tree/${config.materialsRef}/presentation/`,
  ROLE_LABEL: config.role === 'publication' ? 'Publication repository' : 'Development archive; existing submitted links are preserved',
};
const output = resolve(project, options['--output']);
const templates = resolve(project, 'docs/wiki');
const allowedOutputs = ['work', 'outputs'].map(name => resolve(project, name));
if (!allowedOutputs.some(path => output.startsWith(path + sep))) throw new Error('Generated output must be a separate directory under project work/ or outputs/.');
async function rejectSymlinks(path) {
  const parts = relative(project, path).split(sep);
  let current = project;
  for (const part of parts) {
    current = join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symbolic links are not allowed in generated output: ${current}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}
await rejectSymlinks(output);
try {
  const existing = await readdir(output);
  if (existing.length) {
    await rejectSymlinks(join(output, 'RENDER-RECEIPT.json'));
    const prior = JSON.parse(await readFile(join(output, 'RENDER-RECEIPT.json'), 'utf8'));
    if (prior.repository !== config.repository) throw new Error('Choose another output directory for a different repository.');
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  // Only a genuinely absent output directory is safe to initialize.
  try { await lstat(output); } catch (missing) { if (missing.code === 'ENOENT') { /* new output */ } else throw missing; }
  if (error.path !== output) throw new Error('Refusing to overwrite an existing non-generated directory.');
}
const rendered = [];
for (const filename of (await readdir(templates)).filter(n => n.endsWith('.md')).sort()) {
  let text = await readFile(join(templates, filename), 'utf8');
  text = text.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template token: ${key}`);
    return values[key];
  });
  if (/\{\{[^}]+\}\}/.test(text)) throw new Error(`Unresolved token in ${filename}.`);
  rendered.push([join('wiki', filename), text]);
}
const links = `# Kinetic Core publication links\n\nRepository role: **${values.ROLE_LABEL}**.\n\n| Material | URL |\n| --- | --- |\n| This repository | ${repository} |\n| Current publication | ${canonical} |\n| This repository's game | ${config.gameURL} |\n| Publication game | ${config.canonicalGameURL} |\n| Wiki | ${values.WIKI_URL} |\n| Presentation | ${config.presentationURL} |\n| Original submitted PDF | ${config.submittedPresentationURL} |\n| Stable video viewer | ${config.videoURL} |\n| Video source | ${config.videoSourceURL} |\n\nEach game remains a separate self-contained deployment. No automatic synchronization is implied. Preserve original submitted URLs while judges may use them. Browser saves are origin/device-local.\n`;
rendered.push(['PROJECT-LINKS.md', links]);
rendered.push(['VIDEO.md', `# Kinetic Core gameplay video\n\n**[Open the video](${config.videoURL})**\n\nThe completed film is available through this stable viewer. Replacing the published media at the same path keeps the viewer URL unchanged. Each repository deploys its own media copy; a source push alone does not update another site. This renderer does not upload or alter a video.\n\n[Video source](${config.videoSourceURL}) · [Publication repository](${canonical}) · [Presentation](${config.presentationURL})\n\nRefer to the current video's accompanying notes for its exact scenes and evidence. A montage of local landing and separate docking does not establish an uninterrupted Earth-to-Moon flight.\n`]);
for (const [filename, text] of rendered) {
  const path = join(output, filename);
  await rejectSymlinks(path);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text);
}
await rejectSymlinks(join(output, 'RENDER-RECEIPT.json'));
await writeFile(join(output, 'RENDER-RECEIPT.json'), JSON.stringify({ repository: config.repository, role: config.role, config: relative(project, configPath), files: rendered.map(([name]) => name), networkUsed: false, publicationPerformed: false }, null, 2) + '\n');
console.log(`Rendered ${rendered.length} documentation files for ${config.repository} in ${output}. No publication performed.`);
