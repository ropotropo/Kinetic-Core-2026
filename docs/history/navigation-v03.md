> Historical development record. Earlier working names, scope and test counts apply to that stage only. Read the [current version](../CURRENT-VERSION.md) for Kinetic Core v0.4.4, authored by Mykyta Borisov.

# Mykyta navigation branch

## Solar System catalog and expanded viewport

The Flight map now includes all eight planets, Pluto separately as a dwarf planet, and 461 unique satellite records from the JPL discovery table retrieved 2026-11-15. This snapshot includes provisional designations: Earth 1, Mars 2, Jupiter 115, Saturn 293, Uranus 29, Neptune 16, Pluto 5. Mercury and Venus have no satellite entries. It is a catalog snapshot, not a claim that discovery is complete. Source: https://ssd.jpl.nasa.gov/sats/discovery.html

Search covers names, parent systems and provisional designations. The existing twelve verified landing exercises remain available. Other catalog entries are survey-only, with disabled landing selection and an explanation. No new physical parameters, surface images or transfer capability are implied by a catalog entry.

Expand flight view puts the scene and flight controls across the window; Restore layout returns the configuration panels. Laptop sidebars and command panel are more compact. Browser checks verified expanded view and Uranus's 29 satellite entries, including survey-only handling. All 42 existing tests and both builds passed; new landing exercises are not part of this update.

This independent development line is based on v0.2.0. Use Flight map to select a planetary system and one of its catalog moons. The itinerary is schematic, not an ephemeris or a computed transfer. Surface and docking exercises remain separate scenarios.

Local maps show actual simulation positions, target and velocity: X/altitude for landing, X/Z for docking. Docking vertical offset remains in the flight instruments. The map pauses flight and releases held controls; closing it restores the previous pause state. Destination changes are restricted to assembly.

Drag the 3D canvas horizontally and vertically to orbit the spacecraft or globe. Scroll to zoom. Reset camera restores the normal view. The camera changes presentation only and never steers the vehicle or spends fuel.

Validation: 42 existing numerical/checkpoint tests passed, regular and portable builds completed. Browser checks verified Earth/Saturn system selection, applying Titan to assembly, and horizontal/vertical camera orbit. Safari and full maneuver outcomes have not been independently retested for this branch. Continuous interplanetary flight is not implemented by this change.
