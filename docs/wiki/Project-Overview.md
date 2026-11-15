# Project Overview

Kinetic Core connects an engineering choice to its observable consequence: a heavier vehicle changes liftoff performance; limited propellant constrains a burn; residual drift changes a docking approach. The intended learning experience is to design, fly, observe and retry with a better understanding of the spacecraft.

## The experience

1. **Design:** choose compatible modules and dimensions in the workshop. Review mass, thrust-to-weight and ideal delta-v; save or import a design.
2. **Choose:** prepare the connected Moon route or an explicitly local rehearsal.
3. **Fly:** manage guidance, power and manual stage separation through actual simulated motion.
4. **Observe:** use the instruments, map and debrief to understand fuel use, velocity and contact conditions.
5. **Retry:** recover from a checkpoint or alter the design. The game retains physical failure rather than changing its result to a scripted success.

## Current modes

| Mode | Implemented experience | Boundary |
| --- | --- | --- |
| Rocket workshop | Compatible modular construction; dimensions affect performance; saved designs fly | Hardware is fictional and game-specific |
| Complete Moon mission | Same craft through Earth launch, staging, orbit, finite lunar departure, coast, capture and touchdown | Simplified 2D patched conics; no return |
| Earth launch | Training ascent, orbit and manual staging | Distinct from the connected Moon route |
| Manual docking | Terminal approach, translation/rotation, finite RCS and three camera views | Full long-range rendezvous is skipped |
| Surface landing | Standard training lander and powered landing assistance | A local terminal exercise |
| Custom surface rehearsal | Retained custom spacecraft starts above the selected world | No interplanetary transfer claim |
| Online Earth | Internet-dependent map flight | Separate from the offline core Moon game |
| Solar System | 3D planet/moon inspection | An atlas, not a playable interplanetary campaign |

Fourteen surface destinations include Moon, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Enceladus, Rhea, Iapetus, Triton, Mercury and Mars. A displayed destination does not imply that a transfer to it is implemented. Some custom designs lack enough thrust for a selected world; the planner warns rather than changing their hardware.

## What is intentionally outside this prototype

Surface sampling, lunar ascent, a complete return mission, entry heating/recovery, full transfer windows to other planets, surveyed terrain and environmental survival models remain future work. Research on Europa supplies scientific context; it does not implement an ocean-sampling or human-survival simulation.

The roadmap expresses direction rather than completed work. [Current scope]({{SOURCE_BLOB_URL}}docs/RELEASE-V044.md) and [the physical model]({{WIKI_URL}}/Physics-and-Sources) should take precedence over older development notes.

[Play]({{GAME_URL}}) · [First mission]({{WIKI_URL}}/How-to-Play) · [Submitted presentation]({{PRESENTATION_URL}})
