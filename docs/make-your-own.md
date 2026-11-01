# Make your own

1. **Pick a product and gather real numbers.** Dimensions, sensor, switch, weights. Mark anything you assume.
2. **Copy the example.** `cp -R examples/m1pro examples/<name>`; rename the `m1pro-*` folders and fix the imports.
3. **Model the parts** in `shared/`: build each as a mesh in millimetres, group by layer so the explode view can stagger them.
4. **Describe motion as data** in `model.js`: when it moves, how far, when it lifts, when a button closes.
5. **Write the edit** in `film.js`: a `SCRIPT` of `{t, ...}` events. Cut on bars of the music tempo; one idea per shot; slow only the moment that matters.
6. **Build and check stills** after each change: `npm run build`, then capture a few frames and look.
7. **Cue sheet and sound:** `npm run timeline`, then `npm run score`.
8. **Render** with `npm run film`, then mux the audio (command in the README).

Rules that keep it looking right: pale studio and one accent colour, labelled assumptions, no text over busy areas, keep the page under 1 MB.
