# 3D Product Visualization

Turn a real product into an interactive 3D explainer page and a 60 fps launch-style film, with a generated score, from one codebase.

![Example film preview](media/preview.gif)

The example is a gaming mouse (GravaStar Mercury M1 Pro): [watch the full film](media/m1pro-film.mp4) (1080p60 with sound; play it in QuickTime, VLC or a browser, since some editor previews play it silent).

## Get started

You need Node.js 20+ and `ffmpeg`. Python 3 is only needed for the sound.

1. **Get the project.** Clone the repo and open the folder.

   ```bash
   git clone https://github.com/Vedmeena21/3D-product-visualization
   cd 3D-product-visualization
   ```

2. **Install everything it needs.** One command for the web side, one for the sound.

   ```bash
   npm run setup
   pip install -r engine/requirements.txt
   ```

3. **Build the pages and open the live one.** Open `out/dist/m1pro-live.html` in your browser. The product tours itself; touch it and it's yours.

   ```bash
   npm run build
   ```

4. **Render the film.** Three commands in order: the cue times, the sound, then the picture. Join them with ffmpeg to get the finished video.

   ```bash
   npm run timeline
   npm run score
   npm run film
   ffmpeg -i out/m1pro-silent.mp4 -i out/m1pro-score.wav -c:v copy -c:a aac -shortest out/m1pro.mp4
   ```

5. **Check a few moments first, if you like.** Save stills at chosen seconds instead of rendering everything.

   ```bash
   node engine/capture.mjs m1pro-film --at 5,22,36.9 --out-dir out/stills
   ```

No graphics card? The film still renders, at about a second a frame, with this in place of `npm run film`:

```bash
PLAYWRIGHT_BROWSERS_PATH=0 node --import ./examples/m1pro/tools/swgl.mjs engine/capture.mjs m1pro-film --size 1600x900 --dpr 1.2 --out out/m1pro-silent.mp4
```

## Make one for your own product

1. Copy `examples/m1pro/` to `examples/<product>/` and rename the folders.
2. Model the parts in real millimetres, grouped by layer.
3. Describe the motion as data: what moves, how far, when.
4. Write the edit as a timed script: cuts on the music's bars, one idea per shot.
5. Build, look at stills, fix, then render the timeline, score and film.

More detail: [docs/make-your-own.md](docs/make-your-own.md). How it works: [docs/how-it-works.md](docs/how-it-works.md).

## Licence

Created by [Vedmeena21](https://github.com/Vedmeena21). Copyright © 2026 Vedmeena21, released under the [MIT licence](LICENSE): you may use, change and share this code, including commercially, as long as this copyright notice and the licence text stay with it.

GravaStar and Mercury M1 Pro are trademarks of their owner. The mouse example is an independent study based on public specifications; it is not made, endorsed or sponsored by GravaStar.
