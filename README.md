# 3D Product Visualization

Turn a real product into an **interactive 3D explainer and a 60 fps launch-style film**, from one codebase.

You describe the product's parts, motions and the story you want to tell. The kit gives you:

- **a live page**: one offline HTML file where the product runs, comes apart, opens to a cutaway, and tours itself until you touch it;
- **a film**: the same scene rendered frame by frame to 1080p60, with speed ramps, camera cuts, labels and callouts;
- **a score**: procedural sound timed from the film itself, so every click, move and cut lands on the beat, mastered to −14 LUFS.

Because the picture is a pure function of time, the page, the film and the sound can never drift apart.

## Example: GravaStar Mercury M1 Pro

The included example is a gaming mouse: 4K-report flick, exploded layers, sensor cutaway, and the switch closing at 0.30 mm in 20× slow motion.

![Example film preview](media/preview.gif)

[Watch the full film](media/m1pro-film.mp4) (1080p60 with sound; play in QuickTime, VLC or a browser, as some editor previews play it silent).

## Why use it

| You want | You get |
|---|---|
| To show how something works, not just how it looks | exploded views, section cutaways, slow-motion on the one moment that matters |
| A shareable demo | a single HTML file under 1 MB, no server, works offline |
| A launch-style video | deterministic frame capture, no screen recording, repeatable edits |
| Honest specs | every number on screen is real or labelled as assumed |

## Quick start

Needs Node.js 20+. The film also needs `ffmpeg`; the score needs Python 3.

```bash
git clone https://github.com/Vedmeena21/3D-product-visualization
cd 3D-product-visualization
npm run setup        # three.js, esbuild, Playwright + Chromium, installed into engine/
npm run build        # -> out/dist/*.html
pip install -r engine/requirements.txt   # only for the score (numpy)
```

Open `out/dist/m1pro-live.html`. Then render the film:

```bash
npm run timeline && npm run score && npm run film
ffmpeg -i out/m1pro-silent.mp4 -i out/m1pro-score.wav -c:v copy -c:a aac -shortest out/m1pro.mp4
```

No GPU? Software rendering works at about a second a frame: run the film step as
`PLAYWRIGHT_BROWSERS_PATH=0 node --import ./examples/m1pro/tools/swgl.mjs engine/capture.mjs m1pro-film --size 1600x900 --dpr 1.2 --out out/m1pro-silent.mp4`.

## Make one for your product

1. **Copy** `examples/m1pro/` to `examples/<product>/`.
2. **Model** the parts in real millimetres, grouped by layer.
3. **Describe motion** as data: what moves, how far, when.
4. **Write the edit** as a timed script: cuts on the music's bars, one idea per shot.
5. **Build, look at stills, fix**, then cue sheet, score, film.

Details and rules of thumb: [docs/make-your-own.md](docs/make-your-own.md). How the pieces fit: [docs/how-it-works.md](docs/how-it-works.md).

## Layout

```
.
├── engine/              reusable for any product
│   ├── web/             film runtime, shader warm-up, seeded rng, base CSS
│   ├── build.mjs        scene folder -> one offline HTML file
│   ├── capture.mjs      frame-by-frame renderer (mp4 or review stills)
│   └── audio/           synth, music bed, mixer and loudness mastering
├── examples/m1pro/      the worked example: model, motion, edit, overlay, score
├── docs/                how it works, make your own
├── media/               example film, poster, preview
└── LICENSE
```

## Licence

[MIT](LICENSE). The M1 Pro example is an unofficial study, not affiliated with GravaStar.
