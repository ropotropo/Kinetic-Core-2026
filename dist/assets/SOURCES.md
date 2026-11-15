# Local visual assets

## Author portrait

`mykyta-portrait.jpg` is the existing AI-generated spacesuit portrait of
**Микита Борисов**, supplied for this project and explicitly requested for the
author page by Andrii on 15 November 2026. The image is an illustration, not
evidence of a real lunar mission. It was encoded from the current approved KC portrait v5 PNG
without a generative edit or facial alteration. Its source/output SHA-256,
dimensions and encoding are recorded in `mykyta-portrait-source.json`.
The technical provenance is documented here separately from Mykyta's
sole game authorship; the game page keeps its visible copy minimal. The original source file remains intact in the project
presentation workspace; no personal reference photographs are included here.

## Earth map

- File: `earth-blue-marble.jpg`
- Source: NASA Earth Observatory, **Blue Marble: Next Generation**, July 2004 global base map, 5400 × 2700 JPEG.
- Official collection: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/
- Original file: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x5400x2700.jpg
- Credit: NASA Earth Observatory / NASA Goddard Space Flight Center; Blue Marble: Next Generation produced by Reto Stöckli.
- Retrieved: November 14, 2026.
- The image is stored locally and is not requested from NASA during gameplay.
- NASA media guidance: https://www.nasa.gov/nasa-brand-center/images-and-media/

## Procedural scene

The rocket, capsule, station, launchpad, texture patterns and lighting are original procedural artwork authored with Codex assistance. They are fictional training hardware inspired by spaceflight engineering. The launchpad is a visual interpretation rather than a survey-accurate reconstruction of LC-39 or Wallops. No NASA insignia or agency endorsement is represented.

Celestial background size, camera distances, sky transition and stage debris are visual representations. They do not feed the physics state. Earth map is NASA imagery; the emergency low-detail fallback is schematic. All dynamics, actual altitude and craft orientation come from the simulation module.

## v0.2 celestial visualization maps

The new `celestial-*.jpg` assets are local display maps. Their exact URLs, source SHA-256 hashes, source sizes and processing are recorded in [`celestial-sources.json`](celestial-sources.json). Total JPEG storage, including the retained v0.1 full-size Earth source, is approximately 4.61 MB.

- **Earth:** `celestial-earth.jpg`, a 2048 × 1024 resampling of the NASA Earth Observatory July 2004 Blue Marble: Next Generation map described above. The dated satellite composite is not live imagery. The separate cloud layer is procedural illustration, not a NASA weather product. Ocean roughness is derived heuristically from map colors for rendering, not a measured material-property dataset.
- **Moon:** `celestial-moon.jpg` is the 2025 LROC 2K sRGB display map from the [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/). `celestial-moon-height.jpg` is the kit's 1K LOLA display-relief JPEG. Credit: NASA Scientific Visualization Studio; Ernie Wright; LRO LROC and LOLA teams. NASA explicitly describes the color map as optimized for aesthetics rather than scientific analysis. Some polar coverage is supplemented/inpainted. Relief shading in this game is for visual presentation and is not used as a landing elevation model.
- **Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Enceladus, Rhea, Iapetus and Triton:** official visualization texture maps from [NASA-3D-Resources / Images and Textures](https://github.com/nasa/NASA-3D-Resources/tree/master/Images%20and%20Textures), resampled to 1024 pixels wide, JPEG quality 84. Collection credit: NASA 3D Resources and its contributing teams, including NASA/JPL's Solar System Simulator. The files are historical composites/display products, not complete new surveys. Coverage, resolution, color processing and filled or interpolated regions vary by original asset.
- **Parent planets:** Mars, Jupiter, Saturn and Neptune use maps from the same NASA 3D Resources collection, with the same processing and limitations. Saturn's rendered rings are procedural and approximate.

The NASA 3D Resources [README](https://github.com/nasa/NASA-3D-Resources/blob/master/README.md) describes these assets as free and without copyright, and links to the [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). The guidelines require source acknowledgement, preservation of any separately identified third-party rights and no implied NASA endorsement. No agency logos, identifiable persons or other branding have been incorporated into these maps or the original vehicle artwork. This game and its generated code/rendering are not reviewed or certified by NASA.

## Landing terrain and end effects

All landing terrain, rocks, ice-fracture patterns, surface relief, survey beacons and the four-leg lander are original procedural illustrations authored with Codex assistance. They are not surveyed reconstructions of actual landing sites. The visible 25 m target zone corresponds to the game's local terminal-landing exercise. Globe textures are separate from this terrain and do not supply the collision surface. The physics module documents the local surface approximation.

Preview globe size, body shape/oblateness, slow inspection rotation, illumination direction and parent-planet context are presentation choices, not live ephemerides or a true-scale solar-system view. Phobos/Deimos silhouettes are approximate irregular shapes; their visualization texture maps do not constitute measured 3D shape models. Parent planets appear as contextual illustrations and are hidden through Titan's simulated haze during surface descent.

Dust/debris use brief ballistic-looking motion, not atmospheric smoke on airless moons. Capture lights, impact flash and strut settling are visual feedback, not additional forces in the simulation. Hard-impact effects are triggered once from outcome state; benign mission-rule failures do not invent a destructive explosion. A reduced-motion preference reduces particles and suppresses inspection rotation.

## v0.4 close-up maps and continuous flight presentation

- **Moon 4K:** `celestial-moon-hd.jpg`, 4096 × 2048, converted from NASA SVS's [LROC sRGB 16-bit 4K TIFF](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_16bit_srgb_4k.tif). Credit: NASA / GSFC / ASU / LROC. Converted to 8-bit RGB JPEG, quality 94; no generated detail. The CGI Moon Kit's visualization and coverage limitations above still apply.
- **Europa 4K:** `celestial-europa-hd.jpg`, 4096 × 2048, resampled from the [USGS Galileo / Voyager global 500 m mosaic](https://planetarymaps.usgs.gov/mosaic/Europa_Voyager_GalileoSSI_global_mosaic_500m.tif). Credit: NASA / JPL / USGS. The original Simple Cylindrical mosaic is 19631 × 9816 pixels. This is a **monochrome mosaic**, given mild display contrast and a warm-neutral tint; it is not measured true color or a height map. Approximately 4.25% of zero/no-data pixels were filled with a flat median value, without reconstructed surface detail. [Processing receipt](hd-sources.json) records original and derived hashes, dimensions, sizes and source URLs.
- Desktop renderers with 4096-pixel texture support use these maps by default. When 8192-pixel textures are supported, the retained 5400 × 2700 NASA Earth source supplies the Earth's close-up color map without another download. Narrow screens retain the lighter source maps. Neither map is used as a local landing elevation model. The landing sites remain procedural illustrations and the flat contact approximation remains in the simulation module.

The custom vehicle geometry is shared verbatim between the workshop and flight renderer. Its dimensions, canonical attachment positions and stage membership come from the vehicle-design model. The geometry, stages, plume shaders, finite steam/dust particles, crawler, astronaut and Kinetic Core text flag are original procedural artwork. The flag uses the approved Kinetic Core / KC emblem, not an agency insignia. EVA presentation is enabled only after successful contact in the integrated Moon mission when the controller explicitly enables crew; Europa landing practice does not claim human radiation survival.

Flight backgrounds use a separate depth pass and floating local coordinates. Earth and Moon preserve their supplied relative bearings and angular sizes; the Moon trajectory is a modeled circular orbit, not a current ephemeris. Sun and other planets are symbolic static contextual markers, with minimum visible sizes; they do not participate in the Earth–Moon solver. Globe display orientation, ocean tonal lift, ocean roughness, cloud layer and atmosphere scattering are visualization approximations. The dated Earth composite's near-black ocean receives a restrained daylight tonal lift; it is not a new measured ocean-color product.

Launchpad and coastal terrain are illustrative. Camera framing, Earth distance haze, launch steam and vacuum dust are presentation; thrust, stage release, fuel and contact state continue to come from the simulation. The surface-EVA walk and flag placement are a post-contact cinematic, not an independently modeled life-support or surface-traverse simulation.

## Final Kinetic Core branding

The approved KC vector, wordmark, mission emblem and 3:5 flag are stored in
`branding/`. The interface and post-contact flag embed the original approved
vectors. They travel with the source export; no remote logo service is used.
