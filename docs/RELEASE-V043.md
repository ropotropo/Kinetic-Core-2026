# Kinetic Core v0.4.3

Created by **Mykyta Borisov**, the sole game author.

- Retains the skippable opening rollout from v0.4.2.
- Fixes the blue ground gap during ascent: altitude-dependent haze no longer
  completely obscures the local surface, the terrain camera reaches beyond
  15 km, the globe stays present, and local ground fades into it over 6–24 km.
- Moon touchdown shows two astronauts and the approved KC flag. The camera
  moves closer to the ceremony; a compact success debrief has an explicit
  **Watch flag ceremony** action. Moon local landing practice also includes
  this post-contact presentation. Flight/resource physics are unchanged.

Validation: 86 tests pass; web and portable production builds complete. The
opening rollout/countdown/ascent/control handover were observed in the browser;
Safari portable HTTP verified rollout and skip. Earth and ceremony visuals were
inspected in a labelled renderer fixture at representative altitudes and a
confirmed-contact presentation state. This patch does not claim another full
lunar campaign or a real-phone benchmark.
