# Next stage: the Moon, in detail

Recorded from Andrii's feedback for Mykyta Borisov on 15 November 2026.
This is a separate planned stage, not a claim of implemented mechanics.

## Goal

Make the last part of the Earth–Moon expedition feel like arriving on the Moon:
a convincing landing, coherent hardware, a grounded crew and a meaningful debrief.
Finish the current camera, staging, terrain and navigation corrections first.

## Work and acceptance

| Work | Acceptance |
| --- | --- |
| Surface and crater scale | Recognizable maria, crater bowls/rims and varied regolith with scale cues. Landing area stays physically readable. Avoid tiled/checkerboard textures and repeating crater stamps. Terrain is an illustrative reconstruction unless surveyed data is actually used. |
| Contact and joined hardware | All footpads meet the local surface after touchdown; ascent/descent sections, ladder, braces and engines have coherent attachments. No floating rings, disconnected struts or coincident panels. Check standard and custom craft at all camera angles. |
| Solar-panel sequence | Inspection may show deployed hardware. Flight uses explicit stowed/deployed states appropriate to the launch envelope and spacecraft phase. A visual hinge does not imply a new power or structural simulation. |
| Landing behavior | Show actual descent, braking, final contact, engine shutdown, dust settling and a stable landed pose; do not manufacture touchdown from animation. Preserve finite resources and contact limits. |
| Crew and flag ceremony | Ground crew feet and the KC pole; maintain believable scale, connected equipment and camera framing on portrait/landscape screens. Respect reduced motion and provide Skip/Replay without obscuring the scene. |
| After landing | Present actual contact speeds, landing offset and reserves with a concise mission debrief and a clear next choice. Design an observation/photo or sample-objective interaction separately before claiming it is playable. |
| Performance | Reuse pooled/instanced details and LODs; record actual phone/browser timings, draw calls and memory. Do not label a desktop viewport resize as mobile performance acceptance. |

## Completion evidence

- Play the continuous Moon expedition from a frozen source snapshot.
- Check failed approach, checkpoint retry and actual safe contact.
- Inspect the landed craft, crew and flag from multiple angles without crossing
  below the terrain; check contact at both low and wide camera views.
- Verify stow/deploy sequence at launch, stage release, coast and lunar descent.
- Test portrait and landscape on an actual phone and desktop Safari/Chromium.
- Keep physical-model limits, image sources and procedural reconstruction clear.
- Mykyta reviews the result before treating this Moon stage as complete.

Sampling, lunar ascent, rendezvous, Earth return and life-support/environmental
survival remain separate future features. The next Moon art/gameplay stage must
not silently expand the current physical mission claims.
