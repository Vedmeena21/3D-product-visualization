#!/usr/bin/env node
// Renders a built film page frame by frame.
//   node engine/capture.mjs m1pro-film --size 1600x900 --dpr 1.2 --out out/film.mp4
//   node engine/capture.mjs m1pro-film --at 1.5,22,36.9 --out-dir out/stills       (PNG stills, for review)
// Options: --fps N  --from S --to S (a slice)  --config '{"quality":{...}}' or a path to a JSON file
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {BROWSER_ARGS, DIST, FFMPEG, OUT, need} from './lib/config.mjs';

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 ? dflt : argv[i + 1];
};
const target = argv[0] && !argv[0].startsWith('--') ? argv[0] : null;
if (!target) {
  console.error('usage: node engine/capture.mjs <name|file.html> [--size WxH] [--dpr N] [--out f.mp4 | --at t,t --out-dir d]');
  process.exit(2);
}
const html = target.endsWith('.html') ? path.resolve(target) : path.join(DIST, `${target}.html`);
if (!fs.existsSync(html)) {
  console.error(`missing ${html}; build it first: node engine/build.mjs ${target}`);
  process.exit(2);
}
const [W, H] = flag('size', '1600x900').split('x').map(Number);
const dpr = Number(flag('dpr', 1));
const cfgArg = flag('config', '{}');
const cfg = JSON.parse(cfgArg.trim().startsWith('{') ? cfgArg : fs.readFileSync(cfgArg, 'utf8'));
const stills = flag('at', null)?.split(',').map(Number);

const {chromium} = need('playwright');
const browser = await chromium.launch({args: BROWSER_ARGS});
const page = await (await browser.newContext({viewport: {width: W, height: H}, deviceScaleFactor: dpr})).newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.addInitScript((c) => (window.__CFG = c), cfg);
await page.goto(`${pathToFileURL(html)}?capture`);
await page.waitForFunction(() => window.__film && window.__film.ready, null, {timeout: 600000});
const {duration, fps: pageFps} = await page.evaluate(() => ({duration: window.__film.duration, fps: window.__film.fps}));
const gl = await page.evaluate(() => {
  const g = document.createElement('canvas').getContext('webgl2');
  const e = g.getExtension('WEBGL_debug_renderer_info');
  return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
console.log(`renderer: ${gl}`);

const shot = async (t) => {
  await page.evaluate((x) => window.__film.seek(x), t);
  return page.screenshot({type: 'png'});
};

if (stills) {
  const dir = path.resolve(flag('out-dir', path.join(OUT, 'stills')));
  fs.mkdirSync(dir, {recursive: true});
  for (const t of stills) {
    const file = path.join(dir, `${path.basename(html, '.html')}-${t.toFixed(2)}.png`);
    fs.writeFileSync(file, await shot(t));
    console.log(file);
  }
} else {
  const fps = Number(flag('fps', pageFps || 60));
  const from = Number(flag('from', 0));
  const to = Math.min(Number(flag('to', duration)), duration);
  const out = path.resolve(flag('out', path.join(OUT, `${path.basename(html, '.html')}.mp4`)));
  fs.mkdirSync(path.dirname(out), {recursive: true});
  const ff = spawn(FFMPEG, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], {stdio: ['pipe', 'inherit', 'inherit']});
  const n = Math.round((to - from) * fps);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    if (!ff.stdin.write(await shot(from + i / fps))) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 60 === 59 || i === n - 1) console.log(`frame ${i + 1}/${n}  ${((Date.now() - t0) / (i + 1) / 1000).toFixed(2)} s/frame`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(out);
}
await browser.close();
