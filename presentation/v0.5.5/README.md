# Kinetic Core v0.5.5 - teaser and presentation package

Sole project author: **Mykyta Borisov**. Game source is frozen at `559a56eab08abfaca62001704c188be71e9f6dab` on `codex/flight-polish`.

## Deliverables

- `Kinetic-Core-Teaser-v0.5.5.mp4`: 56-second teaser with 22 authored shots, concise English narration and an original score.
- `Kinetic-Core-Teaser-v0.5.5.en.srt`: timed English captions for YouTube.
- `Kinetic-Core-v0.5.5-EN.pdf` and `Kinetic-Core-v0.5.5-UA.pdf`: 18 widescreen slides each, with 280-second speaking scripts.
- `Kinetic-Core-v0.5.5-poster.png`: 2560 x 1440 poster retaining the approved portrait.
- `Kinetic-Core-v0.5.5-thumbnail.jpg`: 1280 x 720 YouTube thumbnail below 2 MB.
- `YOUTUBE.md`: ready-to-copy English title and description.

The earlier submitted PDFs and 82-second video v2 remain unchanged at their original paths/commits. This versioned package is additive. The preservation journal is `source/preservation-journal.json`.

## Editing and provenance

`video/` contains the editable Remotion composition, exact shot JSON, source clips, audio stems and local export scripts. `source/pdf_build.py`, `source/pdf-content.json` and `source/pdf-assets.json` rebuild the bilingual PDFs; `source/pdf-speaker-notes-en.md` and `source/pdf-speaker-notes-uk.md` contain the timed pitch. `source/pdf-poster.svg` is editable poster artwork.

All gameplay frames were newly recorded from the frozen v0.5.5 distribution through an independent local static server. `capture/manifest.json` records bundle hashes, selected takes, before/after states and limitations. Stage release and lunar capture segments use validated checkpoints continuously prepared through the unchanged production solver; `source/checkpoint-prep/` records that preparation. These staged capture entry points are not an assertion of one uninterrupted browser playthrough. Actual stage release, contact crossing and the flag finale were then recorded from the running game through its normal controls.

The Moon expedition retains one spacecraft and resource ledger across launch, transfer, orbit and landing. Docking is a separate local terminal exercise; other worlds are local landing rehearsals. The atlas is illustrative. This package does not claim implemented sample collection, controllable EVA or a return-to-Earth campaign.

The approved cover portrait is fictional generated artwork retained unchanged; provenance stays in technical sources rather than visible production captions. The voice is a standard non-impersonating English TTS preset. Music and editorial sound effects are original synthesis rather than recorded game audio. No new paid integration was used.

## Verification and downloads

`source/qa/` and `capture/source-cadence-summary.json` preserve validation methods and measured results. Checks distinguish decoded motion from a container frame-rate label, and numeric audio checks from subjective listening. The 155-game-test result cited in notes is the existing frozen-release QA record, not a new gameplay test run by this media task. Game source, physics, portable HTML and native packages are unchanged.

The exact game release remains [v0.5.5](https://github.com/ropotropo/Hakaton2026/releases/tag/v0.5.5). New media downloads use the separate [media-v0.5.5 release](https://github.com/ropotropo/Hakaton2026/releases/tag/media-v0.5.5); Windows/Android packages are not relabelled as v0.5.5. The source ZIP includes this additive presentation folder, its editable sources, capture evidence and hash manifest. The exact frozen game source remains in the game release.

The delivered MP4 was exported with FFmpeg/Pillow from the same 22-shot edit plan. The editable Remotion composition remains available; its headless export stalled in this environment. See `video/README.md` for the tested local export command and dependencies. The edit plan's original readiness status is a pre-export snapshot; `video/render-receipt.json` and final `source/qa/` reports record the completed export and checks.
