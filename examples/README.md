# Examples

| Folder | What it is | Build it |
|---|---|---|
| [`hello-cube/`](hello-cube/main.js) | A cube turning once every 6 seconds. About 35 lines; start here | `node engine/build.mjs hello-cube` |
| [`m1pro/`](m1pro/) | A gaming mouse taken apart: exploded layers, sensor cutaway, slow-motion switch, console overlay, live tour and score | `npm run build` |

## Anatomy of a product example

Each product is three scene folders sharing one code folder, so the page and the video can never disagree:

```
<product>/
├── <product>-shared/   the model, the motion data, the edit, the overlay, the score
├── <product>-live/     main.js for the page you drive
├── <product>-video/    main.js for the recorded tour, plus timeline.json
└── tools/              timeline sampler and the software-render preload
```

Start a new product by copying `m1pro/` and following [docs/make-your-own.md](../docs/make-your-own.md).
