# Kinetic Core - narrated gameplay film, revision 2

Latest film: `Kinetic-Core-Gameplay-v2.mp4`. Final format: 82 seconds, 1920 x 1080, 30 fps, H.264/AAC. Sole author: **Mykyta Borisov**. The earlier 88-second film and its source remain available as revision 1.

This revision replaces the long, slowed shots and repeated black transitions with 22 shorter operational scenes. It adds the Solar System atlas, world comparison, component dimension changes, performance close-ups, mission planning, actual flight, a local Moon landing and separate terminal docking. Full interface context precedes purposeful instrument close-ups. The final landing debrief is a genuine recorded result.

## Motion and recording

The original rollout/ascent recordings contained long repeated-frame runs, made more visible by slow-motion editing. New operational footage uses a controlled browser clock and one actual rendered screenshot per 1/30 second, then encodes those frames at 30 fps. Wall-clock capture speed is not simulation speed. Physics and game source are unchanged; no outcome or telemetry is injected.

The healthy earlier Moon descent and contact recording is retained at a documented 1.2x editorial speed, mapping its 25 fps source to 30 fps without invented intermediate frames. `retimed-landing-v2.json` records the source intervals. Integrated ascent, separate local landing, and separate docking remain distinct. Where the player selects simulation warp, it is identified separately from editing speed.

Source captures and provenance are in `remotion/public/footage-v2/`. `v2-edit-plan.json` records the exact scene sequence and frame boundaries. `validation-v2.json` records final format, decoding, frame-cadence and audio checks. Cadence measurements distinguish intentional static interface/debrief views from active flight and do not use container frame rate alone as evidence of smooth motion.

## English narration and music

The narration uses the standard **en-US-ChristopherNeural** synthetic voice, generated through the public Microsoft Edge TTS service using `edge-tts 7.3.1`. It does not claim to be a real astronaut or a celebrity. The source text is `narration-v2-en.txt`; sentence timings are in `narration-v2-timing.json`. The normalized voice stem is `remotion/public/audio-v2/voiceover-en.wav`.

The musical underscore is an original algorithmic composition: a minor-key pad progression, arpeggiated notes, bass and a restrained 108 BPM pulse. No sampled or downloaded music is used. The unducked score stem and audio provenance are in `remotion/public/audio-v2/`. The composition lowers music during speech and fades it at the end.

`Kinetic-Core-Gameplay-v2.en.srt` provides optional English closed captions for YouTube. It is external to the picture, so native game instruments remain readable.

## Rebuild

From `remotion/`:

```sh
npm ci
npm run dev
npx remotion render KineticCoreGameplayV2 ../Kinetic-Core-Gameplay-v2.mp4 --codec=h264 --crf=21 --audio-codec=aac --concurrency=2
```

The video composition is `src/GameplayV2.tsx`. Both revisions are registered in `src/Root.tsx`. To regenerate voice, install `edge-tts==7.3.1` in a project-local Python environment and run `scripts/generate-voiceover-v2.py`. Normalize the result with FFmpeg loudnorm at -17 LUFS, -2 dBTP, LRA 7, then encode 48 kHz mono PCM16 WAV. To regenerate the original score, run `scripts/generate-score-v2.py` with NumPy installed.

Capture scripts record the real locally served game. Their Playwright/browser paths and scratch directories are workstation settings; adjust them when moving machines. Do not commit `node_modules`, browser downloads, temporary screenshot sequences, credentials or virtual environments.
