# Kinetic Core gameplay film

**Finished MP4:** `Kinetic-Core-Gameplay.mp4`
**Runtime:** 88 seconds
**Format:** 1920 × 1080, 30 fps, H.264 with AAC audio
**Sole author:** Mykyta Borisov

The film uses newly recorded moving gameplay from the actual local v0.4.4 game build, an editable Remotion timeline, the approved portrait and KC identity, short English titles, and an original synthesized ambient sound bed. The final file is approximately 9.6 MB. It is a feature montage: the standard local Moon landing and separate docking exercise are identified explicitly.

## Shot list

| Output time | Shot | Source and edit |
| --- | --- | --- |
| 0–5 s | Project and sole author | Approved portrait artwork with a subtle push-in |
| 5–16 s | Spacecraft workshop | Real component selection, dimension change and camera inspection; 0.7× edit |
| 16–23 s | Mission selection | Real Moon mission planner; normal playback |
| 23–34 s | Rollout | Actual integrated-mission rollout; 2× edit |
| 34–46 s | Liftoff | Actual opening powered ascent; 0.6× slow-motion edit |
| 46–62 s | Local Moon landing rehearsal | Actual standard training lander with powered landing assist; 2× edit |
| 62–75 s | Separate docking exercise | Actual manual RCS inputs, cockpit view and powered braking; 1.8× edit |
| 75–81 s | Genuine touchdown proof | Actual local-rehearsal contact and settled in-game debrief; normal playback |
| 81–88 s | KC closing | Project identity and Created by Mykyta Borisov |

All game frames preserve their complete 1600 × 900 viewport. The caption band sits outside the gameplay picture, keeping instruments and controls unobscured. Capture sources are in `remotion/public/footage/`. The recording container uses 25 fps; the finished composition is rendered at 30 fps.

## Evidence and boundaries

- `capture-manifest.json` records the workshop, planner, integrated rollout/liftoff, docking controls and read-only state logging. No physics state or success outcome was injected.
- `landing-provenance.json` records the independent local Moon rehearsal. It ran through ordinary visible UI at 1× with Landing assist on. The recorded debrief shows **0.25 m/s vertical contact**, **0.04 m/s lateral contact**, and **828.9 kg fuel remaining**. The sidebar's settled zero velocities are not asserted as impact measurements.
- The Moon payoff uses the standard local training lander, independently of the workshop vehicle. It does not demonstrate an uninterrupted Earth-to-Moon campaign. The integrated route's planner is shown as an actual product feature; this new capture stops near liftoff.
- Docking is a separate terminal exercise using manual RCS, attitude hold and powered braking. This footage does not claim a successful soft capture or a complete orbital rendezvous.
- Editing speeds are timeline playback changes, distinct from the game's simulation rate. No existing `advanceTime` hook was used in the delivered recordings.
- The portrait is generated cover artwork, retained separately from actual gameplay. Its provenance remains in the presentation's technical source records. The current film has no visible AI-image caption, as requested.
- The soundtrack is original mathematical synthesis created by `scripts/generate-audio.mjs`: quiet sine components at 55, 82.4069 and 110 Hz with slow modulation and fades. No downloaded music, voice imitation, or copyrighted track is used. There is no narration.

`source-manifest.json` identifies the capture artifact and source assets by SHA-256. The footage uses the existing v0.4.4 `dist` build served at `http://127.0.0.1:5188/`. The build hashes identify that artifact more precisely than the repository HEAD, which can change while presentation files are being prepared. These clips are new recordings and are distinct from the historical screenshots in the PDFs.

## Edit or render again

The official [Remotion Agent Skills](https://github.com/remotion-dev/skills) were installed and applied. Remotion 4.0.543 and its rendering browser were installed; Studio was opened before editing the composition.

From the `remotion/` folder:

```sh
npm ci
npm run dev
npx remotion browser ensure
npx remotion render KineticCoreGameplay ../Kinetic-Core-Gameplay.mp4 \
  --codec=h264 --crf=24 --audio-codec=aac --concurrency=2
```

The editable scene nodes and their timing are in `remotion/src/Composition.tsx`; format and total duration are in `remotion/src/Root.tsx`. Keep the named shots independent when changing their order or duration. Preserve the local-rehearsal and separate-docking descriptions and inspect the result after a retime.

To regenerate the ambient audio, run `node scripts/generate-audio.mjs` from this folder. Recording sources are `scripts/capture-gameplay.mjs` and `scripts/capture-local-landing.mjs`; their Playwright module/browser and working-output paths are local workstation settings and should be adjusted for another machine. They record the real localhost game using normal UI/keyboard actions, with state/text readout used only for logging. Re-record into versioned media files to preserve these originals.

Keep `node_modules/`, browser downloads, caches and transient `page@…` recordings out of Git. Deliverable media, editable source, lockfile, provenance and scripts belong with this video folder. No game source or simulation logic changed for video production.

The finished output was checked for duration, format, complete decoding, correct author/title, readable telemetry and genuine touchdown evidence. Review-frame images are working QA artifacts rather than additional gameplay evidence.
