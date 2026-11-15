# Destination catalog and terminal landing model

Original game idea: Mykyta. This catalog, numerical model and tests were prepared with AI assistance. Sources checked November 15, 2026.

## What the destination selector represents

Version 0.2 contains a curated set of **12 solid-surface moons**: the Moon, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Enceladus, Rhea, Iapetus and Triton. It is not a catalog of every Solar System satellite. `playable: true` means the game provides a terminal landing exercise; it does not imply that a crewed landing is safe, practical or part of an approved real mission.

`src/destinations.js` separates physical data from game content:

- `radius` is the mean radius, converted from kilometres to metres.
- `mu` is GM, converted from km³/s² to m³/s².
- `gravity` is calculated as `mu / radius²`.
- `source` points to the JPL physical-parameter table.
- `factSource` points to the relevant NASA Science page.
- atmosphere, surface and hazard descriptions summarize scientific context.
- every `sampleMethod` starts with **Proposed:**. It describes a possible game instrument/scenario, not a claim that this sampling operation has happened or is implemented in this version.
- colors are visual design choices, not measured albedo or spectral data.

## Adopted physical data

Values are from [JPL Planetary Satellite Physical Parameters, grouped tables](https://ssd.jpl.nasa.gov/sats/phys_par/sep.html). The table cites the corresponding ephemeris and radius reference for each entry. Gravity below is calculated, not a separate measurement.

| Moon | Parent | Mean radius (km) | GM (km³/s²) | Calculated surface g (m/s², approx.) |
|---|---|---:|---:|---:|
| Moon | Earth | 1737.4 | 4902.800 | 1.624 |
| Phobos | Mars | 11.08 | 0.0007087 | 0.00577 |
| Deimos | Mars | 6.2 | 0.0000962 | 0.00250 |
| Io | Jupiter | 1821.49 | 5959.91547 | 1.796 |
| Europa | Jupiter | 1560.80 | 3202.71210 | 1.315 |
| Ganymede | Jupiter | 2631.20 | 9887.83275 | 1.428 |
| Callisto | Jupiter | 2410.30 | 7179.28340 | 1.236 |
| Titan | Saturn | 2574.76 | 8978.13710 | 1.354 |
| Enceladus | Saturn | 252.10 | 7.21037 | 0.113 |
| Rhea | Saturn | 763.50 | 153.94175 | 0.264 |
| Iapetus | Saturn | 734.30 | 120.51511 | 0.223 |
| Triton | Neptune | 1352.60 | 1428.49546 | 0.781 |

Mean radius describes an equivalent-volume sphere. Real gravity varies with shape, rotation, terrain and nearby bodies. This matters especially on irregular Phobos and Deimos. The isolated spherical model omits parent-planet tides, local shape gravity, body rotation and terrain slopes. Displayed gravity therefore has model uncertainty even when the adopted GM/radius values are precise.

## Surface context and proposed sampling

- **Moon:** regolith and rock; the proposed sampler is a scoop and shallow rock core. Vacuum, dust and thermal extremes are context, not a thermal-life simulation.
- **Phobos and Deimos:** loose dark regolith in very weak gravity. Proposed anchoring/contact sampling addresses rebound and ejecta, but anchoring hardware is not simulated by this landing model.
- **Io:** volcanic rock and sulfur compounds, active heat and radiation. The proposed robotic sampling area avoids active vents. Radiation, lava and electronics lifetime are not solved or ignored as real mission risks; they are disclosed exclusions from this gravity exercise.
- **Europa, Ganymede and Callisto:** icy surfaces with differing fractures, grooves, craters and dark material. Proposed shallow surface samples do not imply access to a subsurface ocean. Europa's planetary-protection and radiation requirements need a separate mission-design model.
- **Titan:** solid terrain with ice and organic sediment exists alongside hydrocarbon liquids. The selected practice zone is a surveyed solid patch. The proposed sampler is sealed and cryogenic; lake splashdown is not modeled.
- **Enceladus:** icy terrain and active plume regions. The proposed shallow sampling area is away from active fractures; plume interception is a different mission mode.
- **Rhea and Iapetus:** cold icy/regolith terrain. The proposed samples compare surface material; high relief is scientific context rather than generated collision geometry.
- **Triton:** volatile nitrogen frost and icy terrain under a very thin atmosphere. The proposed volatile sampler is sealed; cryogenic preservation is not yet simulated.

## Landing exercise and explicit initial conditions

The lander is a separate fictional terminal-training vehicle, not the assembled launch capsule. Starting this exercise initializes a local descent; interplanetary transfer, capture orbit, deorbit and atmospheric entry are not simulated.

Normal scenarios begin with feet 800 m above a flat surveyed patch, 80 m right of the landing-zone centre, descending at 12 m/s. Phobos and Deimos instead begin at 120 m, 40 m offset and 0.35 m/s downward. Their actual gravity is **not** inflated for gameplay. A destination-specific low-thrust mode makes the same pilot controls usable in microgravity:

`thrust_limit = min(26,000 N, initial_mass × surface_g × 2.8)`

This limiter is a fictional throttle/nozzle/engine-mode assumption exposed in `state.scenario`; it is not a measured engine capability. All initial conditions and the actual thrust limit are available to the UI. Both microgravity starting offsets exceed the 25 m landing-zone radius, so passive waiting cannot win.

The fictional lander has 4,200 kg dry mass, 1,200 kg shared descent/RCS propellant, a 320 s main-engine Isp, 230 s RCS Isp, 900 N·m maximum attitude torque and a fixed lumped pitch inertia of 16,000 kg·m². There are no real-hardware performance claims.

## Equations and controls

Physics state is double-precision SI. The integration step is at most 1/120 second, independently of rendered frames. Position is `[pad_offset, feet_height]`, velocity is `[horizontal, vertical]`, and angle is radians from upright. Positive angle tilts thrust toward positive x:

`gravity(height) = mu / (radius + height)²`

`a_x = thrust × sin(angle) / mass + drag_x / mass`

`a_y = thrust × cos(angle) / mass − gravity(height) + drag_y / mass`

`mass_flow_main = thrust / (Isp × 9.80665)`

`angular_acceleration = torque / inertia`

The model uses a flat local patch and vertical inverse-square gravity; it is not a full curved-body orbital model. There is no passive horizontal or angular damping in vacuum. Main thrust and RCS torque share the finite propellant tank. Attitude hold uses an explicit torque controller and burns RCS propellant; it does not rotate the vehicle for free. There is no translation/landing autopilot in the playable mode.

`hoverThrottle` is calculated as current `mass × gravity / thrust_limit`, including the scenario limiter. It is a hint, not an automatic command. The displayed braking altitude is an upright, maximum-thrust estimate without drag, not a predicted touchdown point.

### Titan drag

Titan has a **dense** atmosphere, not a thin one. The local training model uses:

`density(height) = 5.3 kg/m³ × exp(−height / 20,000 m)`

`drag = −½ × density × speed² × C_D × area × velocity_direction`

The chosen near-surface density/scale height are approximate model inputs consistent with Titan's cold, nitrogen-rich, roughly 1.5-atmosphere environment. They are not a fitted Huygens atmospheric profile. The fictional vehicle uses `C_D = 1.2` and reference area 10 m². No wind, lift, parachute, methane weather or entry heating is included. The tenuous atmospheres/exospheres of other destinations, including Triton, are neglected dynamically; their metadata does not call them all airless.

## Contact and failure

If a fixed step would cross the ground, a substep contact-time solution resolves the feet at height zero. It preserves actual contact speeds, offset, angle, angular speed and time in `state.impact`. It cannot tunnel below terrain because of a large render-frame delay.

These are **fictional game acceptance limits**, shared with the readiness indicator:

| Condition | Limit |
|---|---:|
| Absolute horizontal pad offset | ≤ 25 m |
| Absolute vertical contact speed | ≤ 2 m/s |
| Absolute horizontal contact speed | ≤ 1.5 m/s |
| Tilt from upright | ≤ 8° |
| Absolute pitch rate | ≤ 3°/s |

Safe contact applies the strut-support constraint and stops engine/relative motion. Unsafe contact records the specific violated limits. Going above 8 km or more than 3 km laterally exits this local training area. Rollover, bouncing, compressible struts, irregular-surface collisions and impact fragmentation are not solved.

## Checkpoints and validation

`restoreLandingState(raw)` validates dynamic state, then recreates the destination, mass, engine, thrust limiter and scenario from trusted module definitions. Saved forces, gravity, propellant capacity and tolerances are never trusted. Throttle and attitude torque are released on restore. A fabricated successful state without a consistent safe contact record is rejected.

Run `node --test tests/landing.test.js`. The 16 tests cover physical units and destination data, inverse-square ballistic acceleration, vacuum momentum, hover propellant flow, Titan drag, powered attitude control, empty tanks, contact limits, terrain tunneling, display-rate independence and trusted checkpoint reconstruction. A test-only controller demonstrates that all 12 default scenarios can be landed through ordinary throttle/rotation inputs updated at 10 Hz. It does not modify the trajectory or run inside the game. The reference runs take approximately 130–291 simulated seconds and retain propellant. Waiting without input fails every default scenario.

## NASA/JPL references

- [JPL grouped satellite physical parameters](https://ssd.jpl.nasa.gov/sats/phys_par/sep.html): numerical GM and mean radius, with per-entry references and uncertainties.
- [NASA Moon facts](https://science.nasa.gov/moon/facts/) and [weather on the Moon](https://science.nasa.gov/moon/weather-on-the-moon/).
- [NASA Phobos](https://science.nasa.gov/mars/moons/phobos/) and [Deimos](https://science.nasa.gov/mars/moons/deimos/).
- [NASA Io facts](https://science.nasa.gov/jupiter/jupiter-moons/io/facts/), [Europa](https://science.nasa.gov/jupiter/jupiter-moons/europa/), [Ganymede](https://science.nasa.gov/jupiter/jupiter-moons/ganymede/) and [Callisto](https://science.nasa.gov/jupiter/jupiter-moons/callisto/).
- [NASA Titan facts](https://science.nasa.gov/saturn/moons/titan/facts/) and [Titan atmosphere presentation](https://science.nasa.gov/wp-content/uploads/2023/09/20080325_CHARM_McKay.pdf).
- [NASA Enceladus](https://science.nasa.gov/saturn/moons/enceladus/), [Rhea](https://science.nasa.gov/saturn/moons/rhea/) and [Iapetus](https://science.nasa.gov/saturn/moons/iapetus/).
- [NASA Triton](https://science.nasa.gov/neptune/moons/triton/).
- [NASA Glenn specific impulse](https://www.grc.nasa.gov/www/BGH/specimp.html) and [flight equations with drag](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-equations-with-drag/).

No live telemetry, NASA endorsement, human-safety certification or completed real mission is implied.
