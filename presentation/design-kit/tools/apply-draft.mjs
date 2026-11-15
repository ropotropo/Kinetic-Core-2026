#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);
const SLIDE_IDS = ['cover', 'concept', 'builder', 'mission', 'docking', 'physics', 'closing'];
const COVER_IDS = new Set(['shadowline', 'sunlit']);
const MAX_IMAGE = 30 * 1024 * 1024;
const MIME_EXTENSION = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp'};
const AUTHOR = 'Mykyta Borisov';
const PROJECT = 'Kinetic Core';
const CREDIT = `Created by ${AUTHOR}`;
const HELP = `Apply an exported local presentation draft.
Usage: node tools/apply-draft.mjs /absolute/path/draft.json
Only editable slide text, cover choice and demo/repository links are merged.
Embedded PNG/JPEG/WebP images are imported as references (30 MB each).
`;

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function inside(root, destination) {
  const relative = path.relative(root, destination);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function safeTarget(root, relative) {
  const filename = path.resolve(root, relative);
  if (!inside(root, filename) || filename === root) throw new Error('Output path escapes the presentation kit.');
  if (!inside(root, await fs.realpath(path.dirname(filename)))) throw new Error('Output directory resolves outside the presentation kit.');
  try {
    const stat = await fs.lstat(filename);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Refusing a symlink or non-file output: ${relative}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return filename;
}

function validateIdentity(project, label) {
  if (!record(project) || project.project !== PROJECT || project.author !== AUTHOR) {
    throw new Error(`${label} must identify ${PROJECT} with sole author ${AUTHOR}.`);
  }
  if (project.identity !== undefined && (!record(project.identity) || project.identity.title !== PROJECT || project.identity.author !== AUTHOR)) {
    throw new Error(`${label} contains conflicting identity metadata.`);
  }
}

function validateSlides(slides, label) {
  if (!Array.isArray(slides) || slides.length !== SLIDE_IDS.length) throw new Error(`${label} must contain the seven known slides.`);
  const ids = slides.map(slide => record(slide) ? slide.id : undefined);
  if (new Set(ids).size !== SLIDE_IDS.length || ids.some(id => !SLIDE_IDS.includes(id))) {
    throw new Error(`${label} has unknown, missing or duplicate slide IDs.`);
  }
  for (const slide of slides) {
    if (typeof slide.title !== 'string' || typeof slide.lead !== 'string' || !Array.isArray(slide.body) || slide.body.length > 3 || slide.body.some(item => typeof item !== 'string')) {
      throw new Error(`${label} slide ${slide.id} needs string title/lead and at most three body strings.`);
    }
  }
  const cover = slides.find(slide => slide.id === 'cover');
  const closing = slides.find(slide => slide.id === 'closing');
  if (cover.title !== PROJECT || cover.body.length !== 1 || cover.body[0] !== CREDIT || closing.title !== PROJECT || closing.lead !== CREDIT) {
    throw new Error('Cover and closing project identity and sole-author credit are fixed.');
  }
}

function validateSlots(content) {
  if (!Array.isArray(content.screenshots)) throw new Error('The presentation content needs a screenshots array.');
  const ids = content.screenshots.map(slot => record(slot) ? slot.id : undefined);
  if (ids.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id)) || new Set(ids).size !== ids.length) {
    throw new Error('The authoritative screenshot slots contain invalid or duplicate IDs.');
  }
  return new Set(ids);
}

function timestamp(value, label, optional = false) {
  if (optional && (value === undefined || value === '')) return '';
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error(`${label} must be a valid timestamp.`);
  return value;
}

function link(value, label) {
  if (typeof value !== 'string') throw new Error(`${label} must be an HTTP/HTTPS URL or blank.`);
  const text = value.trim();
  if (!text) return '';
  if (/[\u0000-\u0020\u007f]/.test(text)) throw new Error(`${label} contains unencoded whitespace or control characters.`);
  let parsed;
  try {parsed = new URL(text);} catch {throw new Error(`${label} must be an absolute HTTP/HTTPS URL.`);}
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw new Error(`${label} must use HTTP or HTTPS.`);
  return text;
}

function optionalString(value, label) {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw new Error(`${label} must be a string.`);
  return value.trim();
}

function decodeMedia(media, slots) {
  if (media === undefined) return [];
  if (!record(media)) throw new Error('Draft media must be an object keyed by known screenshot slots.');
  return Object.entries(media).map(([id, item]) => {
    if (!slots.has(id) || !record(item) || item.id !== id) throw new Error(`Unknown or mismatched screenshot override: ${id}`);
    if (!Object.hasOwn(MIME_EXTENSION, item.mime)) throw new Error(`Unsupported screenshot MIME type for ${id}.`);
    if (typeof item.fileName !== 'string' || !item.fileName.trim()) throw new Error(`Screenshot ${id} needs its original filename.`);
    if (typeof item.dataUrl !== 'string') throw new Error(`Screenshot ${id} needs a base64 data URL.`);
    const prefix = `data:${item.mime};base64,`;
    if (!item.dataUrl.startsWith(prefix)) throw new Error(`Screenshot ${id} has a mismatched data URL MIME type.`);
    const encoded = item.dataUrl.slice(prefix.length);
    if (!encoded || encoded.length > Math.ceil(MAX_IMAGE / 3) * 4 || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new Error(`Screenshot ${id} has invalid base64 data or exceeds 30 MB.`);
    }
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length > MAX_IMAGE || bytes.toString('base64') !== encoded) throw new Error(`Screenshot ${id} failed the canonical base64 roundtrip or exceeds 30 MB.`);
    const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
    const webp = bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!({'image/png': png, 'image/jpeg': jpeg, 'image/webp': webp}[item.mime])) throw new Error(`Screenshot ${id} contents do not match its bitmap MIME type.`);
    const build = optionalString(item.build, `${id} build`);
    const commit = optionalString(item.commit, `${id} commit`);
    if (commit && !/^[a-fA-F0-9]{7,64}$/.test(commit)) throw new Error(`Screenshot ${id} commit must be a hexadecimal SHA.`);
    return {id, bytes, extension: MIME_EXTENSION[item.mime], fileName: item.fileName, build, commit, intakeAtUTC: timestamp(item.intakeAtUTC, `${id} intakeAtUTC`, true)};
  });
}

function validateDraft(draft, current) {
  if (!record(draft) || draft.schema !== 'kinetic-core-presentation-draft.v1') throw new Error('Unsupported presentation draft schema.');
  timestamp(draft.savedAtUTC, 'savedAtUTC');
  validateIdentity(current, 'Authoritative presentation');
  validateIdentity(draft.project, 'Draft');
  validateSlides(current.slides, 'Authoritative presentation');
  validateSlides(draft.project.slides, 'Draft');
  const slots = validateSlots(current);
  if (!COVER_IDS.has(draft.project.selectedCover)) throw new Error('Draft selectedCover must be shadowline or sunlit.');
  if (!record(draft.project.links)) throw new Error('Draft needs demo and repository links.');
  const links = {demo: link(draft.project.links.demo, 'Demo link'), repository: link(draft.project.links.repository, 'Repository link')};
  const media = decodeMedia(draft.media, slots);
  return {links, media};
}

async function readContent(root) {
  const filename = await safeTarget(root, 'presentation-content.json');
  const text = await fs.readFile(filename, 'utf8');
  return {content: JSON.parse(text), text};
}

async function acquire(root, name) {
  const filename = path.join(root, name);
  try {await fs.mkdir(filename);} catch (error) {
    if (error.code === 'EEXIST') throw new Error(`${name} exists. Another presentation operation may be running.`);
    throw error;
  }
  return async () => fs.rmdir(filename);
}

async function stageText(root, label, text) {
  const filename = await safeTarget(root, `.${label}-${process.pid}-${randomUUID()}.tmp`);
  await fs.writeFile(filename, text, {flag: 'wx', mode: 0o600});
  return filename;
}

async function writeMerged(root, previous, merged) {
  const jsonPath = await safeTarget(root, 'presentation-content.json');
  const jsPath = await safeTarget(root, 'presentation-content.js');
  const json = JSON.stringify(merged, null, 2) + '\n';
  const serialized = JSON.stringify(merged).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const temporary = [];
  let jsonCommitted = false;
  try {
    const nextJSON = await stageText(root, 'presentation-content-json', json);temporary.push(nextJSON);
    const nextJS = await stageText(root, 'presentation-content-js', `window.KC_PROJECT = ${serialized};\n`);temporary.push(nextJS);
    if (await fs.readFile(jsonPath, 'utf8') !== previous.text) throw new Error('Presentation content changed during draft application. Retry against the updated content.');
    await safeTarget(root, 'presentation-content.json');
    await safeTarget(root, 'presentation-content.js');
    await fs.rename(nextJSON, jsonPath);jsonCommitted = true;
    await fs.rename(nextJS, jsPath);
  } catch (error) {
    if (jsonCommitted) {
      try {
        const restore = await stageText(root, 'presentation-content-restore', previous.text);temporary.push(restore);
        await safeTarget(root, 'presentation-content.json');
        await fs.rename(restore, jsonPath);
      } catch (restoreError) {
        throw new Error(`${error.message} Content restoration also failed: ${restoreError.message}. Imported reference images remain preserved.`);
      }
    }
    throw error;
  } finally {
    for (const filename of temporary) await fs.unlink(filename).catch(error => {if (error.code !== 'ENOENT') throw error;});
  }
}

async function applyDraft(root, draftPath) {
  const releaseDraftLock = await acquire(root, '.presentation-draft.lock');
  let temporary;
  const imported = [];
  try {
    const initial = await readContent(root);
    const slots = validateSlots(initial.content);
    const stat = await fs.stat(draftPath);
    if (!stat.isFile()) throw new Error('Draft path must name a regular JSON file.');
    const maximumDraftSize = slots.size * Math.ceil(MAX_IMAGE / 3) * 4 + 10 * 1024 * 1024;
    if (stat.size > maximumDraftSize) throw new Error('Draft exceeds the combined screenshot and metadata size limit.');
    const draft = JSON.parse(await fs.readFile(draftPath, 'utf8'));
    const validated = validateDraft(draft, initial.content);
    if (validated.media.length) {
      temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'kinetic-core-draft-'));
      await fs.chmod(temporary, 0o700);
      const intake = await safeTarget(root, 'tools/intake-screenshot.mjs');
      for (const media of validated.media) {
        const imagePath = path.join(temporary, `${randomUUID()}.${media.extension}`);
        await fs.writeFile(imagePath, media.bytes, {flag: 'wx', mode: 0o600});
        const note = `Imported from local presentation draft ${draftPath}; savedAtUTC=${draft.savedAtUTC}; original filename=${media.fileName}${media.intakeAtUTC ? `; browser intakeAtUTC=${media.intakeAtUTC}` : ''}. Reference import, with no final-build assertion.`;
        const args = [intake, '--slot', media.id, '--file', imagePath, '--note', note];
        if (media.build) args.push('--build', media.build);
        if (media.commit) args.push('--commit', media.commit);
        try {
          const {stdout} = await run(process.execPath, args, {cwd: root, maxBuffer: 1024 * 1024});
          imported.push(JSON.parse(stdout));
        } catch (error) {
          throw new Error(`Screenshot ${media.id} import failed: ${String(error.stderr || error.message).trim()}`);
        }
      }
    }
    const releaseIntakeLock = await acquire(root, '.screenshot-intake.lock');
    try {
      // Reload after intake so imported preferred files and trusted evidence survive.
      const latest = await readContent(root);
      validateIdentity(latest.content, 'Authoritative presentation');
      validateSlides(latest.content.slides, 'Authoritative presentation');
      const currentSlots = validateSlots(latest.content);
      if (validated.media.some(media => !currentSlots.has(media.id))) throw new Error('Screenshot slots changed during application. Imported references remain preserved.');
      const edits = new Map(draft.project.slides.map(slide => [slide.id, slide]));
      const merged = structuredClone(latest.content);
      merged.slides = merged.slides.map(slide => {
        const edit = edits.get(slide.id);
        return {...slide, title: edit.title, lead: edit.lead, body: [...edit.body]};
      });
      merged.selectedCover = draft.project.selectedCover;
      merged.links = {...merged.links, ...validated.links};
      await writeMerged(root, latest, merged);
    } finally {await releaseIntakeLock();}
    return {applied: true, content: 'presentation-content.json', browserData: 'presentation-content.js', slideCount: SLIDE_IDS.length, selectedCover: draft.project.selectedCover, importedReferences: imported};
  } catch (error) {
    if (imported.length) error.message += ` ${imported.length} imported reference image(s) remain in the kit with their intake journal; they were not deleted.`;
    throw error;
  } finally {
    if (temporary) await fs.rm(temporary, {recursive: true, force: true});
    await releaseDraftLock();
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {console.log(HELP);return;}
  if (args.length !== 1 || args[0].startsWith('-')) {console.error(HELP);process.exitCode = 1;return;}
  const root = await fs.realpath(ROOT);
  const result = await applyDraft(root, path.resolve(process.cwd(), args[0]));
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(`Draft application failed: ${error.message}`);
  process.exitCode = 1;
});
