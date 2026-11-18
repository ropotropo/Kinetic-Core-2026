# Kinetic Core design language

## Flight Deck v0.5

A black flight deck frames a lit spacecraft, a planetary limb and the moment
of contact. The scene carries the drama. The interface supplies a quiet,
readable answer to three questions: where am I, what happens next, and which
control changes it? Andrii's direction combines Apple-like clarity with a
restrained aerospace broadcast interface. Mykyta Borisov is the sole game
author.

Flight Deck is an interface revision. The Moon expedition, separate practice
scenarios and exploration views retain their existing physical boundaries.
Use Kinetic Core's own black identity; celestial bodies provide natural color.
Do not import Malibu Wired's brass, TRD's dashboard components, a generic neon
cockpit or a marketing-site hero.

## Shared tokens

[src/ui-kit.css](../src/ui-kit.css) is the shared Flight Deck foundation.
[src/styles.css](../src/styles.css) and the scoped mission, practice, workshop
and atlas styles provide their surface-specific layout. Read the shared tokens
before extending a surface; avoid copying an old override as a new default.

| CSS token | Current value | Purpose |
| --- | --- | --- |
| `--kc-vacuum` | `#000` | Space, page and viewport foundation |
| `--kc-panel` | `#0a0a0b` | Recessed command and tool surfaces |
| `--kc-line` | `#ffffff26` | Necessary quiet boundaries |
| `--kc-text` | `#f5f5f7` | Text, selected controls and primary actions |
| `--kc-muted` | `#a6a8af` | Supporting labels and secondary information |
| `--kc-navigation` | `#9bcaff` | Focus, reference axes and navigation assists |
| `--kc-success` | `#a8d8bd` | Confirmed physical success |
| `--kc-caution` | `#edb96d` | Physical caution or required stage release |
| `--kc-hit` | `44px` | Minimum interactive target |
| `--kc-gap` | `12px` | Shared spacing unit |
| `--kc-header` | `56px` | Restrained flight header |
| `--kc-control-radius` | `12px` | Shared rectangular action radius |
| `--kc-font` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | Offline platform typography |

Failure red `#ff8b83` remains a semantic state color in the scoped flight
styles. Blue, green, amber and red communicate state or navigation; large
backgrounds remain neutral black.

## Type and geometry

Use the platform system sans with tabular numerals for flight values. Reserve
monospace for elapsed time, keycaps and log timestamps. Keep instrument labels
compact, control labels legible and the maneuver coach short. The essential
three readings have greater visual weight than supporting details. Scale the
readings for the available viewport without shrinking the touch target.

The shared `.kc-tool` is a 44 px circular translucent control: `#08090ba8`, a
`#ffffff3b` border and a 16 px backdrop blur. Its selected state uses ceramic
white with dark content. A decorative SVG identifies the action; preserve a matching accessible name
and hover title. Flight utility circles have no visible label and keep a stable
44 px target. Engine state remains in the nearby instrument or pressed state. Main actions use the shared 12 px radius; sheets use a
larger enclosing radius and component choices can retain a small radius.

Use sentence case, left-aligned instructions and units beside their values.
White identifies the primary action. A thin rule separates related functions;
a selected hardware rail identifies installation. Do not turn every reading
into a card or add decorative grids, scan lines or glowing borders.

## Bounded flight composition

```text
KC / current flight                   Back / Missions       56 px
Launch             Transfer             Orbit             Land
┌────────────────────────────────────────────────────────────┐
│ Phase / elapsed time                  Camera / Time / Tools │
│                                                            │
│                    Spacecraft / world                      │
│                                                            │
│ Three critical readings                                    │
└────────────────────────────────────────────────────────────┘
One short next-maneuver coach                     Primary action
Guidance                  Engine ceiling                 Cut
```

The active flight occupies one stable `100dvh` viewport. Account for safe-area
insets at the header, sides and bottom. The 56 px header carries identity and
navigation. The scene remains the largest uninterrupted surface; its view
tools stay at the edges. Keep the three essential readings separate from the
maneuver coach and keep the active engine or translation controls reachable
without page scrolling. Do not put a long explanation or resource ledger
between the player's hand and the flight controls.

In the Moon expedition, the journey sits above the scene and the single coach
sits above the bottom engine cluster. During landing, show altitude, vertical
speed and pad offset. During Earth flight, the third reading can show remaining
propellant. Docking uses port range, closing speed and lateral offset; detailed
attitude, resource and contact limits remain available through flight tools.

Long configuration, evidence and resource content scroll inside bounded
panels. In the mission planner, the destination, approach choices and short
craft budget scroll while Start remains pinned above the bottom safe area.
Preserve all four named lunar approaches. A local rehearsal names the stages
it skips before the player starts. On short landscape screens, reduce unused
spacing and rearrange controls while preserving readable readings, reachable
44 px targets and useful scene area.

## Worlds and evidence

Use NASA/JPL surface imagery where available, lit as a sphere rather than
painted as a flat glowing icon. Preserve correct visual distinctions such as
Earth's thin atmosphere, an airless Moon and Titan's haze. Label procedural
globes, terrain, fictional hardware and training approximations honestly.
Do not let an attractive render imply a simulated mission capability.

## Motion and outcomes

Motion answers a physical event or a player's action. Thruster visuals follow
actual applied force. Success begins with contact or confirmed physical state,
then reveals a short debrief over the still-visible 3D scene. Failure shows
the impact/abort and explains the violated condition with a useful retry.
Avoid confetti, screen-wide neon, continuous pulse effects, artificial camera
shake during delicate control, and timers masquerading as mission progress.

Debrief text fades in once. The renderer should reduce camera motion and
particle intensity when reduced motion is requested; CSS removes interface
transitions and debrief animation. Never hide essential warnings behind an
effect. Focus stays visible in Navigation blue.

## Review discipline

Review the mission home, workshop, planner, active maneuver, failure and safe
contact together at desktop and narrow widths. Also check a short landscape
viewport. Remove any permanent accessory that competes with the spacecraft
without helping a flight decision. Tools, model notes and evidence should be
available on demand instead of covering the scene throughout flight.

These are design requirements. Browser layout checks do not establish device
compatibility, mobile frame rates, thermal behavior or measured performance.
Record those separately when actually tested.

## Explicit assembly platform

The custom workshop uses one shared typed-slot vehicle definition for geometry,
performance, saves and flight. A player chooses hardware, then deliberately
selects a compatible attachment point on the 3D platform or in its accessible
list. Choosing a component must not append it to an invisible sequence.
Installed parts retain their physical role regardless of the order of edits.

Highlight compatible points in navigation blue while placement is active;
show the component's radius and length before placement. Keep incompatible
points disabled and name replacement of occupied hardware explicitly. Copying
a component prepares another placement rather than silently attaching it.
Dimension edits update the same craft and performance data used by flight.

The white Start Flight action belongs in the workshop header so the path from
assembly to mission planning remains obvious. Load a useful lunar demonstrator
for a quick first flight, and offer an empty platform for deliberate design.
Saved or imported layouts follow the same validation and flight path; migration
from sequence-based files explains its typed placement to the player. Leaving
the editor returns to a paused flight. A dark circular assembly deck supplies
scale and footing without making the scene into a decorative dashboard.

## Missions, practice and exploration

Every game surface exposes a text-labelled **Missions** control. Its home gives
the **Moon expedition** the primary action and the **Rocket workshop** a clear
secondary path. Keep **Practice a maneuver** and **Explore** visibly separate.
Earth launch, manual docking and surface landing are named exercises; their
copy states the initial condition and the route segments they skip. The Solar
System atlas surveys destinations. Earth free flight names its internet
requirement. A destination selection or an attractive planet view must not
imply a continuous interplanetary transfer.

Keep the current surface identifiable and make Back predictable. Opening
Missions preserves a paused flight and releases held inputs. Returning from
Missions must retain that pause, including when another flight sheet was
already open. Historical milestones saved on the device describe confirmed
past events; they never restore, unlock or fabricate a physical flight state.

## Actual journey and next maneuver

The integrated Moon journey is **Launch → Transfer → Orbit → Land**. Its state
comes from the flight solver through [mission-journey.js](../src/mission-journey.js):

| Journey stage | Actual mission phases |
| --- | --- |
| Launch | Rollout, countdown, Earth ascent |
| Transfer | Confirmed Earth orbit, departure window, departure burn, Earth–Moon coast, lunar approach, ballistic approach to capture |
| Orbit | Capture burn and confirmed lunar orbit |
| Land | Powered descent, final descent and confirmed touchdown |

Orbit is an active goal during capture; it becomes a confirmed orbit only when
the physical orbit condition passes. A surface rehearsal marks launch,
transfer and orbit **Skipped**. A failure retains the last observed maneuver
and leaves unflown stages incomplete. Never use elapsed time, an animation or
a filled percentage as evidence of reaching a destination. The explicit
rollout presentation and ignition countdown are ground sequences, not
substitutes for flight conditions.

The coach presents one next maneuver. Depleted attached stages require a
manual **Separate** action; coasting and a zero engine ceiling must not hide
that action. An attached core in Earth orbit must be released before lunar
departure planning. An empty active engine is a fuel-budget problem, not a
request to increase throttle. A restored powered phase with zero ceiling asks
for deliberate engine power before resuming. During a coast, explain the
upcoming physical condition and offer useful time warp when appropriate.
Selected warp and the allowed multiplier remain distinct; phase and altitude
limits still apply. A coast does not consume fuel or satisfy a later burn.

Compute planner budgets from resolved flight parts, including cargo. Do not
assume `evaluateDesign().parts` contains catalog-only fields. Keep launch mass,
retained surface mass and ideal engine Δv distinct. Label the reference body,
units and engine state accurately; lunar orbital radii must be converted to
altitudes before being labelled as altitude.

## Flight controls and optional sheets

Keep engine percentage beside the slider label, and distinguish commanded
ceiling from applied thrust. Powered guidance steers and uses finite propellant
within the ceiling. Manual flight exposes held pitch controls. In separate
landing practice, **Landing assist** and **Upright hold** retain separate names
and states; an attitude controller does not imply an automatic descent.

Full telemetry, checkpoint actions and the controls guide belong in
an optional tools sheet. Time has its own direct control. A small passive map
shows actual position and target range in the scene; its geometry is schematic,
not a solved collision-free route. Tools, time and camera sheets are exclusive and
bounded; each has a stationary, labelled close control. Opening a sheet
releases held controls and pauses the maneuver. Closing it leaves the maneuver paused. Resuming is an explicit
player action, available as a short Resume control in the sheet and on the
command surface after closing it. A depleted stage still requires release
before flight can continue. Keep the covered scene and command surface inert while a
sheet is open.

Camera names describe views the renderer actually supports. The Moon mission
exposes External chase and an available local Descent camera, plus **360°
inspection**, zoom and Return to camera. Disable unavailable mounted views
with a short availability reason. Inspection changes the view, never the
trajectory. The renderer's inspection state is authoritative; if a physical
phase changes the scene and resets inspection, the selected control and hint
must update with it. Reset inspection offsets when entering a mounted view.

Use visible keyboard focus. Space and Enter on a focused UI control activate
that control; flight shortcuts operate from the scene. Held pointer and
keyboard controls release on their corresponding end/cancel, pause, blur,
visibility change and navigation. Check the actual shortcut and touch paths,
including stage depletion, restore at zero ceiling and nested-sheet pause.
Preserve checkpoint validation and reconstruction of trusted hardware
constants throughout visual changes.

## Docking optics and hardware detail

Expose External chase, Docking camera and Cockpit as explicit selected controls,
including while paused. Reset inspection offsets when entering a mounted view.
The crew-eye window and nose optics follow the actual spacecraft quaternion;
they must never steer toward the target merely to improve composition. Display
actual relative range, closing rate, lateral offset and attitude in the cabin.
The interior is a fictional procedural reconstruction, not a certified replica.
Keep the instrument display independent of cabin-frame aspect changes. It keeps
its 6:1 ratio, receives uniform scaling only and is capped at 100 CSS px high;
the main digits remain about 24 px at that maximum on tall or ultrawide screens.
Widening the cabin must not stretch its numbers.

Prefer a small number of meaningful panels, struts, footpads, foil surfaces,
engine details and handrails over dense invisible geometry. The v0.4 standard
lander adds 22 cosmetic meshes while preserving its contact axis; custom-craft
dimensions and shared geometry remain authoritative. Steam/dust pools are
finite and reduced-motion settings lower intensity. The extended curved ground
supplies a horizon away from the pad rather than moving the target with the
craft. These are implementation budgets, not measured mobile FPS claims.

The author page pairs the existing project spacesuit portrait with the exact
name **Mykyta Borisov**, Ukraine, and sole-author credit. Preserve the face and visible KC suit patch; keep provenance in the asset credits rather than visible captions.
Use calm type, one authorship line and a visible close action. About the author
lives directly in the fullscreen field guide's creator hero, without a separate
burger or a hidden More-only route. Use the approved short biography and 44 px
touch targets. Keep the face and KC patch visible. Desktop uses a contain-fit
portrait; phones use a wider raised image with empty upper sky cropped and a
black lower gradient. Place Play and About the author below the subject, then
the lesson tabs in the same scroll area.

## Final branding

Kinetic Core is the confirmed name. Use the approved Latin KC vector from
public/assets/branding in the interface, menu and post-contact flag. Keep only
Created by Mykyta Borisov as the game authorship line. How to play introduces
the full Moon mission before detailed controls.


## v0.5.1 flight polish

- Workshop focus follows the selected hardware or compatible attachment point,
  with effect-free bounds, a short eased transition and above-platform limits.
- Chase framing uses stable hardware bounds. Tiny pressure-driven launch shake
  disappears in vacuum; a pointing controller may still turn the actual craft.
- Empty launch stages hold for explicit release. The release action uses a red
  attention state, with no pulse under reduced motion. Fuel and current-thrust
  burn estimates accompany the stage; altitude is a reference, not orbit proof.
- Critical flight phases run at 1×. Safe coasts may use the chosen rate; crossing
  a physical phase boundary discards unused warp budget before a powered event.
- Passive maps cannot cover camera, inspection or contact controls at phone sizes.
- World selection is a horizontal globe rail with keyboard navigation, explicit
  Begin/Cancel and the same destination gravity/context as the original selector.
- Lunar terrain and panel deployment in this patch are bounded visual changes.
  The deeper lunar stage is tracked in LUNAR-EXPERIENCE-NEXT.md.

Round flight utilities are icon-only on phone and desktop. Keep an accessible
name and a hover title; do not shrink or wrap labels inside the circles. View
utilities use 44 × 44 px targets. Return to flight camera shares their reset
icon and second-row alignment. Expanded Data replaces the phase heading at the
left edge and must not cover a tool or reset action.

Stage separation may use one brief external presentation shot, based on the
actual departing hardware. Ease into the view and back to chase; keep controls
available and the solver untouched. Never invent a fresh separation on restore.
Manual inspection cancels the shot, pause freezes it, and reduced motion skips
it. Camera smoothing must not blend incompatible world frames or make a mounted
cockpit drift away from its physical pose.


## Final v0.5.3 visual and interaction rules

- One-finger inspection uses viewport-normalized yaw/pitch; upward drag raises
  the camera toward a surface view. Pinch zoom rebases when pointer count changes.
- Camera selection restores a previously running flight; Escape, real blur,
  visibility loss, context loss or depletion hold never silently resume it.
- Standard/custom descent exhaust uses the applied thrust, soft edges and zero
  output at cutoff. It is visual gas appearance, not a fluid solver.
- Docking-camera sensor grain is confined to that feed. Do not distort alignment
  or place grain above the reticle/telemetry. Joined hardware is inspectable after
  actual capture. Port detailing must preserve its physical contact plane.
- Ready primary actions and the single next-maneuver action receive a restrained
  soft shadow pulse; reduced motion uses a static soft shadow. No animated rings,
  scaling or attention effect on disabled/secondary controls. This is the
  requested exception to the general no-pulse rule.
- The author portrait is anchored right with room for the visible KC suit patch;
  the biography sits below it on a low black gradient, with readable safe areas.

- Attachment editing must reveal the selected inspector immediately on phones,
  before the full list. Empty points open compatible hardware; Add/Replace is
  explicit. Keep camera focus and existing design validation.
- KC identity is a keyboard-accessible return to mission home. World selectors
  share the same globe rail and a reachable primary action. Landing counts are
  quiet, per-world confirmed history, never inferred from achievement badges.


The home Moon may use a slow decorative 3D rotation, with a lit near side,
existing NASA maps and image fallback. Keep its canvas non-interactive, stop
hidden/closed work and render reduced-motion static frames. A single reusable
low-power context, modest mesh and capped DPR/draw rate bound the extra work.

## v0.5.5 navigation finish

How to play uses Missions' fullscreen black shell, a fixed safe-area header and
one scrolling body. The creator hero offers Play and direct About the author;
Moon, Docking, Landing and More retain their existing lesson and keyboard APIs.
Play opens Missions with the current flight paused. Closing or reading a guide
never starts a vehicle. Wide activity headings are centered between identity and
navigation while narrow layouts preserve their reachable controls.

The Solar System body selector shares the horizontal globe rail. Native select
values remain the source for selection and 3D focus; only verified body/system
pairs enable a separate local landing. Legacy launch payloads use three explicit
mass-labelled cards and the existing flight-mass calculation. Assembly orbit,
pan, zoom and smooth reset remain above the actual platform deck.
