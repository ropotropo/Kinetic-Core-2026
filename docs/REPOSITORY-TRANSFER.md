# Portable repository handover

Requirement recorded from Andrii on 15 November 2026: after v1 is ready, Mykyta
must be able to move the complete game into another repository without missing
assets or conflicting game authorship. Mykyta is the sole game author; see
[AUTHORS.md](../AUTHORS.md). No new destination repository is created by this
requirement alone.

## What travels together

- `src/`, `index.html`, `public/assets/` and its image provenance/credits.
- `package.json`, the exact `package-lock.json`, `scripts/` and project skills.
- `desktop/` and `android/` wrapper source, their lockfiles/configuration and
  notices. Native build output, SDK caches and signing keys stay outside Git.
- `dist/`: optimized static game, portable HTML and dependency notices.
- `docs/`, `README.md`, `AUTHORS.md` and project instructions.
- A source ZIP and SHA-256 manifest tied to the exact reviewed commit.

The baseline game uses no API keys, paid services, backend or developer home
directory. Optional Earth map flight fetches external online map data; it is
explicitly separate from the offline Moon game. Browser saves are local to an
origin/device and do **not** move just because a repository or site changes.
Custom vehicle JSON export/import is available; mission-save migration across
origins remains a separate future feature.

## Release export

1. Run `npm ci`, `npm test` and `npm run build` in the project root.
2. Commit all intended source, documentation and `dist/` changes. Review the
   tracked file list; never include `work/`, `outputs/`, credentials or modules.
3. Run `npm run export`. It rejects a dirty working tree and archives exactly
   `HEAD` without `.git`, producing `outputs/v<version>/transfer/` with a source
   ZIP and `EXPORT-MANIFEST.json`. Keep both with the release.
4. Extract into an empty directory. Run `npm ci`, `npm test`, `npm run build`.
   Open the static preview and portable HTML. Check launch, staging, docking
   cameras, landing, restore and offline textures on that extracted copy.
5. Before publishing in a new repository, replace links in README/release and
   the hosting setup. Search for `ropotropo/Hakaton2026`; these are distribution
   links, not simulation dependencies. The Vite build uses relative asset paths.
6. Mykyta can initialize a fresh Git history in the new repository, or preserve
   the original history deliberately. This export does not rewrite old commits
   or fabricate contributor identities. Third-party credits always travel too.

## v1 sign-off

Check the source manifest, clean-room build, offline portable play, notices,
authorship, chosen code license, destination links and ownership of the new
repository. Publish only the tested snapshot. Windows/Android preview installers are available from v0.4.4. Production signing,
app-store identities and real-device acceptance remain separate work, described in
[DISTRIBUTION.md](DISTRIBUTION.md).
