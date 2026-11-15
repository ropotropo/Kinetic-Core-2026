# Kinetic Core v1 motion review

Decoded frame analysis confirms the reported stutter in rollout and liftoff. Native capture already contains the pauses; export slow motion makes them more prominent. The local lunar descent has substantially better cadence.

| Segment | Class | World near-static transitions | Longest world hold | Full-game near-static transitions | Longest full-game hold |
|---|---|---:|---:|---:|---:|
| workshop | intentional-ui-interaction | 81.0% | 2.533s | 88.6% | 2.533s |
| planner | intentional-ui-interaction | 77.4% | 2.867s | 79.6% | 3.667s |
| rollout | active-flight | 73.2% | 1.000s | 84.3% | 2.067s |
| liftoff | active-flight | 80.1% | 1.567s | 84.8% | 1.900s |
| descent | active-flight | 0.9% | 0.033s | 2.9% | 0.067s |
| docking | active-flight | 52.7% | 0.400s | 71.9% | 0.733s |
| touchdown | contact-and-debrief | 14.7% | 0.100s | 23.1% | 0.167s |
| closing | intentional-static-title | 93.5% | 5.700s | 94.1% | 5.833s |

Menu and closing stillness is intentional and is a pacing issue, not direct evidence of capture drops. Active rollout/ascent holds are also present in the native source: rollout70.9% near-static transitions/1.72s longest hold; ascent36.9%/0.80s. The source is25fps, while export is30fps; neither header rate establishes smoothness.

The method decodes every frame, crops captions/borders away, area-scales to240×180 grayscale, and compares adjacent pixels. A near-duplicate requires MAE<0.03 luma(0–255) and fewer than0.1% pixels changing by at least2 luma. Hold durations use actual decoded PTS intervals. This is a visual-change metric, not an instrumented game render-fps counter. Full script, source hashes and per-frame raw metrics are retained alongside this report.

Required edit changes:
- Replace rollout and ascent with frame-accurate captures; verify decoded consecutive frames before editing.
- Use playbackRate >=1 for all gameplay. The v1 0.6x ascent worsens repetition.
- Cut workshop/world selection on observable user operations; remove multi-second idle menu dwell.
- Reduce opening/closing from12seconds combined; keep the total75–85seconds.
- Add distinct Solar System/world choice, engineering adjustment, staging and camera/RCS operations, with narration synchronized to the visible action.
- Revalidate export active-motion ranges and no black gaps after narration/music mix.

Cumulative-anchor cross-check: compare every low-motion frame to the fixed start of its run and break as soon as cumulative drift exceeds the same thresholds. This reduces v1 rollout longest hold from1.00s to0.633s and liftoff from1.567s to1.400s; local descent remains0.033s. Thus slow drift explains part of the adjacent metric, while long near-identical liftoff holds remain. This guard is included in final v2 validation.
