# Kinetic Core - final Space Apps presentation

Sole author: **Mykyta Borisov**.

- [English PDF](Kinetic-Core-EN.pdf)
- [Ukrainian PDF](Kinetic-Core-UA.pdf)

Both final PDFs contain fourteen widescreen slides with the same story, designed for **280 seconds (4 minutes 40 seconds)** plus a 20-second margin. The Ukrainian edition translates authored text; genuine game-interface screenshots remain in their original English.

The seven original information slides are retained, with seven separate full-screen gameplay views interleaved. Full-screen views preserve the entire image and all telemetry, using black margins only when required by the original aspect ratio. No website URL or hyperlink is included in either final PDF.

The story covers audience, spacecraft design, Earth rollout, lunar flight, landing, separate manual docking, physical calculations and thanks. Images are real recorded game captures, except the fictional cinematic cover portrait and logo. Captures are not new gameplay tests. The mathematical model's explicit approximations remain visible. Historical QA is distinguished from certification or a universal accuracy percentage.

## Rehearsal and source

[source/speaker-notes-en.md](source/speaker-notes-en.md) and [source/speaker-notes-uk.md](source/speaker-notes-uk.md) contain timed speaking scripts. The complete bilingual copy and timings are in [source/content.json](source/content.json). Fonts are embedded in the PDFs. Original font files are not distributed.

Rebuild with Python, ReportLab and Pillow: `python source/build_pdfs.py`. macOS uses installed Arial. Elsewhere, set `KC_FONT_REGULAR` and `KC_FONT_BOLD` to Unicode-capable TrueType files.

## Complete design materials

[design-kit/](design-kit/) preserves the earlier local editor, editable PowerPoint drafts, all current cover options, KC logo/flag PNG and SVG files, design tokens, physics evidence and screenshot tools. These are supporting authoring materials, not the final presentation PDFs. The portable design-kit ZIP is also included so the previous complete handoff remains downloadable.

[source/captures.json](source/captures.json) records source capture hashes and limitations. The game was not modified by this presentation addition.

## Next task: video

Create a separate professional gameplay video for YouTube, maximum 90 seconds. Show real motion from mission choice and spacecraft assembly through rollout/launch, changing instruments, lunar approach, landing success and a distinct docking exercise. Use restrained zooms and transitions, KC identity, and the same black/white visual language. Preserve genuine time/resource changes and distinguish time warp from editing. Video production is the next task and is not represented as complete here.
