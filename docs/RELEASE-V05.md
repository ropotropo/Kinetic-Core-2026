# Kinetic Core v0.5.0 — Flight Deck

Created by **Mykyta Borisov**, the sole game author.

Flight Deck replaces the overlapping page layout with a scene-first interface.
The opening Missions screen gives the continuous Moon expedition a clear start;
separate docking, landing and Earth-launch practice are grouped below. Exploration
stays separate from physical mission progress.

## Changed experience

- One live journey and one next maneuver, driven by actual flight state. Manual
  stage release remains part of the expedition.
- Three decisive readings stay visible. Detailed telemetry, controls, sources
  and checkpoints move into optional paused sheets.
- Bounded phone flight, safe-area headers, 44 px targets and separate horizontal
  scene/control columns. No essential flight controls below the page fold.
- External chase, docking camera, cockpit and free inspection have truthful
  selected states. Round translucent tools provide map, camera, zoom and reset.
- Fourteen-world landing chooser; Cancel preserves the current paused flight.
  Landing assist, engine ceiling, tilt and engine cut are visible together.
- Workshop Hardware/Vehicle/Readiness panels, Files & presets and Plan flight
  connect the assembled craft to its actual mission plan.
- Short Moon/Docking/Landing/More guide. Completed physical milestones persist
  locally without pretending practice is a completed transfer.
- Atlas labels are decluttered. Online Earth reserves room for attribution;
  its setup, active controls and optional information are distinct.

The existing KC identity, author portrait, launch rollout, landing ceremony,
NASA/JPL asset notices and physical simulation are preserved. No repository
move or main-branch merge is included in this release.

See [verification and device limits](QA-V05.md), [the UX audit](UX-AUDIT-V05.md)
and [installation](DISTRIBUTION.md). The portable HTML remains available with
the web build and exact-commit source export.
