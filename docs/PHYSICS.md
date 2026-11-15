# Physical models in the first playable

Game concept: Mykyta. Physics implementation and tests: AI-assisted development with Codex, November 14, 2026. This is an educational game model, not flight software or a NASA-certified simulator.

## Scope and honest transitions

The game simulates a two-stage Earth ascent and a separate close-range docking exercise. The ascent must establish a real, calculated bound orbit. The pilot must detach each launch stage. Entering the terminal exercise explicitly initializes a spacecraft near the station; it does **not** simulate orbital phasing or a complete rendezvous transfer. The docking reference is a circular 200 km Earth orbit. A successful ascent is allowed to be mildly elliptical; the handoff is a training-scenario transition, not a claim that the spacecraft has navigated continuously to the station.

Every component in `src/catalog.js` is fictional training hardware. Masses, thrust, specific impulses, propellant capacities, dimensions and structural/capture limits are plausible game design inputs. They are not measured specifications of vehicles with similar names. The underlying equations and NASA/JPL reference data are distinct from those hardware assumptions.

## Units and numerical integration

All physics uses SI units: metres, seconds, kilograms, newtons, pascals and radians. JavaScript number values provide double-precision state independently of the Three.js scene. The public simulation step subdivides elapsed simulation time into steps no greater than 1/60 second. The UI should also use a fixed-step accumulator. Warp changes simulated time per displayed frame, not the equations or fuel efficiency.

The gravity update is a velocity-Verlet-style step, with thrust and drag evaluated on the current step and thrust acceleration evaluated using half-step propellant mass. The launch plane is two-dimensional. No rendering position, animation progress variable or frame count determines mission success.

Earth constants:

| Parameter | Value | Treatment |
|---|---:|---|
| Gravitational parameter μ | 398600.435507 km³/s² | JPL DE440 value, converted to m³/s² |
| Spherical radius | 6371 km | Rounded mean-radius approximation |
| Rotation rate | 7.2921159 × 10⁻⁵ rad/s | Rounded sidereal rate |
| Standard gravity g₀ | 9.80665 m/s² | Conversion of Isp in seconds to effective exhaust speed |

## Ascent

The Earth-centred position and inertial velocity are integrated under inverse-square gravity:

`a_gravity = −μ r / |r|³`

Launch-site latitude scales the initial eastward rotational boost by `cos(latitude)`. Atmospheric velocity rotates with that same effective rate in the two-dimensional model. This reproduces the change in available rotational boost, but does not model inclination, launch azimuth corridors or a three-dimensional rotating oblate Earth.

The atmosphere follows the three NASA Glenn metric curve-fit layers. Temperature and pressure depend on altitude; density follows the ideal-gas relation used in that resource. In this game the fit is deliberately truncated above 100 km. The upper-atmosphere extrapolation is an educational approximation; it does not model thermospheric density, space weather or orbital decay.

`q = ½ ρ |v_relative_to_air|²`

`F_drag = −q C_D A v_relative_to_air / |v_relative_to_air|`

Drag coefficients and reference areas come from the fictional component definitions. There is no hidden vacuum damping. Atmospheric pressure interpolates each engine's sea-level and vacuum thrust/Isp. Propellant use follows:

`mass_flow = thrust / (Isp × g₀)`

`ideal_Δv = Isp × g₀ × ln(wet_mass / final_mass)`

The builder's ideal delta-v omits gravity, drag and steering losses. It is a design comparison, not a guarantee that a chosen vehicle will reach orbit. Adding a heavier capsule, service module or cargo reduces the available budget and changes acceleration/RCS response. Forty-seven of the 48 Kennedy hardware combinations reached orbit under the reference guided ascent test; the heaviest Atlas/Vector combination runs short. Its low-margin warning is intentional.

Manual separation removes an attached stage's dry mass **and any remaining propellant**. Position and velocity remain continuous. Separation cannot occur on the pad. The model does not simulate a pyrotechnic impulse, debris collisions or recovery of the discarded stage.

Optional ascent guidance commands thrust direction and throttle through a closed-loop radial-velocity target. It changes forces, never position or velocity directly. The pilot can trim pitch or fly with guidance off. Guidance limits nominal acceleration to approximately 3.8 g; manual flight can exceed it. The fictional aerodynamic design limit is 110 kPa. Structural flex, bending loads, vibration, heating, lift, winds and detailed engine performance are outside this first version.

An orbit is confirmed only when:

- specific orbital energy is negative;
- calculated apoapsis is finite and at least 180 km;
- calculated periapsis is at least 150 km;
- instantaneous altitude is at least 150 km.

Success latches engine cutoff even if a stale UI throttle command remains at full. It does not label a hyperbolic trajectory an orbit. Upper-stage/spacecraft separation remains an explicit pilot action before the docking exercise.

Reference default flight, with immediate pilot staging at core burnout: core burnout at approximately T+154.07 s, orbit confirmed at T+459.22 s, approximately 204.46 km altitude, 7.771 km/s speed, 151.8 × 206.3 km apsides, and 14.3 tonnes of upper-stage propellant remaining. Small timing differences follow the exact manual separation time. At 5× warp this is approximately 92 seconds of real time; at 10×, approximately 46 seconds.

## Terminal docking

The model has three translation axes and quaternion attitude with three angular degrees of freedom. Body RCS forces rotate into the station frame. Thrusters consume finite propellant; empty tanks cannot apply forces or torques. Translation brake and attitude hold are explicit powered assists and also consume propellant. The model does not automatically approach the station.

The right-handed display frame is:

- `x`: right (negative orbit cross-track);
- `y`: up (radially away from Earth);
- `z`: range (negative along-track, positive in front of the docking port);
- the spacecraft nose points in body `−Z`; input `z > 0` commands forward/approach thrust.

The Hill/Clohessy–Wiltshire frame maps as `[radial, along-track, cross-track] = [y, −z, −x]`. With `n = sqrt(μ / reference_radius³)`, the implemented unforced accelerations are:

`a_x = −n² x`

`a_y = 3n² y − 2n v_z`

`a_z = 2n v_y`

These linear equations are appropriate only for small separations near a circular reference orbit. They are not a general interplanetary navigation model. The initial 70 m separation is small relative to the orbital radius.

`orientation` is body-to-display-frame quaternion `[x,y,z,w]`. `angularVelocity` in saved physics state is **inertial body-axis spin**. The display frame rotates at `Ω = [−n,0,0]`. Quaternion integration subtracts that frame rotation:

`q_dot = ½ (q ⊗ ω_body − Ω_frame ⊗ q)`

Telemetry, attitude hold and capture use angular rate **relative to the station frame**, not raw inertial spin. Thus a body with no inertial spin visibly changes attitude relative to the orbiting station rather than magically following its local vertical. A diagonal rigid-body inertia tensor includes the gyroscopic term. Inertia remains fixed at the initial spacecraft mass for this short exercise; gravity-gradient torque and the detailed spatial arrangement of individual jets are omitted.

The spacecraft reference point is the docking-port point represented as a lumped translational state. The first model does not resolve centre-of-mass/port lever-arm coupling or compliant docking hardware. Contact is a geometric port-plane/envelope check, not a full mesh collision simulation. The pilot must cross the port plane with all of these fictional training limits satisfied:

| Capture limit | Requirement |
|---|---:|
| Lateral offset | ≤ 0.35 m |
| Total relative speed | ≤ 0.20 m/s |
| Absolute axial speed | ≤ 0.15 m/s |
| Quaternion angular error | ≤ 5° |
| Relative angular speed | ≤ 1°/s |

The readiness indicator uses the same predicate as contact. Unsafe contact fails with an explanation. Safe contact imposes the final mechanical capture constraint; subsequent relative translation and spin are locked to the station. The app should keep the final approach at real time.

A numerical control-feasibility exercise completed the default 70 m approach in approximately 235 simulated seconds while using about 4.3 kg of RCS propellant. This controller exists only in testing; the playable exercise remains manually controlled.

## Automated validation

Run `node --test tests/physics.test.js` (or the project test script). The tests cover configuration trade-offs, atmosphere, real fuel flow, pad hold, manual stage mass continuity, ballistic orbital energy/angular momentum, rejection of escape orbits, complete default ascent, latched cutoff, display scheduling independence, vacuum momentum, exhausted RCS tanks, powered assists, rotating-frame attitude, safe capture, unsafe capture and malformed state. These checks establish useful numerical behavior; they do not certify real mission accuracy.

## Primary sources

Checked November 14, 2026.

- [NASA Glenn: Ideal Rocket Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/) — mass-ratio delta-v and variable mass.
- [NASA Glenn: Specific Impulse](https://www.grc.nasa.gov/www/BGH/specimp.html) — thrust, propellant flow and effective exhaust speed.
- [NASA Glenn: Earth Atmosphere Equation, metric](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/earth-atmosphere-equation-metric/) — three-layer pressure/temperature/density curve fits.
- [NASA Glenn: Flight Equations with Drag](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-equations-with-drag/) — drag and relative airspeed.
- [JPL Solar System Dynamics: Astrodynamic Parameters](https://ssd.jpl.nasa.gov/astro_par.html) — Earth GM from DE440 and sidereal time reference.
- [NASA NTRS: Initial value and two point boundary value solutions to the Clohessy–Wiltshire equations](https://ntrs.nasa.gov/citations/19930041082) — linear relative-motion formulation.
- [NASA NTRS report 20090013858](https://ntrs.nasa.gov/api/citations/20090013858/downloads/20090013858.pdf) — near-circular, short-range Hill/Clohessy–Wiltshire assumptions.

The sources inform the numerical model. This game has no live NASA telemetry, real mission authority or NASA endorsement.

## v0.2 surface descent

The new terminal exercises use a separate 2D lander in SI units. See [DESTINATIONS.md](DESTINATIONS.md) for sourced physical parameters, environment approximations and contact rules. The exercises are not connected by a continuous transfer to the Earth launch. A selected moon does not silently change the assembled rocket's performance.

Checkpoint schema v1 remains backward compatible with launch/docking saves. Destination is additive; landing states receive their own strict validation. Restore reconstructs gravitational, lander, thrust-mode and contact constants from the trusted catalog, then copies only validated motion and resource state. Engine and held inputs are released on restoration.

## v0.4 continuous Moon mission

The separate `lunar-mission.js` controller connects the typed-slot custom
spacecraft's Earth ascent to lunar contact. It does not replace the preserved
legacy ascent/docking exercises. The builder, geometry, save and solver resolve
one canonical design; imported files cannot supply their own engine constants.
Stage release removes the actual stage and remaining fuel. Attached stages are
retained until an explicit pilot separation, including at a depletion pause.

The launch retains 1/60 s substeps. Long coasts use bounded phase-specific
velocity-Verlet substeps (up to 30 s), with shorter powered/periapsis steps and
contact crossing-time solving near the surface. Fuel flow is thrust divided by
Isp × standard gravity; midstep mass supplies thrust acceleration. Time warp
advances those physical substeps rather than interpolating between worlds.

Moon radius is 1,737,400 m, GM is 4.9028 × 10¹² m³/s², mean orbital distance is
384,400,000 m and the synthetic orbit is circular/coplanar. The Earth frame
changes to a Moon-centered frame inside a 66,100,000 m sphere of influence.
World position, velocity, time, fuel and mass are continuous at that coordinate
change; the patched-conic **acceleration field is an approximation**. It omits
simultaneous three-body gravity, lunar eccentricity/inclination, oblateness,
mascons, Sun perturbations and current ephemerides.

Guidance waits for a modeled departure window, burns finite fuel, targets lunar
periapsis, coasts ballistically, brakes into lunar orbit and descends toward the
chosen longitude. All four NASA-reference sites are projected into the same
2D plane; their latitude is reference metadata, not a modeled plane change.
Powered guidance points an ideal engine; manual attitude is kinematic in this
integrated model, not the rigid-body six-degree-of-freedom docking model.
This ideal pointing does not account for attitude-control propellant or torque.
Translational burns spend main propellant; there is no passive translational braking.

The default lunar demonstrator is fictional high-performance hardware. A
numerical reference mission takes roughly 4.85 days and retains about 2 t of
main propellant after contact. This is a model result, not a real mission
performance prediction. Contact must meet the game speed, offset, tilt and leg
rules; a hard or unsuitable landing can fail. Earth re-entry/heat recovery,
sampling, life support, lunar ascent and return are not implemented.

New mission checkpoints validate phase/frame, finite motion, trusted hardware,
tank limits, discarded mass, propellant ledger, navigation plan and terminal
contact. Restored engine power is zero and the UI remains paused. Invalid saves
do not replace the last trusted in-memory checkpoint. Local custom rehearsals
accept active descent saves only and are explicitly separate from transfers.

`landing-assist.js` adds powered guidance to the legacy standard training
lander through its normal throttle/torque interface. It obeys the power ceiling
and consumes propellant. This is distinct from its upright-attitude hold.
Custom surface rehearsals instead use their actual retained custom hardware;
a vehicle without sufficient thrust is not silently upgraded.

Moon/site references: [JPL satellite parameters](https://ssd.jpl.nasa.gov/sats/phys_par/sep.html),
[JPL astrodynamic parameters](https://ssd.jpl.nasa.gov/astro_par.html) and
[NASA lunar landing sites](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html).
Map limits and processing are documented in [asset credits](../public/assets/SOURCES.md).
