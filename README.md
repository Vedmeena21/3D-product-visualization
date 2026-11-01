# 3D Product Visualization

An interactive 3D teardown of the **GravaStar Mercury M1 Pro** gaming mouse: pull it apart, section the sensor, slow the click down to watch the switch snap. One offline HTML page you can drive, plus a 57 s, 60 fps film with its own generated score.

![Preview](media/preview.gif)

**Watch the full film:** [media/m1pro-film.mp4](media/m1pro-film.mp4) (1080p60, with sound; use QuickTime, VLC or a browser, since some editors' previews play it silent).

## What it shows

| | |
|---|---|
| Hook | a 4K-report flick, then the parts lifting apart with numbered labels |
| Walkthrough | sensor cutaway with the lift-off distance, the Omron switch closing at 0.30 mm in 20× slow motion, scroll wheel detents, the underside and its 4 kHz receiver |
| Sound | every click, flick and cut is timed from the film itself, mastered to −14 LUFS |
| Numbers | real values where they are public; anything assumed is labelled on screen |

## Run it

Needs Node.js 20+. For the film you also need `ffmpeg`; for the sound, Python 3.

```bash
git clone https://github.com/Vedmeena21/3D-product-visualization
cd 3D-product-visualization
npm run setup        # installs three.js, esbuild, Playwright + Chromium into engine/
npm run build        # -> teardown-out/dist/m1pro-live.html, m1pro-film.html
```

Open `teardown-out/dist/m1pro-live.html` in a browser. It tours itself; touch anything and it is yours.

### Make the film

```bash
npm run timeline     # reads the edit, writes the cue times the score uses
npm run score        # -> teardown-out/m1pro-score.wav
npm run film         # frame-by-frame capture -> teardown-out/m1pro-silent.mp4
ffmpeg -i teardown-out/m1pro-silent.mp4 -i teardown-out/m1pro-score.wav -c:v copy -c:a aac -shortest teardown-out/m1pro.mp4
```

No GPU (CI, some sandboxes)? Software rendering works but takes about a second a frame: `node --import ./examples/m1pro/tools/swgl.mjs engine/sims/capture.mjs ...`.

## Make one for your own product

Short version; the full one is in [docs/make-your-own.md](docs/make-your-own.md).

1. Copy `examples/m1pro/` to `examples/<product>/` and rename the folders to match.
2. In `shared/mouse.js`, replace the parts with your product's, in real millimetres.
3. In `shared/model.js`, describe the motions (gestures) as data.
4. In `shared/film.js`, edit the `SCRIPT`: cuts on bars, one idea per shot.
5. `npm run build`, look at stills, fix, repeat. Then timeline, score, film.

## Layout

```
.
├── README.md  LICENSE  NOTICE.md  package.json
├── media/                 film, poster, preview
├── docs/                  how it works, make your own
├── examples/m1pro/
│   ├── m1pro-shared/      the product: mouse.js, skin.js, model.js, film.js, live.js, console.js, stage.js, score.py
│   ├── m1pro-live/        the page you drive
│   ├── m1pro-film/        the recorded tour (+ timeline.json)
│   ├── m1pro-film-lite/   lighter variant
│   └── tools/             timeline.mjs, swgl.mjs
└── engine/                the page runtime, builder, frame capture and sound engine (see NOTICE.md)
```

## Credits and licence

The M1 Pro model, edit, console and score are mine. The runtime, capture and sound engine in `engine/` come from the MIT-licensed [teardown](https://github.com/elvarofficial/teardown) kit and [claude-motion](https://github.com/whaleyxbt/claude-motion); see [NOTICE.md](NOTICE.md). MIT licence. Unofficial fan study, not affiliated with GravaStar.
