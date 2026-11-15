# Europa: imagery and landing evidence

Checked against primary NASA/JPL and USGS resources on 15 November 2026. This is context for an educational robotic surface rehearsal, not a claim that a crewed Europa expedition is currently feasible.

## What changed visually

The previous globe used a 1024-pixel NASA visualization texture. A new 4096 × 2048 display map is derived from the USGS Galileo/Voyager 500 m global mosaic. The downloaded 19631 × 9816 GeoTIFF identifies itself as SimpleCylindrical; it already matches an equirectangular sphere UV projection. It was downsampled, given restrained display contrast and a warm-neutral monochrome tint. This is not a new measured color map or elevation model.

About 4.25% of the downsampled image contained zero/no-data values. Those regions receive a flat median tone rather than fabricated fractures or generated surface detail. Original resolution and coverage vary across the mosaic. Close inspection can still reveal seams and lower-resolution regions; more pixels in the game cannot recover missing observations.

Source bytes, SHA-256 and processing are retained in `public/assets/hd-sources.json`. Raw source files remain in ignored `work/assets-hd/`; only optimized images and the provenance receipt are shipped.

## What landing must respect

- Europa's surface is dominated by water ice with ridges, bands and disrupted terrain. A global albedo mosaic does not resolve the local slopes or boulders needed to certify a landing pad.
- Its tenuous atmosphere offers no useful parachute or aerodynamic landing brake in this exercise. Descent uses finite rocket propellant.
- Jupiter's radiation environment requires mission-specific protection and favors robotic exploration. The rehearsal does not calculate radiation dose, heat flow or biological survival.
- A shallow sterile ice sample is a proposed future gameplay objective. Access through the ice shell to the ocean is not implemented or implied by a surface landing.
- The fictional Ice plain, Fracture-field and Chaos-margin training zones are approach scenarios, not real approved landing coordinates. Terrain near the lander is an illustrative model, separate from the photographic globe.

## Sources to inspect

- [USGS: Europa Voyager–Galileo SSI global mosaic, 500 m](https://astrogeology.usgs.gov/search/map/europa_voyager_galileo_ssi_global_mosaic_500m) and [source GeoTIFF](https://planetarymaps.usgs.gov/mosaic/Europa_Voyager_GalileoSSI_global_mosaic_500m.tif).
- [NASA: Europa overview](https://science.nasa.gov/jupiter/jupiter-moons/europa/) — surface, environment and ocean evidence.
- [NASA/JPL: highest-resolution Europa image and mosaic](https://www.jpl.nasa.gov/images/pia21431-highest-resolution-europa-image-mosaic-from-galileo/) — an important example of detailed *regional* imaging, not uniform global coverage.
- [NASA/JPL: satellite physical parameters](https://ssd.jpl.nasa.gov/sats/phys_par/sep.html) — mean radius and GM used by the existing descent model.

The new 4K Moon image independently comes from [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), converted from the 4K sRGB TIFF. Its photographic surface map and display relief remain presentation assets, not local collision geometry.
