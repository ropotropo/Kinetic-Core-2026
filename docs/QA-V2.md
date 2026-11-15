# Version 0.2 independent QA

Original concept: Mykyta. Review date: November 15, 2026 (America/Los_Angeles).

This record distinguishes observed browser behavior, numerical tests, source review and unverified scope. It does not certify flight accuracy or human safety. Source changes and release operations remain with the integration owner.

## Automated checks

Independently ran `npm test` on the integrated version 0.2 source: **42 passed, 0 failed**. This includes 16 landing/destination tests, 18 ascent/docking tests and 8 checkpoint tests.

The landing checks cover physical units and JPL parameters, destination-specific gravity, vacuum inertia, finite main/RCS propellant, Titan drag, touchdown constraints, contact-time resolution, display-rate independence, all 12 scenarios requiring active control, coarse-control feasibility on all 12 scenarios and trusted checkpoint restoration. The test controller is separate from the playable manual controls and does not teleport the lander.

## Source/model audit

- The 12 destination entries distinguish measured/reference body data from fictional hardware, procedural terrain and proposed future sample operations.
- Terminal descent starts as a separate exercise with a standard training lander; the launch vehicle is not silently transformed into a landed spacecraft.
- Normal scenarios start at 800 m/−12 m/s; Phobos/Deimos use explicit lower/slower initial conditions and a disclosed low-thrust mode instead of inflated gravity.
- Main engine and attitude hold consume finite shared propellant. No vacuum translation or rotation damping is hidden in the model.
- Landing acceptance checks ground-plane contact, pad offset, both translational speeds, tilt and angular rate. Real impact telemetry is retained for the debrief.
- Checkpoints validate landing dynamics and reconstruct gravity, hardware and tolerances. Restoring a landing releases throttle and torque.
- Transfer, radiation survival, sampling, irregular-body gravity, sloped terrain and a complete Moon return mission are explicitly outside this version.

## Browser acceptance matrix

| Workflow | Status |
| --- | --- |
| Destination picker exposes all 12 moons and correct selected context | Passed: selected every option and checked its detail heading |
| NASA/JPL globe presentation for the Moon, Europa, Titan and parent bodies | Passed: actual mapped globes; Jupiter and Saturn visible in appropriate previews |
| Start manual Moon descent with transparent initial state | Passed: paused, 800 m, −12 m/s, +80 m offset, 1,200 kg propellant |
| Throttle slider, tilt, powered upright hold, engine cut and pause | Passed: manual Moon flight plus final-build Space cutoff; standalone Titan W/S, A, B and Space |
| Manual safe Moon touchdown without developer state mutation | Passed: real controls, T+03:09, contact 1.55 m/s vertical / 0.01 m/s lateral |
| Unsafe contact, explanation, checkpoint recovery and repeat | Passed: actual final-build Moon impact, correct debrief, same-mode restore and visible active craft |
| Destination/checkpoint consistency across changes | Passed: switched workbench to Titan, then restored Moon at the exact saved state |
| Desktop, 390 px and 320 px layouts | Passed; final 320 px active landing has readable scene instruments and controls |
| Prior launch/staging/orbit/docking behavior | Final build passed ascent, manual separation, bound orbit, explicit docking handoff, RCS translation/yaw/brake and restore; complete manual capture was verified in v0.1, not repeated |
| New application console errors | No confirmed game exception or Three/WebGL error; generic extension channel warnings recorded |
| Portable build in Chrome over HTTP | Passed: rendered embedded globes, actual Titan flight, W/S/A/B/Space controls and advancing physical state |
| Safari HTTP/direct-file | Integration lead verified startup/DOM controls only; foreground 3D and continuous v0.2 gameplay unverified |

## Browser evidence

Tested the stable production preview at `http://127.0.0.1:5174/` in isolated real Chrome. All 12 destination buttons updated the detail context. Europa showed its fractured ice texture and Jupiter; Titan showed its hazy orange globe and Saturn. The 390 px survey and 320 px destination chooser/paused landing fitted without horizontal clipping.

### Real manual Moon landing

The flight used only the visible power slider, normal A/D keyboard holds, the powered upright hold and pause/resume. No developer state injection, elapsed-time stepping or test controller was used. Pauses allowed deliberate reading of the same instruments a player sees. Held inputs returned to neutral; lateral momentum persisted after releasing tilt controls. This full flight preceded the final visual/layout/renderer-reset rebuild; physics source was unchanged, and the final build received the recovery and regression checks below.

| Point | Time | Feet altitude | Vertical speed | Pad offset | Lateral speed | Fuel |
| --- | --- | --- | --- | --- | --- | --- |
| Start | 00:00 | 800.0 m | −12.00 m/s | +80.0 m | 0.00 m/s | 1,200.0 kg |
| Checkpoint | 01:00 | 353.7 m | −5.19 m/s | −11.3 m | +0.11 m/s | 1,018.0 kg |
| Final approach | 02:46 | 38.1 m | −1.44 m/s | −12.0 m | approximately −0.01 m/s | 733.4 kg |
| Safe contact | 03:09 | 0.0 m | **1.55 m/s contact** | **−12.2 m** | **0.01 m/s contact** | **675.4 kg** |

The debrief displayed “Touchdown on Moon,” retained contact velocities and fuel, and the actual lander remained on the surface. Final tilt was 0.0°, within the 8° limit. The touchdown was within the ±25 m landing zone and the 2 m/s vertical / 1.5 m/s lateral limits.

Evidence under `outputs/v0.2.0/qa/`: `assembly-desktop.jpg`, `destination-picker.jpg`, `europa-survey.jpg`, `titan-survey.jpg`, `destination-390.jpg`, `destination-picker-320.jpg`, `landing-paused-320.jpg`, `moon-safe-touchdown.jpg`.

After the final immutable rebuild (`index-DSU4QhhQ.js`), restore recovered the manually saved Moon state at T+01:00: 353.7 m, −5.19 m/s vertical, +0.11 m/s lateral, −11.3 m offset, −1.4° tilt and 1,018.0 kg fuel. It paused and released throttle to 0%. Switching the assembly destination to Titan and restoring again correctly recovered Moon context and dynamics. Evidence: `final-restored-moon.jpg`.

A final copy-only patch produced release JavaScript `index-BNosbisS.js`: ending outside the training area without ground impact now uses “Descent exercise ended” and speed labels, rather than claiming contact. Physics, rendering and CSS were unchanged. A fresh standalone Chrome smoke on this release build again rendered the Moon craft, advanced physical state and responded to W (25% power); evidence: `portable-final-release-smoke.jpg`. The no-contact branch was source-reviewed, not physically flown to the exercise boundary.

### Final-build failure, recovery and mobile controls

Resuming that Moon checkpoint with zero thrust caused actual ground contact at T+01:18: 34.29 m/s vertical, 0.11 m/s lateral and −9.3 m offset. The debrief correctly identified excessive vertical speed, retained the real impact values and showed the fallen lander/debris without overlapping old instruments. Its Restore checkpoint button returned to the same physical saved state, paused. After resume, W increased power to 30%, fuel decreased and the restored upright craft was visible with no leftover impact effects. Space then cut power to 0%. At 320 px, the final active scene showed altitude, vertical speed and pad offset above the engine slider, hold, tilt and cut controls.

Evidence: `final-restored-moon-active.jpg`, `final-unsafe-moon-contact.jpg`, `final-moon-retry-visible.jpg`, `final-landing-paused-320.jpg`, `final-active-hud-320.jpg`.

### Final-build ascent and docking regression

The default vehicle launched at 10× mission time. The core actually depleted at T+02:34. Manual separation at T+02:59 released 23,000 kg, and the upper-stage burn reached a bound **151.6 × 212.8 km** orbit at T+08:18 with engine cutoff. Releasing the upper stage exposed the explicit separate terminal-approach handoff. No fake continuous rendezvous was presented.

In the terminal scenario, W increased closing speed and consumed RCS propellant; Right changed yaw; Space braking reduced closing speed from +0.14 to +0.05 m/s and reduced fuel. The saved docking checkpoint restored range 69.8 m, closing speed +0.14 m/s and 319.6 kg RCS, paused with powered attitude hold released. Resuming showed the actual craft and station after the renderer time rewind. Full manual capture remains covered by the v0.1 real-browser run and was not repeated for v0.2.

Evidence: `final-launch-orbit.jpg`, `final-docking-restored-visible.jpg`.

### Portable and Safari scope

The standalone `Kineti-Core.html` was tested in Chrome over HTTP, not direct `file:`. Moon/Earth, Europa/Jupiter and Titan/Saturn embedded globes rendered. A real Titan terminal flight advanced to T+00:04, 753.5 m altitude, −9.40 m/s, −2.9° tilt and 1,190.7 kg fuel after W/S power and A tilt commands; Space cut thrust and B switched powered hold off. The scene rendered the lander, thrust and haze. No live CDN or external runtime asset was required by the packaged document: independent static inspection found 18 embedded JPEG image payloads plus one SVG favicon, zero external script tags, zero stylesheet links and zero unembedded `/assets/` runtime paths. This checks packaging; it does not claim every browser/OS offline policy was exercised.

Evidence: `portable-moon-globe.jpg`, `portable-europa-globe.jpg`, `portable-titan-globe.jpg`, `portable-titan-flight.jpg`.

The integration lead opened the v0.2 portable direct file and HTTP version in Safari and verified the new title, destination chooser and paused Moon landing controls through accessibility/DOM. The native window was occluded; screenshots were blank and continuous animation was not observable. Therefore **Safari foreground 3D rendering and continuous v0.2 gameplay remain unverified**. Foreground Safari motion had been verified for v0.1, but that earlier result is not a v0.2 compatibility pass.

The integration lead separately observed an actual Europa failure in IAB: 40% power slowed descent and consumed propellant, then engine cut at approximately 429 m led to unsafe contact at T+01:54 (33.83 m/s vertical, 80 m offset), with explicit reasons and debris. Restore returned to the paused initial 800 m / −12 m/s / 1,200 kg / zero-throttle state. This is integration-lead evidence, not the independent manual Moon test.

## Findings

No confirmed physics/source blocking defect remains from this pass. The final build verified the destination control above modules, compact active landing instruments and the failure/retry renderer reset.

Chrome recorded generic asynchronous extension message-channel errors without an application stack (three during initial preview testing, three on final-build reload and one on standalone navigation). No confirmed game exception or Three/WebGL error was observed. These extension-style warnings were not treated as proof of an application fault.

Remaining limits: only Moon received a complete real-browser safe landing; all 12 scenarios were numerically tested, not manually flown to contact. Browser emulation checked narrow layouts, not physical iOS/Android devices. Safari gameplay has the precise verification gap above. Transfers, return flight, sampling, radiation and environmental survival remain future scope. No claim of professional flight-simulator fidelity or current-year AAA asset quality is made.
