# How it works

One idea runs through the whole repo: **the picture is a pure function of time**. `render(t)` takes a number and draws a frame, with no hidden state. That is why the live page, the film and the score always agree.

| Piece | File | Job |
|---|---|---|
| Model | `m1pro-shared/mouse.js`, `skin.js` | Parts built from real dimensions: shell, skeleton, board, switches |
| Motion | `model.js` | Gestures (flick, lift, press, scroll) as data; `stateAt(seq, tau)` |
| Edit | `film.js` | `SCRIPT` of timed events, speed ramps, camera views, orbit |
| Overlay | `console.js` | Panels, callouts, the switch schematic with its force chart |
| Page | `live.js` | Tour when idle, hands over to the user, returns after 25 s |
| Sound | `score.py` + `timeline.json` | Cues found by sampling the film, so slow motion keeps its sound in sync |

The film is captured frame by frame (no real-time recording), so heavy shaders cost time, not quality.
