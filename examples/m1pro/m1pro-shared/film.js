// GRAVASTAR MERCURY M1 PRO, the film: the mouse (mouse.js) on its pad (stage.js) under the console (console.js).
// It opens in a dark room, a reflection sweeping the skeleton until the shell lights; the studio comes up and the
// console builds panel by panel. The operator flicks it, cuts it down the centreline to watch the lens leave the pad,
// x-rays it for the left switch (slowed twentyfold through the press and the release, a schematic of the switch's
// blade beside it) and the wheel, turns it over for the slider and the receiver, flicks again on the 4K link,
// explodes it layer by layer and closes on a card. Each shot changes on a bar of the score (92 bpm). Every pose and
// number is a pure function of t.
import {runSim} from 'teardown-kit/runtime.js';
import {createConsole, DISPLAY, PANELS} from './console.js';
import {SPEC, SWITCH} from './dims.js';
import {contactAt, lastEdge, phaseAt, pressAt, SEQ, stateAt, wheelAt} from './model.js';
import {createStage} from './stage.js';

const BAR = (4 * 60) / 92;
const B = (n) => Math.round(n * BAR * 100) / 100;
// the left click, slowed through the press and the release: [tau, rate], linear in between
const CLICK_WARP = [[0, 1], [0.33, 1], [0.38, 0.05], [0.46, 0.05], [0.5, 0.5], [0.56, 0.5], [0.59, 0.06], [0.64, 0.06], [0.7, 1], [2.4, 1]];
const F = ['01', '02', '10'];
export const SCRIPT = [
  // 1 · the hook: a flick on the 4K link at 3200 DPI, apart layer by layer, back together, an orbit and a flick
  {t: 0, seq: 'flick', view: 'hero', link: 'k4', dpi: 3200, set: {studio: 1, reveal: 1, title: 0, endcard: 0, gate: 1, sweep: 1, loupe: 0}, dur: 0.001, focus: F},
  {t: 0.2, big: ['23.6', '', 'COUNTS PER 4K REPORT AT 29.5 IPS · 3200 DPI']},
  {t: 2.2, big: ['0 OR 1', '', 'COUNTS PER 4K REPORT AT ≈ 1 IPS · THE DRIFT QUANTISES']},
  {t: 3.8, big: null},
  {t: 4.0, display: 'exploded', focus: []},
  {t: 5.1, display: 'labels'},
  {t: B(3) + 0.2, display: 'labels'},
  {t: B(3) + 0.5, display: 'exploded'},
  {t: B(3) + 1.2, link: 'k1'},
  {t: B(3) + 1.5, dpi: 1600},
  {t: B(4), display: 'orbit', focus: F},
  {t: B(4) + 0.4, seq: 'flick'},
  {t: B(6) - 0.6, display: 'orbit'},
  // 2 · a dark room: a reflection sweeps the skeleton, the shell lights, the title
  // the hook's flick ends with the lights still off (off while moving); they stay off until the shell lights
  {t: B(6) - 0.001, set: {gate: 0}, dur: 0.001},
  {t: B(6), seq: 'rest', view: 'reveal', set: {studio: 0, reveal: 0, sweep: 0}, dur: 1.0, focus: null},
  {t: B(6) + 1.0, set: {sweep: 1}, dur: 4.0},
  {t: B(6) + 1.4, set: {title: 1}, dur: 0.9},
  {t: B(7), set: {gate: 1}, dur: 1.1},
  {t: B(8) - 0.8, set: {title: 0}, dur: 0.7},
  {t: B(8) - 0.4, set: {studio: 1}, dur: 1.6},
  {t: B(8), set: {reveal: 1}, dur: 1.8},
  // 3 · hero flick
  {t: B(8.5), seq: 'flick', view: 'hero', focus: F},
  {t: B(8.5) + 0.5, big: ['0.94', 'G', 'PEAK ACCELERATION · 100 MM FLICK IN 0.25 S · 29.5 IPS']},
  // 4 · the sensor, cut down the centreline
  {t: B(10), view: 'sensor', big: null},
  {t: B(10) + 0.6, display: 'section'},
  {t: B(10) + 1.2, seq: 'flick', rate: 0.5},
  {t: B(10) + 1.8, display: 'labels', big: ['1', 'MM', 'LIFT-OFF DISTANCE · ABOVE IT THE SENSOR STOPS COUNTING']},
  {t: B(13) - 0.9, display: 'labels', big: null},
  {t: B(13) - 0.6, display: 'section'},
  // 5 · the left switch, x-rayed, the click slowed through the press and the release
  {t: B(13), view: 'switch', focus: ['03', '10']},
  {t: B(13) + 0.4, display: 'xray'},
  {t: B(13) + 0.8, set: {loupe: 1}, dur: 0.7, display: 'labels', big: ['0.30', 'MM', 'PRE-TRAVEL TO CONTACT · OMRON D2FC (CATALOGUE ±0.2)']},
  {t: B(13) + 1.2, seq: 'click', warp: CLICK_WARP},
  {t: B(16) - 0.7, set: {loupe: 0}, dur: 0.6, display: 'labels', big: null},
  // 6 · the wheel
  {t: B(16), view: 'wheel', focus: ['03', '10']},
  {t: B(16) + 0.5, seq: 'scroll', rate: 0.8, big: ['15°', '', 'PER DETENT · 24 DETENTS / REV (ASSUMED)']},
  {t: B(18) - 0.6, display: 'xray', big: null},
  // 7 · the underside, the link and the DPI
  {t: B(18), view: 'bottom', focus: ['06', '11']},
  {t: B(18) + 0.6, display: 'labels'},
  {t: B(18) + 1.2, link: 'bt'},
  {t: B(18) + 2.3, link: 'k4', big: ['4', 'KHZ', '0.25 MS PER REPORT · WITH THE 4K RECEIVER (SOLD SEPARATELY)']},
  {t: B(18) + 3.1, dpi: 3200},
  {t: B(20) - 0.6, display: 'labels', big: null},
  // 8 · the card
  {t: B(20), seq: 'rest', view: 'card', set: {reveal: 0}, dur: 1.4, focus: null},
  {t: B(20) + 1.0, set: {endcard: 1}, dur: 1.0},
];
export const DURATION = B(22);
export const DEFAULTS = {duration: DURATION, fps: 60, theme: 'light', hud: {enabled: false, title: 'm1pro', subtitle: ''}, director: {enabled: false}, watermark: ''};
const D2R = Math.PI / 180;
const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const ss = (a, b, t) => smoother((t - a) / (b - a));

// ------------------------------------------------------------ the speed ramp: film seconds -> tau for a warped gesture
// rate(tau) is piecewise linear; film time is the integral of dtau / rate, tabulated once at 0.5 ms of film time
const WARPS = new Map();
const warpTable = (warp, dur) => {
  if (WARPS.has(warp)) return WARPS.get(warp);
  const rate = (tau) => {
    let i = 0;
    while (i < warp.length - 2 && warp[i + 1][0] <= tau) i++;
    const [a, ra] = warp[i];
    const [b, rb] = warp[i + 1];
    return ra + (rb - ra) * Math.min(1, Math.max(0, (tau - a) / (b - a)));
  };
  const DTF = 0.0005;
  const taus = [0];
  let tau = 0;
  while (tau < dur) {
    // midpoint step
    const r = rate(tau + 0.5 * DTF * rate(tau));
    tau = Math.min(dur, tau + DTF * r);
    taus.push(tau);
  }
  const tab = {taus, DTF, rate, end: (taus.length - 1) * DTF};
  WARPS.set(warp, tab);
  return tab;
};
const warpAt = (e, dt) => {
  const W = warpTable(e.warp, SEQ[e.seq].dur);
  const u = Math.max(0, dt / W.DTF);
  const i = Math.min(W.taus.length - 2, Math.floor(u));
  const tau = Math.min(SEQ[e.seq].dur, W.taus[i] + (W.taus[i + 1] - W.taus[i]) * Math.min(1, u - i));
  return {tau, rate: W.rate(tau)};
};
/** film seconds a warped gesture takes */
export const warpSpan = (e) => warpTable(e.warp, SEQ[e.seq].dur).end;

// ------------------------------------------------------------ script state at film time t
export const seqAt = (t) => {
  const e = SCRIPT.filter((x) => x.seq && x.t <= t).pop();
  if (e.warp) return {seq: e.seq, ...warpAt(e, t - e.t), t0: e.t};
  return {seq: e.seq, tau: Math.min(SEQ[e.seq].dur, (t - e.t) * (e.rate ?? 1)), rate: e.rate ?? 1, t0: e.t};
};
export const displayAt = (t) => {
  const out = Object.fromEntries(DISPLAY.map((k) => [k, 0]));
  for (const e of SCRIPT) if (e.display && e.t <= t) out[e.display] = out[e.display] ? 0 : 1;
  return out;
};
const lastFlip = (key, t) => SCRIPT.filter((e) => e.display === key && e.t <= t).pop()?.t ?? -9;
export const easedDisplay = (key, t, dur = 0.7) => {
  const on = displayAt(t)[key];
  const k = ss(lastFlip(key, t), lastFlip(key, t) + dur, t);
  return on ? k : 1 - k;
};
export const linkAt = (t) => SCRIPT.filter((e) => e.link && e.t <= t).pop()?.link ?? 'k1';
export const dpiAt = (t) => SCRIPT.filter((e) => e.dpi && e.t <= t).pop()?.dpi ?? SPEC.dpiDefault;
/** a continuous film parameter (studio, reveal, title, endcard, gate, sweep, loupe), eased between its keys */
export const keyAt = (key, t, def = 0) => {
  const ks = SCRIPT.filter((e) => e.set && key in e.set);
  let prev = def;
  let out = def;
  for (const e of ks) {
    if (e.t > t) break;
    const v = e.set[key];
    out = prev + (v - prev) * ss(e.t, e.t + (e.dur ?? 0.8), t);
    prev = v;
  }
  return out;
};
/** the feature number on screen: [value, unit, caption] and its opacity */
export const bigAt = (t) => {
  const ks = SCRIPT.filter((e) => 'big' in e);
  const i = ks.findLastIndex((e) => e.t <= t);
  if (i < 0 || !ks[i].big) return null;
  const next = ks[i + 1];
  const k = ss(ks[i].t, ks[i].t + 0.45, t) * (next ? 1 - ss(next.t - 0.35, next.t, t) : 1);
  return {v: ks[i].big[0], unit: ks[i].big[1], cap: ks[i].big[2], k};
};
/** each panel's opacity: the panels the shot is about stay, the rest step back */
export const focusAt = (t) => {
  const ks = SCRIPT.filter((e) => 'focus' in e);
  const i = ks.findLastIndex((e) => e.t <= t);
  const lvl = (f, id) => (!f ? 1 : f.includes(id) ? 1 : 0.34);
  const k = ss(ks[i].t, ks[i].t + 0.6, t);
  return Object.fromEntries(PANELS.map((id) => [id, i > 0 ? lvl(ks[i - 1].focus, id) + (lvl(ks[i].focus, id) - lvl(ks[i - 1].focus, id)) * k : lvl(ks[i].focus, id)]));
};

// ------------------------------------------------------------ views (mm, degrees; target relative to the mouse)
export const VIEW_FN = {
  reveal: (u) => ({tx: -8, ty: 12, tz: 0, az: 110 + 3.4 * u, el: 12 + 0.6 * u, d: 250 - 3.5 * u, sx: 250, sy: -14, follow: 0.8}),
  hero: (u) => ({tx: -4, ty: 14, tz: 0, az: 136 + 2.2 * u, el: 23, d: 315, sx: 0, sy: -30, follow: 0.8}),
  top: (u) => ({tx: 0, ty: 10, tz: 0, az: 0.5 + 0.6 * u, el: 88.5, d: 380, sx: 0, sy: -30, follow: 0.85}),
  side: (u) => ({tx: 0, ty: 17, tz: 0, az: 181 + 0.8 * u, el: 5, d: 360, sx: 0, sy: -40, follow: 0.85}),
  bottom: (u) => ({tx: 2, ty: 8, tz: 0, az: 152 + 2 * u, el: -58, d: 330, sx: 0, sy: -30, follow: 0}),
  switch: (u) => ({tx: 34, ty: 14, tz: -12, az: 152 + 1.4 * u, el: 24, d: 270, sx: -150, sy: 10, follow: 0.9, travelX: 4}),
  wheel: (u) => ({tx: 30, ty: 18, tz: 0, az: 140 + 2.5 * u, el: 20, d: 270, sx: 0, sy: 20, follow: 0.9}),
  sensor: (u) => ({tx: -2, ty: 14, tz: 0, az: 184 + 0.8 * u, el: 6, d: 300, sx: 0, sy: 40, follow: 0.6}),
  card: (u) => ({tx: -6, ty: 14, tz: 0, az: 128 + 5 * u, el: 20, d: 300, sx: 270, sy: -20, follow: 0}),
};
// what the floor note says in each view
export const VIEW_NOTE = {
  reveal: '',
  hero: 'GUNMETAL GRAY<br>ON A CLOTH PAD',
  top: 'TOP · 12 OPENINGS<br>DPI RING · TAIL NOTCH',
  side: 'LEFT SIDE · 6 VENTS<br>FORWARD / BACK BUTTONS',
  bottom: 'UNDERSIDE · 6 PTFE SKATES<br>RECEIVER STORED UPRIGHT',
  switch: 'PADDLE TRAVEL DRAWN ×4<br>HINGE POSITION ASSUMED',
  wheel: 'WHEEL Ø23.5 × 7.3 MM<br>DETENTS: 24 ASSUMED',
  sensor: 'SECTION AT THE CENTRELINE<br>IMAGING SPOT SCHEMATIC',
  card: '',
};
const VIEWS = SCRIPT.filter((e) => e.view).map((e) => [e.t, e.view]);
const blend = (a, b, k) => {
  const o = {};
  for (const key in b) o[key] = key === 'az' ? a.az + ((((b.az - a.az + 540) % 360) - 180) * k) : (a[key] ?? b[key]) + (b[key] - (a[key] ?? b[key])) * k;
  const swing = Math.min(1, Math.abs(((b.az - a.az + 540) % 360) - 180) / 90);
  o.d += Math.max(0, Math.max(a.d, b.d) * (1 + 0.25 * swing) - o.d) * Math.sin(Math.PI * k);
  return o;
};
// the orbit turns the camera 16°/s while it is on; what it turned within a view stays with that view, so switching
// it off holds the angle and the next cut blends from where the camera really is
const ORBIT_ON = (() => {
  const spans = [];
  let on = null;
  for (const e of SCRIPT) if (e.display === 'orbit') on === null ? (on = e.t) : (spans.push([on, e.t]), (on = null));
  if (on !== null) spans.push([on, Infinity]);
  return spans;
})();
const orbitDeg = (t0, t) => 16 * ORBIT_ON.reduce((a, [s, e]) => a + Math.max(0, Math.min(t, e) - Math.max(t0, s)), 0);
const viewCam = (i, t) => {
  const c = VIEW_FN[VIEWS[i][1]](t - VIEWS[i][0]);
  return {travelX: 1, ...c, az: c.az + orbitDeg(VIEWS[i][0], t)};
};
export const camAt = (t) => {
  let i = 0;
  while (i < VIEWS.length - 1 && VIEWS[i + 1][0] <= t) i++;
  let o = viewCam(i, t);
  if (i > 0) {
    const k = ss(VIEWS[i][0], VIEWS[i][0] + 1.6, t);
    if (k < 1) o = blend(viewCam(i - 1, t), o, k);
  }
  // the exploded view backs the camera off so the layers fit
  const ex = easedDisplay('exploded', t, 2.0);
  return {...o, d: o.d * (1 + 0.9 * ex), ty: o.ty + 52 * ex, follow: (o.follow ?? 0.8) * (1 - ex)};
};
export const viewAt = (t) => VIEWS.filter(([a]) => a <= t).pop();

// ------------------------------------------------------------ the operator's pointer
const REST = [[860, 470], [760, 420], [940, 520], [820, 380]];
export function makeCursor(ui) {
  const EV = SCRIPT.filter((e) => e.t > 0).flatMap((e) => {
    const out = [];
    const at = (t, k) => ui.spots[k] && out.push({t, spot: ui.spots[k]});
    if (e.seq) at(e.t, e.seq);
    if (e.view) at(e.t + (e.seq ? 0.35 : 0), e.view);
    if (e.display) at(e.t, e.display);
    if (e.link) at(e.t, 'link_' + e.link);
    if (e.dpi) at(e.t, 'dpi_' + e.dpi);
    return out;
  });
  const WP = [[0, 900, 600]];
  EV.forEach((e, i) => {
    WP.push([e.t - 0.16, ...e.spot], [e.t + 0.22, ...e.spot]);
    WP.push([e.t + 1.4, ...REST[i % REST.length]]);
  });
  WP.sort((a, b) => a[0] - b[0]);
  return (t) => {
    let i = 0;
    while (i < WP.length - 2 && t > WP[i + 1][0]) i++;
    const [t0, x0, y0] = WP[i];
    const [t1, x1, y1] = WP[i + 1];
    const k = ss(t0, t1, t);
    const len = Math.hypot(x1 - x0, y1 - y0);
    const bow = Math.sin(Math.PI * k) * Math.min(24, len * 0.07);
    let press = false;
    let ring = 0;
    let rx = 0;
    let ry = 0;
    for (const e of EV) {
      if (t >= e.t - 0.07 && t < e.t + 0.09) press = true;
      if (t >= e.t && t < e.t + 0.55) {
        ring = 1 - (t - e.t) / 0.55;
        [rx, ry] = e.spot;
      }
    }
    return {x: x0 + (x1 - x0) * k + (len ? (-(y1 - y0) / len) * bow : 0), y: y0 + (y1 - y0) * k + (len ? ((x1 - x0) / len) * bow : 0), press, ring, ringX: rx, ringY: ry};
  };
}

// ------------------------------------------------------------ labels: parts in the mouse frame, per view
const PARTS = {
  skeleton: ['MAGNESIUM SKELETON', 'TRACED · 1.4 MM WALL ASSUMED', 'skeleton'],
  paddle: ['LEFT BUTTON', 'HINGED AT THE REAR (ASSUMED)', 'skeleton'],
  wheel: ['SCROLL WHEEL', 'Ø23.5 × 7.3 MM · TRACED', 'wheel'],
  encoder: ['ENCODER', 'CHANGFENG · 24 DETENTS ASSUMED', 'pcb'],
  sensor: ['PAW3395', '26K DPI · 650 IPS · 50 G', 'pcb'],
  lens: ['LENS', 'LIFT-OFF 1 OR 2 MM', 'pcb'],
  mcu: ['nRF52833', 'RADIO + MCU · 7 × 7 MM', 'pcb'],
  lb: ['OMRON D2FC', 'CLOSES AT 0.3 MM · 50M', 'pcb'],
  rb: ['RIGHT SWITCH', 'OMRON BLUE DOT', 'pcb'],
  usb: ['USB-C', 'WIRED 1 KHZ · FULL SPEED', 'pcb'],
  battery: ['602030 CELL', '300 MAH · 1.11 WH (FCC LABEL)', 'battery'],
  key: ['KEY BOARD', 'DPI SWITCH K1 · SIDE B4 / B5', 'key'],
  side: ['SIDE BUTTONS', 'FORWARD · BACK', 'skeleton'],
  dongle: ['1K RECEIVER', 'STORED UPRIGHT IN THE BASE', 'base'],
  slider: ['MODE SLIDER', '2.4G · OFF · BT', 'pcb'],
  leds: ['RGB LEDS ×3', 'OFF WHILE MOVING (DEFAULT)', 'pcb'],
  shell: ['INNER SHELL', 'LIT FROM THE REAR LEDS', 'shell'],
  antenna: ['CHIP ANTENNA', '2.4 GHZ', 'pcb'],
  skates: ['PTFE SKATES ×6', 'CORNERS · LENS RING · POCKET', 'base'],
};
export const VIEW_PARTS = {
  reveal: [],
  card: [],
  hero: ['skeleton', 'paddle', 'wheel', 'side', 'shell'],
  top: ['skeleton', 'paddle', 'wheel', 'shell'],
  side: ['skeleton', 'side', 'paddle', 'shell'],
  bottom: ['slider', 'dongle', 'lens', 'skates'],
  switch: ['lb', 'paddle', 'encoder', 'mcu', 'usb', 'antenna'],
  wheel: ['wheel', 'encoder', 'rb', 'lb', 'usb'],
  sensor: ['sensor', 'lens', 'battery', 'key', 'mcu', 'leds'],
  exploded: ['skeleton', 'shell', 'key', 'battery', 'wheel', 'sensor', 'dongle'],
};
// with the switch detail open the labels keep to the left and only the three that matter stay
const LOUPE_PARTS = ['lb', 'paddle', 'mcu'];
/** label plates in two columns, numbered clockwise from the top right; `left` keeps them all on the left */
export function makeLabels(st) {
  return (keys, o, {left = false, maxY = 700} = {}) => {
    if (o < 0.02) return [];
    const A = st.mouse.anchors;
    const pts = keys
      .map((k) => ({k, at: st.project(A[k], PARTS[k][2])}))
      .filter((x) => x.at && x.at[0] > 330 && x.at[0] < 1290 && x.at[1] > 130 && x.at[1] < 740);
    const mid = left ? 1e9 : pts.length ? pts.reduce((a, b) => a + b.at[0], 0) / pts.length : 800;
    const L = pts.filter((x) => x.at[0] < mid).sort((a, b) => a.at[1] - b.at[1]);
    const R = pts.filter((x) => x.at[0] >= mid).sort((a, b) => a.at[1] - b.at[1]);
    const out = [];
    const stack = (col, x) => {
      let y = 150;
      const placed = [];
      for (const c of col) {
        y = Math.max(y, Math.min(maxY - 36 * (col.length - 1 - placed.length), c.at[1] - 10));
        placed.push({name: PARTS[c.k][0], sub: PARTS[c.k][1], at: c.at, label: [x, y], w: 196, o});
        y += 38;
      }
      return placed;
    };
    const r = stack(R, 1080);
    const l = stack(L, 344);
    [...r, ...l.reverse()].forEach((c, i) => out.push({...c, n: String(i + 1).padStart(2, '0')}));
    return out;
  };
}

// ------------------------------------------------------------ the console from a frame's state
export const stateChip = (m, lod) => {
  if (m.h >= lod) return ['Lifted', `${m.h.toFixed(1)} MM · ABOVE THE ${lod} MM LOD`, 'air'];
  if (m.cL || m.cR) return [m.cL ? 'Left click' : 'Right click', 'CONTACT CLOSED', 'ok'];
  if (Math.abs(m.v) > 3) return ['Tracking', `${m.ips.toFixed(1)} IPS · ${m.counts.toLocaleString('en-US')} COUNTS`, 'ok'];
  if (m.h > 0.05) return ['Lifting', `${m.h.toFixed(1)} MM · STILL TRACKING`, 'move'];
  return ['At rest', m.glow > 0.5 ? 'LIGHTS ON · NO MOTION' : 'LIGHTS RETURNING', 'ok'];
};
/** the switch and wheel traces over the last 0.3 s of the gesture (sampled, pure) */
export const traceAt = (seq, tau) => {
  const span = 0.3;
  const n = 121;
  const tr = {p: [], c: [], A: [], B: [], edges: [], span};
  let prev = null;
  for (let i = 0; i < n; i++) {
    const tt = tau - span + (i / (n - 1)) * span;
    const q = Math.max(0, tt);
    tr.p.push(pressAt(seq, 'L', q));
    const c = contactAt(seq, 'L', q);
    tr.c.push(c);
    if (prev === 0 && c === 1) tr.edges.push((i / (n - 1)) * span);
    prev = c;
    const ph = ((wheelAt(seq, q).angle / 15) % 1 + 1) % 1;
    tr.A.push(ph < 0.5 ? 1 : 0);
    tr.B.push((ph + 0.25) % 1 < 0.5 ? 1 : 0);
  }
  return tr;
};
/** the left switch for the detail: travel, contact, how far through the snap, which way the plunger moves */
export const switchAt = (seq, tau, rate) => {
  const p = pressAt(seq, 'L', tau);
  const dp = pressAt(seq, 'L', tau + 0.0005) - pressAt(seq, 'L', Math.max(0, tau - 0.0005));
  const [te, c] = lastEdge(seq, 'L', tau);
  // the blade crosses between the contacts in about half a millisecond (schematic)
  const age = te < 0 ? 1 : (tau - te) / 0.0005;
  const snap = c ? Math.min(1, age) : 1 - Math.min(1, age);
  // a ring at the switch for half a second of film after each closing
  const ringAge = te < 0 || !c ? 9 : (tau - te) / Math.max(0.02, rate);
  return {p, c, snap, dir: Math.sign(dp), ring: ringAge < 0.6 ? 1 - ringAge / 0.6 : 0, rate};
};
export function makeConsoleFrame(ui, st) {
  const labels = makeLabels(st);
  return (s) => {
    const S = SEQ[s.seq];
    const m = s.m;
    const loupe = s.loupe ?? 0;
    const keys = s.explode > 0.5 ? VIEW_PARTS.exploded : loupe > 0.05 ? LOUPE_PARTS : VIEW_PARTS[s.view];
    const A = st.mouse.anchors;
    // the lift drawn at the lens: the skate plane, the pad and the lift-off distance between them
    let dim = null;
    if (s.section && m.h > 0.15) {
      const a = st.project({x: A.lens.x, y: 0, z: A.lens.z}, 'pcb');
      const b = st.project({x: A.lens.x, y: -m.h, z: A.lens.z}, 'pcb');
      const lod = st.project({x: A.lens.x, y: -s.lod, z: A.lens.z}, 'pcb');
      if (a && b && lod) dim = {a, b, lod, h: m.h, lodMm: s.lod, k: Math.min(1, (m.h - 0.15) / 0.5)};
    }
    ui.update({
      m,
      state: stateChip(m, s.lod),
      seq: s.seq,
      prog: s.tau / S.dur,
      tau: s.tau,
      dur: S.dur,
      phase: phaseAt(s.seq, s.tau),
      link: s.link,
      dpi: s.dpi,
      lod: s.lod,
      view: s.view,
      display: s.display,
      paused: s.paused ?? false,
      speed: s.speed ?? 1,
      speedK: s.speedK ?? 0.45,
      trace: traceAt(s.seq, s.tau),
      note: s.explode > 0.5 ? 'EXPLODED BOTTOM-UP<br>BASE · BOARD · WHEEL · CELL · KEY · SHELL · SKELETON' : VIEW_NOTE[s.view],
      callouts: labels(keys ?? [], s.labels, {left: loupe > 0.05, maxY: s.big?.k > 0.05 ? 560 : 700}),
      cursor: s.cursor,
      reveal: s.reveal ?? 1,
      focus: s.focus,
      title: s.title ?? 0,
      endcard: s.endcard ?? 0,
      big: s.big,
      dim,
      loupe: loupe > 0.01 ? {k: loupe, at: st.project(A.lb, 'pcb'), ...switchAt(s.seq, s.tau, s.speed ?? 1)} : null,
    });
    return m;
  };
}
/** the scene state from the model and the displays */
export const sceneState = (m, o) => ({x: m.x, h: m.h, pL: m.pL, pR: m.pR, wheel: m.wheel, spot: m.tracking && o.section ? 0.9 : 0, ...o, glow: m.glow * (o.gate ?? 1)});

/** everything the film draws at t, shared with the live page's tour */
export const filmAt = (t) => {
  const {seq, tau, rate} = seqAt(t);
  const disp = displayAt(t);
  const [vt0, view] = viewAt(t);
  const sweep = keyAt('sweep', t);
  return {
    seq,
    tau,
    rate,
    link: linkAt(t),
    dpi: dpiAt(t),
    disp,
    view,
    since: t - vt0,
    explode: easedDisplay('exploded', t, 2.0),
    xray: easedDisplay('xray', t),
    section: easedDisplay('section', t, 0.6) > 0.5,
    labels: easedDisplay('labels', t, 0.5),
    studio: keyAt('studio', t, 1),
    reveal: keyAt('reveal', t, 1),
    title: keyAt('title', t),
    endcard: keyAt('endcard', t),
    gate: keyAt('gate', t, 1),
    envRot: -2.3 * (1 - sweep),
    loupe: keyAt('loupe', t),
    big: bigAt(t),
    focus: focusAt(t),
  };
};

export function makeFilm() {
  return async ({cfg, canvas, capture}) => {
    const st = createStage({canvas});
    // capture --config {"quality": {...}} overrides; the lite entry draws without AO or MSAA for software GL
    const q = cfg.quality ?? (window.__LITE ? {samples: 0, ao: false, shadow: 1024} : null);
    if (q) st.setQuality(q);
    const resize = () => st.resize(1600, 900, capture ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2));
    resize();
    const ui = createConsole(document.getElementById('app'));
    const cursorAt = makeCursor(ui);
    const frame = makeConsoleFrame(ui, st);
    window.M1 = st;
    return {
      resize,
      render(t) {
        const f = filmAt(t);
        const cam = camAt(t, f.disp.orbit);
        const m = stateAt(f.seq, f.tau, {dpi: f.dpi, link: f.link, lod: 1});
        st.frame(sceneState(m, {link: f.link, xray: f.xray, explode: f.explode, section: f.section, travelX: cam.travelX, studio: f.studio, envRot: f.envRot, gate: f.gate}), {...cam, az: cam.az * D2R, el: cam.el * D2R});
        const cursor = f.reveal > 0.6 ? cursorAt(t) : {x: -99, y: -99, press: false, ring: 0, ringX: 0, ringY: 0};
        frame({m, seq: f.seq, tau: f.tau, link: f.link, dpi: f.dpi, lod: 1, view: f.view, display: f.disp, explode: f.explode, section: f.section, labels: f.labels * ss(1.1, 1.7, f.since), cursor, speed: f.rate, speedK: (f.rate - 0.05) / 1.95, reveal: f.reveal, focus: f.focus, title: f.title, endcard: f.endcard, big: f.big, loupe: f.loupe});
        return {};
      },
    };
  };
}
void SWITCH;

export const run = () => runSim(DEFAULTS, makeFilm());
