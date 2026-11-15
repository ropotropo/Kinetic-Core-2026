# Kinetic Core screenshot and evidence plan

Sole author: **Mykyta Borisov**. Presentation content: `presentation-content.json`, revision **v5**.

This seven-slide draft uses six existing v0.4 reference captures and provides two additional capture slots. Reference images make the layout reviewable now. Replace them with captures from one frozen final build before treating the deck as a final-build demonstration.

## Seven-slide structure

| Slide | Purpose | Image slots |
| --- | --- | --- |
| 1. Cover | Kinetic Core, event/challenge and sole author | Selected lunar portrait artwork |
| 2. Concept | Engineering choices and the implemented mission loop | `overview` |
| 3. Builder | Shared design, geometry and performance | `builder` |
| 4. Moon mission | The same spacecraft from Earth orbit to contact | `earth-orbit`, `moon-touchdown` |
| 5. Docking | Separate manual terminal-control exercise | `docking` |
| 6. Mathematical model | Equations, regression criteria and fidelity limits | Native editable table from `physicsRows` |
| 7. Closing | Mykyta's project, demo/source links and local rehearsal breadth | `europa` |

The additional `lunar-approach` and `checkpoint-retry` slots support expanded evidence, a later slide revision or the report. They do not increase the default seven-slide count.

## Capture priorities

Capture actual gameplay through ordinary visible controls. Pausing to compose a readable frame is useful. Renderer fixtures, injected physics state and generated gameplay images are unsuitable as evidence of a completed mission.

Use **1920 × 1080 or larger** for final wide captures where practical. Capture at the game's real viewport resolution instead of upscaling an old image. Preserve readable instrument labels and numbers. For gameplay presentation frames, avoid pause blur and blocking menus; the checkpoint/retry slot deliberately documents the paused restore state. Confirm the final UI uses Mykyta Borisov before replacing historical reference captures. Save PNG when sharp text requires it; high-quality JPEG is also suitable. If the extension changes, update `preferredFile` in the content manifest to match the real file. The default slots below use JPEG for the existing reference copies.

| Priority | Slot and expected file | What the frame must show | Capture steps and evidence note |
| --- | --- | --- | --- |
| P0 | `overview` — `screenshots/overview.jpg` | Moon route, selected site and retained custom-craft mission summary | Open Start Flight from the saved custom craft. Select the Moon and one named site. Keep the route/scenario label and start controls readable. Record the site and build. |
| P0 | `builder` — `screenshots/builder.jpg` | The assembled craft, edited dimension and mass/TWR/ideal delta-v | Change one dimension through the normal workshop UI, save and reload the design. Capture the resulting model and values. Put the actual before/after readings in the manifest notes; do not fabricate a comparison. |
| P0 | `earth-orbit` — `screenshots/earth-orbit.jpg` | Confirmed orbit, calculated apsides, stage state and remaining fuel | Fly the same craft through ascent. Separate the stage with the normal control. Capture the orbit-confirmed event, periapsis/apoapsis, speed, fuel and mission clock. Record guidance and staging state. |
| P0 | `moon-touchdown` — `screenshots/moon-touchdown.jpg` | The retained custom craft at genuine contact, impact telemetry, fuel and site | Continue that flight through departure, coast, capture and descent. Capture the real success/debrief screen. State whether powered guidance was active. Crew/flag visuals do not establish sampling or lunar-return capability. |
| P0 | `docking` — `screenshots/docking.jpg` | Cockpit or docking view, range, closing speed, offset, alignment and RCS reserve | Start the normal separate docking exercise and use ordinary RCS controls. Capture a readable approach frame. Record powered-assist states. Keep a soft-capture frame as supporting evidence if useful; secured post-capture zero values are not measured approach velocities. |
| P1 | `europa` — `screenshots/europa.jpg` | Local-rehearsal label, lander, horizon and descent/power/fuel readings | Select Europa's local surface exercise. Keep its scenario label visible. Record standard lander versus custom craft and landing-assist state. Do not describe it as an Earth-to-Europa transfer. |
| P1 | `lunar-approach` — `screenshots/lunar-approach.jpg` | Genuine coast/approach/capture phase, Moon, mission map and resource state | Continue the same Moon flight to a named approach or capture phase. Capture mission time, distance or speed, remaining fuel and the physical scene. Record the preceding checkpoint. |
| P1 | `checkpoint-retry` — `screenshots/checkpoint-retry.jpg` | Restored paused state, zero engine ceiling, recovered time/fuel and checkpoint message | Save through the normal UI, record the displayed state, advance, then restore. Capture the paused restored screen. Record the before/after readings in the manifest. Do not inject a state for the capture. |

For the four P0 flight images, a single ordinary saved custom-craft run provides stronger continuity evidence than unrelated attractive frames. Docking remains a distinct training scenario and should be labeled separately.

## Reference images already available

The integration owner copies these originals into the preferred files above. Their current dimensions are reference quality, not the final capture target.

| Slot | Original repository path | Original pixels | Current status |
| --- | --- | ---: | --- |
| `overview` | `outputs/v0.4.0/mission-planner.jpg` | 1280 × 720 | Reference |
| `builder` | `outputs/v0.4.0/workshop-custom-performance.jpg` | 1280 × 720 | Reference |
| `earth-orbit` | `outputs/v0.4.0/qa/custom-earth-orbit.jpg` | 1728 × 997 | Reference |
| `moon-touchdown` | `docs/media/v04-custom-moon-touchdown.jpg` | 1728 × 997 | Reference |
| `docking` | `docs/media/v04-docking-cockpit.jpg` | 1728 × 997 | Reference |
| `europa` | `docs/media/v04-europa-lander.jpg` | 1280 × 800 | Reference |
| `lunar-approach` | No assigned capture | — | Missing |
| `checkpoint-retry` | No assigned capture | — | Missing |

Use `fit: "contain"` by default so screenshots retain their aspect ratio and essential instruments. Avoid cropping an actual telemetry value, scenario label, source caption or failure condition merely to fill a frame. Existing game screenshots are distinct from the generated cover portrait.

## Build and capture manifest

Freeze the candidate build before final capture. Record the full commit, whether the working tree is dirty, the versioned bundle or portable HTML hash and the screenshot hash. A commit alone cannot identify uncommitted source changes.

The source audit observed HEAD `d495fd715efc7ac1a19c57974c3750263763c192` with an actively dirty working tree. That is a **reference snapshot**, not a final release approval. Prior QA used several explicitly named production bundles; do not silently assign those old images to a newer build.

For each final capture, fill a record with the actual values. This is a template, not captured data:

```json
{
  "id": "moon-touchdown",
  "file": "screenshots/moon-touchdown.jpg",
  "capturedAt": null,
  "timezone": "America/Los_Angeles",
  "buildVersion": null,
  "commit": null,
  "dirty": null,
  "buildArtifact": null,
  "buildSha256": null,
  "imageSha256": null,
  "imageWidth": null,
  "imageHeight": null,
  "browserAndVersion": null,
  "viewport": null,
  "mode": "integrated Moon mission",
  "site": null,
  "craftDesignOrSave": null,
  "guidanceAndAssistStates": null,
  "missionTime": null,
  "displayedTelemetry": {},
  "interactionMethod": "ordinary visible UI",
  "stateInjectionUsed": false,
  "verificationStatus": "pending",
  "notes": null
}
```

Mark a capture verified only after its file, visible state and build provenance have been checked. Retain old originals as versioned references; replace the current manifest entry deliberately rather than losing its source history. If a screenshot depicts a failure or checkpoint rather than completion, caption that exact state.

## Feature and benefit evidence

The short presentation can emphasize these implemented capabilities without inventing player-study outcomes:

- **Design choices matter:** typed geometry changes loaded mass, propulsion and ideal delta-v. The benefit is an inspectable engineering tradeoff, not a measured learning gain.
- **Resources remain coherent:** the integrated Moon route retains the same craft, tanks and mass ledger. Screenshots should show continuity across orbit and contact.
- **Critical operations are controllable:** pilot staging, RCS docking and powered landing assistance produce observable physical consequences. State the assist mode instead of implying every run was unassisted.
- **Retry is supported:** validated checkpoints restore evolving state with controls released and engine power zero.
- **Destinations offer different exercises:** terminal scenarios expose body-dependent gravity and selected atmosphere effects. They do not imply connected transfers to every world.

## Mathematical accuracy wording

Use **“Physics-based flight, tested within explicit model limits.”**

The native table on slide 6 should distinguish the model, the numerical check and its scope. The values in `numericalChecks` are existing **test acceptance criteria**. This source audit did not execute those tests. Prior independent QA reports 86 passed checks in its recorded v0.4 source; that record is separate from a new run on the final frozen build.

Examples of well-scoped criteria are the circular Earth-orbit conservation fixture over 600 simulated seconds and the local lunar-coast fixture over 48 simulated hours. Their energy/angular-momentum tolerances are not a universal position-error bound or a real-world accuracy percentage.

Keep these material boundaries with the evidence:

- Integrated Moon flight is 2D patched-conic training with a synthetic circular Moon and ideal engine pointing.
- Site longitude is projected into the training plane; latitude remains reference metadata.
- Hardware values and contact thresholds are educational assumptions. Ideal delta-v omits drag, gravity and steering losses.
- Docking uses a separate local HCW/quaternion model, not complete long-range rendezvous.
- Terrain is illustrative display geometry; source maps are not surveyed collision data.
- Sampling, lunar ascent/return, radiation/life-support survival and complete outer-system transfers remain future work.

Do not replace these boundaries with “NASA-certified,” “100% realistic,” a global accuracy percentage, or an unsupported device/FPS claim. The project can make a strong presentation through visible consequences, transparent equations and reproducible checks.

## Final deck update

1. Copy final captures into `screenshots/` and update their manifest provenance.
2. Replace reference status only for captures actually verified on the frozen build.
3. Keep the seven-slide structure and native text/table objects editable.
4. Fill the demo URL after checking the final build and intended access path. Keep the repository link separate.
5. Inspect every slide at presentation size for legible instruments, correct author/title, truthful captions and preserved image proportions.

Image-generation provenance for cover artwork remains in technical source files and speaker notes. The current private covers have no visible AI caption, as explicitly requested. This capture plan itself does not publish any material or change the game source.
