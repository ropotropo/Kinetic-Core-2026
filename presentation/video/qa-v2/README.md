# Revision 2 validation evidence

The final portable summary is `../validation-v2.json`. This folder preserves exact analysis code, source checks and per-frame numeric exports behind it. The method compares decoded luma pixels and actual presentation timestamps; it distinguishes active flight, deliberate static UI and settled result screens. The cumulative-anchor metric avoids mistaking very small continuous movement for an actual freeze.

The Python scripts require NumPy and FFmpeg/ffprobe. `FFDIR`, `ROOT` and `PROJECT` at the top are local workstation settings; adjust them to another machine and choose a separate scratch output folder. The scripts are preserved without edits so their SHA-256 matches the executed code recorded in validation. `analyze_cadence.py` accepts a film path, report name and `--crop width:height:x:y`. Audio validation accepts the final film, original voice/music stems and sentence timing JSON; run it with `--help` for the arguments.

Metrics report objective timing, repetition and sound levels. They do not claim that a numeric test heard pronunciation or judged musical taste. Per-frame JSON records are retained for inspection; temporary rendered review frames and PCM decode scratch are not part of the deliverable.
