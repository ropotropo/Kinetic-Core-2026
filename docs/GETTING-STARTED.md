# Kinetic Core — how to play

Created by **Mykyta Borisov**, the sole game author.

## First mission: Earth to Moon

1. Open **Missions → Prepare expedition**. The Lunar demonstrator is ready.
   To customize it, choose **Build a spacecraft**, then **Plan flight**.
2. Choose the **Moon** globe for the full expedition, select an approach, then **Start lunar mission**.
3. Keep **Powered guidance on** and the engine ceiling at **100%** initially.
   A short rollout and countdown precede the actual powered first 100 m.
4. At core depletion, the game pauses. Select **Separate booster** or press
   **Space** to release the stage and continue.
5. Once Earth orbit is confirmed, select **Plan departure**. Coast to the
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
| Manual docking | **Missions → Docking**, then choose a camera | WASD translates, R/F moves vertically, arrows turn, Q/E rolls; hold Space to brake; Shift or Fine RCS uses 20% thrust |
| Surface landing | **Missions → Surface landing**, choose a world and begin; leave **Landing assist** on for a first try | W/S power, A/D or left/right arrows tilt, Space cuts the engine |
| Custom surface rehearsal | Workshop → Plan flight → a destination other than Moon | Starts above that world with your retained spacecraft; launch/transfer are explicitly skipped |

Docking is a separate terminal approach near the station. Camera changes never
steer or brake the ship. Counter-thrust and powered assists spend propellant.

## Phone controls

Use the power slider, stage/guidance actions and held pitch buttons in mission
flight. Disable guidance to expose manual pitch. **Cut engine** sets power to
zero. Docking has Translate/Rotate groups and a **Fine RCS** toggle; its scene
stays visible while reaching the touch pad. Landing has held tilt buttons.
WASD and arrow mappings are unchanged on desktop.

Portrait/landscape layouts were checked, but real-phone GPU performance and a
complete manual phone campaign still need device testing.

## Pause, save and retry

**Esc** or **Pause** releases held inputs. Leaving the page also pauses flight.
Opening Missions, Time, the guide or tools pauses; closing those leaves flight paused.
Selecting a camera or closing its view sheet restores a previously running
flight; Esc or a real background/visibility change keeps it paused.
Use **Resume** when ready. Camera changes affect only the view; free inspection
is labelled separately from External chase, Docking camera and Cockpit.
Save before a risky maneuver. **Restore checkpoint** recovers the saved state,
and opens paused. Practice restores its saved engine ceiling; the expedition
restores with zero ceiling. Check the intended power before resuming.
Saves are local to the current browser/device; changing a site or repository
URL does not automatically migrate them. Vehicle JSON export/import lets you
carry a design to another installation.

See [README](../README.md), [physical model](PHYSICS.md) and
[repository transfer](REPOSITORY-TRANSFER.md) for details.


Round flight buttons use icons. The clock opens Time, the camera opens view
controls, the sliders open Tools, and the chart toggles compact Data. The curved
arrow returns from inspection to the flight camera. The power symbol cuts the
engine. Desktop hover titles and accessible names describe each action; selected
guidance remains a pressed state. Powered maneuvers run at 1×; accelerate only
where Time makes a faster coast rate available.

After a confirmed docking, the camera shows the joined spacecraft from outside.
Choose **Inspect docked craft** to dismiss the debrief and orbit the result.
Docking camera has a restrained sensor texture; its reticle and telemetry remain
sharp. One-finger upward drag moves toward a top-down surface view; pinch zoom
is separate from orbit. Ready primary actions use a soft shadow pulse, with a
static soft shadow when reduced motion is enabled.


In Rocket workshop, select a component to bring its editor above the attachment
list. Change hardware shows compatible choices; review dimensions and confirm
Add or Replace. Empty attachment points open Hardware automatically on phones.
The KC logo returns to mission home and pauses the current flight. Phone preview
Vehicle/Destination tabs sit at bottom center. World rails display a small count
of newly confirmed successful landings; these totals stay on this browser/site
and do not backfill earlier milestone badges.

Destination survey hides launch-assembly settings. All new surface-practice
entry points start with powered landing assist on; switch it off for manual
engine control. Touchdown counters record new attempts, with no cloud sync.

The small version beside Kinetic Core on mission home identifies the loaded
build. A tab already open keeps its loaded code until you refresh; save a flight
checkpoint before reloading. The initial Make it to the Moon screen and reopened
Missions use the same slowly rotating 3D Moon. Reduced motion keeps it still.

Standard Earth launch setup offers payload cards: Crew only adds 0 kg, Science
package adds 2,000 kg and Outpost supplies adds 8,000 kg. This mass-budget choice
updates launch mass, thrust-to-weight and ideal delta-v; select it before flight.

The question-mark opens the fullscreen flight guide. About the author is next
to Play above the lessons; it is no longer hidden in More. Play opens Missions
with the current flight paused. Moon, Docking, Landing and More explain each
mode, and returning to a flight still requires a deliberate Resume action.
In Solar System, choose a system and use the globe rail to focus a body.
Survey-only bodies keep Landing practice disabled; supported worlds start a
separate local exercise, with no transfer implied.
