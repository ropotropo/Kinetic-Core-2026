# Kinetic Core

**Design a mission. Fly its critical moments.**

> **Current testing branch.** The separately maintained [author publication](https://github.com/ropotropo/Kinetic-Core-2026) retains the earlier submitted snapshot. This branch contains the newer flight build; no migration is implied.

Created by **Mykyta Borisov** · **NASA Space Apps Challenge 2026** · Challenge: **Space Mission Design Game**

Build a modular spacecraft, see how engineering choices change its performance, and fly a continuous Earth-to-Moon landing mission. Practice docking and surface landings as clearly separate exercises.

## Flight polish v0.5.6

How to play is a fullscreen guide with a creator portrait, direct author entry
and Play. Its mobile hero uses a wider, raised portrait with bottom-gradient
actions, leaving more room for the lessons. Ready primary actions use a quiet soft glow. The atlas uses a swipeable
body rail; payload cards expose added mass and assembly cameras stay above the
deck. Wide activity headings are centered. Flight-scene sunlight keeps a camera-independent scenario bearing, with
occluded glare and consistent lighting. The opening Moon is a lit 3D sphere with a barely perceptible decorative rotation,
paused when the home screen is hidden. The workshop frames selected hardware and attachment points. Empty launch
stages pause for a highlighted release action. Critical maneuvers run at 1×,
with a direct Time control for safe coasts and a passive position mini-map.
Destination selection uses a globe rail. The follow-up adds an actual-stage
separation shot, stable phone inspection, softer descent exhaust, a broader
flame-anchored trail and a detailed docking port with an inspectable capture.
Phone workshop edits now stay visible with explicit Add/Replace actions. World
selectors share a globe rail and local successful-landing counts; KC returns home.
See [mobile guide refinement](docs/QA-V056.md), [guide, navigation and Sun validation](docs/QA-V055.md), [home-Moon validation](docs/QA-V054.md), [flight validation](docs/QA-V053.md), [earlier patch checks](docs/QA-V051.md) and
the planned [detailed Moon stage](docs/LUNAR-EXPERIENCE-NEXT.md).


## Start here

This repository and its GitHub files require collaborator sign-in. The temporary game preview and earlier submitted public snapshot are separately accessible.

| Review material | Link |
| --- | --- |
| Current playable preview | **[Open the current Kinetic Core build](https://nonprofit-analyses-fridge-michelle.trycloudflare.com/)** — temporary, while the development Mac is online |
| Earlier submitted publication | [Separate public snapshot](https://ropotropo.github.io/Kinetic-Core-2026/) — not synchronized with this branch |
| Repository web hosting | Hakaton Pages is not enabled; use the preview above |
| Submitted presentation | **[English PDF — original submitted link](https://github.com/ropotropo/Hakaton2026/blob/codex/final-presentations/presentation/Kinetic-Core-EN.pdf)** |
| Project guide | **[Read the Wiki](https://github.com/ropotropo/Hakaton2026/wiki)** |
| Gameplay video | **[Video and update status](VIDEO.md)** — completed film, maintained separately |
| v0.5.6 web / portable HTML / source | **[Current release](https://github.com/ropotropo/Hakaton2026/releases/tag/v0.5.6)** |
| Previous native installers (v0.5.0) | **[HTML, Windows EXE, Android APK and source](https://github.com/ropotropo/Hakaton2026/releases/tag/v0.5.0)** |
| Historical submitted installers | [v0.4.4 downloads](https://github.com/ropotropo/Hakaton2026/releases/tag/v0.4.4) |

**This branch: v0.5.6 Flight polish.** Use the playable preview above and versioned downloadable builds; the separate publication repository has not been synchronized. The archive web files are ready on `gh-pages`, but a repository owner must reactivate Pages in Settings before that web address works. Original submitted links and v0.4.4 downloads remain historical records. The PDF keeps its original URL and bytes; video revisions are maintained independently.

![Recorded Kinetic Core gameplay](docs/media/v04-custom-moon-touchdown.jpg)

*Recorded gameplay from the documented guided Moon-mission check. This image is historical test evidence, not a new run of the final build.*

## Flight Deck v0.5

The opening **Missions** screen gives the Moon expedition one primary action,
with the spacecraft workshop, separate maneuver practice and exploration below.
The journey shows actual flight phases; the local flight log records confirmed
milestones. Three critical readings, the scene and touch controls share one
bounded viewport. A passive map stays in the corner; clock, camera and instrument icons open their controls.
Closing tools leaves flight paused until an explicit **Resume** action. Camera
selection or its close button restores a previously running flight; Escape and
backgrounding keep it paused.

## Try the first mission

1. Open **Missions → Prepare expedition**. The Lunar demonstrator is ready.
   For a custom vehicle, choose **Build a spacecraft**, place compatible hardware
   and select **Plan flight**. Dimensions change geometry and performance.
2. Choose the **Moon** globe for the full expedition, select one of four Apollo-reference
   approaches and start. Other destinations are labelled surface rehearsals.
3. A skippable 12 s rollout and 5 s countdown precede actual powered ascent.
   The flight director hands over at 100 m. Keep **Powered guidance** on initially;
   the engine slider sets its ceiling. At depletion choose **Separate booster**.
4. In confirmed Earth orbit, choose **Plan departure**. Use time warp for coasts
   and release the depleted upper stage when prompted. The same retained craft
   uses finite fuel for departure, approach, capture and descent. Safe contact
   starts the KC crew/flag ceremony and physical debrief.

For a quick maneuver, choose **Missions → Docking** or **Missions → Surface
landing**. Docking starts a separate 70 m terminal approach with External chase,
Docking camera and Cockpit; changing view does not align, brake or move the
craft. Landing assist is powered descent guidance, separate from Upright hold.
Both use finite propellant. See [How to play](docs/GETTING-STARTED.md) for
controls, checkpoints and recovery.

## What the prototype demonstrates

- The same assembled spacecraft carries its mass, finite propellant and flight state through Earth launch, staging, orbit, lunar departure, capture and touchdown.
- Dimensions and hardware choices change mass, thrust, fuel and performance. Powered guidance and RCS assistance spend the available propellant.
- A separate manual docking exercise offers external, docking and cockpit cameras. Other-world surface rehearsals explicitly skip interplanetary transfers.

The mission model uses **2D patched conics, ideal engine pointing and a synthetic circular Moon epoch**. Terrain and spacecraft are illustrative. Sampling, lunar ascent, return and complete interplanetary transfers are future work. Desktop keyboard is the primary precision-control baseline; real-phone performance and Windows/Android device acceptance remain unverified.

## Evidence and source

[Flight Deck v0.5 verification](docs/QA-V05.md) · [v0.5 UX audit](docs/UX-AUDIT-V05.md) · [Original v0.4.4 review baseline](docs/CURRENT-VERSION.md) · [Physics and references](docs/PHYSICS.md) · [Documentation index](docs/README.md) · [Presentation materials](presentation/README.md) · [Archive/publication continuity](docs/MIGRATION.md)

The current suite covers numerical/state/geometry regressions, mission-journey and retained-mass checks, and local milestone persistence. Build checks and historical browser evidence are identified separately in the documentation; a passing suite is not certification or a universal accuracy score.

To run locally with Node.js **22.12+** and npm:

```sh
npm ci
npm test
npm run build
npm run preview
```

A source build produces `dist/Kineti-Core.html`. Download the matching portable HTML from the [current release](https://github.com/ropotropo/Hakaton2026/releases/tag/v0.5.3) after publication and open it directly. The legacy filename is retained for compatibility. The core Moon game has bundled assets; optional online Earth flight needs internet. Browser saves stay local to the current origin and device.

## Authorship and credits

**Mykyta Borisov is the sole game author.** Andrii relays feedback and coordinates development; Codex and specialist agents provide implementation, design and verification assistance. See [AUTHORS.md](AUTHORS.md).

NASA/JPL/USGS references and imagery retain their [source credits](public/assets/SOURCES.md). Dependency licenses are included in [THIRD_PARTY_NOTICES.txt](dist/THIRD_PARTY_NOTICES.txt). Generated cover artwork is documented separately from actual gameplay. No NASA affiliation or endorsement is implied. A new public license for the original game has not been selected; third-party license terms continue to apply.
