# Kineti Core: direction of flight

Working product direction, 15 November 2026. Sole game author: Mykyta. Andrii relays feedback and coordinates development. This implementation establishes a proposal for Mykyta to review, not a claim of his approval of every design choice.

## North Star

**Design a mission, understand the consequences of its engineering choices, and personally fly its critical moments.**

The defining experience is a chain of decisions: a heavier sample package changes the launch; a landing target changes the vehicle and sampling method; a hurried approach spends the reserve needed to return home. Beauty makes the spacecraft believable. Consistent physics makes success earned.

Our product measure is the share of first-time players who complete a critical maneuver and can explain one engineering tradeoff they made. Supporting measures: a successful launch-to-docking run, a safe manual landing, retries that improve contact speed or fuel reserve, and whether players distinguish a training handoff from a continuous flight. These are proposed measures; no analytics or player results are fabricated or collected by this build.

## Play loop

Choose a scientific objective → select a destination → design and budget the spacecraft → launch and stage → transfer and rendezvous → land → collect a sample → ascend and dock → return and debrief.

Only the implemented portions below are playable today. A destination picker does not imply that transfer, surface survival, sampling or return already exists.

| Version | Player outcome | Exit criteria | Deliberate boundary |
| --- | --- | --- | --- |
| v0.1, released | Assemble a two-stage rocket, reach a bound Earth orbit, dock manually | Fuel and mass accounting, physical orbit check, safe capture and checkpoint restore | 2D ascent; terminal docking starts as a separate scenario |
| v0.2, released | Inspect 12 moons and land a standard training lander | Local gravity, NASA maps, finite fuel and debrief | Surface exercises skip transfers, radiation and sampling |
| v0.3, Mykyta's branch | Ground rollout, custom workshop, Mercury/Mars and online Earth flight | Preserve changes through commit d495fd7 | At that stage the workshop was independent of ascent; map flight remains separate |
| v0.4, implementation stage | Fly the same custom vehicle from Earth to Moon touchdown | Typed points, saved designs actually fly, shared fuel, finite burns, manual staging, coast/capture/descent, four sites, direct modes and docking cameras | 2D patched conics, ideal engine pointing, synthetic Moon epoch, illustrative terrain; other worlds are local rehearsals |
| v1, proposed release gate | A new player completes and retries the Moon expedition, then practices docking | Completion gates below pass on a frozen reproducible build; Mykyta reviews the playable | No implied return, sample mechanics, complete Solar System transfers or installers |
| After v1: lunar return | Sample, ascend, rendezvous and return | Tool/sample mass, ascent propulsion, rendezvous targeting, reserves, entry/heat and recovery | Another coherent physics and verification stage |
| After v1: outer system | Plan a different outer-system mission | Transfer windows, propulsion, instruments and validated body hazards | Europa research does not implement human survival or ocean sampling |
| Distribution milestone | Install the tested game on a PC or Android device | Windows/macOS/Android smoke matrix, appropriate inputs, stable saves, signed packages where required | Packaging is not a replacement for mobile performance work |

Version numbers describe order, not promised delivery dates. Complete the Moon expedition before adding more long-distance routes.

## Efficient path to v1

| Priority | Gate | v0.4 evidence / remaining work |
| --- | --- | --- |
| P0 | Complete loaded-craft mission, staging and restore | Passed a full guided Chrome Moon flight with edited/saved/loaded hardware and manual staging. Actual custom Europa success/failure/restore also checked. Keep this as the regression baseline. |
| P0 | Find and operate each maneuver | Modes paths, three docking cameras, 360° inspection, full manual soft capture and readable landing assistance passed browser checks; desktop and 390 px covered. |
| P1 | Believable visuals with bounded resources | Detailed lander/cockpit, steam/dust and corrected distant Moon horizon checked. Measure performance on Mykyta's actual device before v1; no mobile GPU/FPS claim yet. |
| P1 | A first-time player completes and retries | Written first-flight steps and physical failure explanations exist. Mykyta's first-play feedback and any necessary simplification remain. |
| P0 before v1 | Compatibility and portable handover | Record Safari and extracted-copy results in QA-V04. Direct-file/offline browser coverage must be distinguished from embedded-asset checks and HTTP portable testing. |
| Sign-off | Mykyta approves the candidate | Review the versioned playable, resolve his blocking feedback, freeze source/archive/manifest and choose final distribution/submission requirements. |

Keep more destinations, renderer changes, native wrappers and the return campaign
outside this gate. Return would expand v1 materially; this plan focuses the first
release on Moon landing and a distinct docking exercise. No completion rate or
delivery date is invented. [QA-V04.md](QA-V04.md) records actual evidence; this
plan is not a passed test.

## Ownership and handover

Mykyta is the sole game author in UI, metadata and [AUTHORS.md](../AUTHORS.md).
Third-party attribution remains separate. Each reviewed candidate must be
exportable without `.git`, scratch files, private services or forgotten textures.
See [the transfer procedure](REPOSITORY-TRANSFER.md) for the clean-room check and
manifest.

## Physics contract

Use SI units, fixed steps, finite resources and observable state. Time warp changes elapsed simulation time during allowed phases; it does not remove delta-v requirements. Keep presentation coordinates separate from physical coordinates. State every scenario handoff and important approximation. Build references and numerical tests before expanding the claims of the model.

The current surface scenarios are deliberate exercises using each body's mean-radius spherical gravity. Phobos and Deimos need much lower, slower starts and limited thrust; a future operational mission also needs irregular shape, local gravity and parent-body effects. Titan's simplified drag is not an entry or parachute model. A rendered icy crust is not an implemented subsurface-ocean sampling mission.

## Design contract

The game is an optical mission instrument: true black, disciplined white type, quiet controls and detailed spacecraft under physical light. Real engineering information earns space; decorative telemetry does not. Read [DESIGN.md](DESIGN.md) and the reusable [Kineti design skill](../skills/kineti-design/SKILL.md) for the actual language. No Malibu Wired or TRD visual system is inherited.

## What to test next with Mykyta

1. Does the destination survey make a different landing feel worth trying?
2. Can a new player distinguish throttle, drift and attitude, and recover after a failed landing?
3. Does the globe and spacecraft detail support believable scale without hiding the flight instruments?
4. After one safe touchdown, is a complete Moon return mission the strongest next step?

Review through the version pull request. Keep a portable build and browser link with each completed version so feedback refers to a reproducible release.
