// Writes m1pro/m1pro-film/timeline.json from the film's SCRIPT and the gesture model, so the stills, the video and
// the score all read the same times. Beats are the operator's moves; the rest are sound events found by sampling the
// film itself (so the click's speed ramp carries through): flicks (with their film-time duration), lifts and
// set-downs, switch contacts closing and opening (with the playback rate at that moment), wheel detents, and the
// film's own cues: the reflection sweep, the shell lighting, the studio coming up, cuts, feature numbers, the
// explode and its return, the end card.
// Run: node examples/m1pro/tools/timeline.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const require = createRequire(path.join(ROOT, 'engine/x.js'));
const esbuild = require('esbuild');
const entry = `export {SCRIPT, DURATION, seqAt, keyAt} from '${ROOT}/examples/m1pro/m1pro-shared/film.js';
export {SEQ, contactAt, wheelAt, handAt} from '${ROOT}/examples/m1pro/m1pro-shared/model.js';`;
const res = await esbuild.build({
  stdin: {contents: entry, resolveDir: ROOT, loader: 'js'},
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  nodePaths: [path.join(ROOT, 'engine/node_modules')],
  logLevel: 'error',
  plugins: [
    {name: 'kit', setup(b) {
      b.onResolve({filter: /^rig\//}, (a) => ({path: path.join(ROOT, 'engine/web', a.path.slice(4))}));
    }},
    // film.js imports console.js, which touches the DOM only when called; stub the browser-only kit runtime
    {name: 'stub', setup(b) {
      b.onResolve({filter: /runtime\.js$/}, () => ({path: 'stub', namespace: 'stub'}));
      b.onLoad({filter: /.*/, namespace: 'stub'}, () => ({contents: 'export const runSim = () => {};'}));
    }},
  ],
});
const tmp = path.join(HERE, '.timeline.bundle.mjs');
fs.writeFileSync(tmp, res.outputFiles[0].text);
const {SCRIPT, DURATION, seqAt, keyAt, SEQ, contactAt, wheelAt} = await import(tmp);
fs.rmSync(tmp);

const r3 = (x) => Math.round(x * 1000) / 1000;
const out = {
  duration: DURATION,
  beats: [...new Set(SCRIPT.map((e) => e.t))],
  presses: SCRIPT.filter((e) => e.t > 0 && (e.seq || e.display || e.link || e.dpi) && e.seq !== 'rest').map((e) => e.t),
  cuts: SCRIPT.filter((e) => e.view && e.t > 0).map((e) => e.t),
  bigs: SCRIPT.filter((e) => e.big).map((e) => e.t),
  explode: SCRIPT.filter((e) => e.display === 'exploded').map((e) => e.t),
  flicks: [],
  lifts: [],
  setdowns: [],
  closes: [],
  opens: [],
  detents: [],
};
// the film's cues, from its keys
const rise = (key, lvl = 0.5) => {
  const dt = 0.005;
  for (let t = dt; t < DURATION; t += dt) if (keyAt(key, t - dt) < lvl && keyAt(key, t) >= lvl) return r3(t);
  return null;
};
const keyStart = (key, v) => SCRIPT.find((e) => e.set && e.set[key] === v && e.t > 0)?.t ?? null;
out.sweep = {t: keyStart('sweep', 1), dur: SCRIPT.find((e) => e.set && e.set.sweep === 1 && e.t > 0)?.dur ?? 4};
out.glowOn = keyStart('gate', 1);
out.titleIn = keyStart('title', 1);
out.studioUp = keyStart('studio', 1);
out.studioDown = keyStart('studio', 0);
out.endcard = keyStart('endcard', 1);
out.studioHalf = rise('studio');

// sample the film at 0.25 ms: gesture events in film time
const dt = 0.00025;
let prev = null;
let flick = null;
for (let t = 0; t <= DURATION; t += dt) {
  const s = seqAt(t);
  const S = SEQ[s.seq];
  if (prev && prev.t0 === s.t0) {
    const a = prev.tau;
    const b = s.tau;
    for (const [t0, T, D] of S.moves) {
      if (a < t0 && b >= t0) flick = {t: t, tau1: t0 + T, mm: D};
      if (flick && a < flick.tau1 && b >= flick.tau1) {
        out.flicks.push({t: r3(flick.t), duration: r3(t - flick.t), mm: String(flick.mm)});
        flick = null;
      }
    }
    for (const [up, down, , ramp] of S.lifts) {
      if (a < up && b >= up) out.lifts.push(r3(t));
      if (a < down + ramp && b >= down + ramp) out.setdowns.push(r3(t));
    }
    for (const btn of ['L', 'R']) {
      const c0 = contactAt(s.seq, btn, a);
      const c1 = contactAt(s.seq, btn, b);
      if (!c0 && c1) out.closes.push({t: r3(t), rate: Math.round(s.rate * 1000) / 1000, btn});
      if (c0 && !c1) out.opens.push({t: r3(t), rate: Math.round(s.rate * 1000) / 1000, btn});
    }
    if (Math.round(wheelAt(s.seq, a).detents) !== Math.round(wheelAt(s.seq, b).detents)) out.detents.push(r3(t));
  } else flick = null;
  prev = {t0: s.t0, tau: s.tau};
}
fs.writeFileSync(path.join(ROOT, 'examples/m1pro/m1pro-film/timeline.json'), JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])));
console.log('closes', out.closes, '\nopens', out.opens, '\nflicks', out.flicks);
