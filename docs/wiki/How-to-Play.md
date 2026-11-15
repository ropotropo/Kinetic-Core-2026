# How to Play

**[Open Kinetic Core]({{GAME_URL}})** in a desktop browser. Keyboard controls are the precision baseline. The in-game **How to play** guide is available from the header and site menu.

## First Earth-to-Moon mission

1. Open **Modes → Rocket workshop** and load the **Lunar demonstrator**.
2. Choose **Start Flight → Moon**, select an approach and start the mission.
3. Leave **Powered guidance** on and the power ceiling at 100% for your first run. A rollout cinematic and countdown precede powered ascent; the director hands over above the first 100 m.
4. At core depletion the game pauses. Choose **Separate stage**, or press **Space**, to release the depleted stage and continue.
5. After a bound Earth orbit is confirmed, choose **Plan lunar departure**. Coast to the burn window and release the depleted upper stage when prompted.
6. Use time warp during the coasts. Guidance uses the spacecraft's actual propellant for lunar approach, capture, orbit and descent.
7. Watch altitude, vertical speed and pad offset through touchdown. A dashed map bearing is not a collision-free flight plan.

Editing a vehicle changes its mass and propulsion. The reference design is a useful first choice, not a guarantee that every custom design can finish the route.

## Practice a maneuver

**Modes → Manual docking** starts a separate terminal approach near the station. Select **External chase**, **Docking camera** or **Cockpit**. Cameras do not align, brake or steer the craft.

| Input | Manual docking | Local landing exercise |
| --- | --- | --- |
| W / S | Approach / retreat | Increase / decrease engine power |
| A / D | Translate sideways | Tilt sideways |
| R / F | Translate vertically | — |
| Arrow keys | Pitch / yaw | Left/right tilt |
| Q / E | Roll | — |
| Shift | Fine RCS, 20% thrust | — |
| Space | Hold powered translation brake | Cut engine |
| B | Powered attitude hold | Powered upright hold |
| Esc | Pause | Pause |

Docking assistants consume finite RCS propellant. There is no passive vacuum braking. Counter-thrust is required to remove drift.

**Modes → Surface landing** opens a local descent exercise. Leave **Landing assist** on for a first attempt. It is powered guidance and uses fuel; upright hold alone is not descent control. Custom workshop rehearsals are separate from the standard training lander.

## Saves, pause and recovery

- Use **Save checkpoint** before a risky maneuver.
- Restoring pauses the mission and sets the engine ceiling to zero. Select the desired power before resuming.
- Leaving the page pauses the simulation and releases held inputs.
- Saves belong to the current browser origin and device. Another URL, browser or native package has a separate store.
- Vehicle JSON export/import transfers a design, not a complete mission save between origins.

Phone layouts have touch controls, but real-device GPU/performance and a complete manual phone campaign remain unverified. Use the browser build for vehicle file transfer when Android's native file integration is unavailable.

[Detailed source guide]({{SOURCE_BLOB_URL}}docs/GETTING-STARTED.md) · [Verification limits]({{WIKI_URL}}/Verification-and-Limitations)
