#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash, randomUUID} from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = 'presentation-content.json';
const JOURNAL = 'asset-journal.json';
const HELP = `Import an original screenshot into the local presentation kit.

Usage:
  node tools/intake-screenshot.mjs --list
  node tools/intake-screenshot.mjs --slot <id> --file <image-path>
      [--build <label>] [--commit <sha>] [--note <text>] [--final]

PNG, JPEG and WebP are supported. Relative source paths use the current
working directory. Imports copy the original bytes without resampling.
--final requires both --build and a 7–64 character hexadecimal --commit.
Only the selected screenshot becomes final; release readiness is unchanged.
`;

function parseArgs(args) {
  const options = {};
  const values = new Set(['slot', 'file', 'build', 'commit', 'note']);
  const flags = new Set(['list', 'final', 'help']);
  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`);
    const key = argument.slice(2);
    if (!values.has(key) && !flags.has(key)) throw new Error(`Unknown option: ${argument}`);
    if (Object.hasOwn(options, key)) throw new Error(`Repeated option: ${argument}`);
    if (flags.has(key)) options[key] = true;
    else {
      const value = args[++i];
      if (value === undefined || value.startsWith('--') || !value.trim()) {
        throw new Error(`${argument} requires a nonempty value.`);
      }
      options[key] = value.trim();
    }
  }
  if (options.help) return options;
  if (options.list) {
    if (Object.keys(options).length !== 1) throw new Error('--list cannot be combined with import options.');
    return options;
  }
  if (!options.slot || !options.file) throw new Error('Both --slot and --file are required.');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(options.slot)) {
    throw new Error('Slot IDs may contain only letters, digits, underscores and hyphens.');
  }
  if (options.commit && !/^[a-fA-F0-9]{7,64}$/.test(options.commit)) {
    throw new Error('--commit must be a 7–64 character hexadecimal commit SHA.');
  }
  if (options.final && (!options.build || !options.commit)) {
    throw new Error('--final requires a nonempty --build label and --commit SHA.');
  }
  return options;
}

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function safeFile(root, relative) {
  const destination = path.resolve(root, relative);
  if (!within(root, destination) || destination === root) throw new Error('Write destination escapes the output folder.');
  const parent = await fs.realpath(path.dirname(destination));
  if (!within(root, parent)) throw new Error('A destination directory resolves outside the output folder.');
  try {
    const existing = await fs.lstat(destination);
    if (existing.isSymbolicLink() || !existing.isFile()) {
      throw new Error(`Refusing a symlink or non-file destination: ${relative}`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return destination;
}

async function readJSON(root, relative, fallback) {
  const filename = await safeFile(root, relative);
  try {
    const text = await fs.readFile(filename, 'utf8');
    return {value: JSON.parse(text), text};
  } catch (error) {
    if (error.code === 'ENOENT' && fallback !== undefined) return {value: fallback, text: null};
    throw new Error(`Cannot read ${relative}: ${error.message}`);
  }
}

function slotsFrom(content) {
  if (!content || typeof content !== 'object' || Array.isArray(content) || !Array.isArray(content.screenshots)) {
    throw new Error(`${CONTENT} must contain a screenshots array.`);
  }
  return content.screenshots;
}

function pngSize(bytes) {
  if (bytes.length < 45 || bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.readUInt32BE(8) !== 13) {
    throw new Error('Invalid or truncated PNG header.');
  }
  let offset = 8, imageData = false, ended = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) throw new Error('Truncated PNG chunk.');
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') imageData = true;
    if (type === 'IEND') {
      if (length !== 0) throw new Error('Invalid PNG end chunk.');
      ended = true;
      break;
    }
    offset = end;
  }
  if (!imageData || !ended) throw new Error('PNG is missing image data or its end chunk.');
  return {width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), format: 'png', extension: 'png'};
}

function jpegSize(bytes) {
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('Invalid JPEG marker sequence.');
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > bytes.length) throw new Error('Truncated JPEG segment header.');
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) throw new Error('Invalid or truncated JPEG segment.');
    if (startOfFrame.has(marker)) {
      if (length < 8 || bytes.lastIndexOf(Buffer.from([0xff, 0xd9])) < offset + length) {
        throw new Error('Invalid or truncated JPEG image.');
      }
      return {width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3), format: 'jpeg', extension: 'jpg'};
    }
    offset += length;
  }
  throw new Error('JPEG has no supported frame header.');
}

function webpSize(bytes) {
  if (bytes.length < 30) throw new Error('Truncated WebP image.');
  const riffEnd = bytes.readUInt32LE(4) + 8;
  if (riffEnd > bytes.length || riffEnd < 20) throw new Error('Invalid or truncated WebP RIFF container.');
  let offset = 12, dimensions, imagePayload = false;
  while (offset + 8 <= riffEnd) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (data + length > riffEnd) throw new Error('Truncated WebP chunk.');
    if (type === 'VP8X') {
      if (length < 10) throw new Error('Invalid extended WebP header.');
      dimensions = {width: 1 + bytes.readUIntLE(data + 4, 3), height: 1 + bytes.readUIntLE(data + 7, 3)};
    } else if (type === 'VP8L') {
      if (length < 5 || bytes[data] !== 0x2f) throw new Error('Invalid lossless WebP header.');
      const bits = bytes.readUInt32LE(data + 1);
      dimensions ??= {width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff)};
      imagePayload = true;
    } else if (type === 'VP8 ') {
      if (length < 10 || !bytes.subarray(data + 3, data + 6).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
        throw new Error('Invalid lossy WebP frame header.');
      }
      dimensions ??= {width: bytes.readUInt16LE(data + 6) & 0x3fff, height: bytes.readUInt16LE(data + 8) & 0x3fff};
      imagePayload = true;
    } else if (type === 'ANMF' && length >= 16) imagePayload = true;
    offset = data + length + (length % 2);
  }
  if (!dimensions || !imagePayload) throw new Error('WebP has no supported image frame.');
  return {...dimensions, format: 'webp', extension: 'webp'};
}

function inspectBitmap(bytes, source) {
  const extension = path.extname(source).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) {
    throw new Error('Only .png, .jpg, .jpeg and .webp bitmap files are accepted.');
  }
  let result;
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) result = pngSize(bytes);
  else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) result = jpegSize(bytes);
  else if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') result = webpSize(bytes);
  else throw new Error('File contents are not a supported PNG, JPEG or WebP bitmap.');
  const expected = result.extension === 'jpg' ? ['.jpg', '.jpeg'] : [`.${result.extension}`];
  if (!expected.includes(extension)) throw new Error(`The filename extension does not match the ${result.format.toUpperCase()} file signature.`);
  if (!Number.isSafeInteger(result.width) || !Number.isSafeInteger(result.height) || result.width <= 0 || result.height <= 0) {
    throw new Error('Image dimensions must be positive integers.');
  }
  return result;
}

async function writeJSON(root, relative, value) {
  const destination = await safeFile(root, relative);
  const temporary = await safeFile(root, `.${path.basename(relative)}-${process.pid}-${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary, JSON.stringify(value, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    await safeFile(root, relative);
    await fs.rename(temporary, destination);
  } finally {
    await fs.unlink(temporary).catch(error => {if (error.code !== 'ENOENT') throw error;});
  }
}

async function storeOriginal(root, slot, bytes, sha256, extension) {
  const directory = path.join(root, 'screenshots');
  try {await fs.mkdir(directory);} catch (error) {if (error.code !== 'EEXIST') throw error;}
  const resolved = await fs.realpath(directory);
  if (!within(root, resolved)) throw new Error('The screenshots directory resolves outside the output folder.');
  for (let suffix = 0; suffix < 1000; suffix++) {
    const relative = `screenshots/${slot}-${sha256.slice(0, 8)}${suffix ? `-${suffix + 1}` : ''}.${extension}`;
    const filename = await safeFile(root, relative);
    try {
      await fs.writeFile(filename, bytes, {flag: 'wx'});
      return {relative, reused: false};
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (hash(await fs.readFile(filename)) === sha256) return {relative, reused: true};
    }
  }
  throw new Error('Too many existing files share the requested screenshot prefix.');
}

async function importScreenshot(root, options) {
  const lock = path.join(root, '.screenshot-intake.lock');
  try {await fs.mkdir(lock);} catch (error) {
    if (error.code === 'EEXIST') throw new Error('Screenshot intake is locked. Another import may be running; inspect the empty .screenshot-intake.lock directory before removing a stale lock.');
    throw error;
  }
  try {
    const before = await readJSON(root, CONTENT);
    const matches = slotsFrom(before.value).filter(slot => slot.id === options.slot);
    if (matches.length !== 1) throw new Error(matches.length ? `Duplicate screenshot slot: ${options.slot}` : `Unknown screenshot slot: ${options.slot}. Use --list.`);
    const sourcePath = path.resolve(process.cwd(), options.file);
    const sourceStat = await fs.stat(sourcePath);
    if (!sourceStat.isFile()) throw new Error('--file must name a regular image file.');
    const bytes = await fs.readFile(sourcePath);
    const image = inspectBitmap(bytes, sourcePath);
    const sha256 = hash(bytes);
    const stored = await storeOriginal(root, options.slot, bytes, sha256, image.extension);
    const importedAtUTC = new Date().toISOString();
    const status = options.final ? 'final' : 'reference';
    const slot = matches[0];
    const previousSlot = structuredClone(slot);
    slot.preferredFile = stored.relative;
    slot.source = stored.relative;
    slot.status = status;
    slot.alt = `Screenshot: ${slot.label || slot.id}`;
    slot.provenance = {
      capturedSource: sourcePath,
      resolvedSource: await fs.realpath(sourcePath),
      sha256,
      width: image.width,
      height: image.height,
      format: image.format,
      byteLength: bytes.length,
      importedAtUTC,
      dateUTC: importedAtUTC,
      dateMeaning: 'UTC intake time; actual capture time is not inferred',
      capturedAtUTC: null,
      sourceModifiedAtUTC: sourceStat.mtime.toISOString(),
      build: options.build || null,
      commit: options.commit || null,
      note: options.note || '',
      status,
      originalBytesPreserved: true
    };
    const journal = await readJSON(root, JOURNAL, []);
    const entries = Array.isArray(journal.value) ? journal.value : journal.value?.entries;
    if (!Array.isArray(entries)) throw new Error(`${JOURNAL} must be an array or an object with an entries array.`);
    const entry = {
      id: randomUUID(),
      operation: stored.reused ? 'reuse-identical-screenshot' : 'import-screenshot',
      phase: 'prepared',
      importedAtUTC,
      screenshotId: slot.id,
      destination: stored.relative,
      contentFile: CONTENT,
      status,
      provenance: slot.provenance,
      previousSlot,
      currentSlot: structuredClone(slot)
    };
    // Detect unrelated edits before replacing the JSON document.
    if (await fs.readFile(await safeFile(root, CONTENT), 'utf8') !== before.text) {
      throw new Error(`The content document changed during intake. Original image preserved at ${stored.relative}; retry against the updated document.`);
    }
    entries.push(entry);
    await writeJSON(root, JOURNAL, journal.value);
    await writeJSON(root, CONTENT, before.value);
    entry.phase = 'committed';
    await writeJSON(root, JOURNAL, journal.value);
    return {slot: slot.id, status, file: stored.relative, sha256, width: image.width, height: image.height, reused: stored.reused};
  } finally {
    await fs.rmdir(lock);
  }
}

async function main() {
  let options;
  try {options = parseArgs(process.argv.slice(2));} catch (error) {
    console.error(error.message + '\n\n' + HELP);
    process.exitCode = 1;
    return;
  }
  if (options.help) {console.log(HELP);return;}
  const root = await fs.realpath(ROOT);
  if (options.list) {
    const {value} = await readJSON(root, CONTENT);
    console.log('Slot\tStatus\tLabel');
    for (const slot of slotsFrom(value)) console.log(`${slot.id}\t${slot.status || 'missing'}\t${String(slot.label || '').replace(/[\r\n\t]/g, ' ')}`);
    return;
  }
  const result = await importScreenshot(root, options);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(`Screenshot intake failed: ${error.message}`);
  process.exitCode = 1;
});
