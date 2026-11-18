# Flight Deck v0.5 verification

15 November 2026. Game author: **Mykyta Borisov**. Baseline: v0.4.4 (`b772085`).

The redesign changes interface architecture and presentation. The numerical
flight, landing, relative-motion, fuel and checkpoint solvers remain unchanged.
The new journey and flight-log helpers read confirmed physical state.

## Automated checks

- `npm test`: **99 passed**, zero failures. Includes numerical flight and
  checkpoint regression coverage, ten mission-journey/retained-budget tests and
  three local milestone persistence tests.
- `npm run build`: passes; bundled web game and self-contained
  `dist/Kineti-Core.html` include the image set and third-party notices.
- `git diff --check`: passes.
- Vite reports the existing large single JavaScript bundle. Dynamic chunks are
  intentionally not introduced into the portable build. No measured phone FPS
  or memory claim is made.

## Browser observations

These are real UI interactions in a Chromium browser using viewport overrides,
not physical iPhone or Android tests. Only the scenarios below are claimed.

| Surface | Observed behavior |
| --- | --- |
| Home, 390 × 844 | One primary Moon action; separate Practice and Explore; persistent historical milestones; guide in footer. |
| Workshop, 390 × 844 | Hardware → nose-fairing selection → compatible attachment → readiness → Plan flight. Mass, attachment count and planner summary update. |
| Docking, 320 × 740, 390 × 844 and 844 × 390 | Scene, three readings, mounted cameras and held controls fit together. Cockpit has bounded instrument type. A held Approach command produces actual closing velocity. Horizontal scene measures 544 × 226 px. |
| Camera tools | Inspection clears mounted-camera selection, has its own label/reset and leaves flight paused. |
| Landing selection | Fourteen worlds; Europa selection starts the correct exercise. Selecting Titan then Cancel preserves the existing paused Europa flight and its 800 m altitude. |
| Landing, 844 × 390 | Scene measures **544 × 192 px**, command column 300 px; no horizontal document overflow. Previous stacked layout left a 74 px scene. |
| Moon landing assist | Actual safe contact: **0.25 m/s vertical**, **0.04 m/s lateral**, **828.9 kg propellant remaining**. Debrief and a physical milestone appear. This is separate local practice. |
| Failed landing | Cutting the Europa engine produces actual unsafe contact at **47.39 m/s** and an off-pad failure. Debrief explains the physical limits. |
| Retry | Restore returns to 800 m on Europa, paused, with engine power zero and assist off. No silent thrust or automatic resume. |
| Atlas | Jupiter → Europa, Focus, zoom and Info work; playable status explicitly says transfer skipped. Close-focus label decluttering was recaptured after visual review. |
| Online Earth | Location loads, local flight starts, Info pauses and closing retains pause. Provider terrain loading can hold flight while preserving state. Final phone tool captions and both touch rows sit above the expanded provider attribution. |
| Moon expedition | Completed the actual Earth-to-Moon route through visible controls: rollout, ascent, both manual stage releases, departure, coasts, capture, lunar orbit and touchdown. Contact: **0.5 m/s vertical, 0.08 m/s lateral**. KC flag ceremony works; the completed expedition is saved in the local flight log. |
| Mission camera/tools | Inspection, return to mounted camera and explicit Resume work. Requested 50,000× coast is truthfully shown as an applied 5,000× near the Moon. |
| Guide and author | Contextual four-tab guide, optional sources, site menu and Mykyta's biography are reachable. |

Screenshots from the verification are in the local `outputs/v0.5.0/qa/` folder;
selected final interface captures are included in `docs/media/v05/`.

## Native packages and remaining acceptance

Windows: new v0.5.0 NSIS installer, all 35 bundled web files and author notice,
KC icon, executable version and Mykyta metadata verified. Unsigned; no Windows
installation/runtime acceptance was performed.

Android: final web payload was independently checked file by file against the
Windows ASAR. The unchanged v0.4.4 compiled native shell was reused, its binary
manifest updated to version 0.5.0/code 500, aligned and re-signed. Official
`aapt`, `zipalign` and `apksigner` checks pass; v2/v3 signatures and the original
development certificate are preserved. Evicted Gradle cache files prevented a
fresh native compilation. This build method is recorded rather than presented
as a successful Gradle rebuild.

Two attempts to access the native Safari window timed out. The Safari v0.5.0
smoke/full-flight check therefore remains **unverified**, not passed.

## Scope and remaining device acceptance

Real iPhone Safari and Android installation, sustained GPU/memory performance,
multi-finger precision flight and a complete manual phone campaign need device
acceptance. Browser resizing verifies layout, not those hardware properties.
Keyboard, touch and camera behavior are checked without calling the optional
developer time/state hooks to manufacture a successful mission.

The [source audit](UX-AUDIT-V05.md) records baseline findings and ownership;
the [design language](DESIGN.md) and project skill preserve the new hierarchy.

Portrait ceremony framing remains an area for visual refinement: the crew and
flag can sit low in the narrow camera frame. The complete mission and ceremony
trigger work; this release does not claim every cinematic shot is final.
