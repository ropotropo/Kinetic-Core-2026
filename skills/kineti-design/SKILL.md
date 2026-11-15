---
name: kineti-design
description: Extend or review Kineti Core's black aerospace game interface and 3D presentation using its own design language. Use for this repository's vehicle builder, flight controls, destination atlas and mission outcomes.
---

# Kineti Core design

Read [the design language](../../docs/DESIGN.md) before changing game visuals.
Its source tokens are in [src/styles.css](../../src/styles.css). Mykyta Borisov
(Микита Борисов) is the sole game author; Andrii's direction is predominantly true black,
Apple-like precision and restrained aerospace science fiction.

The memorable surface is the lit spacecraft or celestial body. Keep controls
calm around it: white primary actions, continuous instrument panels, sentence
case labels, tabular sans values, and a small selection rail for installed
hardware. Reserve blue for navigation/focus and amber/red/green for physical
state. Do not reuse Malibu Wired or TRD branding or a generic card dashboard.
Keep visible copy brief. Store portrait-generation and implementation provenance
in credits/docs, without visible production captions or repeated explanations.
Use the current name and portrait in AUTHORS.md and public/assets/SOURCES.md.

For a new interaction, identify the flight decision it supports and the
physical state that drives it. Preserve useful scene area and one clear next
action. A chosen destination, a training scenario and a fully simulated
transfer must remain distinguishable to the player. Label illustrative
terrain, procedural maps and fictional hardware where they could be mistaken
for measured or mission-validated data.

Effects follow actual thrust, staging, capture, touchdown or impact. Reveal an
outcome once, keep the 3D event visible and explain a failed condition with a
useful retry. Respect reduced motion without suppressing essential state.
Do not replace physics with visual progress or alter dynamics for an effect.

Review the actual game at desktop and narrow widths with focus visible:
assembly, destination selection, an active maneuver, success and failure.
Keep commands reachable, numbers readable and held controls safely released
on pause/blur. Document meaningful visual decisions in the design language.
This skill does not authorize publication, new paid assets, unrelated redesigns
or changes to simulation and checkpoint contracts.
