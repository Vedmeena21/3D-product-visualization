---
name: product-viz
description: Build an interactive 3D explainer page and a 60 fps launch-style video (with a generated score) for a real product. Use when the user wants a product taken apart in 3D, an exploded view, a cutaway, a product teardown video, or a 3D demo page of a physical product.
---

# 3D product visualization

Builds a product as one offline HTML page you can drive, plus a frame-by-frame video and a generated score. The worked example is `examples/m1pro/`; copy it, don't start from nothing.

## Steps

1. **Research first.** Collect real dimensions, parts and specs. Mark anything assumed; it is labelled on screen.
2. **Copy the example** to `examples/<product>/` (`<product>-shared`, `-live`, `-film`).
3. **Model the parts** in millimetres, grouped by layer so the exploded view can stagger them.
4. **Describe motion as data** (`model.js`): what moves, how far, when. The picture is a pure function of time: `render(t)` takes one number and keeps no state.
5. **Write the edit** (`film.js` `SCRIPT`): cuts on the music's bars, one idea per shot, slow only the moment that matters.
6. **Build and look.** `node engine/build.mjs <product>-film`, then `node engine/capture.mjs <product>-film --at 5,12,30 --out-dir out/stills` and view the stills. Fix, repeat.
7. **Sound and video.** `node examples/<product>/tools/timeline.mjs`, then `python3 engine/audio/run.py examples/<product>/<product>-shared/score.py`, then `node engine/capture.mjs <product>-film --out out/film.mp4`. Mux the audio with ffmpeg.

## Rules

- Pale studio, one accent colour. No text over busy areas. Page under 1 MB.
- Every number on screen is real or labelled as assumed.
- Keep installs local to the project (`engine/node_modules`).
- No GPU: prefix captures with `PLAYWRIGHT_BROWSERS_PATH=0 node --import ./examples/m1pro/tools/swgl.mjs`.

Details: `docs/how-it-works.md`, `docs/make-your-own.md`.
