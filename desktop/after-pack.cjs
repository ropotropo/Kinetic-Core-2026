const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

// Build-only PE resource editing, based on the same public API used by
// Electron Packager. No Wine or native runtime bridge is required.
module.exports = async context => {
  if (context.electronPlatformName !== 'win32') return;
  const R = await import('resedit');
  const pkg = JSON.parse(await fs.readFile(path.join(__dirname, 'package.json'), 'utf8'));
  const filename = path.join(context.appOutDir, 'Kinetic Core.exe');
  const exe = R.NtExecutable.from(await fs.readFile(filename));
  const resources = R.NtExecutableResource.from(exe);
  const digest = bin => createHash('sha256').update(Buffer.from(bin)).digest('hex');
  const preserved = entries => new Map(entries.filter(e => ![3, 14, 16].includes(e.type)).map(e => [JSON.stringify([e.type, e.id, e.lang]), digest(e.bin)]));
  const before = preserved(resources.entries);
  const icons = R.Data.IconFile.from(await fs.readFile(path.join(__dirname, 'resources/icon.ico')));
  const groups = R.Resource.IconGroupEntry.fromEntries(resources.entries);
  if (!groups.length) throw new Error('Electron executable has no icon resource.');
  for (const group of groups) R.Resource.IconGroupEntry.replaceIconsForResource(resources.entries, group.id, group.lang, icons.icons.map(icon => icon.data));
  const versions = R.Resource.VersionInfo.fromEntries(resources.entries);
  if (!versions.length) throw new Error('Electron executable has no version resource.');
  for (const version of versions) {
    version.setFileVersion(pkg.version, 1033);
    version.setProductVersion(pkg.version, 1033);
    for (const language of version.getAllLanguagesForStringValues()) version.setStringValues(language, {
      CompanyName: 'Mykyta Borisov', FileDescription: 'Kinetic Core', ProductName: 'Kinetic Core',
      InternalName: 'kinetic-core', OriginalFilename: 'Kinetic Core.exe',
      LegalCopyright: 'Copyright © Mykyta Borisov',
    });
    version.outputToResourceEntries(resources.entries);
  }
  resources.outputResource(exe);
  const output = Buffer.from(exe.generate());
  const verified = R.NtExecutableResource.from(R.NtExecutable.from(output));
  const after = preserved(verified.entries);
  if (before.size !== after.size || [...before].some(([key, hash]) => after.get(key) !== hash)) throw new Error('PE edit changed a protected Electron resource.');
  await fs.writeFile(filename, output);
  console.log('  KC executable icon and Mykyta metadata applied; all other Electron resources preserved.');
};
