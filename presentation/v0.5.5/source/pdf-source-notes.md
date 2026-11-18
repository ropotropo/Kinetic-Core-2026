# Kinetic Core v0.5.5 PDF source

The two versioned presentations have 18 slides each and a 280-second rehearsal. Existing submitted PDFs, video v2 and their sources remain unchanged.

- Sole game author: **Mykyta Borisov**. The Ukrainian presentation uses **Микита Борисов** in its Ukrainian display credit; PDF metadata retains the exact Latin author name.
- Frozen game source: `559a56eab08abfaca62001704c188be71e9f6dab`.
- Model definitions: `docs/PHYSICS.md`. Its v0.4.4 heading records the preserved model baseline and is not a claim that the new screenshots are from that version.
- Verification reference: `docs/QA-V055.md`, which records 155 passing checks and the prior production/portable build result. Media production does not claim a fresh run of those tests or a new complete unassisted mission acceptance run.
- The integrated Moon route uses 2D patched conics, a synthetic circular Moon and ideal pointing. Docking is a separate local HCW/quaternion exercise. Other-world surface rehearsals are separate from transfers.
- The home Moon, terrain, cabin, parent-body context and scenario Sun are illustrative. The camera/light changes do not add new physical forces, a live ephemeris or surveyed landing geometry.
- Crew and KC flag are the implemented visual finale after successful contact. No playable EVA, sampling, life support, lunar ascent or Earth return is asserted.
- Fresh screenshot paths and phase roles are in `pdf-assets.json`. Keep each image's capture preparation, assistance state and exact frozen-build provenance in the shared capture records.
- The new integrated-flight media uses staged capture segments. Entries were prepared by continuously advancing the exact frozen game's solver from its normal lunar demonstrator, serialized into validated checkpoints, then opened through the normal Restore interface with explicit engine power/resume. Actual subsequent stage release and contact are observed in that restored game. This is not a claim of an uninterrupted human browser playthrough, arbitrary outcome injection, or a new acceptance-test run.
- Positive propellant consumption convention: `mdot_prop = T / (Isp * g0)`; during a burn, `d(m_vehicle)/dt = -mdot_prop`, separate from discrete staging. `g0 = 9.80665 m/s^2`. Ideal delta-v excludes flight losses.
- Cover/PNG poster use the previously approved generated portrait without face modification and the approved KC identity. Generated-image provenance stays in technical records and speaker notes; the visible layout has no production caption or URL.

Run `pdf_build.py` using Python with ReportLab and Pillow. The poster render uses local Sharp; `KC_NODE` and `KC_SHARP_MODULE` can override workstation paths. `KC_FONT_REGULAR` and `KC_FONT_BOLD` can select compatible local TTF fonts. The default exported PDF uses Arial as the system-sans fallback; font files are not distributed with the source. The SVG poster keeps editable live text and embeds the approved image unchanged.

The poster PNG is 2560x1440. Its YouTube-ready JPEG companion is 1280x720 and is checked to remain below 2 MB; it is a downsample of the same approved-photo layout.

Render every final PDF page with Poppler before release. Review all page images, the Ukrainian wrapping and the native equations. Page image rendering is a layout check, not gameplay validation. No pending/missing-image page is permitted in a final PDF.
