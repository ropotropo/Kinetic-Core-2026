# Kinetic Core — v0.5.5 teaser

[The final MP4](../Kinetic-Core-Teaser-v0.5.5.mp4) is a 56-second, 22-cut teaser from the frozen game commit `559a56eab08abfaca62001704c188be71e9f6dab`. Mykyta Borisov is the sole game author. This is a feature montage of fresh captures from that build, including validated prepared flight entries; it does not claim one uninterrupted recorded mission. The Moon expedition, separate manual docking and other-world local practice remain distinct. Sampling, return flight and controllable EVA are not claimed.

The delivered movie was exported with the local **FFmpeg/Pillow fallback**, using [edit-plan.json](edit-plan.json). Remotion Studio works and its actual stage-release composition was checked at frame 750. The default headless renderer stalled when clearing a `requestAnimationFrame` callback during composition retrieval, under default, ANGLE and software ANGLE backends. No vendor code was patched. The editable Remotion source remains in [src/Root.tsx](src/Root.tsx) and [src/Teaser.tsx](src/Teaser.tsx); every picture shot is an authored item with editable trims, labels and detail framing.

The validated fallback uses Python with NumPy and Pillow, Node, the locked Remotion package's bundled FFmpeg/ffprobe and the local macOS `SFNS.ttf` system font. Font files are not redistributed. This environment used Codex's bundled Python interpreter. Run the command below with a Python interpreter containing those packages; set `NODE_PATH_EXECUTABLE`, `FFMPEG_PATH` or `FFPROBE_PATH` if their local defaults differ. `--scratch` must point to a project work folder. Temporary frames, PCM mixes, installed dependencies and browser caches are excluded from the published files.

```sh
npm ci
npm run dev
npm run preflight
python3 scripts/render-fallback.py \
  --scratch /absolute/project/work/teaser-render \
  --output ../Kinetic-Core-Teaser-v0.5.5.mp4
```

`npm run render` and `npm run render:fallback` invoke that fallback and accept the same extra arguments after `--`. `npm run render:remotion` preserves the normal Remotion export as an alternative for an environment where its headless renderer works. It was not used for the delivered MP4. [render-receipt.json](render-receipt.json) records the actual renderer, script/plan/source hashes, output hash and audio headroom gain. The render receipt and independent decoded-frame/audio QA establish the delivered result; a 30 fps header alone does not establish smoothness.

The 56-second English narration master already contains its timeline gaps and starts at frame 0. The original 116 BPM score includes editorial sound design, not recorded game sound. Its gain ducks to 0.25 under the spoken windows and rises to 0.6 in the gaps, with 0.2-second ramps. The final PCM mix receives one recorded headroom gain of 0.9390993666; this preserves the score's quiet/critical contrast. Picture cuts are hard cuts, source playback is 1×, and only the final eight frames fade to black. The approved portrait is a presentation visual; truthful image and capture provenance remains in the version's technical source materials.
