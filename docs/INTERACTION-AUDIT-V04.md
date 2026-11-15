# Interaction audit — v0.4

15 November 2026. Sole game author: **Mykyta Borisov**. Scope: button families,
spacing, touch reachability and an honest mobile-readiness assessment. This
supplements the physical-flight evidence in [QA-V04.md](QA-V04.md).

## Changes

- Shared **7 px** action geometry, **44 px** primary/toggle/held targets and
  **40 px** compact desktop tools. Phone actions use at least 44 px. Quiet text
  navigation, segmented views, part-selection rows and circular attachment
  markers retain distinct shapes because they serve different interactions.
- Removed 29–39 px phone overrides in workshop/header controls; improved power
  slider hit areas, consistent gaps and Online Earth toolbar scrolling.
- Added a full-width integrated flight scene with optional Telemetry on short
  landscape screens. Exposed docking touch controls in phone landscape too.
- Styled the integration lead's new ordinary-input controls: manual pitch,
  engine cut, legacy ascent pitch, Earth yaw and docking Fine RCS. The legacy
  ascent pitch pair occupies a full second row so it cannot overflow the power
  tools; its scene may shrink to preserve reachable commands on short laptops.

## Actual browser checks

The checked production build was `index-DboM9t0b.js` / `index-D7varkHM.css`.
Normal visible Chrome controls and read-only DOM measurements were used. No
state injection or developer time-step hook was used.

| View | Observed result |
| --- | --- |
| Main / 390 × 844 | Document width 390 px, no horizontal overflow; Modes, pause and burger targets all 44 px |
| Workshop / 390 × 844 | Modes, Back to game and Start Flight each 44 px; document width 390 px; controls reachable |
| Author / 390 × 844 | Correct Микита Борисов / Created by Mykyta Borisov; portrait loaded at 1024 px natural width; no visible generation caption; no horizontal overflow |
| Integrated manual rehearsal / 390 × 844 | Guidance off exposed both 44 px held-pitch buttons. Cut engine set the ceiling to 0%. A real one-second right-button hold was delivered while flight advanced to T+00:01 / 785.8 m. After pointer release and Pause, no held classes remained; angular response was not separately measured. Scene remained 390 px high. |
| Integrated manual rehearsal / 844 × 390 | Header ended at 61 px, scene retained 220 px, command footer ended exactly at 390 px; no horizontal overflow. Telemetry drawer opened normally. |
| Burger menu / 390 × 844 | Restrained anchored black menu, clear Game / About the author rows and reachable close control; no arrows or redundant portrait captions |

Evidence: `outputs/v0.4.0/interaction-audit/author-390.jpg`,
`workshop-390.jpg`, `mission-manual-390.jpg` and `mission-landscape-844.jpg`.
`control-metrics.json` exports the measured values. The paused screenshots show
control layout and release state, not a completed landing.

The browser connector disconnected during the next docking entry. This was not
an observed application exception. The remaining new Fine RCS interaction,
legacy ascent wrap, Online Earth and Solar System changes were **source-reviewed**
in this audit; the integration lead owns any subsequent browser smoke. No
additional full campaign was repeated. The final legacy-ascent CSS wrap needs
the integration lead's final build; the dimensions above refer to the earlier
checked build explicitly.

## Mobile verdict

The responsive UI and touch controls support trying the game from a phone.
Guided mission commands, the builder, menu, landing controls and docking's
translation/rotation inputs are available. Desktop keyboard remains the most
comfortable precision-control scheme. The main flight scene supports one-finger
orbiting but wheel-based zoom; its pinch zoom is not implemented. Workshop and
Solar System use OrbitControls with their own touch behavior.

A desktop viewport test is not a physical-device acceptance test. Real iOS and
Android GPU performance, thermal/memory behavior, multi-touch precision and a
complete manual phone mission remain unverified. Treat phone play as a testable
preview until Mykyta checks his device; do not label it fully optimized mobile.
