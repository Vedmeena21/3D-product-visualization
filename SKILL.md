---
name: product-viz
description: Build an interactive 3D visualization of a real product, as one offline HTML page plus a 60 fps video with a generated score. Use when the user wants a product taken apart in 3D, an exploded view, a cutaway, a teardown video, a 3D model or demo page of a physical product, or a product video made with Claude, even if they don't say "skill" or "teardown".
---

# 3D product visualization

Builds a product as one offline HTML page you can drive, plus a frame-by-frame video and a generated score. The worked example is `examples/m1pro/`; copy it, don't start from nothing.

## Steps

1. **Research first.** Collect real dimensions, parts and specs. Mark anything assumed; it is labelled on screen.
2. **Copy the example** to `examples/<product>/` (`<product>-shared`, `-live`, `-video`).
3. **Model the parts** in millimetres, grouped by layer so the exploded view can stagger them.
4. **Describe motion as data** (`model.js`): what moves, how far, when. The picture is a pure function of time: `render(t)` takes one number and keeps no state. That is what lets the same scene run live and be captured frame by frame.
5. **Write the edit** (`video.js` `SCRIPT`): cuts on the music's bars, one idea per shot, slow only the moment that matters.
6. **Build and look.** `node engine/build.mjs <product>-video`, then `node engine/capture.mjs <product>-video --headed --at 5,12,30 --out-dir out/stills` and view the stills. Fix, repeat.
7. **Sound and video.** `node examples/<product>/tools/timeline.mjs`, then `python3 engine/audio/run.py examples/<product>/<product>-shared/score.py`, then `node engine/capture.mjs <product>-video --headed --out out/video.mp4`. Mux the audio with ffmpeg.

## Rules

- Pale studio, one accent colour. No text over busy areas, so the product stays the subject.
- Page under 1 MB, so it loads instantly and works offline.
- Every number on screen is real or labelled as assumed, so nobody mistakes a guess for a spec.
- Keep installs local to the project (`engine/node_modules`), so nothing global changes.
- Pass `--headed` to every capture on a Mac or any machine with a GPU; headless Chromium there fails with "Error creating WebGL context".
- No GPU at all (a sandbox, CI): drop `--headed` and prefix captures with `PLAYWRIGHT_BROWSERS_PATH=0 node --import ./examples/m1pro/tools/swgl.mjs`. It renders in software at about 1 s per frame.

Details: `docs/how-it-works.md`, `docs/make-your-own.md`.

## Before you hand it over

- Stills checked at every cut, in the live page and in the video, not only the first frame.
- Every number on screen is sourced or labelled as assumed.
- `timeline.json` regenerated after the last edit, so the score matches the cuts.
- Live page under 1 MB; score at −14 LUFS with peaks under −2 dBFS.
- Nothing installed outside the project folder.
