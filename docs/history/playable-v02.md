> Historical development record. Earlier working names, scope and test counts apply to that stage only. Read the [current version](../CURRENT-VERSION.md) for Kinetic Core v0.4.4, authored by Mykyta Borisov.

# v0.2: destination flight deck

Original game concept: Mykyta. This release completes a destination-survey and terminal-landing stage on top of v0.1's rocket assembly, ascent, manual staging and docking.

## Playable

- Twelve selectable moons, NASA visualization maps and parent-planet context.
- A Moon color/relief map, improved Earth cloud/atmosphere lighting and distinct icy, rocky and hazy worlds.
- A separate manual terminal-landing exercise on every selected moon: local inverse-square gravity, finite propellant, thrust/mass flow, rigid-body tilt, powered upright hold, Titan near-surface drag and resolved contact limits.
- A detailed fictional four-leg lander, external/descent cameras and a projected marker on the actual landing zone.
- Optical Bench design language, compact live descent readings, physical event effects and dismissible success/failure debriefs with actual contact data.
- Validated local checkpoints, paused descent preparation, pause on blur and release of held inputs.
- A portable HTML build containing the graphics engine and all 18 celestial images.

## Explicit limits

Landing is a training handoff, not a continuous flight from Earth to the selected moon. The standard landing vehicle is independent of the rocket assembled in the builder. Landing maps do not provide surveyed local collision terrain. Sample methods and environmental hazards are useful planning context; sampling, radiation damage, thermal survival, surface ascent and return are future mechanics.

The 2D descent assumes a local flat surveyed zone and spherical gravity magnitude from the destination's mean radius and GM. It omits parent-body/tidal terms and irregular gravity, particularly consequential at Phobos and Deimos. Those exercises use lower/slower initial conditions and a clearly disclosed low-thrust mode. Titan's exponential atmosphere is a near-surface approximation without entry, parachutes, wind or buoyancy. See [DESTINATIONS.md](../DESTINATIONS.md).

## First descent

1. Choose **Surface destination**, inspect a moon in 3D and start **Land on …**. Read the paused briefing before resuming.
2. Use W/S or the slider to set engine power. The hover-power hint is approximate: above it slows downward motion while upright, below it allows gravity to accelerate the descent. Hover power falls as fuel burns.
3. Tilt left/right with A/D, the left/right arrows or held buttons to move toward the pad. Upright hold returns the attitude toward vertical using finite propellant; it does not cancel lateral velocity. Tilt the other way to brake drift.
4. The descent camera points toward the landing zone; the external camera shows the lander. Altitude, vertical speed and pad offset remain over the view on narrow screens.
5. Touch down inside ±25 m of the center with vertical speed ≤2 m/s, lateral speed ≤1.5 m/s, tilt ≤8° and rotation ≤3°/s. These are game tolerances, not hardware qualification limits. An off-pad gentle contact fails the exercise without an invented explosion.
6. On failure, read the violated conditions and restore the checkpoint. A successful debrief preserves the actual contact speeds rather than displaying the zero velocity of a resting vehicle.

## Release direction

The next proposed stage is a coherent Moon mission with a shared vehicle/resource state and a transfer map. Read [NORTH-STAR.md](../NORTH-STAR.md) for version gates, [DESIGN.md](../DESIGN.md) for the visual language and [DISTRIBUTION.md](../DISTRIBUTION.md) for the future Windows/macOS/Android packaging plan. Native installers are not shipped in this release.
