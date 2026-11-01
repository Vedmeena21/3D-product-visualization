// The one input: tau, seconds into a gesture. Three gestures (flick, click, scroll) give the hand's motion in closed
// form: position along the pad (minimum-jerk moves), lift height, the left and right plunger travel and the wheel
// angle. Everything the sensor, the switches, the encoder and the reports do follows from them. No three.js here.
// Quantities that need history (counts while the sensor is tracking, contact with hysteresis) are tabulated at load.
import {DETENTS, LINKS, SPEC, SWITCH} from './dims.js';

const clamp01 = (u) => Math.min(1, Math.max(0, u));
// minimum-jerk position and its derivatives (per unit u)
const mj = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (10 + u * (-15 + 6 * u)));
const mjv = (u) => (u <= 0 || u >= 1 ? 0 : 30 * u * u * (1 - u) * (1 - u));
const mja = (u) => (u <= 0 || u >= 1 ? 0 : 60 * u * (1 - u) * (1 - 2 * u));
const G0 = 9806.65; // mm/s²

// ------------------------------------------------------------ gestures
// moves: [t0, T, D mm] along the pad (+ = the mouse's right); lifts: [up, down, H mm, ramp]; presses: [t0, t1, travel]
// for the left (L) and right (R) plungers; spins: [t0, T, detents] (+ = toward the user, scroll down)
export const SEQ = {
  flick: {
    dur: 3.6,
    label: 'FLICK',
    moves: [[0.35, 0.25, 100], [1.2, 0.6, -100], [2.35, 0.55, 8], [2.95, 0.55, -8]],
    lifts: [[1.0, 1.95, 4, 0.18]],
    presses: {L: [], R: []},
    spins: [],
    phases: [
      [0, 'HAND AT REST'],
      [0.35, 'FLICK · 100 MM IN 0.25 S'],
      [0.6, 'STOP'],
      [1.0, 'LIFT · SENSOR GATES OFF ABOVE THE LOD'],
      [1.2, 'REPOSITION IN THE AIR · NO COUNTS'],
      [1.95, 'SET DOWN · TRACKING AGAIN'],
      [2.35, 'SLOW DRIFT ≈ 1 IPS · COUNTS QUANTISE'],
      [3.5, 'REST'],
    ],
  },
  click: {
    dur: 2.4,
    label: 'CLICK',
    moves: [],
    lifts: [],
    presses: {L: [[0.4, 0.6, 0.55], [0.85, 1.03, 0.55]], R: [[1.55, 1.78, 0.55]]},
    spins: [],
    phases: [
      [0, 'FINGER ON THE LEFT BUTTON'],
      [0.4, 'PRESS · 0.3 MM TO CONTACT'],
      [0.6, 'RELEASE · OPENS 0.12 MM HIGHER'],
      [0.85, 'SECOND CLICK'],
      [1.2, 'DOUBLE CLICK SENT'],
      [1.55, 'RIGHT BUTTON'],
      [1.9, 'REST'],
    ],
  },
  // the hand off the mouse: the film's opening and close
  rest: {dur: 8, label: 'REST', moves: [], lifts: [], presses: {L: [], R: []}, spins: [], phases: [[0, 'HAND AT REST']]},
  scroll: {
    dur: 2.6,
    label: 'SCROLL',
    moves: [],
    lifts: [],
    presses: {L: [], R: []},
    spins: [[0.3, 0.95, 6], [1.55, 0.6, -3]],
    phases: [
      [0, 'FINGER ON THE WHEEL'],
      [0.3, 'SCROLL DOWN · 6 DETENTS'],
      [1.25, 'DETENT HOLDS THE WHEEL'],
      [1.55, 'SCROLL UP · 3 DETENTS'],
      [2.15, 'REST'],
    ],
  },
};
export const SEQ_KEYS = ['flick', 'click', 'scroll'];
export const phaseAt = (seq, tau) => SEQ[seq].phases.filter(([a]) => a <= tau).pop()[1];

export const handAt = (seq, tau) => {
  const S = SEQ[seq];
  let x = 0;
  let v = 0;
  let a = 0;
  for (const [t0, T, D] of S.moves) {
    const u = (tau - t0) / T;
    x += D * mj(u);
    v += (D / T) * mjv(u);
    a += (D / (T * T)) * mja(u);
  }
  let h = 0;
  for (const [up, down, H, r] of S.lifts) h += H * (mj((tau - up) / r) - mj((tau - down) / r));
  return {x, v, a, h};
};
// plunger travel: the finger drives the paddle down in 40 ms, holds, lets go in 30 ms
const press = (list, tau) => {
  let p = 0;
  for (const [t0, t1, d] of list) p = Math.max(p, d * (mj((tau - t0) / 0.04) - mj((tau - t1) / 0.03)));
  return p;
};
// the wheel: the finger turns it, the detent spring snaps each step
const snap = (r) => {
  const n = Math.floor(r);
  const f = r - n;
  return n + mj(mj(f));
};
/** a plunger's travel (mm) at tau */
export const pressAt = (seq, b, tau) => press(SEQ[seq].presses[b], tau);
export const wheelAt = (seq, tau) => {
  let r = 0;
  for (const [t0, T, n] of SEQ[seq].spins) r += n * clamp01((tau - t0) / T);
  const steps = Math.sign(r) * snap(Math.abs(r));
  return {detents: steps, angle: (steps * 360) / DETENTS};
};

// ------------------------------------------------------------ tables (history), 0.25 ms grid = one 4K report
const DT = 0.00025;
const TAB = {};
for (const key of Object.keys(SEQ)) {
  const S = SEQ[key];
  const n = Math.ceil(S.dur / DT) + 2;
  const track = {1: new Float64Array(n), 2: new Float64Array(n)};
  const contact = {L: new Uint8Array(n), R: new Uint8Array(n)};
  const st = {L: 0, R: 0};
  for (const lod of [1, 2]) {
    let X = 0;
    let prev = handAt(key, 0).x;
    for (let i = 0; i < n; i++) {
      const hd = handAt(key, i * DT);
      // the sensor counts only while the lens is within the lift-off distance of the pad
      if (i && hd.h < lod) X += hd.x - prev;
      prev = hd.x;
      track[lod][i] = X;
    }
  }
  for (let i = 0; i < n; i++) {
    for (const b of ['L', 'R']) {
      const p = press(S.presses[b], i * DT);
      // contact closes at the pre-travel, reopens only once the plunger is back past the hysteresis
      if (p >= SWITCH.pt) st[b] = 1;
      else if (p <= SWITCH.pt - SWITCH.md) st[b] = 0;
      contact[b][i] = st[b];
    }
  }
  TAB[key] = {n, track, contact};
}
const lookF = (A, tau) => {
  const u = Math.max(0, Math.min(A.length - 2, tau / DT));
  const i = Math.floor(u);
  return A[i] + (A[i + 1] - A[i]) * (u - i);
};
const lookI = (A, tau) => A[Math.max(0, Math.min(A.length - 1, Math.floor(tau / DT + 1e-6)))];
/** sensor counts at tau (integer, toward the mouse's right) */
export const countsAt = (seq, tau, dpi, lod = 1) => Math.floor((lookF(TAB[seq].track[lod], tau) * dpi) / 25.4);
export const contactAt = (seq, b, tau) => lookI(TAB[seq].contact[b], tau);
/** the last edge of a button's contact before tau: [time, state] */
export const lastEdge = (seq, b, tau) => {
  const A = TAB[seq].contact[b];
  let i = Math.min(A.length - 1, Math.floor(tau / DT));
  const s = A[i];
  while (i > 0 && A[i - 1] === s) i--;
  return i === 0 ? [-1, s] : [i * DT, s];
};

/** everything the console and the scene read at one instant */
export function stateAt(seq, tau, cfg) {
  const {dpi, link, lod} = cfg;
  const L = LINKS[link];
  const hd = handAt(seq, tau);
  const tracking = hd.h < lod;
  const f = L.rate;
  const k = Math.floor(tau * f + 1e-9);
  // the last reports: counts sent in each report interval
  const reports = [];
  const K = Math.min(k, 96);
  for (let j = k - K + 1; j <= k; j++) reports.push(countsAt(seq, j / f, dpi, lod) - countsAt(seq, (j - 1) / f, dpi, lod));
  const ips = Math.abs(hd.v) / 25.4;
  const g = Math.abs(hd.a) / G0;
  const pL = press(SEQ[seq].presses.L, tau);
  const pR = press(SEQ[seq].presses.R, tau);
  const wh = wheelAt(seq, tau);
  const ph = ((wh.angle / (360 / DETENTS)) % 1 + 1) % 1;
  // lighting: the default "light off when moving" fades the glow while the mouse moves or is lifted
  let moving = 0;
  for (const [t0, T] of SEQ[seq].moves) moving = Math.max(moving, mj((tau - t0 + 0.05) / 0.12) * (1 - mj((tau - t0 - T - 0.35) / 0.4)));
  for (const [up, down] of SEQ[seq].lifts) moving = Math.max(moving, mj((tau - up) / 0.12) * (1 - mj((tau - down - 0.35) / 0.4)));
  return {
    seq,
    tau,
    x: hd.x,
    v: hd.v,
    a: hd.a,
    h: hd.h,
    ips,
    g,
    tracking,
    counts: countsAt(seq, tau, dpi, lod),
    reports,
    rate: f,
    report: k,
    pL,
    pR,
    cL: contactAt(seq, 'L', tau),
    cR: contactAt(seq, 'R', tau),
    wheel: wh.angle,
    detent: Math.round(wh.detents),
    A: ph < 0.5 ? 1 : 0,
    B: (ph + 0.25) % 1 < 0.5 ? 1 : 0,
    glow: 1 - moving,
    force: (Math.min(pL, SWITCH.pt) / SWITCH.pt) * SWITCH.of,
  };
}

// ------------------------------------------------------------ hand checks (printed by the console's footnotes)
export const CHECK = {
  // D = 100 mm, T = 0.25 s: v_peak = 1.875 D/T, a_peak = 5.77 D/T²
  vPeak: (1.875 * 100) / 0.25, // 750 mm/s = 29.5 IPS
  aPeak: (5.7735 * 100) / (0.25 * 0.25) / G0, // 0.94 G
  forceN: (88 / 1000) * ((5.7735 * 100) / (0.25 * 0.25) / 1000), // 0.81 N
  countsPerReport1K: (750 / 25.4) * (SPEC.dpiDefault / 1000), // 47.2
  worstPerReport1K: (SPEC.ipsMax * SPEC.dpiMax) / 1000, // 16,900, fits int16
};
