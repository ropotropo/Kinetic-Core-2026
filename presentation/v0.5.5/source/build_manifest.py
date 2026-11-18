"""Hash the publishable version folder selected by Git ignore rules.

Run from the repository root before staging/committing the package.
The manifest and checksum file are excluded from the inventory to avoid cycles.
"""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
PREFIX = str(ROOT.relative_to(REPO))
EXCLUDED = {"MANIFEST.json", "SHA256SUMS.txt"}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

listed = subprocess.check_output(
    ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", PREFIX],
    cwd=REPO,
).decode().split("\0")
files = []
for name in sorted(set(filter(None, listed))):
    path = REPO / name
    relative = str(path.relative_to(ROOT))
    if relative in EXCLUDED:
        continue
    files.append({"path": relative, "bytes": path.stat().st_size, "sha256": sha(path)})

manifest = {
    "schema": "kinetic-core-media-package.v0.5.5",
    "project": "Kinetic Core",
    "soleProjectAuthor": "Mykyta Borisov",
    "frozenGameCommit": "559a56eab08abfaca62001704c188be71e9f6dab",
    "gameRelease": "https://github.com/ropotropo/Hakaton2026/releases/tag/v0.5.5",
    "mediaRelease": "https://github.com/ropotropo/Hakaton2026/releases/tag/media-v0.5.5",
    "video": {"seconds": 56, "frames": 1680, "fps": 30, "width": 1920, "height": 1080, "shots": 22, "renderer": "FFmpeg/Pillow; editable Remotion source retained"},
    "presentations": {"languages": ["en", "uk"], "slidesEach": 18, "pitchSecondsEach": 280},
    "captureMethod": "Fresh frozen-build browser captures, including solver-prepared validated checkpoint entries. Subsequent manual stage release and contact were captured in the running game. No uninterrupted human playthrough claim.",
    "gameSourceChanged": False,
    "priorCanonicalMediaUnchanged": True,
    "validation": ["source/qa/video-independent.json", "source/qa/video-visual.json", "source/qa/audio-validation.json", "source/qa/pdf-independent.json", "source/pdf-review/verification.json", "source/qa/preservation-verified.json", "capture/source-cadence-summary.json"],
    "limitations": ["Numeric audio checks do not establish subjective listening approval.", "Moon expedition, separate docking and other-world local practice remain distinct.", "No sample collection, controllable EVA or Earth-return campaign claimed.", "Approved cover is fictional generated artwork; technical provenance is preserved."],
    "files": files,
}
(ROOT / "MANIFEST.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
checks = [(item["path"], item["sha256"]) for item in files]
checks.append(("MANIFEST.json", sha(ROOT / "MANIFEST.json")))
(ROOT / "SHA256SUMS.txt").write_text("".join(f"{digest}  {name}\n" for name, digest in sorted(checks)))
print(f"Inventoried {len(files)} files / {sum(f['bytes'] for f in files):,} bytes")
