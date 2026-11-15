# Verification and Limitations

Verification is separated into numerical/state tests, build checks, browser interaction evidence and platform acceptance. These records support a prototype; they do not certify a flight solver or establish a universal accuracy percentage.

## Numerical and state checks

The v0.4.4 suite contains **86 automated tests**, covering thrust/fuel behavior, ballistic conservation, actual orbit checks, stage release, landing feasibility and failure, docking motion/capture, typed hardware geometry, frame scheduling and checkpoint validation.

Tests run with `npm test`. They do not measure every renderer, device, input method or player experience. [Test source]({{SOURCE_TREE_URL}}/tests) is available for inspection.

## Recorded interaction evidence

The [v0.4 QA record]({{SOURCE_BLOB_URL}}docs/QA-V04.md) distinguishes the build, browser and conditions of each run. Historical checks include a complete guided Earth-to-Moon mission with an edited/saved/loaded spacecraft and manual staging, a separate manual soft docking capture, standard/custom landings, unsafe outcomes and restore.

Those are earlier recorded runs. Adding documentation or copying a screenshot does not constitute another complete flight of the final build. The presentation preserves historical captures and their provenance. The previous video showed a local landing rehearsal and a separate docking exercise; video revisions must be interpreted using the notes accompanying that version.

## Browser and portable builds

`npm run build` produces a regular static site and a portable HTML with embedded local assets. The source export was independently extracted, all 86 tests passed, and rebuilding reproduced the saved game files. Regular HTTP browser smoke checks covered mode entry, docking camera selection, landing and Moon-mission rollout.

Embedded-asset and HTTP checks do not establish every direct-file/offline browser behavior. The earlier export session's in-app browser blocked `file://`; that direct-file check was not replaced with a claimed success. Historical Safari coverage is recorded in the original QA/release notes. A fresh full Safari campaign is not claimed by this Wiki.

## Known boundaries

- **Physics:** simplified 2D patched conics, ideal pointing, synthetic Moon epoch and illustrative terrain. See [Physics and Sources]({{WIKI_URL}}/Physics-and-Sources).
- **Game scope:** no sampling, lunar ascent, return, entry/recovery or full interplanetary campaign.
- **Mobile:** layouts and touch controls exist; real-phone performance and complete manual device play still need acceptance testing.
- **Windows:** an unsigned preview installer was built and its payload inspected; real Windows installation/runtime is not certified by that inspection.
- **Android:** the preview APK was built and checked with development signing; real-device touch, GPU/memory and installation acceptance remain unverified. Vehicle file-picker/download integration is not included.
- **Saves:** browser, desktop and Android stores are separate. Moving repositories does not migrate mission saves.
- **Eligibility:** a test pass or repository cleanup does not itself establish compliance with all competition rules.

The [distribution notes]({{SOURCE_BLOB_URL}}docs/DISTRIBUTION.md) and version-specific receipts provide the exact package limitations. Older documents may name fewer tests or earlier working titles; those statements apply to their historical stage.
