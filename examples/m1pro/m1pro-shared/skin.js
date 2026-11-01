// The M1 Pro's skin: a parametric surface traced from the official renders (planform from the top view, crest and
// lower edge from the side view, a superellipse section between them), cut by the traced openings and thickened.
// Openings are signed-distance fields in their own view (top, left, right, front); the outer surface rolls over a
// quarter-round of one wall thickness at every opening, so the struts read as cast metal rather than a cut sheet.
// The same chart meshes the paddles and side buttons (the region inside an opening instead of outside it) and the
// inner shell (offset inward, no openings but the wheel and DPI bores).
//
// Frames: s = mm from the nose tip; three.js X = 62 - s (forward), Y up from the desk, Z toward the mouse's right.
import * as THREE from 'three';
import {CREST, FOOT, HOLES, PLAN, SECTION, WALL} from './dims.js';

// ------------------------------------------------------------ smooth tables (monotone cubic Hermite)
export function hermite(table) {
  const xs = table.map((p) => p[0]);
  const ys = table.map((p) => p[1]);
  const n = xs.length;
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = [d[0]];
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const r = a * a + b * b;
    if (r > 9) {
      const t = 3 / Math.sqrt(r);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    let j = n - 1;
    while (j - i > 1) {
      const k = (i + j) >> 1;
      if (xs[k] > x) j = k;
      else i = k;
    }
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
// the planform is interpolated squared, so the nose and tail close with a vertical tangent like a rounded end
const W2 = hermite(PLAN.map(([s, w]) => [s, w * w]));
export const halfWidth = (s) => Math.sqrt(Math.max(0, W2(s)));
export const crestAt = hermite(CREST);
export const footAt = hermite(FOOT);
export const S_END = PLAN[PLAN.length - 1][0];

// ------------------------------------------------------------ the surface
const {P: PE, Q: QE} = SECTION;
const spow = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
/** a skin with its own planform scale, crest and foot offsets (the inner shell is the same skin pulled in) */
export function makeSurface({inset = 0, drop = 0, lift = 0} = {}) {
  const at = (s, phi, out) => {
    const W = Math.max(0, halfWidth(s) - inset);
    const H = crestAt(s) - drop;
    const F = footAt(s) + lift;
    out[0] = 62 - s;
    out[1] = F + (H - F) * Math.pow(Math.abs(Math.cos(phi)), 2 / QE);
    out[2] = W * spow(Math.sin(phi), 2 / PE);
    return out;
  };
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  const c = [0, 0, 0];
  const e = [0, 0, 0];
  /** point and outward unit normal */
  const frame = (s, phi, P, N) => {
    at(s, phi, P);
    const hs = 0.004;
    const hp = 0.0004;
    at(Math.min(S_END, s + hs), phi, a);
    at(Math.max(0, s - hs), phi, b);
    at(s, phi + hp, c);
    at(s, phi - hp, e);
    const sx = a[0] - b[0];
    const sy = a[1] - b[1];
    const sz = a[2] - b[2];
    const px = c[0] - e[0];
    const py = c[1] - e[1];
    const pz = c[2] - e[2];
    // outward = d/ds × d/dphi
    let nx = sy * pz - sz * py;
    let ny = sz * px - sx * pz;
    let nz = sx * py - sy * px;
    const l = Math.hypot(nx, ny, nz) || 1;
    N[0] = nx / l;
    N[1] = ny / l;
    N[2] = nz / l;
  };
  return {at, frame, inset, drop, lift};
}
// chart: u in [0,1] spaced by cosine (dense at the nose and tail), v in [-1,1] from the left foot over the crest
export const sOfU = (u) => (S_END / 2) * (1 - Math.cos(Math.PI * u));
export const uOfS = (s) => Math.acos(Math.min(1, Math.max(-1, 1 - (2 * s) / S_END))) / Math.PI;
export const phiOfV = (v) => Math.sign(v) * (Math.PI / 2) * Math.pow(Math.abs(v), 1.6);
export const vOfPhi = (phi) => Math.sign(phi) * Math.pow(Math.abs(phi) / (Math.PI / 2), 1 / 1.6);
/** the chart coordinates of a top-view point (s, z) on a surface */
export const vOfTop = (surf, s, z) => {
  const W = Math.max(1e-6, halfWidth(s) - surf.inset);
  const r = Math.min(1, Math.abs(z) / W);
  return vOfPhi(Math.sign(z) * Math.asin(Math.pow(r, PE / 2)));
};
/** the chart coordinates of a side-view point (s, y); side -1 left, +1 right */
export const vOfSide = (surf, s, y, side) => {
  const H = crestAt(s) - surf.drop;
  const F = footAt(s) + surf.lift;
  const r = Math.min(1, Math.max(0, (y - F) / (H - F)));
  return vOfPhi(side * Math.acos(Math.pow(r, QE / 2)));
};

// ------------------------------------------------------------ openings as signed distance (negative inside)
function smoothLoop(pts, per = 10) {
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  return out;
}
function polySD(loop, x, y) {
  let d = Infinity;
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [ax, ay] = loop[j];
    const [bx, by] = loop[i];
    const ex = bx - ax;
    const ey = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey || 1)));
    d = Math.min(d, Math.hypot(x - ax - ex * t, y - ay - ey * t));
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside ? -d : d;
}
const RES = 0.2;
const MARGIN = WALL + 1.2;
/** a hole as a raster of signed distance in its own view plane */
export function rasterHole(h, R = WALL) {
  const loop = h.poly ? h.pts : smoothLoop(h.pts);
  // view plane coordinates: top (s, z), left/right (s, y), front (z, y)
  const xs = loop.map((p) => p[0]);
  const ys = loop.map((p) => p[1]);
  const x0 = Math.min(...xs) - MARGIN;
  const y0 = Math.min(...ys) - MARGIN;
  const nx = Math.ceil((Math.max(...xs) + MARGIN - x0) / RES) + 1;
  const ny = Math.ceil((Math.max(...ys) + MARGIN - y0) / RES) + 1;
  const g = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g[j * nx + i] = polySD(loop, x0 + i * RES, y0 + j * RES);
  const sample = (x, y) => {
    const fx = (x - x0) / RES;
    const fy = (y - y0) / RES;
    if (fx < 0 || fy < 0 || fx >= nx - 1 || fy >= ny - 1) return Infinity;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const tx = fx - i;
    const ty = fy - j;
    const k = j * nx + i;
    return (g[k] * (1 - tx) + g[k + 1] * tx) * (1 - ty) + (g[k + nx] * (1 - tx) + g[k + nx + 1] * tx) * ty;
  };
  const grow = h.sharp ? 0 : (h.shrink ?? 0);
  return {view: h.view, R: h.sharp ? 0.55 : R, sample: grow ? (x, y) => sample(x, y) + grow : sample, loop};
}
const FACE = {top: (n) => n[1] > 0.12, left: (n) => n[2] < -0.12, right: (n) => n[2] > 0.12, front: (n) => n[0] > 0.25};
/** the field: distance from P (mouse frame) with base normal n to the nearest opening; and that opening's radius */
export function holeField(holes) {
  return (P, n) => {
    let d = Infinity;
    let R = WALL;
    const s = 62 - P[0];
    for (const h of holes) {
      if (!FACE[h.view](n)) continue;
      const v = h.view === 'top' ? h.sample(s, P[2]) : h.view === 'front' ? h.sample(P[2], P[1]) : h.sample(s, P[1]);
      if (v < d) {
        d = v;
        R = h.R;
      }
    }
    // finite, so an edge between a vertex no opening faces and one inside an opening still interpolates
    return [Math.min(d, 20), R];
  };
}
export const SKELETON_HOLES = HOLES.map((h) => rasterHole({shrink: h.poly ? 0 : 0.6, ...h}));

// ------------------------------------------------------------ the mesher
/**
 * Mesh a region of the chart. field(P, n) -> [d, R]: keep where d >= 0; within R·reach of the edge the outer surface
 * rolls over a quarter-ellipse (R deep, R·reach wide) to meet the inner surface. t: wall thickness, o: outward offset
 * of the outer surface; reach > 1 rounds the struts over like a casting.
 */
export function meshSkin(surf, field, {u0 = 0.0004, u1 = 0.9996, v0 = -1, v1 = 1, nu = 300, nv = 240, t = WALL, o = 0, inner = true, reach = 1} = {}) {
  const NV = nv + 1;
  const P = [0, 0, 0];
  const N = [0, 0, 0];
  const grid = [];
  const pos = [];
  const nor = [];
  const idx = [];
  const ridx = [];
  const tmpP = [0, 0, 0];
  const tmpN = [0, 0, 0];
  const dAt = (u, v) => {
    surf.frame(sOfU(u), phiOfV(v), tmpP, tmpN);
    return field(tmpP, tmpN)[0];
  };
  // the fillet: offset along n and the tilted normal, from the distance to the edge
  const place = (u, v, dOverride) => {
    const s = sOfU(u);
    const phi = phiOfV(v);
    surf.frame(s, phi, P, N);
    let [d, R] = field(P, N);
    if (dOverride !== undefined) d = dOverride;
    const out = {P: P.slice(), N: N.slice(), d, R, b: null};
    if (d < R * reach) {
      // the direction toward the opening, in the tangent plane, from the field's gradient across the chart
      const du = 0.0006;
      const dv = 0.0015;
      const gu = (dAt(u + du, v) - dAt(u - du, v)) / (2 * du);
      const gv = (dAt(u, v + dv) - dAt(u, v - dv)) / (2 * dv);
      const A = [0, 0, 0];
      const B = [0, 0, 0];
      const Cc = [0, 0, 0];
      const D = [0, 0, 0];
      surf.at(sOfU(u + du), phi, A);
      surf.at(sOfU(u - du), phi, B);
      surf.at(s, phiOfV(v + dv), Cc);
      surf.at(s, phiOfV(v - dv), D);
      const Tu = [(A[0] - B[0]) / (2 * du), (A[1] - B[1]) / (2 * du), (A[2] - B[2]) / (2 * du)];
      const Tv = [(Cc[0] - D[0]) / (2 * dv), (Cc[1] - D[1]) / (2 * dv), (Cc[2] - D[2]) / (2 * dv)];
      const E = Tu[0] * Tu[0] + Tu[1] * Tu[1] + Tu[2] * Tu[2];
      const F = Tu[0] * Tv[0] + Tu[1] * Tv[1] + Tu[2] * Tv[2];
      const G = Tv[0] * Tv[0] + Tv[1] * Tv[1] + Tv[2] * Tv[2];
      const det = E * G - F * F || 1e-9;
      const ca = (G * (Number.isFinite(gu) ? gu : 0) - F * (Number.isFinite(gv) ? gv : 0)) / det;
      const cb = (E * (Number.isFinite(gv) ? gv : 0) - F * (Number.isFinite(gu) ? gu : 0)) / det;
      const g = [ca * Tu[0] + cb * Tv[0], ca * Tu[1] + cb * Tv[1], ca * Tu[2] + cb * Tv[2]];
      const gn = g[0] * N[0] + g[1] * N[1] + g[2] * N[2];
      const b = [-(g[0] - gn * N[0]), -(g[1] - gn * N[1]), -(g[2] - gn * N[2])];
      const bl = Math.hypot(b[0], b[1], b[2]);
      out.b = bl > 1e-9 ? b.map((x) => x / bl) : null;
    }
    return out;
  };
  const outer = (q) => {
    const Rw = q.R * reach;
    const k = q.d < Rw ? Math.min(1, Math.max(0, (Rw - Math.max(0, q.d)) / Rw)) : 0;
    const c = Math.sqrt(Math.max(0, 1 - k * k));
    const off = o - q.R * (1 - c);
    const p = [q.P[0] + q.N[0] * off, q.P[1] + q.N[1] * off, q.P[2] + q.N[2] * off];
    let n = q.N;
    if (k > 0 && q.b) {
      // the ellipse's normal: (R·k across, R·reach·c up) before normalising
      const kn = k;
      const cn = c * reach;
      n = [q.N[0] * cn + q.b[0] * kn, q.N[1] * cn + q.b[1] * kn, q.N[2] * cn + q.b[2] * kn];
      const l = Math.hypot(n[0], n[1], n[2]);
      n = n.map((x) => x / l);
    }
    return [p, n];
  };
  const push = (p, n) => {
    pos.push(p[0], p[1], p[2]);
    nor.push(n[0], n[1], n[2]);
    return pos.length / 3 - 1;
  };
  // grid vertices: outer and inner
  const gi = new Int32Array((nu + 1) * NV * 2).fill(-1);
  const gd = new Float32Array((nu + 1) * NV);
  const gq = [];
  for (let i = 0; i <= nu; i++) {
    const u = u0 + ((u1 - u0) * i) / nu;
    for (let j = 0; j <= nv; j++) {
      const v = v0 + ((v1 - v0) * j) / nv;
      const q = place(u, v);
      const k = i * NV + j;
      gd[k] = q.d;
      gq[k] = q;
      grid[k] = [u, v];
    }
  }
  const outerIdx = (k) => {
    if (gi[2 * k] < 0) {
      const [p, n] = outer(gq[k]);
      gi[2 * k] = push(p, n);
    }
    return gi[2 * k];
  };
  const innerIdx = (k) => {
    if (gi[2 * k + 1] < 0) {
      const q = gq[k];
      const off = o - t;
      gi[2 * k + 1] = push([q.P[0] + q.N[0] * off, q.P[1] + q.N[1] * off, q.P[2] + q.N[2] * off], [-q.N[0], -q.N[1], -q.N[2]]);
    }
    return gi[2 * k + 1];
  };
  // vertices where the opening's edge crosses a grid edge: outer edge, inner edge, and the rim between them
  const edges = new Map();
  const edgeV = (ka, kb) => {
    const key = ka < kb ? ka * 1e7 + kb : kb * 1e7 + ka;
    let e = edges.get(key);
    if (e) return e;
    const da = gd[ka];
    const db = gd[kb];
    const f = da / (da - db);
    const [ua, va] = grid[ka];
    const [ub, vb] = grid[kb];
    const q = place(ua + (ub - ua) * f, va + (vb - va) * f, 0);
    const [p, n] = outer(q);
    const offI = o - t;
    const pi = [q.P[0] + q.N[0] * offI, q.P[1] + q.N[1] * offI, q.P[2] + q.N[2] * offI];
    const rimN = q.b || n;
    e = {o: push(p, n), i: push(pi, [-q.N[0], -q.N[1], -q.N[2]]), ro: push(p, rimN), ri: push(pi, rimN), N: q.N};
    edges.set(key, e);
    return e;
  };
  const tri = (a, b, c) => {
    // a, b, c: grid keys in counter-clockwise order seen from outside
    const ins = [gd[a] >= 0, gd[b] >= 0, gd[c] >= 0];
    const n = ins.filter(Boolean).length;
    if (n === 0) return;
    if (n === 3) {
      idx.push(outerIdx(a), outerIdx(b), outerIdx(c));
      if (inner) idx.push(innerIdx(a), innerIdx(c), innerIdx(b));
      return;
    }
    // rotate so the odd one is first
    let r = [a, b, c];
    const odd = n === 1 ? ins.indexOf(true) : ins.indexOf(false);
    r = [r[odd], r[(odd + 1) % 3], r[(odd + 2) % 3]];
    const [A, B, C] = r;
    const eAB = edgeV(A, B);
    const eAC = edgeV(A, C);
    if (n === 1) {
      idx.push(outerIdx(A), eAB.o, eAC.o);
      if (inner) idx.push(innerIdx(A), eAC.i, eAB.i);
      // the rim, from AB to AC
      ridx.push([eAB, eAC]);
    } else {
      idx.push(eAB.o, outerIdx(B), outerIdx(C), eAB.o, outerIdx(C), eAC.o);
      if (inner) idx.push(eAB.i, innerIdx(C), innerIdx(B), eAB.i, eAC.i, innerIdx(C));
      ridx.push([eAC, eAB]);
    }
  };
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const k00 = i * NV + j;
      const k10 = (i + 1) * NV + j;
      const k01 = i * NV + j + 1;
      const k11 = (i + 1) * NV + j + 1;
      // counter-clockwise from outside: u runs rearward, v from left to right over the top
      tri(k00, k10, k11);
      tri(k00, k11, k01);
    }
  }
  // rims: a quad per edge segment, wound to face the opening
  const pv = (k) => [pos[3 * k], pos[3 * k + 1], pos[3 * k + 2]];
  for (const [e1, e2] of ridx) {
    const a = pv(e1.ro);
    const b = pv(e2.ro);
    const c = pv(e2.ri);
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const gn = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const want = [nor[3 * e1.ro], nor[3 * e1.ro + 1], nor[3 * e1.ro + 2]];
    const ok = gn[0] * want[0] + gn[1] * want[1] + gn[2] * want[2] >= 0;
    if (ok) idx.push(e1.ro, e2.ro, e2.ri, e1.ro, e2.ri, e1.ri);
    else idx.push(e1.ro, e2.ri, e2.ro, e1.ro, e1.ri, e2.ri);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

/** the chart box (u, v) around a top-view loop on a surface, with a margin in mm */
export function chartBoxTop(surf, pts, m = 2) {
  const us = [];
  const vs = [];
  for (const [s, z] of pts) {
    for (const ds of [-m, m]) us.push(uOfS(Math.min(S_END, Math.max(0, s + ds))));
    for (const dz of [-m, m]) vs.push(vOfTop(surf, s, z + dz));
  }
  return {u0: Math.max(0.0004, Math.min(...us)), u1: Math.min(0.9996, Math.max(...us)), v0: Math.max(-1, Math.min(...vs)), v1: Math.min(1, Math.max(...vs))};
}
export function chartBoxSide(surf, pts, side, m = 2) {
  const us = [];
  const vs = [];
  for (const [s, y] of pts) {
    for (const ds of [-m, m]) us.push(uOfS(Math.min(S_END, Math.max(0, s + ds))));
    for (const dy of [-m, m]) vs.push(vOfSide(surf, s, y + dy, side));
  }
  return {u0: Math.max(0.0004, Math.min(...us)), u1: Math.min(0.9996, Math.max(...us)), v0: Math.max(-1, Math.min(...vs)), v1: Math.min(1, Math.max(...vs))};
}
