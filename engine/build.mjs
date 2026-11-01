#!/usr/bin/env node
// Bundles a scene folder (one with a main.js) into a single offline HTML file: three.js, fonts and CSS inlined.
//   node engine/build.mjs examples/m1pro/m1pro-live examples/m1pro/m1pro-film
//   node engine/build.mjs m1pro-live            (a bare name is looked up under examples/ and examples/*/)
// Output: <out>/dist/<folder name>.html
import fs from 'node:fs';
import path from 'node:path';
import {DIST, MODULES, REPO, RIG_DIR, RIG_PREFIX, need} from './lib/config.mjs';

const esbuild = need('esbuild');

const find = (arg) => {
  const direct = path.resolve(arg);
  if (fs.existsSync(path.join(direct, 'main.js'))) return direct;
  const top = path.join(REPO, 'examples', arg);
  if (fs.existsSync(path.join(top, 'main.js'))) return top;
  for (const ex of fs.readdirSync(path.join(REPO, 'examples'))) {
    const p = path.join(REPO, 'examples', ex, arg);
    if (fs.existsSync(path.join(p, 'main.js'))) return p;
  }
  throw new Error(`no scene "${arg}" (looked for a folder containing main.js)`);
};

const face = (family, weight, file, style = 'normal') =>
  `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};font-display:block;` +
  `src:url(data:font/woff2;base64,${fs.readFileSync(path.join(MODULES, file)).toString('base64')}) format('woff2')}`;
const FONTS = [
  ...[400, 600, 700].map((w) => face('JetBrains Mono', w, `@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${w}-normal.woff2`)),
  face('Inter', '100 900', '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
].join('\n');
const BASE_CSS = fs.readFileSync(path.join(RIG_DIR, 'base.css'), 'utf8');

const rigAlias = {
  name: 'rig',
  setup(b) {
    b.onResolve({filter: /^rig\//}, (a) => ({path: path.join(RIG_DIR, a.path.slice(RIG_PREFIX.length))}));
  },
};

fs.mkdirSync(DIST, {recursive: true});
const args = process.argv.slice(2);
if (!args.length) {
  console.error('usage: node engine/build.mjs <scene folder|name> [...]');
  process.exit(2);
}
for (const arg of args) {
  const dir = find(arg);
  const name = path.basename(dir);
  const t0 = performance.now();
  const res = await esbuild.build({
    entryPoints: [path.join(dir, 'main.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2022',
    write: false,
    nodePaths: [MODULES],
    plugins: [rigAlias],
    legalComments: 'none',
    logLevel: 'error',
  });
  const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name}</title><style>${FONTS}\n${BASE_CSS}</style></head>
<body><div id="app"></div><script>${js}</script></body></html>`;
  const out = path.join(DIST, `${name}.html`);
  fs.writeFileSync(out, html);
  console.log(`${out}  ${Math.round(html.length / 1024)} KB  ${Math.round(performance.now() - t0)} ms`);
}
