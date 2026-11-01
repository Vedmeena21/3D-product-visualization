# 3D Product Visualization

Turn a real product into an interactive 3D explainer page and a 60 fps launch-style film, with a generated score, from one codebase.

![Example film preview](media/preview.gif)

The example is a gaming mouse (GravaStar Mercury M1 Pro): [watch the full film](media/m1pro-film.mp4) (1080p60 with sound; play it in QuickTime, VLC or a browser, since some editor previews play it silent).

## Get started

**You need:** Node.js 20+, and `ffmpeg` on your PATH. Python 3 is only needed for the score.

**1. Install**

```bash
git clone https://github.com/Vedmeena21/3D-product-visualization
cd 3D-product-visualization
npm run setup                              # three.js, esbuild, Playwright and Chromium
pip install -r engine/requirements.txt     # numpy, for the score
```

**2. Build the pages**

```bash
npm run build
```

This writes two offline HTML files to `out/dist/`. Open `m1pro-live.html` in a browser: the product tours itself, and when you touch it, it's yours.

**3. Render the film**

```bash
npm run timeline    # cue times from the edit
npm run score       # out/m1pro-score.wav
npm run film        # out/m1pro-silent.mp4, frame by frame
ffmpeg -i out/m1pro-silent.mp4 -i out/m1pro-score.wav -c:v copy -c:a aac -shortest out/m1pro.mp4
```

No GPU? Software rendering works at about a second a frame. Run the film step as:

```bash
PLAYWRIGHT_BROWSERS_PATH=0 node --import ./examples/m1pro/tools/swgl.mjs engine/capture.mjs m1pro-film --size 1600x900 --dpr 1.2 --out out/m1pro-silent.mp4
```

To check a few moments without rendering everything:

```bash
node engine/capture.mjs m1pro-film --at 5,22,36.9 --out-dir out/stills
```

## Make one for your own product

1. Copy `examples/m1pro/` to `examples/<product>/` and rename the folders.
2. Model the parts in real millimetres, grouped by layer.
3. Describe the motion as data: what moves, how far, when.
4. Write the edit as a timed script: cuts on the music's bars, one idea per shot.
5. Build, look at stills, fix, then render the timeline, score and film.

More detail: [docs/make-your-own.md](docs/make-your-own.md). How it works: [docs/how-it-works.md](docs/how-it-works.md).

## Licence

Released under the [MIT licence](LICENSE): you may use, change and share this code, including commercially, as long as the licence text stays with it.

GravaStar and Mercury M1 Pro are trademarks of their owner. The mouse example is an independent study based on public specifications; it is not made, endorsed or sponsored by GravaStar.
