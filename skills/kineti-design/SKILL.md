---
name: kineti-design
description: Extend or review Kinetic Core's Flight Deck interface and 3D presentation. Use for mission home, vehicle workshop, flight controls, destination atlas and outcomes.
---

# Kinetic Core design

Read [the design language](../../docs/DESIGN.md) before visual changes. The v0.5
Flight Deck foundation is [src/ui-kit.css](../../src/ui-kit.css); scoped mission,
practice, workshop and atlas styles supply layout. Read current shared tokens
before adding a control. Mykyta Borisov (Микита Борисов) is the sole game author.
Use Kinetic Core's own true-black aerospace identity and approved Latin KC mark.

## Flight Deck hierarchy

The lit spacecraft or world is the main surface. Use the platform system sans,
tabular flight values, sentence case, white primary actions and short visible
labels. Shared tokens are vacuum `#000`, panel `#0a0a0b`, line `#ffffff26`, text
`#f5f5f7`, muted `#a6a8af`, navigation `#9bcaff`, success `#a8d8bd` and caution
`#edb96d`. Shared geometry is a 56 px header, 44 px minimum targets, 12 px gap
and 12 px rectangular-action radius. Circular tools use the translucent
`#08090ba8` surface, `#ffffff3b` border and restrained blur. Semantic color
communicates physical state or focus. Do not import another project's palette.

Keep active flight in one bounded `100dvh` viewport with safe-area insets.
Header: identity, Back and text-labelled Missions. Scene: the largest useful
area, edge-mounted tools and exactly three critical readings. Command surface:
one short next-maneuver coach, followed by reachable engine or translation
controls. Keep telemetry distinct from advice. Configuration, model notes,
map, detailed instruments and guides belong in bounded optional panels; they
must not force active controls below the phone viewport. Planner content can
scroll while its primary Start action stays above the bottom safe area.

## Capability and action truth

Missions home puts the Moon expedition first, the rocket workshop second, and
separates Practice a maneuver from Explore. Keep expedition, local rehearsal,
docking exercise and atlas survey distinguishable. Name skipped phases and
internet requirements honestly. Preserve all four named lunar approaches.
A selected destination is not evidence of an implemented transfer.

Derive the Moon journey Launch → Transfer → Orbit → Land from actual phases
using [mission-journey.js](../../src/mission-journey.js). Rehearsals mark unflown
phases Skipped. Failures retain the last observed maneuver; timers and visual
percentages never establish a physical milestone. The coach has one next
maneuver: manual stage release, validated departure planning, deliberate engine
power after restore, a real burn or a coast toward its next condition. Empty
fuel is not fixed by throttle. Show selected and allowed warp accurately;
coasting does not pay a future delta-v requirement. Resolve planner mass from
actual flight parts, including cargo, and keep SI units and reference frames.

Opening Missions pauses and releases inputs. Optional tools/map/camera sheets
pause the maneuver and make the covered controls inert. Explicit camera selection
or its close button restores the prior running state; a previously paused flight,
Escape, backgrounding and other optional sheets remain paused with an explicit
Resume action. A depleted stage must
still be released before continuing. Verify nested-sheet return, held-input release,
manual staging and zero-power restore. Space/Enter on focused controls belongs
to those controls, never a background flight shortcut. Preserve checkpoint
validation and trusted-constant reconstruction.

Camera, 360° inspection, zoom and Return to camera must be discoverable and
meaningful. Use real availability checks for mounted cameras. The renderer's
inspection state controls selected UI and hints, including after a scene/phase
change. A view change must not alter a trajectory. Separate powered landing
assist from upright attitude hold and explain their finite propellant use.

## Outcomes and review

Effects follow actual thrust, staging, capture, touchdown or impact. Reveal an
outcome once, retain the spacecraft and explain a failure with a useful retry.
Preserve ground rollout and the real post-touchdown KC flag ceremony. Respect
reduced motion without hiding state. Label illustrative terrain, procedural
maps, fictional hardware and model approximations where they affect meaning.
Keep image/tool provenance in source credits, without extra production captions.
The fullscreen guide shares Missions' shell and gives the creator a direct
entry above the lessons. Its Play action opens Missions with flight paused.
Use only a soft shadow pulse for a ready primary or sole next-maneuver action;
reduced motion gets a static shadow. Do not animate rings or secondary controls.

Review mission home, workshop, planner, an active maneuver, success and failure
at desktop, narrow portrait and short landscape sizes. Confirm readable
numbers, visible focus, 44 px targets, reachable controls, camera reset and safe
release of held inputs. Browser layout evidence does not establish measured
device performance or compatibility. Record only the scenarios actually tested.

Document meaningful decisions in DESIGN.md. This skill does not authorize
publication, paid assets, new mission capabilities or changes to physics and
checkpoint contracts.
