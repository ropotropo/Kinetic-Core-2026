# Kinetic Core 2026

**Design a mission. Fly its critical moments.** Created by **Mykyta Borisov (ropotropo), the sole game author**. [Authorship and assistance](AUTHORS.md).

This publication contains the current **v0.5.6** game, imported from the Hakaton2026 release, with the complete source, tests, assets, native wrapper sources and presentation materials.

- **[Play Kinetic Core](https://ropotropo.github.io/Kinetic-Core-2026/)** — public, no account required.
- [English presentation](presentation/Kinetic-Core-EN.pdf) · [Ukrainian presentation](presentation/Kinetic-Core-UA.pdf)
- [Newer v0.5.5 presentation and teaser package](presentation/v0.5.5/README.md) — retained under its original version.
- [Project Wiki](https://github.com/ropotropo/Kinetic-Core-2026/wiki) · [Gameplay film](https://ropotropo.github.io/Kinetic-Core-2026/demo/)
- [Source and transfer record](docs/review/SYNC-V056.json) · [How to play](docs/GETTING-STARTED.md) · [Physics](docs/PHYSICS.md)

Build a modular spacecraft and fly the Earth–Moon route. Docking and surface practice are separate exercises. The game includes mobile controls; real-device acceptance and a new full mission are not claimed by this file transfer.

## Run locally

Use Node.js 22.12+:

```sh
npm ci
npm test
npm run build
npm run preview
```

The self-contained portable build is `dist/Kineti-Core.html`. Optional Earth map flight requires internet. Native wrappers and installation limits are described in [distribution notes](docs/DISTRIBUTION.md).

## Preserved materials

The earlier gameplay film, presentations, editable sources, historical receipts, asset provenance and third-party notices remain included. [The original submitted PDF URL](https://github.com/ropotropo/Hakaton2026/blob/codex/final-presentations/presentation/Kinetic-Core-EN.pdf) remains unchanged. Older v0.4.4 releases retain their historical version; this update does not replace their attachments or move tags.

This repository is a separate public publication. Future source updates require deliberate transfer. See [asset credits](public/assets/SOURCES.md) and [dependency notices](dist/THIRD_PARTY_NOTICES.txt).
