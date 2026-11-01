# How it works

Whatever the product, one idea runs through the whole repo: **the picture is a pure function of time**. `render(t)` takes a number and draws a frame, with no hidden state. That is why the live page, the film and the score always agree.

| Piece | File | Job |
|---|---|---|
| Model | `m1pro-shared/mouse.js`, `skin.js` | Parts built from real dimensions: shell, skeleton, board, switches |
| Motion | `model.js` | Gestures (flick, lift, press, scroll) as data; `stateAt(seq, tau)` |
| Edit | `film.js` | `SCRIPT` of timed events, speed ramps, camera views, orbit |
| Overlay | `console.js` | Panels, callouts, the switch schematic with its force chart |
| Page | `live.js` | Tour when idle, hands over to the user, returns after 25 s |
| Sound | `score.py` + `timeline.json` | Cues found by sampling the film, so slow motion keeps its sound in sync |

The film is captured frame by frame (no real-time recording), so heavy shaders cost time, not quality.

## The engine

| Piece | Job |
|---|---|
| `engine/web/film.js` | `runSim(defaults, setup)`: a scene returns `render(t)`. In capture mode `window.__film.seek(t)` draws exactly time t; in a browser it plays and loops |
| `engine/build.mjs` | Bundles a scene folder with three.js, fonts and CSS into one HTML file |
| `engine/capture.mjs` | Opens the page in Chromium, seeks each frame, pipes PNGs to ffmpeg; `--at` writes review stills |
| `engine/audio/` | Generated sounds, a chord bed, a mixer and a loudness master (ffmpeg's EBU R128 meter) |

A scene imports the engine as `rig/…`, for example `import {runSim} from 'rig/film.js'`.
