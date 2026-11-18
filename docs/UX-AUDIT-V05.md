# Kinetic Core — v0.5 UX architecture audit

15 November 2026. Baseline: v0.4.4, source commit `b772085`, before the v0.5 interface changes. Sole game author: **Mykyta Borisov**. Approved identity: **Kinetic Core / KC**.

This is a source-based design critique and implementation brief. The lead agent owns live browser review. The reported 390 px screenshot is contextual evidence supplied by the lead; this audit did not independently capture a browser, run a phone mission or measure device performance. Findings below distinguish source facts from proposed acceptance criteria. Later source line numbers may move during implementation; named functions and selectors identify the baseline evidence.

## Overall impression

The sunlit craft, black foundation, actual flight instruments and physical outcomes are the strongest parts of the game. The interface currently makes the player negotiate several overlapping applications before reaching them. The first useful redesign is structural: one scene, one current mission identity, one honest phase and one next action. Circular translucent tools should support that structure rather than become another toolbar.

The intended first experience is the continuous Earth–Moon route. The current landing screen instead opens the older Earth-launch builder; its four-step header presents separate exercises as consecutive campaign stages. The guide recommends a different route through Modes and the workshop. A new player must understand the distinction without reading the guide first.

## Priority findings

| ID | Priority | Baseline evidence and effect | Concrete action |
| --- | --- | --- | --- |
| U01 | P0 | `main.js` initial `state`, initial assembly HTML and `renderCommand()` open the legacy Earth-launch configuration. The guide's first mission starts elsewhere: Modes → Rocket workshop → Lunar demonstrator → Start Flight → Moon. The primary screen does not teach the primary journey. | Make the first visible primary action **Start Moon mission** using the existing useful demonstrator. Keep **Customize vehicle** and **Practice** available in the mission selector. Do not silently begin flight on page load. |
| U02 | P0 | `main.js:66`, `renderPhase()` and the final `for (const nav…)` handler present assembly → ascent → docking → surface as progress, then make each progress label directly restart a scenario. Docking and local landings are separate exercises; this is neither a route map nor trustworthy completion history. | Replace it with non-destructive current-mission milestones driven by physical state. Route navigation belongs in the mission selector. Never label skipped stages complete. |
| U03 | P0 | `styles.css` uses a 65dvh/minimum-420px phone scene below header, progress and wrapped `.navigation-tools`; `.command-deck` follows it in document flow. Flight controls can fall below the fold. This matches the lead's reported 390 px screenshot. | Bound the active flight to `100dvh`; pin its essential command area inside the safe viewport. Put configuration and detailed instruments in drawers. The player must see the craft and operate it simultaneously. |
| U04 | P0 | `.landing-director` in `solar-view.css` moves to bottom 45px on phones; `.descent-hud` in `styles.css` is at bottom 48px. The guidance card and the altitude/speed/offset strip occupy the same region. | Use one reserved HUD band. Put a short warning above three aligned live values. Move stopping-distance explanation and touchdown limits into expanded flight details. |
| U05 | P0 | `mission-control.js` places the next-maneuver hint in `.mc-sidebar`, while `mission-panel.css` hides that sidebar at phone widths and short landscape sizes. Stage-ready auto-pause and departure planning require a player decision that is not persistently explained beside the action. | Put **Now / Next** in the pinned command rail for every phase, including while paused. Keep the corresponding primary action beside it. Telemetry holds the full log and resource ledger. |
| U06 | P0 | The final `main.js` progress handler changes/reset scenarios immediately; base global `keydown` and mission-control `keydown` exempt inputs/selects/textareas but not focused buttons. Space on a button can be treated as stage/cut instead of normal button activation. The progress `<li role=button>` supports Enter but not Space. | Remove action semantics from progress. Use native buttons for actions. Flight shortcuts must ignore interactive element targets, except dedicated held-flight controls with explicit semantics. Preserve release on keyup/pointer cancellation. |
| U07 | P1 | Camera behavior appears under **Change view**, **Descent camera**, **External camera**, **360° view**, **Reset camera**, **Orbit / trajectory view**, a separate docking camera row, atlas focus and Earth reset. In mission control **360° view** actually calls `resetOrbit()`. Toggle text often describes the next view rather than the selected view. | Provide one **Camera** tool with explicit current selection: **External**, **Descent**, **Docking**, **Cockpit**, **Trajectory**, limited to supported phases. Keep **Reset view** separate inside it. Do not imply cameras steer the vehicle. |
| U08 | P1 | Destination selection is spread between the assembly destination dialog, `navigation.js` Flight map, `solar-view.js` Solar System and mission-control planner. Some actions mutate `state.destination` immediately, some inspect, and some start a separate standard-lander rehearsal. | Use **Atlas** for exploration/eligible destination choice and **Map** for current live state. Clearly distinguish **Set practice destination**, **Inspect world**, and **Start local rehearsal**. A selected world must not imply a simulated transfer. |
| U09 | P1 | The workshop stacks header, readiness/presets, scene, palette, attachment list, dimensions, engineering and file controls on phones. Choosing hardware scrolls back to the scene; inspecting dimensions requires finding the distant inspector. | Retain explicit typed-slot placement and accessible slot list. Use one bottom sheet with **Parts / Selected part / Readiness**; keep scene and selection visible. Offer files in **Vehicle → Save / Load / Import / Export**. |
| U10 | P1 | Online Earth has a wrapping/scrolling location toolbar, header, long footer, status box, five-reading panel, coordinates and ten touch controls over one map. Its planning controls remain space-consuming while flying. | Split location setup from active local flight. Collapse site editing after launch; persist AGL, vertical speed, lateral speed, fuel and compact touch control clusters. Preserve loading/error/required-map-data states. |
| U11 | P1 | Only rollout has systematic top/left/right/bottom safe-area treatment; `index.html` does not request `viewport-fit=cover`. Other full-screen surfaces depend on fixed pixel offsets and some support only bottom safe-area padding. | Use shared safe-area variables and `viewport-fit=cover`; apply them to every full-screen surface, tool dock, action footer, close button and drawer. Verify notch/home-indicator areas in both orientations. |
| U12 | P1 | `scene.js` main renderer tracks one drag and uses wheel-only zoom. There is no pinch distance handler or visible zoom pair in the main game. The canvas has `touch-action:none`. | Add reachable **Zoom in / Zoom out / Reset** controls. Document actual gestures per renderer. Pinch is an optional later improvement and must not be claimed until implemented and checked. |
| U13 | P1 | Several surfaces are independent dialogs/sections with separate current-mode and focus restoration logic. Solar close attempts to focus `.navigation-tools .primary-button`, which is now a hidden legacy launcher. Exploration entry can leave a stale mode label after return. | Restore focus to the actual visible invoking control; derive current mode from the active surface. Native dialogs or equivalent explicit focus containment should cover atlas and Online Earth as well as other tools. |
| U14 | P2 | Much of the interface repeats phase, mode, instructions and units across header, scene, command deck, guide, sidebars and footer. Tiny 8–11px prose is used to fit the accumulated copy. | Remove duplicate visible explanations. Keep one sentence of immediate instruction and three decisive readings; put detailed controls/model evidence behind **Help** and **Telemetry**. |

P0 means necessary for a coherent first play and active phone control. P1 follows in the same redesign where practical. P2 is refinement after the structure works.

## Information architecture

The shell should use these stable terms everywhere:

| Control | Meaning | Contents / behavior |
| --- | --- | --- |
| **Mission** or the existing clearly labelled **Modes** | Choose what to do | Moon mission; Workshop; Practice; Explore. Always show current activity. Opening pauses all active simulation/input owners. Closing leaves flight paused until Resume. |
| **Camera** | Change presentation only | Phase-supported named views, selected state, Reset view, zoom controls. Neither a mode switch nor an assist. |
| **Map** | Understand this flight | Current physical spacecraft/target/velocity and relevant projection. Label schematic context and missing axes. Map must not become a second mission-launch menu. |
| **Telemetry** | Inspect flight evidence | Resource readings, stage state, logs, checkpoint save/restore and model details. Critical three readings remain on the scene. |
| **Help** | Learn this maneuver | Current-control summary first; full guide and model/credits below. |
| **Menu** | Project information | About the author and credits; return to the current paused view. Do not duplicate every mission entry here. |

Within mission selection, the recommended first action is the existing Moon route. Practice groups Earth launch, Manual docking and Surface landing; Explore groups Solar System atlas and Online Earth. The workshop remains available directly. This is a display grouping of existing capabilities, not a new campaign system.

For saved state, expose **Resume saved Moon mission** only when a trusted checkpoint exists; identify its phase and local-device scope. A base exercise checkpoint and an integrated mission checkpoint are different stores today. Do not make one undifferentiated Restore promise. An invalid/unavailable checkpoint must retain the previous safe state and give a useful reason.

### First useful play

1. See the prepared craft, **Moon mission**, a short route (**Earth launch → Lunar transfer → Touchdown**) and **Start Moon mission**.
2. If preparation is still needed, the same action opens the existing planner. Show destination, approach, craft readiness, and **Launch mission** together. Keep model assumptions under expandable evidence.
3. Let the player choose **Customize vehicle** without losing the path back to mission planning.
4. Start rollout/countdown, then label the actual control handover. Explain manual stage release at the point it becomes relevant.
5. After touchdown show contact speeds/fuel and **Retry from checkpoint** or **Back to mission**. Docking remains an explicitly separate practice opportunity.

Do not require a tutorial carousel, account, new unlock system, analytics or fake progress percentage.

## Phase and next-action contract

The UI consumes existing simulation phase and telemetry. It does not advance a mission or declare completion itself. These are proposed display labels and actions, mapped to baseline state.

| Existing state / condition | Display phase | Persistent next-action cue | Primary action | Essential scene readings |
| --- | --- | --- | --- | --- |
| Prepared demonstrator / valid design | Mission preparation | Ready for the Moon route; choose approach or customize | Start Moon mission / Launch mission | Wet mass, ideal Δv, readiness summary |
| Invalid design / pending placement | Vehicle preparation | Name the first blocking requirement | Fix highlighted hardware / Place component | Relevant readiness error; keep remaining errors expandable |
| `rollout` (integrated) | Rollout | Transport to the launchpad; flight has not started | Skip to countdown (optional) | Phase; elapsed/sequence context without false flight percentage |
| `countdown` | Ignition sequence | Controls hand over above 100 m | Watch countdown; Pause remains available | Countdown; locked-control explanation |
| `launch`, `!handedOver` | Earth ascent · Director | Flight director controls the first 100 m | No fake manual action | Altitude, vertical speed, active-stage fuel |
| `launch`, `handedOver`, `!stageReady` | Earth ascent | Guidance steers; manage engine ceiling | Continue ascent; show engine control | Altitude, speed/vertical speed, active-stage fuel |
| `stageReady`, attached releasable stage | Stage depleted · Paused | Separate the depleted stage to continue | Separate stage | Stage name, fuel, actual pause state |
| `orbit`, core still attached / resources absent | Earth orbit | Release the attached core before planning departure | Separate core stage | Confirmed apsides, fuel, attached stage |
| `orbit`, departure can be planned | Earth orbit | Plan a departure to the moving Moon | Plan lunar departure | Apsides, remaining fuel/Δv, reference body |
| `window` | Waiting for departure window | Coast with engines off; increase time warp if desired | Time warp control, not a fabricated mission advance | Time, reference body, plan/window information actually supplied |
| `departure`, upper propellant available | Lunar departure burn | Powered guidance burns toward the transfer | Engine ceiling / Guidance | Fuel, Δv, speed; show effective warp |
| `departure`, upper stage depleted and attached | Upper stage depleted · Paused | Release upper stage to use spacecraft engine | Separate upper stage | Stage, fuel, pause state |
| `coast` | Earth–Moon coast | Coasting toward the Moon; engines off | Time warp | Distance to Moon, fuel, mission time |
| `lunar-approach` | Lunar approach | Guidance targets capture approach | Guidance / engine ceiling | Lunar altitude, vertical/horizontal speed, fuel |
| `lunar-coast` | Ballistic lunar approach | Engines off; approaching capture burn | Time warp | Lunar altitude, speed, fuel |
| `capture` | Lunar capture burn | Reduce speed into a bound lunar orbit | Guidance / engine ceiling | Lunar altitude, speed, fuel |
| `lunar-orbit` | Lunar orbit | Coast toward the selected landing approach | Time warp | Altitude, fuel, selected approach |
| `descent` / `landing` | Powered descent / Final descent | One actionable physical warning, then aim for safe contact | Engine ceiling; explicit manual pitch when guidance off | Altitude, vertical speed, pad offset; lateral speed/fuel readily accessible |
| `landed` | Touchdown confirmed | Show actual contact evidence | View scene / Retry checkpoint / Back to mission | Contact vertical/lateral speeds, fuel; preserve ceremony visibility |
| `failed` | Flight ended | Explain the failed physical condition | Restore checkpoint | Recorded failure/contact evidence |
| Restored integrated checkpoint | Restored · Paused | Engine ceiling is zero. Set power before Resume. | Resume mission after power decision | Restored phase, ceiling, fuel |

The header milestone sequence for the integrated route can group phases as **Launch / Transfer / Lunar approach / Touchdown**. Completion must derive from actual reached states, with an explicit active phase. A detailed phase list can be expanded. Do not compute “63% mission complete” from time, phase index or distance. A local rehearsal shows **Local descent · Transfer skipped**; docking shows **Terminal docking practice · Rendezvous skipped**. Neither inherits checked campaign milestones.

The time-warp control should show the **effective** warp that the existing safety clamp applies, or communicate the cap beside the requested value. A selected 50,000× while the physical step is capped at 20× is otherwise confusing. Any estimated time displayed must come from an actual plan calculation and be labelled as an estimate.

## Screen inventory and redesign decisions

| Surface / source | Current decision supported | v0.5 composition | Preserve |
| --- | --- | --- | --- |
| Main assembly — `main.js`, `styles.css` | Configure legacy capsule/service/two stages; select a training destination | Moon mission entry takes the front seat; existing Earth exercise configuration stays in Practice or a vehicle sheet. One pinned next action and large craft. | Performance calculations, fictional-hardware disclosure, existing configuration contract |
| Integrated planner — `mission-control.js`, `mission-panel.css` | Choose existing route/rehearsal and approach for custom craft | Compact destination/approach selector with visible readiness and one start action. Separate Moon route from non-Moon local rehearsals in wording. Model evidence expandable. | Same design, site choices, validation and checkpoint restore |
| Integrated active mission | Stage, plan departure, manage guidance/ceiling and coasts | Scene-first HUD; current phase and next command visible; phase-dependent three readings; a single command dock; Map/Telemetry/Camera tools | Physical handover, auto-pause at depletion, finite burns, existing phase transitions |
| Earth launch exercise | Launch/stage a configured vehicle, then optionally enter separate docking scenario | Name **Earth launch practice**. End with true orbit result. If offered, label the next action **Start separate docking practice**. | Existing orbit check and manual staging |
| Manual docking | Translate/rotate/brake into safe soft capture | Range, closing rate, lateral offset/attitude readily available. Camera in one popover. Touch translation/rotation pages with persistent brake and fine state; large reachable held buttons. | Actual camera quaternion, no passive damping, powered attitude/braking and contact limits |
| Surface landing | Control a standard training lander at selected world | One HUD band; one short directive; power slider, tilt pair, cut; distinguish **Landing assist** from **Upright hold** in both state and label. Show paused preparation until ready. | Standard-lander identity, finite fuel, game safety limits, local gravity, rehearsal boundary |
| Mode hub — `mode-hub.js/css` | Choose one of seven existing modes | Group Moon / Workshop / Practice / Explore, short labels and one-line boundary. Current activity clear in text and semantics, including mobile. | Native modal keyboard guard, pause-on-open, explicit selection |
| Workshop — `rocket-workshop.js/css` | Select component, place at compatible point, inspect dimensions and readiness | Scene remains visible; a shallow parts/inspector sheet; selected/placing states explicit; primary **Plan mission** can clarify existing Start Flight behavior. Secondary files in one menu. | Typed slots, on-scene markers plus accessible list, shared design/geometry/performance, Undo, import validation |
| Flight map — `navigation.js` | Currently combines catalog selection and live map | Rename/use **Map** for current maneuver. Keep relative position/velocity projection with readable units; move destination catalog selection to Atlas flow. | Actual local positions and warning that docking Y is absent from X/Z projection |
| Atlas / destination facts — `solar-view.js/css`, destination dialog | Inspect catalog, identify playable/survey-only body | System/body controls in one compact sheet; selected target and **Inspect / Practice here** actions explicit. Available-landing status before a disabled action; details/evidence expandable. | Credited NASA/JPL maps, compressed-spacing disclaimer, catalog snapshot and survey-only truth |
| Europa evidence — `europa-guide.js/css` | Inspect image mosaic, distinguish map from terrain | Evidence detail under Atlas/world information. Keep image first, image-quality/zoom controls reachable, factual limitations and sources under expandable sections. | USGS/NASA provenance, variable coverage and non-elevation-map disclaimer |
| Online Earth — `earth-online.js/css` | Choose real location, wait for required tiles, fly local VTOL | Planning sheet for location; flight view collapses planning tools. Status and retry remain visible. Short flight controls/hints and legal attribution stay accessible. | Data-pending hold, contact/fuel rules, internet requirement, map credits, independent local-flight status |
| Manual rollout — `rollout.js/css` | Drive and physically park crawler, then confirm | Same shared shell; distance/speed/heading as three readings; camera/pause tools; steer/forward/reverse/brake cluster; confirm enabled only at actual limits. | 2 m / ±4° / ≤0.08m/s conditions, travel requirement, kinematic-model disclosure |
| Integrated rollout | Watch transport cinematic before real mission | Preserve visible **Rollout · cinematic** and optional skip. Do not substitute manual-rollout achievement or reuse its “confirmed parked” progress. | Existing presentation-time separation and 5 s countdown |
| Guide — main `guide-dialog` | Learn first Moon flight, practice controls and model | Current maneuver tab/section first, **First Moon mission** next, **All controls**, **Model & credits** expandable. Keep the recommended start reachable directly outside guide. | Complete detailed instructions and honest simulation/model limitations |
| Author/menu — `site-menu.js/css` | Learn creator and return | Retain quiet project page, full portrait, exact name and sole-author line. Use the same safe header/Back control. No game telemetry here. | Current approved biography, age/country, image provenance in technical credits, no visible AI production caption |
| Pause, outcomes and errors | Stop safely, understand consequence and retry | One overlay at a time. Pause gives Resume plus current next action. Failure gives reason plus restore. Success keeps the physical event visible. WebGL/storage/map failures keep a clear recovery route. | Input release, trusted checkpoint reconstruction, actual event-driven outcomes |

## Broadcast HUD design

Use the project's vacuum/carbon/ceramic/silver palette and system typography. The visual reference is a restrained flight broadcast: black scene, sharp white numbers, light rules and a small number of round translucent tools. Do not borrow another brand's logo, type treatment, decorative telemetry or livestream claims. “Live” may only mean the simulation is actually running; Paused and Waiting for map data must be equally clear.

Proposed tool treatment: 44–48px circular buttons, translucent neutral-black background, thin neutral border, monochrome icon, visible focus ring, and an accessible name. Label the Camera/Map/Telemetry selections in the opened surface; for first discovery, use short visible tool labels or a compact labelled rail. A tooltip alone does not teach a phone user an unknown icon. The main mission action stays unmistakably white and text-labelled. Sliders, form fields, component rows and held control pads retain their useful shapes rather than all becoming circles.

Readings use tabular numerals and stable widths. Use 24–32px live values on phones where the band allows; 11–12px labels can be short, but actionable instructions and control text should generally stay 12–14px. Keep white text over an adequately opaque black scrim when scenery is bright. This source audit did not measure rendered contrast over every scene, so contrast remains a browser acceptance item.

Primary visible copy budget during flight: current mode; actual phase/pause state; one next-action sentence; three decisive readings; one primary phase action; necessary manual controls/assist states. All other copy earns space through expansion. A warning can temporarily replace the normal next-action sentence, not cover the measurements.

## Phone and short-screen layout contract

Use one viewport layout system instead of accumulating late CSS overrides. Shared dimensions should account for `env(safe-area-inset-top/right/bottom/left)`, `100dvh`, bounded flex/grid children with `min-height:0`, and scroll ownership. Requested dimensions below are design targets, not measured results.

| Region | Portrait, e.g. 390 × 844 | Landscape, e.g. 844 × 390 |
| --- | --- | --- |
| Header | Single 52–56px row plus top safe area. KC + short mission name; one Mission/Mode entry; Pause/Menu. No wrapped second row of tools. | 44–48px plus safe areas. Short title; mission/phase can share the row. Protect left/right notch insets. |
| Phase / next action | One 40–52px band, at most two concise lines. Current milestone can open details; does not restart flight. | One compact 28–36px band or in-scene plate. Hide duplicated phase titles. |
| Scene | Flexible remaining height. Target at least half the usable portrait viewport with active commands visible; no forced 65dvh pushing controls away. | Preserve roughly 200px or more where possible; do not stack all portrait tools across the center. Use side-edge tools and compact command layout. |
| Essential readings | Three-value reserved strip within scene, avoiding target/craft and command area. | Short horizontal strip near a safe scene edge; labels and numbers remain distinct. |
| Tools | One small row or edge dock. Open one drawer/popover at a time. Do not cover the landing target or reserve another full-width toolbar above the scene. | Edge dock inside safe left/right fields; Camera and Map open compact panels. |
| Active commands | Bottom command area inside safe viewport; 44px minimum controls and a 44px slider hit area. Phase-dependent controls, not every future action at once. | Compact two-column layout or left/right held pads. Brake/cut always reachable; retain enough open scene to judge motion. |
| More detail | Bottom sheet with bounded scroll; close remains fixed. Opening releases inputs/pauses according to shared policy. | Side sheet or full-height details with fixed close; avoid fixed `top:115px;bottom:230px` arithmetic. |
| Workshop | Scene plus one tabbed editor sheet; keyboard-open numeric edits can scroll locally. Start/Plan action remains in bounded header/footer. | Scene beside parts/inspector sheet; avoid stacking a tall palette above/below the only view. |
| Guide/author | Independent document scroll, stable Back/Close, readable content, bottom safe inset. | Same; avoid forcing document pages into flight-sized controls. |

At 320px width, 200% text zoom or a short virtual-keyboard viewport, prefer a bounded local scroll region over clipped controls or shrinking text below readability. Never impose a minimum application height larger than the active viewport without a deliberate scroll/recovery route. Landscape support is part of acceptance, not a rotate-device workaround.

## Input, focus and assist semantics

- Opening a mode selector, editor, guide, map or menu releases all held keyboard/touch inputs. Keep the established paused return policy explicit and consistent. Do not resume automatically just because a drawer closed while the player is reading.
- Escape closes the topmost open tool; with no tool, it pauses/resumes only the active simulation. One handler should win. Native modal behavior must not accidentally pause a covered flight twice.
- Buttons receive normal Enter/Space activation. Global flight keys must ignore buttons, links, summaries and editing fields unless the target is an explicit held-flight pad. A held pad needs a release path for keyup, blur, lost pointer capture, pointercancel and visibility change.
- Keep pointer ownership per pointer for multiple simultaneous touch commands. Main `bindHold()` and mission turn buttons use a Set keyed by command, while rollout tracks pointers; validate release behavior when two fingers touch/release the same command and when pitch plus throttle overlap. This is a source-level risk, not a newly observed stuck-input failure.
- Keep camera drag independent from held thrust pads. The main scene's single drag implementation should not consume an attempted two-finger gesture as an unexplained camera rotation. Visible zoom buttons provide a reliable baseline.
- `Powered guidance`, `Landing assist`, `Upright hold`, `Attitude hold`, `Hover assist` and `Fine RCS` are different existing mechanisms. Each needs its own truthful name and selected/pressed state. Do not collapse them to “Autopilot.” Powered help consumes propellant and obeys existing ceilings.
- Current camera/mode selection must be available semantically and visibly. Phone CSS currently hides the mode-hub `Current` text; keep a non-color current indicator.
- Return focus to the still-visible invoker. If a mode switch removes it, focus the new screen's heading or first primary action. Never restore to hidden legacy toolbar buttons.
- Do not announce every changing flight number in a live region. Use live status for discrete phase changes, depletion, critical warnings and results; let instrument labels/values remain inspectable.

## What already works and should survive

The black optical bench, natural body colors, KC identity and white primary actions form a suitable foundation. Named docking cameras and actual quaternion-following optics support a useful real decision. Physical stage readiness, manual staging, actual orbit checks, finite propellant and honest rehearsal boundaries make progress meaningful. Typed attachment roles and the accessible attachment list make the workshop explainable without 3D precision. Existing pause/blur release, trusted restore validation and specific contact failures are valuable safeguards; redesign their presentation without weakening them.

## Acceptance evidence required from implementation

These are required checks for the new interface, **not passed tests**. Record actual screenshots/build identity and any unverified cases in the release QA document.

1. At 390 × 844, 320px width, 844 × 390 and a laptop viewport, show initial mission entry, planner, workshop, active ascent, stage-ready pause, coast, final descent, docking controls, success and failure. Measure scene/command bounds and confirm every essential command is simultaneously reachable with live readings.
2. Show every secondary surface: Modes, Camera, Map, Telemetry, Atlas, Online Earth setup/flight/error, manual rollout, author and guide. Confirm stationary Close/Back, no accidental background activation, one scroll owner per pane and correct current mode after return.
3. Use ordinary pointer and keyboard controls to start the recommended mission, stage after real depletion, plan departure, restore a checkpoint at zero ceiling and resume deliberately. The UI should explain each decision without requiring the full guide.
4. Check mobile guidance-on and guidance-off descent. Read altitude/vertical speed/offset while moving power and holding pitch. Confirm the director/warning, HUD and target do not overlap. Complete manual/control acceptance on real iOS/Android before claiming phone optimization.
5. Verify keyboard button Enter/Space activation, topmost Escape behavior, visible focus, repeated mode switching and focus return. Test held-control release on pointercancel, lost capture, blur, page hide, pause and overlay open; verify multi-touch ownership on physical hardware when available.
6. In docking, select External/Docking/Cockpit and verify selected label matches the scene, reset returns predictably, and camera changes do not alter craft attitude/position. Zoom controls must work without a mouse wheel.
7. Verify progress with a direct practice start and a restored checkpoint. No launch/transfer milestone is falsely complete, and no time/distance percentage is invented. Check requested/effective time warp labelling against the existing cap.
8. Build the normal and portable playable. Run the repository's required tests for any changed logic. Test in a real browser including Safari for the final candidate; distinguish desktop device emulation, extracted portable HTTP, direct-file loading and actual phone/device checks.

No completion rate, usability-test participant, mobile FPS, full manual phone mission or Safari result is asserted by this audit. No physics modification, new destination, campaign unlock, return flight or paid integration is required to implement this architecture.

## Implementation status — source review, 15 November 2026

The implementation now opens the Missions home with the Moon expedition as its primary entry. The practice screen identifies its current exercise instead of presenting four separate modes as campaign progress. The integrated route has state-derived journey milestones, a persistent next-maneuver rail, a zero-ceiling restore explanation, and Camera/Map/Tools sheets. Practice telemetry, controls, details and the shorter field guide have dedicated bounded layouts. These are observations of the new source, not measurements of rendered usability or device performance.

The secondary-surface changes in this pass are limited to `solar-view.js/css`, `earth-online.js/css` and `rollout.js/css`:

- **Atlas:** compact system/body controls, explicit survey-only or local-landing status, Focus/zoom/Info tools, retained OrbitControls touch behavior, and technical copy folded into an information dialog. Focus returns to the visible invoker. The obsolete landing-director overlay rules were removed from this stylesheet.
- **Online Earth:** location setup is separate from active-flight chrome. Live readings sit apart from held controls; disabled flight tools are hidden during setup. Info pauses flight, and closing it requires an explicit Resume. Map loading has a retry path, and both provider attribution controls and visible source-credit links remain. Touch ownership is tracked by pointer, and focused held buttons support Enter/Space release. The provider URLs, contact model and fixed flight step are unchanged.
- **Manual rollout:** the scene is framed by a 56px safe-area header, three actual parking conditions, round Camera/Pause/Info tools and thumb controls. Info contains instructions and model boundaries. Confirm still depends on the existing distance, heading, speed and travelled-distance conditions. Focused held controls support Enter/Space and cancel safely. No geometry, solver or physical parking threshold was changed.

All three edited JavaScript modules passed `node --check`; the six edited source files passed `git diff --check`. Browser acceptance belongs to the integration lead. The final source-review follow-ups sent to that lead were consistent overlay-resume policy, top safe-area padding on the remaining main/workshop/home/author headers, and keyboard operation of the base practice held-button helper. These follow-ups must be assessed against the final source and browser evidence; this document does not claim they are passed checks.

## Final verification by the lead

The implementation pass also resolved the reported top safe areas, base
held-button Enter/Space behavior, explicit-resume policy, hidden world choice,
74 px horizontal scene, Atlas label crowding and Earth attribution overlap.
The actual continuous Moon mission and separate successful/failed local
landings were played through normal UI controls. See [the verification record](QA-V05.md)
for measured layouts, contact values, package validation and the explicit
Safari/physical-device limits. This source audit is not a hardware performance
certification.
