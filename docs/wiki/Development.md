# Development

The current game is a client-side JavaScript/Three.js project built with Vite. It requires Node.js **22.12+** and npm. The core Moon game uses bundled assets and has no private backend or API-key requirement. Online Earth mode is explicitly internet-dependent.

## Reproduce the game build

Use the [v0.4.4 source snapshot]({{SOURCE_TREE_URL}}) or its [versioned source export]({{REPOSITORY_URL}}/releases/tag/v0.4.4). In the project folder:

```sh
npm ci
npm test
npm run build
npm run preview
```

Open the local preview address printed by Vite. `npm run dev` starts development. Install from the lockfile rather than silently updating dependencies during verification.

## Layout

| Path | Purpose |
| --- | --- |
| `src/` | Simulation, game state, UI and renderer |
| `tests/` | Numerical, state and geometry checks |
| `public/assets/` | Bundled textures, branding and source ledger |
| `dist/` | Static production game and portable HTML |
| `docs/` | Models, current guides, QA records and development history |
| `desktop/` | Electron wrapper source and packaging notices |
| `android/` | Android WebView wrapper source and notices |
| `scripts/` | Production and exact-commit export tooling |

Repository names are publication locations; the package name `kineti-core` and portable filename `Kineti-Core.html` remain compatibility identifiers. The configured repository is [{{REPOSITORY_URL}}]({{REPOSITORY_URL}}). The public project name is **Kinetic Core**, with the **KC** monogram.

## Portable and native previews

The [v0.4.4 release]({{REPOSITORY_URL}}/releases/tag/v0.4.4) provides the portable HTML, complete source export, Windows installer and Android APK previews with checksums and receipts. The native packages are development previews; read [their limitations]({{SOURCE_BLOB_URL}}docs/DISTRIBUTION.md) before treating them as accepted device releases.

`npm run export` packages one clean committed source state without `.git`, caches or installed modules. The manifest records the exact commit and SHA-256 values. Authorship, dependencies, assets, notices and provenance travel together. Browser checkpoint storage does not move with an exported repository.

## Repository preparation

The submitted presentation branch and its PDF URL remain intact. The current-game source and presentation materials are being brought into one judge-facing repository entry point through a reviewed change. Earlier commits/releases remain as history; their names and claims should not replace current documentation. Video edits continue independently at their existing stable path.

No source history is rewritten and no past commit identity is reassigned. [Authorship]({{SOURCE_BLOB_URL}}AUTHORS.md), image provenance and source notices are retained.

## Portable documentation and links

This Wiki is rendered from `docs/wiki/` templates and `project-links.json`. A publication-repository configuration is included in `docs/migration/Kinetic-Core-2026.links.json`. Run `node scripts/render-project-docs.mjs --config project-links.json --output work/generated-docs` to render this repository’s Wiki and link index locally. Rendering makes no network requests and does not publish anything. Use the clean configuration when copying the templates into the publication repository; do not copy archive-specific URLs blindly.

The core game keeps relative bundled asset paths. Each repository retains its own playable and release files; one is not an automatic mirror of the other. Browser saves stay origin-local. Preserve the archive while already-submitted URLs still point to it.
