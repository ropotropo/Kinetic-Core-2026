# Kinetic Core presentation workspace

Current visual revision: **v5**, 15 November 2026. Sole author: **Mykyta Borisov**. Project name: **Kinetic Core**, simple Latin **KC** monogram.

Open `index.html` for the design kit or `deck.html` for the seven-slide presentation workspace. Both are private local HTML/CSS/JavaScript, with no account, remote font service or extra data upload. This is a custom renderer, not OpenUI. The draft presentation uses real existing game captures as references; it is prepared for final screenshots rather than represented as a frozen final release.

## Fresh cover options

| Option | Format | Source image | Cover export |
| --- | --- | --- | --- |
| Shadowline | 16:9 | `assets/mykyta-anamorphic-shadowline-v5.png` | `covers/cover-shadowline-3840x2160.png` |
| Sunlit | 16:9 | `assets/mykyta-anamorphic-sunlit-v5.png` | `covers/cover-sunlit-3840x2160.png` |
| Mission Portrait | 2:3 | `assets/mykyta-anamorphic-portrait-v5.png` | `covers/cover-portrait-2160x3240.png` |

These scenes were generated fresh using only the original portrait and the primary KC emblem as references. No previous generated scene was used. The direction includes anamorphic horizontal LED streaks, shallow background focus, fine cinematic grain, coherent facial lighting, practical helmet task lamps and tactile suit imperfections. Source photos contain the physical KC patch and event inscription; cover titles and author text remain editable. There is no visible image-generation caption, per the user's request. Honest production provenance remains in `sources.json`, `image-prompts.json` and PowerPoint speaker notes.

The PNG export dimensions preserve sharp native lettering. The photographic layers retain their actual generated resolution, recorded in `sources.json`; a larger export does not add photographic detail. Previous image edits remain historical work files, outside this current kit.

## Logo family

`branding/kinetic-core-mission-emblem.png` is the main generated transparent mission badge. The KC monogram, orbit, navigation star and lunar horizon use black/white with a small Ukrainian blue-over-yellow accent. Editable SVG companions include the badge interpretation, minimal KC mark, horizontal wordmark and 3:5 flag. The flag PNG is 3000 × 1800. Vector companions share the identity but are not exact traces of the generated badge. See `branding/README.md` for live-text and production notes.

## Seven-slide draft

1. Kinetic Core cover and sole author
2. Engineering choices and mission concept
3. Shared spacecraft builder and flight model
4. Same-craft Earth orbit to Moon contact
5. Separate terminal docking exercise
6. Equations, numerical regression criteria and model limits
7. Closing, local Europa rehearsal and final demo link

`kinetic-core-presentation-draft.pptx` contains all seven slides. Text and the physics table are native editable objects; screenshots and cover photography remain embedded images. `covers-16x9.pptx` contains the two wide cover options, and `poster-2x3.pptx` contains the portrait. Portable exports use installed Helvetica Neue, the Apple-style fallback. HTML uses the Apple system font stack; proprietary Apple font files are not bundled.

The six reference captures belong to recorded v0.4 work. Two optional capture slots remain missing. `SCREENSHOT-PLAN.md` lists each required view, expected details and provenance. The source audit inspected an actively changing working tree at `d495fd7`; it did not run a fresh game test suite or browser flight. Existing QA reports 86 passing tests and bounded browser scenarios. No universal real-world accuracy percentage or flight certification is asserted.

## Local editing

In `deck.html`, select a slide and edit its text. Choose a screenshot slot, enter the captured build/commit if known, then choose a PNG, JPEG or WebP. The replacement stays local. Use **Save draft** for this browser/device, or **Export draft** for a durable JSON file including local image replacements. **Import draft** restores that JSON. Cover and closing identity fields stay fixed to Kinetic Core and Mykyta Borisov.

Browser storage availability depends on the local app. Exporting the draft is the portable way to keep edits. Local replacements are drafts, not automatically verified final captures. The static PowerPoint download is the most recent built file; local browser edits reach it after applying and rebuilding the exported draft.

```sh
node tools/apply-draft.mjs /absolute/path/kinetic-core-presentation-draft.json
node tools/build-presentation.mjs
```

The image intake tool preserves raw screenshot bytes, gives them hash-based filenames and records source/build provenance without overwriting earlier images. It can explicitly mark a genuine frozen-build capture as final when build and commit are supplied. A single final screenshot does not certify the whole release.

```sh
node tools/intake-screenshot.mjs --list
node tools/intake-screenshot.mjs --slot builder --file /absolute/path/workshop.png \
  --build "Actual frozen build" --commit ACTUAL_HEX_SHA --final
node tools/build-presentation.mjs
```

The build tool uses the already bundled Codex presentation runtime. It regenerates the portable JS data file, cover PNGs, seven slide previews and three validated PowerPoint files. Set `RUNTIME_NODE_MODULES`, `RUNTIME_PYTHON` and `KC_PRESENTATION_SKILL` if the bundled runtime moves. Previous exported PowerPoints and private validation receipts stay under the chat's `work/` folder. The tools do not install dependencies or publish material.

## Files to retain

- `presentation-content.json` is the editable content/screenshot manifest. `presentation-content.js` is its offline browser copy, regenerated by apply/build tools.
- `presentation.css`, `DESIGN-SYSTEM.md`, `tokens.json` keep typography, spacing, colors and geometry consistent.
- `math-evidence.json` keeps source paths, test definitions, scoped tolerances and reported QA separate from new execution.
- `screenshots/` contains unchanged reference or imported game captures.
- `branding/`, `assets/` and `covers/` contain the current identity and photographs.
- `tools/` provides screenshot intake, browser-draft application and native export.
- `kinetic-core-design-kit.zip` contains the complete current portable kit.

The original supplied portrait is left in place and excluded from the portable archive. No game source, release, deployment or external publication was changed by this presentation work. The corrected identity is saved for future local work in the workspace's `PROJECT-NOTES.md` and `AGENTS.md`.
