# Integrated flight demo v0.4 QA

Original game concept: Mykyta. Independent review: November 15, 2026.

This report distinguishes source review, pure numerical tests and real-browser observations. The integration lead owns fixes, builds and publication. The QA reviewer edits this document and evidence under `outputs/v0.4.0/qa/` only.

## Scope and model boundaries

The integrated Moon mission retains a shared typed-slot vehicle, finite tanks, mass and physical trajectory through Earth ascent, orbital coast, lunar departure, lunar-frame transition, capture and touchdown. The model uses a two-dimensional patched-conic training plane and a synthetic circular Moon epoch. Site longitude is projected into that plane; latitude is reference metadata. Other moons remain explicitly separate local surface rehearsals.

Integrated mission and custom-rehearsal pointing are idealized: guidance points the translational engine directly; manual pitch is kinematic. They do not implement a complete six-degree-of-freedom attitude/RCS model. The legacy terminal lander and its new assist use ordinary powered engine/torque inputs instead. These are different fidelity contracts and should not be conflated.

## Source-review findings

| Finding | Initial evidence | Resolution |
| --- | --- | --- |
| Custom surface start crashes | Pure `createCustomDescent(createLunarDesign(), 'europa')` throws at `p.cargo.dryMass`; `evaluateDesign().parts` has no `cargo` entry | Fixed by trusted resolved catalog/config parts; independent pure-call retest creates the 36.038 t assembled craft |
| Custom terminal checkpoint validation | Terminal phase lacked ground/contact validation and practice-site ID was unchecked | Fixed by restoring active checkpoints only plus site/motion bounds; independent forged `landed` and unknown-site retests reject; valid 800 m restore has zero thrust |
| Pre-handover staging | Stage release could be requested during the first 100 m despite flight-director wording | Controller gates stage, power and guidance until actual 100 m; source guard reviewed and browser power/guidance lock and real handover observed |
| Checkpoint persistence atomicity | Validation failure shared the storage-denial fallback and could replace the prior memory checkpoint | Validation now completes before replacement; invalid states retain the last good save, and storage denial retains an already validated session copy |
| Distant lunar terrain | Actual descent at about 2,022 m height / 19.9 km pad offset showed no ground | Extended terrain/far clipping fixed; final-build UI retest at 2,035 m / 20,839.8 m shows continuous ground/horizon |
| Cockpit display clipping | Initial cockpit preview clipped the live LCD lower half at desktop aspect | Position corrected; final desktop and 390 px images show all four live readings |

The Moon checkpoint implementation reconstructs trusted propulsion constants and validates phase/frame/site, motion, tank capacities, mass-flow ledger, plan bounds and touchdown evidence. Source review found explicit key release on pause/blur and a capture-phase mode-menu key guard. Actual pause, restore and mode switching were then exercised in the browser runs below.

## Verification record

Independently ran `npm test` on the integrated source: **86 passed, 0 failed**. Coverage includes all four finite-fuel lunar sites, ascent/staging, continuity at the lunar reference-frame transition, vacuum conservation, contact-time solving, trusted restore/ledger checks, custom Europa descent, Moon/Europa powered terminal assistance, all 14 local destinations, typed-slot geometry/performance and legacy flight regression. Numerical test pilots use normal force/control inputs, but these tests are not evidence of a manual browser flight.

The full browser mission below used the stable production preview at `http://127.0.0.1:5175/`, loaded from `index-CX9LPhhd.js`. It ran in isolated real Chrome using normal visible controls, powered guidance, manual staging, UI time warp and pause/checkpoint buttons. No developer state writes, `advanceTime`, teleportation or direct physics invocation was used in the browser. The diagnostic `render_mission_to_text` hook was unavailable in the CUA read-only scope, so recorded flight evidence comes from the actual displayed instruments, log and scene.

## Full saved-custom-vehicle Moon flight

An empty platform kept Start Flight disabled. Choosing Command capsule highlighted exactly its compatible attachment point; explicit placement installed it. After loading the lunar demonstrator, a native keyboard dimension edit changed capsule length from **3.40 m to 3.55 m**. The shared model changed initial mass from **1,115.3 t to 1,115.5 t**, staged ideal Δv from **10,745 to 10,725 m/s**, and height from **74.3 to 74.5 m**. Save locally → Load lunar demonstrator → Load local save restored the 3.55 m capsule and the changed performance figures. Start Flight carried the same 1,115.5 t design into planning, with 5.63 km/s spacecraft ideal Δv.

All four Moon site buttons changed their reference/approach description. **Taurus–Littrow / Apollo 17** was selected for the complete flight. The planner at 390 px fitted without horizontal clipping and allowed vertical scrolling to the start controls.

| Physical milestone | Displayed mission time / observation |
| --- | --- |
| Rollout and countdown | Rollout / 3 then ignition countdown; prelaunch altitude 0, no propellant change; power/guidance controls locked |
| Genuine first-100 m handover | Log T+00:04; actual powered ascent had consumed fuel, then pilot controls became active |
| Core depletion and pilot release | Auto-paused T+02:23; Space explicitly released 52,283 kg and resumed the next stage |
| Bound Earth orbit | Confirmed T+07:39; **151 × 232 km** apsides; the unspent upper stage stayed attached |
| Departure planning | Selected at T+12:08 while physically coasting; trajectory continued through the departure window |
| Lunar injection / upper release | Burn began T+72:12; depleted upper stage auto-paused at T+73:07; pilot Space released **14,299 kg** and made the retained spacecraft engine available |
| Departure cutoff | T+81:55; the engine stopped and the craft coasted with **15,406.4 kg** service propellant remaining |
| Lunar reference-frame entry | T+4d 0h 39m; the log explicitly identified the coordinate change and continuity |
| Lunar periapsis targeting cutoff | T+4d 0h 43m, followed by ballistic local coast |
| Lunar capture / orbit | Capture burn T+4d 20h 2m; bound local orbit established T+4d 20h 7m |
| Selected-site powered descent | Began T+4d 20h 33m; terminal phase began T+4d 20h 44m |
| Safe contact | **T+4d 20h 52m**, **0.50 m/s vertical**, **0.08 m/s lateral**, **1,632.3 kg propellant**, **11.76 t mass** |

The actual edited and loaded spacecraft remained on the Moon. An astronaut emerged, walked onto the surface and planted the Kinetic Core text flag. This is a visual crew/flag finale, not implemented sampling or a surface return mission; no supplied final logo asset was claimed.

During lunar coast, Save checkpoint captured T+4d 7h 5m, Moon reference, **15,073.1 kg** propellant, **25.2 t** mass and **4,024 m/s** available engine Δv. After allowing the real simulation to advance, Restore checkpoint recovered exactly those displayed values and paused with engine ceiling **0%**. Setting the actual slider back to 100% and resuming continued the same mission to touchdown. This was a normal UI restore, not state injection.

At 390 px during the active final approach, altitude, vertical speed and pad offset remained readable above reachable engine/guidance/warp controls. One visual issue was recorded: at approximately 2,022 m altitude and 19.9 km from the pad, the scene showed the craft against black space without a lunar ground/horizon. Ground appeared correctly near touchdown. This was fixed and rechecked on the final build below; the physics/map continued correctly throughout.

Evidence under `outputs/v0.4.0/qa/`: `typed-placement.jpg`, `loaded-custom-vehicle.jpg`, `lunar-planner-desktop.jpg`, `lunar-planner-390.jpg`, `rollout-start.jpg`, `core-depletion-paused.jpg`, `custom-earth-orbit.jpg`, `upper-depletion-paused.jpg`, `lunar-frame-approach.jpg`, `lunar-capture-burn.jpg`, `integrated-descent-390.jpg`, `integrated-low-descent.jpg` and `custom-moon-touchdown-eva.jpg`. The file named `integrated-low-descent.jpg` captured the successful touchdown debrief because contact occurred before the requested frame; it is not evidence of airborne descent.

Chrome showed three generic asynchronous extension message-channel warnings without an application stack. No game exception or Three/WebGL error was observed during this full flight.

## Final-build cameras and full manual docking

The final pass loaded **`index-BYy34LOK.js` / `index-U9qWEPEW.css`**. All three explicit camera buttons worked: External chase, nose-mounted Docking camera and Cockpit. Right-arrow input changed actual yaw and the body-mounted station view; camera selection preserved physical range. Dragging External chase showed a different side of the craft while port range remained 70.0 m; Reset camera restored chase. The live cockpit LCD matched navigation instruments and fitted at desktop and 390 px. Only the selected camera remained highlighted after moving focus.

Starting from the normal 70 m scenario, the reviewer manually used A/D and R/F paired RCS burns, W approach burns, inertial coasting and explicit Space braking, with powered attitude hold enabled. Pauses were used to read instruments; no physics state was injected. Camera selection did not steer or translate the spacecraft.

| Docking point | Mission time | Range | Closing speed | Lateral offset | RCS reserve |
| --- | --- | --- | --- | --- | --- |
| Initial scenario | 00:00 | 70.0 m | 0.00 m/s | 2.16 m | 320.0 kg |
| Manual alignment | 00:42 | 69.9 m | approximately 0.00 m/s | 0.03 m | 316.0 kg |
| Inertial approach | 01:24 | 40.1 m | 0.83 m/s | 1.29 m | 313.7 kg |
| Brake before final alignment | 02:13 | 6.7 m | 0.03 m/s | 5.31 m | 311.0 kg |
| Orbital-frame drift corrected | 02:36 | 6.0 m | 0.01 m/s | 0.06 m | 307.5 kg |
| Final observed approach | 03:05 | 2.2 m | 0.13 m/s | 0.08 m | 307.1 kg |
| **Soft capture confirmed** | **03:22** | **Port plane reached** | Capture limits passed | Capture limits passed | **307.1 kg** |

The actual port-plane condition produced mechanical capture and debrief; **12.9 kg** RCS was used. External chase after contact showed the spacecraft attached to the station. Secured zero readings are the post-capture constraint, not quoted as measured approach velocities.

Evidence: `docking-cockpit.jpg` (clean final desktop cockpit), `docking-cockpit-390.jpg`, `docking-alignment-camera.jpg`, `docking-external-orbit.jpg`, `manual-soft-capture.jpg`.

## Final lunar-horizon regression

From the completed docking phase, Modes → Complete Moon mission → Restore saved mission recovered the separate checkpoint at T+4d 20h 44m, **29,931 m altitude / 122,831.5 m pad offset**, paused with engine ceiling zero. UI restoration kept the edited 3.55 m capsule. After deliberately setting power and time warp, the retained craft flew to **2,035 m altitude / 20,839.8 m offset**. Continuous lunar terrain and its horizon were visible behind the thrusting craft. This reproduces the formerly black region. The flight was then paused; it was not teleported to a test position.

Evidence: `corrected-lunar-horizon.jpg`.

## Integration-lead IAB evidence

These results belong to the integration lead and are separate from the independent Chrome runs above.

- **Legacy Europa powered assist:** actual UI start at 800 m / 80 m offset, assist on, real simulation to contact at **T+02:10**, **0.25 m/s vertical / 0.04 m/s lateral**, **−0.7 m offset**, **893.6 kg remaining**. The new lander, large controls and dust/outwash below 45 m were observed. Evidence: `outputs/v0.4.0/europa-assisted-touchdown.jpg`, `europa-lander-descent.jpg`.
- **Custom Europa / Fracture-field rehearsal:** retained lunar demonstrator at **36.04 t**, **160 m offset / +2 m/s lateral**. Normal UI time warp and powered guidance reached contact at **0.35 m/s vertical / 0.01 m/s lateral**, **24,584.2 kg main fuel**, **34.45 t mass**. No transfer or Europa EVA was asserted. Restore recovered 800 m / −12 m/s / 160 m / 26,169.5 kg, paused with power zero. Guidance off and zero thrust then caused real unsafe contact at **47.4 m/s**, with unchanged fuel; the prior checkpoint still restored safely. Evidence: `europa-custom-touchdown.jpg`, `europa-custom-failure.jpg`.
- Europa's monochrome 4K guide and source caption were checked at 400% zoom. This verifies imagery/attribution, not measured collision terrain.

## Portable artifact and compatibility boundary

The then-packaged BYy build of `dist/Kineti-Core.html` opened at `http://127.0.0.1:5175/Kineti-Core.html`. Its embedded Moon map rendered; Modes → Manual docking → Cockpit worked; W and Right inputs advanced the real state to T+00:03, range **69.7 m**, closing **0.14 m/s**, RCS reserve **319.5 kg**. The live panel matched these values. The portable tab had **no captured console warnings/errors**. Evidence: `portable-moon-map.jpg`, `portable-cockpit-motion.jpg`.

Static inspection found **15,181,576 bytes**, **21 unique embedded base64 JPEG payloads** and one SVG favicon, **zero external script tags**, **zero stylesheet links** and **zero unembedded `/assets/` runtime paths**. This supports self-contained core assets; Online Earth remains a separately labeled internet mode.

Direct `file:` navigation was rejected by the browser tool's URL security policy, which permits HTTP/HTTPS only and forbids workarounds. No bypass was attempted. Therefore direct-file Chrome execution and a network-disabled offline run are **not claimed**. The passing HTTP test exercised the exact packaged HTML; it is not a direct-file compatibility test. Safari belongs to the integration lead's final gate.

The final production tab contained only generic asynchronous extension message-channel warnings without a game stack; no confirmed game exception or Three/WebGL error was seen. All reviewer-created Chrome tabs were closed and viewport overrides reset. No frame-rate benchmark or physical-mobile-device test was performed.

| Acceptance | Status |
| --- | --- |
| Typed-slot builder, dimension changes, save/load and shared flight vehicle | Passed: edited, saved, reloaded and flew the same 3.55 m capsule design |
| Four lunar-site planner choices and honest rehearsal labeling | Passed through all four UI choices; all four flown numerically, Taurus–Littrow flown in the browser |
| Actual 3 s rollout, 5 s countdown, powered first 100 m and handover | Exact sequence numerically tested; browser sequence/locking/handover and real fuel use observed |
| Manual staging and physical bound Earth orbit | Passed, core release T+02:23 and 151 × 232 km orbit |
| Departure plan, finite-fuel burn, manual upper release and continuous Moon approach | Passed through all displayed phases and manual upper release |
| Same-craft lunar touchdown and crew/flag finale | Passed, 0.50 / 0.08 m/s contact; astronaut and text flag observed |
| Checkpoint restore pauses, releases controls and preserves physical state | Passed on the flown Moon coast state; zero engine ceiling on restore |
| Direct mode switches including manual docking | Passed workshop → integrated mission, final manual docking → integrated saved flight, and portable direct docking entry |
| Moon/Europa terminal assist and near-ground effects | Both assistants passed numerical torque/fuel tests; lead observed actual Europa assist and dust; legacy Moon assist not independently UI-flown in this review |
| Desktop / 390 px reachable commands and usable telemetry | Passed integrated planner/descent and final docking/cockpit at 390 px; no physical mobile-device claim |
| Portable packaged assets and browser console | Passed exact packaged HTML over HTTP and static embedding inspection; direct-file/network-disabled browser testing not claimed |
| Safari compatibility | Lead verified regular and final portable HTTP builds: WebGL, cockpit selection, actual W/Right motion and safe pause; no full Safari Moon campaign claimed |

The independent Chrome/physics review is complete, with no remaining confirmed gameplay blocker. A minor compact legacy assembly-heading clipping issue was sent to the integration lead with `portable-moon-map.jpg`; the typed workshop, planner and flight controls were unaffected. The lead owns the remaining Safari/clean-room release gate and any final copy/CSS-only amendments.


## Integration lead: final amendments and reproducibility

The numerical solver stayed unchanged after the complete mission/capture runs.
Final UI refinements were tested separately, not represented as another complete
unassisted campaign.

- The compact legacy heading is now **Vehicle setup.**, which fits its column.
- The user-reported ultrawide cockpit distortion is corrected: the interior
  frame and 6:1 LCD scale separately. The readout is uniformly scaled and capped
  at 100 CSS px high (main digits approximately 24 px). Actual 1280×800 and
  3440×1440 IAB views were inspected; final normal-view evidence is
  `outputs/v0.4.0/cockpit-final.jpg`, with the wide regression in
  `cockpit-ultrawide-fixed.jpg`.
- The current author page uses **Микита Борисов / Created by Mykyta Borisov** and
  the current v3 portrait without the retired SH patch. Visible generation
  captions and repeated biography were removed. Desktop and 390 px layouts,
  image loading and Back to game were checked. Provenance stays in asset credits.
- The separate [interaction audit](INTERACTION-AUDIT-V04.md) covers semantic
  button families, 44 px touch targets, spacing and 390×844 / 844×390 layouts.
  Integrated manual pitch and Cut engine were operated; pause released held
  pointer inputs. Online Earth yaw and legacy ascent pitch use the existing
  ordinary control path, rather than separate physics.
- In the lead's 390 px IAB test, the Fine RCS toggle changed state and a 1 s held
  Approach produced +0.01 m/s closing rate; release left zero firing buttons.
  A follow-up found the old canvas scrolled offscreen when reaching the pad.
  The mobile docking canvas is now sticky: an actual 800 ms Approach test showed
  +0.06 m/s, with the canvas at y=0..320 and touch controls at y=323..519 inside
  the same 390×844 viewport. Both were visible and no input remained held.
  Evidence: `outputs/v0.4.0/mobile-docking-touch.jpg`.
- Native Safari rendered the regular web game and exact portable HTML over HTTP.
  In the final packaged cockpit, W changed range to 69.9 m / closing +0.07 m/s,
  with 319.8 kg RCS remaining; the game then paused and released controls. An
  earlier Right input visibly changed yaw. This is a WebKit smoke test, not a
  full Safari launch-to-Moon or manual-capture claim. Native screenshots stay
  local because browser chrome includes unrelated user tabs.
- A new directory without developer history or modules installed all pinned
  dependencies with `npm ci --offline`. Its independent test run passed **86/86**.
  Rebuilding the final source produced **all 31 dist files byte-for-byte identical**
  to the release build, including HTML, textures and notices. Records are in
  `work/clean-room-v04/`; no developer home path or private service was required.
- Final portable HTML: **15,603,352 bytes**, **22 unique embedded JPEGs** (including
  the author portrait), no external script/stylesheet references or unembedded
  image paths. SHA-256:
  `3ffea1704642acc4b40f3f0f44b1e43c40f885c0ef46621da68ec4dc9d7d55af`.

A real iPhone/Android GPU, touch latency, suspend/resume and a full physical-phone
manual campaign remain unverified. Main legacy scene inspection has drag but no
pinch zoom; workshop/atlas use OrbitControls pinch. Phone play is a testable
candidate with touch controls, not a measured mobile-performance certification.
