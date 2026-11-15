# Kinetic Core v0.4.2

Created by **Mykyta Borisov**, the sole game author.

The Moon mission now opens with a 12-second cinematic of the assembled rocket
being carried to its launchpad. A quiet title leaves the vehicle visible;
**Skip to countdown** proceeds directly to the existing five-second ignition
sequence. Pause, resume and checkpoint restore retain safe control handling.

This is presentation time only. The tested ground-sequence state, propellant,
flight clock, ascent and subsequent mission physics are unchanged. Surface
rehearsals still start at the selected world, without an Earth rollout.

Validation: all 86 numerical tests passed; production web and portable HTML
builds completed. The production preview automatically progressed through
rollout, countdown, powered ascent and the actual 100 m control handover.
Safari portable HTTP build displayed rollout; Skip to countdown preserved mass
and propellant and entered the ignition sequence. No full lunar replay or
mobile-device benchmark was performed for this presentation-only patch.
