# Engine

Everything that isn't a specific product.

| Path | Job |
|---|---|
| `web/video.js` | `runSim(defaults, setup)`: runs a scene as a video |
| `web/warm.js` | compiles every shader before the first frame |
| `web/rng.js` | seeded random numbers, so procedural detail never changes between loads |
| `build.mjs` | bundles a scene folder into one offline HTML page |
| `capture.mjs` | renders a built page to mp4, or to review stills |
| `audio/` | synth, music bed, mixer and loudness master (see [docs/sound.md](../docs/sound.md)) |
| `lib/config.mjs` | paths and environment variables |

## The scene contract

A scene's `main.js` calls `runSim` with defaults and an async setup. The setup returns `render(t)`, and may return `resize()`.

```js
import {runSim} from 'rig/video.js';

runSim({duration: 6, fps: 60}, async ({cfg, canvas, capture}) => ({
  render(t) { /* draw the frame for time t */ },
}));
```

- In a browser the page plays the scene in real time, loops it and scales it to the window.
- With `?capture` (the recorder sets this) nothing runs on its own: `window.__video.seek(t)` draws exactly time `t` and resolves once it is on screen.
- Scenes import the engine as `rig/…`; the bundler maps that to `engine/web/`.

## build.mjs

```bash
node engine/build.mjs m1pro-live m1pro-video      # a name is looked up under examples/ and examples/*/
node engine/build.mjs path/to/scene               # or any folder containing main.js
```

Writes `out/dist/<folder>.html` with three.js, fonts and CSS inlined.

## capture.mjs

```bash
node engine/capture.mjs <name|file.html> [options]
```

| Option | Meaning |
|---|---|
| `--size WxH` | viewport, default `1600x900` |
| `--dpr N` | pixel ratio; `1.2` on `1600x900` gives 1920×1080 |
| `--out file.mp4` | render the video (H.264, CRF 16) |
| `--fps N`, `--from S`, `--to S` | frame rate and a slice of the timeline |
| `--at 1.5,22` and `--out-dir d` | save PNG stills at those seconds instead |
| `--config '{"quality":{…}}'` | pass options to the scene, as JSON or a path to a JSON file |

## Environment

`PV_OUT` (output folder, default `out`), `PV_MODULES` (where `node_modules` is), `FFMPEG` (binary name), `PLAYWRIGHT_BROWSERS_PATH=0` (use the Chromium inside the project).
