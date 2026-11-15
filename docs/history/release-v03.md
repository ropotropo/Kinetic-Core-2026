> Historical development record. Earlier working names, scope and test counts apply to that stage only. Read the [current version](../CURRENT-VERSION.md) for Kinetic Core v0.4.4, authored by Mykyta Borisov.

# Kinetic Core v0.3

## Playable changes

- Team/game branding is Kinetic Core. Personal attribution was removed from the game UI. The site menu opens an English Creator biography page marked Under development.
- Mercury and Mars join twelve moon descent exercises. Radii and gravity references: https://ssd.jpl.nasa.gov/planets/phys_par.html and gravitational parameters https://ssd.jpl.nasa.gov/astro_par.html. Mercury uses vacuum descent; Mars uses a simple exponential near-surface atmosphere (0.020 kg/m³ sea-level reference, 11 km scale height), not atmospheric entry or parachutes. Training hardware remains fictional.
- Landing guidance shows pad bearing, drift, descent speed and estimated full-thrust stopping distance. It is advisory, not an autopilot.
- Earth/cloud shell separation and matching tessellation reduce depth interference; procedural cloud opacity is reduced. Earth is reframed in orbital views. The static high-ascent station decoration has been removed; the station model remains in the separate terminal-approach scenario.
- Online Earth's camera-only explorer has been replaced by **Earth / free flight**: a local controllable VTOL rocket, finite fuel, terrain/footprint contact, manual landing and relaunch at geographic coordinates. See [EARTH-FLIGHT.md](../EARTH-FLIGHT.md) for controls, sources, verification and limitations. It remains separate from the original ascent and custom workshop; it does not implement continuous orbital entry or detailed wall meshes. Internet is required and geographic data quality varies.
- A separate custom workshop adds independently sized/reordered components, save/load and JSON import/export with a 100-part validation limit. It is an engineering sandbox. Custom designs are not fed into the original two-stage flight simulation.
- A manually controlled crawler rollout precedes the original launch. Fixed-step low-speed ground handling gates launch confirmation on distance, speed and heading. It is a fictional procedural transport scenario, not a structural/suspension simulation or an accurate launch facility reconstruction.

## Verification

43 existing and added numerical/checkpoint tests passed, including descent feasibility tests across all fourteen destinations and adequate braking thrust for Mercury/Mars. Regular and portable builds were produced. Browser checked custom capsule/tank/engine assembly and changing estimates; rollout throttle moved the platform and launch confirmation was initially disabled; online NYC roads/buildings loaded and W moved the camera; site menu and biography routing were exercised. The final English biography copy replaces an earlier Russian placeholder.

No full end-to-end crawler-to-orbit mission, manual Mars touchdown, all-city coverage or Safari pass is claimed for this revision. Remaining work: launch custom workshop vehicles, shared Earth map/spacecraft physics, terrain/building contact, continuous transfers and full mission playthroughs.

## Orbital motion fix

- Orbit is an active, pausable simulation phase. The spacecraft continues coasting with its engine off; its time, position and velocity continue updating after insertion.
- Stage release sends a complete physical snapshot to the renderer. Mission time is no longer confused with wall time, and the vehicle pivot stays fixed across separation.
- Detached stages inherit inertial velocity with a fictional 2 m/s separation impulse. Independent inverse-square ballistic motion is projected into the moving camera frame. Conservative bounding-box clearance prevents visible stage/craft and stage/stage overlap; this is not full rigid-body contact, and atmospheric debris drag is not modeled.
- Orbit / trajectory view shows the actual simulated spacecraft track, enlarged detached-stage markers and an explicitly illustrative circular station reference. The follow camera rotates Earth's geography with position and time. The reference is not the real ISS orbit or a continuous rendezvous.
- 48 numerical/checkpoint/contact tests passed, including continued coast after confirmed orbit and clearance of fully contained bounds. Production and portable builds were generated. Read-only independent code review found no severe blocker. Browser verification for this fix was attempted but unavailable because the browser-control connection was closed; no visual pass or complete manual flight is claimed.

## Launch camera correction

- Trajectory inspection is now available only during confirmed orbital coast. Other phases clear its selection; a new ascent always uses the spacecraft view. Reset camera also exits trajectory inspection.
- Returning from the globe snaps the follow camera back to the vehicle. Its target follows the remaining attached hardware after separation, while the physical model pivot stays stable. The orbital globe fits narrow viewports.
- All 50 tests passed, including rejection of stale overview requests during launch. Manual browser verification completed crawler placement, countdown, liftoff, first-stage release and restoration of an upper-stage checkpoint; the remaining vehicle was visible in the follow camera. Screenshot: outputs/launch-camera-fixed.jpg (local QA artifact). A complete orbit/docking playthrough and Safari verification remain unverified for this correction.
