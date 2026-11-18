# Kinetic Core — current review version

**Game:** v0.4.4 development preview · **Author:** Mykyta Borisov · **Review preparation:** 15 November 2026 (America/Los_Angeles).

The game's historical upstream source is commit [`b772085`](https://github.com/ropotropo/Hakaton2026/commit/b77208515f0398a0a57263db7c6b45641fb26bdc). This preparation combines that game with the existing presentation PDFs and their supporting source. It does not change mission physics, gameplay, dependencies or built game files. This is the author-owned publication repository: [Kinetic-Core-2026](https://github.com/ropotropo/Kinetic-Core-2026). Video is published independently and is linked through [VIDEO.md](../VIDEO.md).

## Implemented behavior

- **Workshop and continuous Moon route:** compatible modular assembly, dimension-dependent performance, vehicle save/import/export, Earth rollout and ascent, manual stage separation, confirmed orbit, finite lunar departure, coast, capture and descent. The retained spacecraft and propellant continue through those stages.
- **Docking:** a separate terminal-approach exercise with manual translation/rotation, finite RCS, powered assistance and three camera views. The exercise skips a full orbital rendezvous.
- **Surface practice:** standard-lander exercises and custom-craft rehearsals. Fourteen destinations include the Moon, Mercury, Mars and eleven other moons. These rehearsals do not implement interplanetary transfers.
- **Exploration and distribution:** a Solar System atlas, a separate internet-dependent Earth map flight mode, browser/portable builds, and Windows/Android preview packages.

## Model and product limits

The connected Earth–Moon route uses 2D patched conics, a synthetic circular Moon epoch and ideal engine pointing. Named-site longitude is projected into the training plane; latitude remains reference metadata. Rendered terrain is illustrative. Hardware parameters and safety tolerances are game-specific inputs.

Samples, lunar ascent, return, atmospheric entry, surveyed terrain, full Solar System transfers and engineering certification are not implemented. Desktop keyboard remains the precision baseline. Device performance, native signing, installation and save migration have the limits recorded in [DISTRIBUTION.md](DISTRIBUTION.md).

## Verification: what each record establishes

| Record | What it establishes | Boundary |
| --- | --- | --- |
| Current `npm test` suite | 86 numerical/state/geometry tests covering flight, fuel, staging, landings, docking and checkpoint validation | Does not replace interaction or device testing |
| Production/portable build and source comparison | Build reproducibility and retained game assets/notices | Embedded assets alone do not establish direct-file browser compatibility |
| [QA-V04](QA-V04.md) | Historical browser outcomes, including a complete guided custom-craft Moon route, manual docking, standard/custom landing, failure and restore | Each entry identifies its artifact and exact conditions; it is not a claim of another full campaign during repository preparation |
| [v0.4.4 record](RELEASE-V044.md) | Author-page and native-package build/inspection work | Real Windows and Android device acceptance is not claimed |
| Presentation source records | PDF capture provenance, copy, speaking notes and generated-cover provenance | Screenshots are historical captures, not new simulation tests |

The source and game build are preserved from v0.4.4. New repository-preparation checks are reported in the pull request and local audit, rather than retroactively presented as historical browser tests. Earlier v0.1/v0.2 test counts apply only to those versions.

## Submission materials and stable URLs

- [Browser game](https://ropotropo.github.io/Kinetic-Core-2026/)
- [Already-submitted English PDF](https://github.com/ropotropo/Hakaton2026/blob/codex/final-presentations/presentation/Kinetic-Core-EN.pdf) — branch, path and PDF bytes preserved.
- [English PDF in this combined source tree](../presentation/Kinetic-Core-EN.pdf)
- [Ukrainian companion PDF](../presentation/Kinetic-Core-UA.pdf)
- [Current video link and revision status](../VIDEO.md)
- [Project Wiki](https://github.com/ropotropo/Kinetic-Core-2026/wiki)

The game name is **Kinetic Core** and its monogram is **KC**. Technical legacy paths such as `dist/Kineti-Core.html` and the package name `kineti-core` remain for compatibility. [AUTHORS.md](../AUTHORS.md), third-party credits and AI/image provenance remain intact. Original-code licensing remains an author decision.
