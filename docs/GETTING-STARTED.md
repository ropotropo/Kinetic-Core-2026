# Kinetic Core — how to play

Created by **Mykyta Borisov**, the sole game author.

## First mission: Earth to Moon

1. Open **Modes → Rocket workshop** and load the **Lunar demonstrator**.
2. Choose **Start Flight → Moon**, select an approach, then start the mission.
3. Keep **Powered guidance on** and the engine ceiling at **100%** initially.
   A short rollout and countdown precede the actual powered first 100 m.
4. At core depletion, the game pauses. Select **Separate stage** or press
   **Space** to release the stage and continue.
5. Once Earth orbit is confirmed, select **Plan lunar departure**. Coast to the
   departure window; release the depleted upper stage when prompted.
6. Use time warp for the coasts. Powered guidance performs lunar approach,
   capture, orbit and descent using the same spacecraft and finite propellant.
7. Monitor altitude, vertical speed and pad offset through safe touchdown.

The Lunar demonstrator is a useful first vehicle, not a guarantee that every
custom design can complete the route. Editing dimensions changes real mass,
thrust and fuel. The model is 2D patched-conic training with ideal pointing,
not current ephemerides or surveyed landing terrain.

## Direct practice

| Mode | First action | Main controls |
| --- | --- | --- |
| Manual docking | **Modes → Manual docking**, then choose a camera | WASD translates, R/F moves vertically, arrows turn, Q/E rolls; hold Space to brake; Shift or Fine RCS uses 20% thrust |
| Surface landing | **Modes → Surface landing**; leave **Landing assist** on for a first try | W/S power, A/D or left/right arrows tilt, Space cuts the engine |
| Custom surface rehearsal | Workshop → Start Flight → a destination other than Moon | Starts above that world with your retained spacecraft; launch/transfer are explicitly skipped |

Docking is a separate terminal approach near the station. Camera changes never
steer or brake the ship. Counter-thrust and powered assists spend propellant.

## Phone controls

Use the power slider, stage/guidance actions and held pitch buttons in mission
flight. Disable guidance to expose manual pitch. **Cut engine** sets power to
zero. Docking has Translate/Rotate tabs and a **Fine RCS** toggle; its scene
stays visible while reaching the touch pad. Landing has held tilt buttons.
WASD and arrow mappings are unchanged on desktop.

Portrait/landscape layouts were checked, but real-phone GPU performance and a
complete manual phone campaign still need device testing.

## Pause, save and retry

**Esc** or **Pause** releases held inputs. Leaving the page also pauses flight.
Save before a risky maneuver. **Restore checkpoint** recovers the saved state,
pauses and sets engine power to zero: choose the intended power before resuming.
Saves are local to the current browser/device; changing a site or repository
URL does not automatically migrate them. Vehicle JSON export/import lets you
carry a design to another installation.

See [README](../README.md), [physical model](PHYSICS.md) and
[repository transfer](REPOSITORY-TRANSFER.md) for details.
