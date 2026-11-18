# Kinetic Core v0.5.5 - 280-second rehearsal

Sole game author: Mykyta Borisov.
Frozen source: `559a56eab08abfaca62001704c188be71e9f6dab`.

Technical notes are not slide copy. They retain assumptions and capture/source provenance.

## 1. Kinetic Core (15 s; 000-015 s)

Hello, I'm Mykyta Borisov, the author of Kinetic Core. This is my space mission design game for NASA Space Apps Challenge 2026.

- Approved generated portrait artwork reused unchanged. Image provenance remains in the presentation source records, not on the visible cover.

## 2. One spacecraft. Every critical moment. (20 s; 015-035 s)

The game connects spacecraft design with the decisions that follow in flight. I built it for curious learners, students and space enthusiasts who want engineering choices they can inspect. The mission home puts the Moon at the centre of that experience.

- Audience is a design target, not a measured learning outcome. The slowly rotating home Moon is a decorative 3D illustration, not a dated ephemeris.

## 3. Mission home (10 s; 035-045 s)

From here, players can prepare the expedition, return to a mission, or open the available exercises and guidance.

- Fresh frozen-v0.5.5 interface capture. Preserve the full screen and its current identity.
- Image: `assets/screens/01-missions-home.png`. Current mission home and 3D Moon.

## 4. Choose the mission (14 s; 045-059 s)

The atlas makes the destination a deliberate choice. The Moon offers the connected expedition. Other available landing destinations provide clearly separate local rehearsals.

- Do not imply every atlas body supports landing or a continuous Earth transfer. Sun and Earth include survey-only gates. Local rehearsal and integrated Moon expedition remain distinct.

## 5. World atlas (10 s; 059-069 s)

Players can inspect a world, read its reference parameters, and see which exercise is actually available for that destination.

- Keep the actual globe rail, body labels and landing gate visible. Source reference values are separate from illustrative terrain and fictional hardware.
- Image: `assets/screens/02-solar-atlas.png`. Current Solar System atlas.

## 6. Build the spacecraft (20 s; 069-089 s)

The workshop uses compatible attachment points rather than an invisible assembly order. Players select hardware and dimensions. The same design determines geometry, loaded mass, fuel and propulsion values, so a change has consequences beyond its appearance.

- Typed design and dimension-dependent mass/fuel are implemented. Catalog hardware, tank densities and structural limits are fictional educational inputs. The ideal delta-v budget excludes gravity, drag and steering losses.

## 7. The assembled spacecraft (18 s; 089-107 s)

Here the model and its engineering readings sit together. The player can inspect a component, adjust it, and carry the saved design into mission planning instead of starting with an unrelated vehicle.

- Use an actual new-build workshop capture. Never substitute generated interface imagery or invented before/after values.
- Image: `assets/screens/05-workshop.png`. Current typed spacecraft workshop.

## 8. Launch. Burn. Separate. (18 s; 107-125 s)

Launch applies real modeled thrust and consumes propellant. When a stage is released, the retained spacecraft loses that hardware and its remaining fuel. The pilot performs the release; a camera beat makes the physical event easier to follow.

- The capture must show a real validated stage release, not a renderer-only separation fixture. v0.5.5 inherits the 4.7-second stage camera beat; it does not replace the physical separation condition.

## 9. Stage separation (15 s; 125-140 s)

This view shows the spacecraft and the departing stage. Position and velocity continue through separation, while the retained mass and available propulsion change.

- Record the exact current-build phase and capture preparation in the capture manifest. A staged phase capture is not itself proof of a new uninterrupted full mission run.
- Image: `assets/screens/17-manual-stage-release.png`. Actual manual stage separation after exact-solver checkpoint preparation and normal Restore/resume.

## 10. From Earth to the Moon (20 s; 140-160 s)

The connected Moon route keeps the spacecraft and resource accounting across ascent, Earth orbit, departure, coast, lunar capture and descent. Coasting does not require the engine to stay on. The mission advances through physical state and maneuvers.

- Continuous route is an implemented model and has historical guided-playthrough evidence. These new media images may use exact-solver checkpoint preparation; do not call them a new uninterrupted player acceptance run. Route is 2D patched conics with a synthetic circular Moon and ideal pointing.

## 11. Lunar approach and orbit (18 s; 160-178 s)

The navigation view and live readings show where the spacecraft is within the model. Finite burns change its trajectory, and the fuel ledger continues into the lunar phases.

- Use a current-build transfer, approach, capture or lunar-orbit image with its actual phase. Match the visible scene to the capture provenance; no live NASA telemetry or ephemeris accuracy is implied.
- Image: `assets/screens/25-lunar-orbit-active.png`. Active integrated lunar orbit after exact-solver checkpoint preparation and normal Restore/Resume; engine off and retained propellant.

## 12. The numbers drive the flight (32 s; 178-210 s)

The simulation uses SI units and double-precision state. Inverse-square gravity, propellant flow and changing mass drive the motion. The displayed flow is positive fuel consumption; vehicle mass decreases as that fuel is burned. Existing v0.5.5 QA records one hundred and fifty-five passing checks. That is prior verification, not a new test run or a universal accuracy percentage.

- Positive flow convention: mdot_prop = T/(Isp*g0) >= 0; d(m_vehicle)/dt = -mdot_prop during a burn, excluding discrete staging. g0 = 9.80665 m/s^2. Ideal delta-v excludes losses.
- Source: docs/PHYSICS.md model definitions and docs/QA-V055.md prior 155-test record. This media build does not rerun or certify them.
- Integrated route: 2D patched conics, synthetic circular Moon, ideal pointing. Separate local docking uses HCW/quaternion dynamics. No universal real-world accuracy, surveyed terrain, certification or NASA endorsement is asserted.

## 13. Powered lunar descent (16 s; 210-226 s)

During descent, altitude, vertical speed and pad offset help explain the approach. Powered guidance is an explicit assist that still uses available thrust and finite propellant.

- Use the genuine new-build descent/plume view. Identify integrated custom-craft versus local standard/custom rehearsal in its asset provenance. Camera/Sun/terrain are illustrative presentation, not new physics forces.
- Image: `assets/screens/21-descent-plume.png`. Integrated Moon final descent, exact-solver prepared entry followed by normal Restore/power/resume and actual modeled motion.

## 14. A landing has conditions (12 s; 226-238 s)

A landing succeeds within explicit contact limits. Speed, sideways motion, tilt, position and suitable hardware matter. A countdown or visual arrival cannot substitute for those conditions.

- Contact limits are fictional educational thresholds. Never replace actual contact readings with post-constraint zero values. Do not introduce fabricated numerical results.

## 15. Touchdown and KC flag (12 s; 238-250 s)

The real landing outcome leads into the KC flag ceremony. The mission retains the contact result and its resource accounting.

- Use genuine current-build successful contact and the implemented visual flag finale. Crew/flag animation does not imply playable EVA controls, sampling, life-support, lunar ascent or Earth return.
- Image: `assets/screens/23-kc-flag.png`. KC flag ceremony following observed genuine physical contact in the restored continuous-solver prepared integrated craft; no landed-state checkpoint loaded.

## 16. Dock with precision (14 s; 250-264 s)

Docking is a separate local three-dimensional exercise. The player controls translation and attitude, reads the approach instruments, and uses reaction-control thrusters or powered braking with finite propellant.

- Local HCW/quaternion scenario, not a complete long-range rendezvous or an automatic continuation of the Moon expedition. Powered assists consume RCS propellant.

## 17. Docking cockpit (10 s; 264-274 s)

Cockpit and external views share the same local physical state. Small corrections change the approach and consume real modeled resources.

- Use new-build actual docking footage/capture. A screenshot of approach does not establish successful soft capture. Cabin geometry is a fictional procedural reconstruction.
- Image: `assets/screens/11-docking-cockpit.png`. Current separate docking cockpit; manual RCS and powered attitude hold.

## 18. Thank you (6 s; 274-280 s)

Thank you. I'm Mykyta Borisov, the author of Kinetic Core.

- No public URL or additional author credit on the slide. Technical sources and capture provenance remain in source files.
