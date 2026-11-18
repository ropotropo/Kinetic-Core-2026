# Frozen v0.5.5 capture

Game source: `559a56eab08abfaca62001704c188be71e9f6dab`.
Sole game author: **Mykyta Borisov**.

All published gameplay frames were newly captured from this frozen build's
`dist/` through a separate local-only server at `127.0.0.1:5195`. The capture
process never changes game source, hardware constants, physical parameters,
contact conditions or outcomes. No v0.4.4 footage is used.

## Recording method

`lib.mjs` installs Playwright's browser clock before navigation and records one
JPEG after each 33/33/34 ms clock increment, then encodes the sequence at 30 fps.
The game's ordinary RAF callbacks and unchanged solver advance the scene.
Output plays at 1×; browser capture wall time is irrelevant to the output time.
Menus and a completed ceremony can intentionally contain stationary frames.
Container FPS alone is not evidence of smooth scene motion.

The scripts use the existing local Playwright/Chromium1248 and FFmpeg runtime.
No remote rendering service or new paid integration is required. Current scripts:

- `capture-ui.mjs`: mission home and actual globe-rail/world selection.
- `capture-workshop.mjs`: native dimension edits and compatible typed hardware.
- `capture-flight.mjs`: rollout, manual booster release, descent/contact/flag.
- `capture-ascent-long.mjs`: final continuous seven-second ascent and active orbit still.
- `capture-docking.mjs`: separate manual terminal exercise and mounted cockpit.

Use the final manifest and media hashes to identify the selected takes. A first
five-second ascent was extended by a new seven-second take. Initial docking
recordings were rejected because installing a clock after app initialization
left a simulation-time deficit. Corrected recordings install it before navigation
and explicitly verify simulation time, fuel and relative-state changes. Rejected
files and a hash journal remain in project scratch, outside published media.

## Honest staged entry points

The long integrated flight uses checkpoints in `../source/checkpoint-prep/`.
They were continuously computed from the ordinary lunar demonstrator with the
exact frozen game functions, regular guidance and explicit stage actions.
Their source hashes, physical events and preparation steps are documented in
`preparation-manifest.json`. They are **solver-prepared capture entry points**,
not human UI saves or proof of one uninterrupted browser playthrough.

The capture loads a checkpoint through the game's normal Restore validation,
sets the engine ceiling and resumes through visible controls. Manual booster
release is a real button action that changes physical stage attachment, retained
mass and fuel. The recorded touchdown starts above the surface and independently
crosses the game's contact condition. No landed/reference outcome is loaded.
The KC flag is the existing presentation-only post-contact ceremony; it does not
claim sampling, return flight or deeper surface operations.

Docking is a separately initialized terminal exercise. The Solar System is a
schematic atlas, and its landing gates start local exercises; they do not claim
continuous transfers to those bodies. The Sun bearing is illustrative scenario
lighting, not a dated astronomical ephemeris.

## Confirmed contact in this capture

The actual browser outcome was 0.5025104163 m/s vertical, 0.0774314956 m/s lateral,
and 0.7932595810 m pad offset. In `moon-contact.mp4`, frame139 still descends;
frame140 (4.667 s) is the first contact/finale render, and the confirmation debrief
is visible by frame143 (4.767 s). Use source5–9 s for an unambiguous confirmed
contact shot. `moon-flag.mp4` source5–10 s visibly contains the KC flag.

`manifest.json` preserves active bundle SHA-256, real states, controls, checkpoint
provenance and still purposes. Separate technical data is not on-screen game copy.
