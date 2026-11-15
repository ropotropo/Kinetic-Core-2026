# Physics and Sources

Kinetic Core keeps rendering separate from physical state. The game uses SI units, fixed simulation steps, finite propellant and explicit outcome conditions. Attractive geometry is not used as proof of physical accuracy.

## Models in the current game

| Area | Model | Important approximation |
| --- | --- | --- |
| Ascent | Newtonian motion, inverse-square gravity, layered atmosphere/drag and propellant mass flow | 2D launch and simplified atmosphere |
| Propulsion and staging | Thrust, changing mass, finite tanks and explicit stage release | Fictional hardware inputs and idealized engine behavior |
| Orbit | Energy and apsides determine bound-orbit conditions | Simplified geometry, not an altitude-only success timer |
| Earth–Moon route | Patched-conic coast and finite burns retaining the craft | 2D plane, ideal pointing and synthetic circular Moon epoch |
| Docking | Local Hill relative dynamics, quaternion attitude and RCS | Separate terminal exercise near a circular reference orbit |
| Surface descent | Body-specific gravity, thrust, fuel and explicit contact limits | Illustrative surface, spherical mean-radius model; simplified drag where applicable |

The standard propulsion relations include ideal delta-v, **Δv = Isp × g₀ × ln(m₀ / mf)**, and mass flow, **ṁ = T / (Isp × g₀)**. Values shown for ideal delta-v exclude flight losses. The equations and their implementation assumptions are documented in [PHYSICS.md]({{SOURCE_BLOB_URL}}docs/PHYSICS.md).

Capture and landing limits are game tolerances. They are not NASA operational criteria. Latitude on the named lunar approaches is reference metadata; the mission projects longitude into its 2D training plane. Terrain is not a surveyed landing-site reconstruction.

## Primary references and imagery

- [NASA Glenn — ideal rocket equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/)
- [NASA Glenn — specific impulse](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/)
- [NASA Glenn — metric Earth atmosphere approximation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/earth-atmosphere-equation-metric/)
- [JPL — satellite physical parameters](https://ssd.jpl.nasa.gov/sats/phys_par/sep.html)
- [NASA SVS — LROC/LOLA Moon maps](https://svs.gsfc.nasa.gov/4720/)
- [NASA Earth Observatory — Blue Marble base map](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/)
- [NASA lunar landing-site references](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html)

The full [asset/source ledger]({{SOURCE_BLOB_URL}}public/assets/SOURCES.md) distinguishes NASA/JPL/USGS imagery, reference data, illustrative procedural geometry, branding and generated artwork. Dependency notices are bundled with the game. No NASA affiliation or endorsement is implied.

## Interpretation

Time warp changes simulated elapsed time in permitted phases; it does not remove a burn's propellant requirement. Camera changes only affect the view. Assistance applies powered control rather than silently cancelling momentum. A successful local rehearsal does not establish that an interplanetary transfer or an uninterrupted campaign was flown.

[Verification and limitations]({{WIKI_URL}}/Verification-and-Limitations) · [Project overview]({{WIKI_URL}}/Project-Overview)
