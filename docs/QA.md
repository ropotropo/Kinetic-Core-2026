# First-playable QA

Original game concept: Mykyta. Review dates: November 14–15, 2026 (America/Los_Angeles).

This is the independent QA record for the first playable. Pending checks are not claims of verification. The implementation owner applies fixes; the reviewer keeps implementation files unchanged.

## Scope and method

The acceptance contract is [PLAYABLE-V1.md](PLAYABLE-V1.md). Review combines an engineering audit of the simulation and save boundaries with a separate browser pass through the visible game. The browser pass follows the gstack QA workflow: inspect the interface, exercise core interactions, observe results, check errors, and reproduce any finding before recording it as confirmed.

No NASA flight certification is implied. A visibly credible scene is not evidence of physically correct motion. Physics claims must be supported by the model and deterministic tests.

## Acceptance matrix

| Area | Check | Status |
| --- | --- | --- |
| Assembly | Capsule, service module, core and upper-stage changes update the displayed vehicle and mass, delta-v and thrust-to-weight values. | Browser trade-off checks passed; numerical catalog tests passed |
| Assembly | An invalid design explains the constraint and cannot silently launch. | No invalid choice exists in the curated catalog; low-margin warning and saved-config rejection covered |
| Launch | Default guidance reaches a bound orbit with the specified periapsis through integrated motion and manual stage separation. | Passed in deterministic tests and a complete manual browser flight |
| Launch | Fuel consumption and mass flow use time in seconds; throttle changes the force; flight is independent of rendering FPS. | Numerical tests passed; browser fuel/throttle instruments observed |
| Separation | A single press performs one separation; key repeat cannot discard multiple stages. Early separation has a visible resource consequence. | Manual staging and both confirmation-cancel paths passed; repeat guard inspected |
| Handoff | The orbital result labels the next section as a terminal-docking training scenario, without claiming full phasing/rendezvous simulation. | Passed in browser |
| Docking | Manual translation and rotation use finite RCS propellant. Releasing input preserves inertia instead of imposing vacuum drag. | Passed with keyboard input and numerical tests |
| Docking | Safe capture checks position, linear velocity, orientation and angular velocity; unsafe contact produces a recoverable failure. | Safe manual capture and unsafe-contact/retry browser paths passed; threshold tests passed |
| Controls | Keyboard instructions match actual controls, focus in forms does not fire thrusters, and losing focus releases held input. | Keyboard translation/rotation passed; form/focus guards inspected; independent focus-loss run not completed |
| Pause | Pausing and restoring do not advance the simulation or retain a stuck command. | Passed in browser |
| Saves | Checkpoints are versioned, serializable and validated; corrupted/unavailable browser storage leaves a usable new-game path. | Browser save/restore and automated tests passed; malformed-log finding fixed and retested |
| Presentation | The scene, guidance, instruments and main action remain readable and reachable at desktop and narrow widths. | Desktop and 390 × 844 assembly checks passed; narrow-screen touch flight not separately played |
| Compatibility | Built static output runs without runtime external assets; Safari/WebGL path is checked separately from the primary browser pass. | Regular static and portable HTML passed in Chrome; Safari HTTP motion and direct-file startup verified by integration lead |
| Console | No unhandled application errors occur in exercised flows. | No application exception found; three generic browser message-channel errors noted below |
| Integrity | Labels distinguish simulated values, fictional module specifications, scientific models, assist modes and limitations. | Source/documentation and visible-label review passed |

## Numerical verification to inspect

- Conservation of angular momentum and orbital energy for an unpowered two-body trajectory.
- Consistent fuel accounting and meaningful mass changes after staging.
- A deterministic successful default ascent, with the engine/guidance/staging sequence recorded.
- Equivalent integrated results for different display-frame schedules.
- RCS fuel exhaustion prevents additional powered control.
- Safe and unsafe docking thresholds tested on both sides of each relevant boundary.
- Serialization preserves the state needed to resume; invalid and non-finite values are rejected.

## Evidence and findings

The browser pass used an isolated Chrome tab through `cua_repl`. The child-agent surface did not expose an in-app browser. Development checks began at `http://127.0.0.1:5173/`; the complete flight used the stable production preview at `http://127.0.0.1:5174/` to avoid development hot-reload resets. Portable-file behavior was checked at `http://127.0.0.1:5174/Kineti-Core.html`.

The reviewer did not inject flight state or call `advanceTime`. The successful approach used visible controls, keyboard burns, powered attitude hold, explicit translation braking and pauses to read the instruments.

### Browser results

- Selecting Aegis C2 plus Horizon CM changed the displayed liftoff mass from 540.4 t to 662.3 t. Adding the science payload changed it to 664.3 t and reduced the displayed ideal delta-v to 11.41 km/s.
- The initial launch-site caption failed to refresh when Wallops was selected. The integration owner corrected this before the stable preview; the final portable browser pass verified the caption changes to **Wallops Flight Facility, Virginia**. The captured configured screenshot predates that correction.
- Early fueled-stage confirmation was canceled using both **Keep flying** and **Escape**; the confirmation could be reopened and later staging remained available.
- The reviewer manually separated the core late, at T+04:17 rather than the reference burnout near T+02:34. The simulated vehicle still reached a calculated bound orbit at T+10:34, with approximately 150.0 × 4,549.0 km apsides. This differs from the reference trajectory because manual staging was deliberately delayed; it is not the tighter reference orbit.
- The upper stage was manually released. The next action explicitly loaded a separate 70 m terminal-approach scenario.
- Manual lateral and vertical burns, approach burns and counter-thrust produced soft capture at terminal T+03:27. The result reported 25.2 kg of RCS propellant used. No state injection or developer stepping was used.
- A checkpoint taken at T+00:35 restored the same mission time, 319.0 kg reserve and 70.0 m range with the simulation paused and controls released.
- A separate full-thrust unsafe approach failed at T+00:45 with 3.91 m lateral offset and 3.11 m/s closing speed. **Restore last checkpoint** returned to paused T+00:00, 70.0 m range and 320.0 kg reserve.
- With attitude hold off, actual Right-arrow and Q inputs changed yaw from −3.0° to −5.5° and roll from 2.0° to 4.9°, while consuming propellant.
- The portable build advanced normally in Chrome: a 2.5-second W burn produced T+00:02, 69.7 m range, 0.18 m/s closing speed and 319.4 kg propellant. Thus the portable package is not intrinsically frozen in the tested browser.
- After the final rebuild, the portable HTML was smoke-tested again: W and yaw inputs advanced time, changed relative motion/orientation and consumed fuel; save/restore returned paused T+00:03, 69.7 m range, 0.13 m/s closing speed and 319.5 kg reserve. The new tab had no console errors. Its screenshot is [final-portable-smoke.jpg](../outputs/qa/final-portable-smoke.jpg).
- The 390 × 844 assembly layout showed no horizontal clipping. Viewport overrides were reset and the reviewer's own Chrome tab was closed after testing.

### Safari result from the integration lead

The integration lead separately verified foreground Safari HTTP docking motion: approximately T+00:02, 69.9 m range, 0.13 m/s closing speed and 319.6 kg reserve, with the station rendered. Earlier apparent time freezes occurred while Safari was occluded/backgrounded. The standalone `file:///…/dist/Kineti-Core.html` opened its full interface and 3D scene in Safari. A complete continuous direct-file flight was **not** independently observed, so this report claims direct-file startup only, not a full Safari file-based mission.

### Console observations

No application exception or application stack trace appeared during the exercised workflows. Chrome recorded three generic errors saying that an asynchronous message listener's channel closed. These are consistent with a browser extension and were already present before the portable check; Grammarly integration was visible. They are recorded here without counting them as verified game errors. Safari behavior was being checked separately by the integration lead.

### Screenshots

- [Desktop assembly](../outputs/qa/assembly-desktop.jpg)
- [Configured vehicle](../outputs/qa/assembly-configured.jpg)
- [Narrow-screen assembly](../outputs/qa/assembly-mobile.jpg)
- [Early separation confirmation](../outputs/qa/early-separation-confirmation.jpg)
- [Core separated](../outputs/qa/core-separated.jpg)
- [Calculated orbit](../outputs/qa/orbit-confirmed.jpg)
- [Terminal scenario start](../outputs/qa/docking-start.jpg)
- [Checkpoint restored](../outputs/qa/checkpoint-restored.jpg)
- [Successful manual capture](../outputs/qa/docking-complete.jpg)
- [Portable build moving](../outputs/qa/portable-docking.jpg)
- [Unsafe-contact failure](../outputs/qa/unsafe-contact.jpg)
- [Rotational controls](../outputs/qa/rotation-controls.jpg)

### Engineering pass

- Independently reran `node --test tests/physics.test.js`: **18 passed, 0 failed**. After storage hardening, independently reran `npm test`: **23 passed, 0 failed**. The final malformed-log regression brings the suite to **24 tests**; independently reran its storage subset: **6 passed, 0 failed**.
- Reviewed the documented force, propellant, gravity, atmosphere, relative-motion and attitude models against the implementation.
- Two source-level boundary findings were raised during implementation and corrected by the physics owner: escape trajectories could otherwise satisfy altitude/apsis comparisons without being bound; the capture readiness indicator needed the same closing-speed and angular-rate checks as actual capture. Regression tests now cover these boundaries.
- The rotating station frame is explicitly subtracted from quaternion evolution. A body without inertial spin therefore does not silently follow the local orbital vertical. Attitude hold and translation brake use finite RCS propellant.
- Default guided numerical insertion is approximately T+459.22 s, with 151.8 × 206.3 km apsides. This verifies the model's reference control path; manual browser execution remains pending.
- The current curated hardware catalog contains 48 Kennedy combinations. All pass the builder's coarse design-validity threshold; the lowest-margin vehicle can still fail its guided ascent. A `valid` builder result must not be described as a guarantee of orbital success.
- Save restoration now rebuilds trusted catalog constants and docking tolerances, checks physical state/config/phase consistency, and rejects string-valued launch dynamics such as `pitchTrim`. These corrections are covered by the storage tests.
- One final malformed-save edge was reproduced and sent to the integration owner: an otherwise valid checkpoint with `log: [null]` passed validation, but the UI log renderer would dereference `entry.time`. The owner added typed log-entry validation and a regression covering null, string, incomplete, wrong-type and negative-time entries. The independent storage rerun passed. This finding is resolved.

## Final result

No confirmed blocking application defect remains in the exercised first-playable workflows. The recorded manual browser mission, numerical tests and final portable smoke passed. Full mobile touch flight, a complete continuous direct-file Safari mission, long-duration performance and hardware beyond the reviewed browser environment remain outside this verification.

## Scientific limitations to confirm in the build

- Launch is a two-dimensional model, rather than a complete three-dimensional atmospheric ascent.
- Any atmospheric model, aerodynamic coefficient and guided pitch program are approximations and should be named explicitly.
- Near-station Hill/Clohessy-Wiltshire relative dynamics apply to small separations near a circular reference orbit. The exact LVLH axis convention must be documented.
- Docking capture limits are game-defined for fictional hardware; they should not be presented as certified ISS/NASA limits.
- The scenario transition into terminal docking skips phasing, orbital-plane alignment and rendezvous transfer.
- Spacecraft structural deformation, thermal failure and docking-interface loads require additional models and are outside the first playable unless explicitly implemented.

## Primary reference for the relative-motion audit

[NASA NTRS: linearized relative-motion treatment](https://ntrs.nasa.gov/api/citations/20090013858/downloads/20090013858.pdf). This supports the domain of the near-circular, close-range approximation; it does not validate the game's implementation by itself.
