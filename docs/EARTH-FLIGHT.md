# Earth free flight

Open **Earth / free flight**, choose a city or enter coordinates, load the location and select **Start rocket flight**. A 15 m fictional VTOL rocket is deployed 120 m above the loaded surface. This is an independent local flight mode; the original ascent, custom workshop and orbital transfer are not connected to it.

## Controls

W/S accelerate forward/back, A/D strafe, Q/E change heading, R/F climb/descend. Space requests powered braking. Shift or Fine thrust reduces translation commands to 12%. Hover assist holds vertical speed at zero when no vertical command is held and consumes fuel; B toggles it. P pauses. Right-drag rotates the map camera and scroll zooms; Reset flight camera follows the rocket again.

Cancel sideways drift, descend with F, then use Space to brake before reaching the ground. Fine thrust + F targets a 1.8 m/s final descent. Contact must be at most 2 m/s vertically and horizontally. Successful contact preserves the position and remaining propellant; R lifts off again. A hard contact ends flight at the impact coordinates. New flight explicitly starts a new sortie with fresh fuel. Closing the map pauses its current flight in memory; reloading the page does not save this separate mode.

## Model and data

- SI quantities, fixed 1/60 s steps, finite 2,000 kg propellant, 6,000 kg dry mass, fictional 180 kN vectored propulsion at 320 s specific impulse, Earth gravity and simplified sea-level quadratic drag. This is a controllable fictional VTOL exercise, not a certified real launch vehicle or an orbital solver.
- OpenFreeMap Liberty supplies OpenStreetMap/OpenMapTiles roads and extruded building footprints. Mapzen Terrarium DEM tiles supply global coarse ground heights via AWS. MapLibre GL JS 5.6.1 renders the Mercator view; a Three.js custom layer positions the rocket in metres at its geographic coordinates. Surface and building detail depend on the loaded data.
- Ground contact follows the loaded DEM. Buildings are solid footprint roof prisms with an approximate 1.8 m collision footprint and ≤1 m horizontal swept samples. Holes in footprints are preserved. Interiors, trees, vehicles, bridge openings and individual wall meshes are not modeled. Ground and roofs are not a promise of safe real-world landing locations.
- Flight holds while required terrain/vector data is unavailable. Source changes invalidate the building collision index before movement resumes. Internet is necessary; selected locations are limited to the map's ±84.9° latitude coverage. Arbitrary coordinates can be selected, but no all-location verification is claimed.

Sources: [MapLibre custom layers](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/), [MapLibre elevation queries](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#queryterrainelevation), [OpenFreeMap](https://openfreemap.org/quick_start/), [Mapzen Terrain dataset](https://registry.opendata.aws/terrain-tiles/), [Terrarium format](https://github.com/tilezen/joerd/blob/master/docs/formats.md), [terrain attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md). Attribution remains visible on the map.

## Verification

63 tests passed, including powered hover/fuel, lateral momentum, loss of propulsion, bounded thrust, frame independence, unloaded data, coordinate wrapping, safe terrain/roof contact, side impacts, hard impact and relaunch. Production and portable builds were generated; online map features still require internet in the portable build.

Manual browser checks: Kennedy-area flight changed latitude, powered braking reduced ground speed from 30.1 to 0.2 m/s, manual descent reached a safe touchdown at 28.61078°, −80.60430° with 887 kg remaining, and relaunch reached 37.5 m with 788 kg remaining. New York/Central Park was loaded and the 3D craft appeared among the real map's buildings. After the final collision-cache changes, movement/braking and a hard crash at the contact coordinates were rechecked. These are desktop checks; Safari, every city, direct user-built rocket flight and continuous orbit-to-city entry remain unverified or unimplemented.
