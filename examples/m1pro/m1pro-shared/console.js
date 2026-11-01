// The M1 Pro console, laid out at 1600 x 900: the badge and title; on the left the mouse state (speed, acceleration,
// lift against the lift-off distance), the report stream (counts per report for the link) and the switch and wheel
// traces; on the right the system card, the gesture switch, link and DPI, views and display; along the bottom the
// battery claims, the gesture timeline and the vendor latency per link. Every number comes from model.js and dims.js;
// every label says where it came from. update(s) redraws the live parts from the frame's state.
import {BATTERY, LIFE_LIT, LINK_KEYS, LINKS, SPEC, SWITCH} from './dims.js';

export const C = {ink: '#141413', mute: '#83827d', faint: '#d9d6cb', line: '#e8e6dc', panel: 'rgba(250,249,245,.96)', acc: '#d97757', accInk: '#b8512f', dark: '#262624', lime: '#b6e61f', alt: '#3c79a8', flag: '#a8342a'};
export const VIEWS = ['hero', 'top', 'side', 'bottom', 'switch', 'wheel', 'sensor'];
export const VIEW_LABEL = {hero: 'HERO', top: 'TOP', side: 'SIDE', bottom: 'UNDERSIDE', switch: 'SWITCH', wheel: 'WHEEL', sensor: 'SENSOR'};
export const DISPLAY = ['labels', 'xray', 'section', 'exploded', 'orbit'];
export const DISPLAY_LABEL = {labels: 'LABELS', xray: 'X-RAY', section: 'SECTION', exploded: 'EXPLODED', orbit: 'ORBIT'};
export const SEQS = ['flick', 'click', 'scroll'];
export const PANELS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
// the order the console builds in after the opening: header, left column, right column, bottom row, footer
const BUILD = ['head', '01', '04', '02', '05', '03', '06', '07', '08', '09', '10', '11', 'foot'];
const LINK_LABEL = {k1: '1K', k4: '4K', bt: 'BT', usb: 'USB'};
const CSS = `
#app{font-family:Inter,system-ui,sans-serif;--serif:'Source Serif 4',Georgia,serif;color:${C.ink};-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.ui{position:absolute;inset:0;pointer-events:none}
.mo{font-family:'JetBrains Mono',ui-monospace,monospace}
.cp{position:absolute;background:${C.panel};border:1px solid ${C.line};border-radius:14px;box-shadow:0 1px 2px rgba(20,20,19,.05),0 8px 24px rgba(20,20,19,.07)}
.ph{position:absolute;display:flex;align-items:center;gap:9px;font:700 10.5px 'JetBrains Mono',monospace;letter-spacing:1.8px}
.ph i{display:block;width:7px;height:7px;border-radius:50%;background:${C.acc}}
.pn{position:absolute;font:500 9.5px 'JetBrains Mono',monospace;color:${C.mute};letter-spacing:1px}
.sm{font:500 9px 'JetBrains Mono',monospace;letter-spacing:1.6px;color:${C.mute};text-transform:uppercase;white-space:nowrap}
.tier{font:600 7.4px 'JetBrains Mono',monospace;letter-spacing:1.2px;color:${C.mute};border:1px solid ${C.faint};border-radius:2px;padding:1px 3px;margin-left:5px;vertical-align:1px}
.bt{position:absolute;height:21px;padding:0 8px;display:flex;align-items:center;justify-content:center;border:1px solid ${C.faint};border-radius:8px;background:#fefdfa;font:700 9.2px 'JetBrains Mono',monospace;letter-spacing:1.2px;color:${C.ink};white-space:nowrap}
.call{position:absolute;white-space:nowrap;background:rgba(250,249,245,.95);padding:3px 8px 4px;border-radius:8px;margin:-3px 0 0 -8px;box-shadow:0 1px 4px rgba(0,0,0,.12)}
.call b{display:flex;align-items:center;gap:7px;font:700 9.4px 'JetBrains Mono',monospace;letter-spacing:1.3px;color:${C.ink}}
.call b em{font-style:normal;color:${C.accInk};font-weight:700;letter-spacing:.6px}
.call span{display:block;font:500 7.8px 'JetBrains Mono',monospace;letter-spacing:1.2px;color:${C.mute};margin-top:2px;padding-left:23px}
.grp{position:absolute;inset:0}
.lean .xtra{display:none}
.big{position:absolute;left:340px;top:578px;white-space:nowrap;background:${C.panel};border:1px solid ${C.line};border-radius:14px;box-shadow:0 1px 2px rgba(20,20,19,.05),0 10px 28px rgba(20,20,19,.1);padding:14px 20px 15px 18px}
.big b{display:block;font:500 62px var(--serif);letter-spacing:-1.2px;line-height:1;color:${C.ink}}
.big b small{font-size:24px;letter-spacing:0;margin-left:6px;color:${C.accInk}}
.big span{display:block;margin-top:9px;font:600 9.6px 'JetBrains Mono',monospace;letter-spacing:1.8px;color:#5f5e59}
.big i{display:block;width:34px;height:4px;border-radius:2px;background:${C.acc};margin-bottom:12px}
.card{position:absolute;white-space:nowrap}
.cur{position:absolute;left:0;top:0;z-index:50;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
.ring{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:1.5px solid ${C.acc};opacity:0;z-index:49}
`;
const el = (h) => {
  const d = document.createElement('div');
  d.innerHTML = h.trim();
  return d.firstElementChild;
};
const nice = (v) => {
  for (const m of [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]) if (v <= m) return m;
  return 10000;
};

const smooth = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const f1 = (x) => x.toFixed(1);
const T = (x, y, s, o = '') => `<text x="${f1(x)}" y="${f1(y)}" font-family="JetBrains Mono" ${o}>${s}</text>`;

// ------------------------------------------------------------ the lift drawn at the lens (section view)
function drawDim({a, b, lod, h, lodMm, k}) {
  const x = Math.min(a[0], b[0]) - 46;
  const o = k.toFixed(2);
  const over = h >= lodMm;
  const col = over ? C.alt : C.acc;
  let s = `<g opacity="${o}">`;
  // extension lines from the skate plane and the pad, the dimension between them with its arrowheads
  for (const p of [a, b]) s += `<line x1="${f1(p[0] - 6)}" y1="${f1(p[1])}" x2="${f1(x - 8)}" y2="${f1(p[1])}" stroke="#85847e" stroke-width=".8"/>`;
  s += `<line x1="${f1(x)}" y1="${f1(a[1])}" x2="${f1(x)}" y2="${f1(b[1])}" stroke="${col}" stroke-width="1.4"/>`;
  const hd = Math.abs(b[1] - a[1]);
  if (hd > 9) for (const [p, dir] of [[a, 1], [b, -1]]) s += `<path d="M${f1(x - 3)} ${f1(p[1] + 6 * dir)} L${f1(x)} ${f1(p[1])} L${f1(x + 3)} ${f1(p[1] + 6 * dir)}" fill="none" stroke="${col}" stroke-width="1.2"/>`;
  // the lift-off distance: where the sensor stops counting
  s += `<line x1="${f1(x - 7)}" y1="${f1(lod[1])}" x2="${f1(x + 7)}" y2="${f1(lod[1])}" stroke="${C.flag}" stroke-width="1.6"/>`;
  s += T(x + 11, lod[1] + 3, `LOD ${lodMm} MM`, `font-size="7.6" font-weight="700" fill="${C.flag}" letter-spacing="1"`);
  const ty = (a[1] + b[1]) / 2;
  s += `<rect x="${f1(x - 168)}" y="${f1(ty - 19)}" width="156" height="34" rx="8" fill="rgba(250,249,245,.95)"/>`;
  s += T(x - 160, ty - 4, `LIFT ${h.toFixed(1)} MM`, `font-size="11" font-weight="700" fill="${C.ink}" letter-spacing="1.2"`);
  s += T(x - 160, ty + 9, over ? 'ABOVE THE LOD · NO COUNTS' : 'WITHIN THE LOD · COUNTING', `font-size="7.4" font-weight="600" fill="${col}" letter-spacing="1"`);
  return s + '</g>';
}

// ------------------------------------------------------------ the switch detail
// A schematic section of a snap-action switch (Omron D2FC family): the plunger presses the middle of a pre-bent
// blade; the blade's free end stays on the NC contact, storing energy, until the plunger reaches the operating point
// (0.30 mm), then snaps to NO in a fraction of a millisecond; going back it holds NO until the release point 0.12 mm
// higher (0.18 mm). Travel is drawn on its own scale (80 px/mm); the force curve's shape is schematic, its two
// catalogue values (OF 0.59 N, RF 0.24 N) are not.
const LOUPE = {cx: 1092, cy: 344, R: 146};
const FORCE = {
  press: (p) => (p <= SWITCH.pt ? 0.18 + ((SWITCH.of - 0.18) * p) / SWITCH.pt : 0.4 + (p - SWITCH.pt) * 0.9),
  release: (p) => {
    const rp = SWITCH.pt - SWITCH.md;
    return p >= rp ? SWITCH.rf + ((p - rp) * (0.55 - SWITCH.rf)) / (0.6 - rp) : FORCE.press(p);
  },
};
function drawLoupe(L) {
  const {cx, cy, R} = LOUPE;
  const o = L.k.toFixed(2);
  const TS = 80;
  const P = L.p * TS;
  const rp = SWITCH.pt - SWITCH.md;
  const closed = L.snap > 0.5;
  // the connector: a small ring on the switch, two lines to the detail
  const [ax, ay] = L.at;
  const dx = cx - ax;
  const dy = cy - ay;
  const dl = Math.hypot(dx, dy) || 1;
  const nx = -dy / dl;
  const ny = dx / dl;
  let s = `<g opacity="${o}">`;
  s += `<circle cx="${f1(ax)}" cy="${f1(ay)}" r="15" fill="none" stroke="${C.ink}" stroke-width="1.2"/>`;
  for (const sg of [-1, 1]) s += `<line x1="${f1(ax + sg * nx * 15)}" y1="${f1(ay + sg * ny * 15)}" x2="${f1(cx + sg * nx * R)}" y2="${f1(cy + sg * ny * R)}" stroke="${C.ink}" stroke-width=".9" opacity=".55"/>`;
  if (L.ring > 0) s += `<circle cx="${f1(ax)}" cy="${f1(ay)}" r="${f1(15 + 34 * (1 - L.ring))}" fill="none" stroke="${C.lime}" stroke-width="${f1(1 + 2.5 * L.ring)}" opacity="${(L.ring * 0.95).toFixed(2)}"/>`;
  // the disc
  s += `<defs><clipPath id="lc"><circle cx="150" cy="150" r="${R - 1}"/></clipPath><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#2e3336"/><line x1="0" y1="0" x2="0" y2="5" stroke="#555c60" stroke-width="1.6"/></pattern></defs>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R + 3}" fill="#faf9f5" stroke="${C.ink}" stroke-width="1.6"/>`;
  s += `<g transform="translate(${cx - 150} ${cy - 150})"><g clip-path="url(#lc)">`;
  for (let g = 0; g <= 300; g += 12) s += `<line x1="${g}" y1="0" x2="${g}" y2="300" stroke="#efede5" stroke-width=".8"/><line x1="0" y1="${g}" x2="300" y2="${g}" stroke="#efede5" stroke-width=".8"/>`;
  // housing, cut: hatched walls round a light cavity, an opening in the top for the plunger
  s += `<rect x="30" y="92" width="240" height="144" rx="6" fill="url(#hatch)"/><rect x="42" y="104" width="216" height="120" fill="#f1efe8"/><rect x="156" y="88" width="44" height="18" fill="#faf9f5"/>`;
  // terminals: COM under the blade's root, NO and NC either side of its free end; pins out of the base
  const live = closed ? C.lime : '#6b7276';
  s += `<rect x="60" y="150" width="12" height="74" fill="${closed ? '#d97757' : '#85847e'}"/><rect x="62" y="236" width="8" height="30" fill="${closed ? '#d97757' : '#a09e96'}"/>`;
  s += `<rect x="230" y="198" width="12" height="26" fill="${closed ? '#d97757' : '#85847e'}"/><rect x="232" y="236" width="8" height="30" fill="${closed ? '#d97757' : '#a09e96'}"/>`;
  s += `<rect x="230" y="104" width="12" height="30" fill="#85847e"/><rect x="146" y="236" width="8" height="30" fill="#a09e96"/>`;
  s += `<circle cx="236" cy="138" r="4.5" fill="#cfcdc4" stroke="#5d5c57"/><circle cx="236" cy="194" r="4.5" fill="${closed ? C.lime : '#cfcdc4'}" stroke="#5d5c57"/>`;
  // the blade: root on COM at (66, 146), pressed down in the middle by the plunger, free end on NC or NO
  const tipY = 146 + 40 * L.snap;
  const midY = Math.max(146 + (tipY - 146) * (112 / 170), 146 + P);
  s += `<path d="M66 146 L170 ${f1(midY)} Q178 ${f1(midY + 1)} 186 ${f1(midY + (tipY - midY) * 0.12)} L236 ${f1(tipY)}" fill="none" stroke="${closed ? '#d9a441' : '#b8883c'}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (closed) s += `<path d="M66 146 L170 ${f1(midY)} L236 ${f1(tipY)}" fill="none" stroke="${C.lime}" stroke-width="1.4" opacity=".9"/>`;
  s += `<circle cx="236" cy="${f1(tipY)}" r="4.5" fill="#d9a441" stroke="#7a5a22"/><circle cx="66" cy="146" r="3.4" fill="#3a3f42"/>`;
  // the plunger
  s += `<rect x="160" y="${f1(60 + P)}" width="36" height="86" rx="4" fill="${C.alt}"/><rect x="160" y="${f1(60 + P)}" width="36" height="9" rx="4" fill="#2b5f8c"/>`;
  // the travel ruler beside it: 0 to 0.6 mm, the operating and release points
  const RX = 140;
  s += `<line x1="${RX}" y1="146" x2="${RX}" y2="${146 + 0.6 * TS}" stroke="${C.ink}" stroke-width="1"/>`;
  for (let i = 0; i <= 6; i++) s += `<line x1="${RX - (i % 3 ? 3 : 6)}" y1="${f1(146 + i * 0.1 * TS)}" x2="${RX}" y2="${f1(146 + i * 0.1 * TS)}" stroke="${C.ink}" stroke-width=".8"/>`;
  s += `<line x1="${RX - 9}" y1="${f1(146 + SWITCH.pt * TS)}" x2="${RX + 16}" y2="${f1(146 + SWITCH.pt * TS)}" stroke="${C.acc}" stroke-width="1.3"/>`;
  s += `<line x1="${RX - 9}" y1="${f1(146 + rp * TS)}" x2="${RX + 16}" y2="${f1(146 + rp * TS)}" stroke="${C.alt}" stroke-width="1.3" stroke-dasharray="2 2"/>`;
  s += T(RX - 11, 146 + SWITCH.pt * TS + 3, 'CLOSES 0.30', `font-size="7" font-weight="700" fill="${C.accInk}" text-anchor="end"`);
  s += T(RX - 11, 146 + rp * TS + 1, 'OPENS 0.18', `font-size="7" font-weight="700" fill="${C.alt}" text-anchor="end"`);
  s += `<path d="M${RX + 1} ${f1(146 + P)} l7 -4 v8 z" fill="${C.ink}"/>`;
  // names
  s += T(204, 76, 'PLUNGER', `font-size="7.6" font-weight="700" fill="${C.ink}" letter-spacing="1"`);
  s += T(74, 140, 'BLADE (SPRING)', `font-size="7.2" font-weight="700" fill="#8a6322" letter-spacing=".8"`);
  s += T(246, 134, 'NC', `font-size="7.6" font-weight="700" fill="${C.ink}"`);
  s += T(246, 214, 'NO', `font-size="7.6" font-weight="700" fill="${live}"`);
  s += T(56, 280, 'COM', `font-size="7.2" font-weight="700" fill="${C.mute}"`) + T(143, 280, 'NC', `font-size="7.2" font-weight="700" fill="${C.mute}"`) + T(229, 280, 'NO', `font-size="7.2" font-weight="700" fill="${C.mute}"`);
  s += `</g></g>`;
  // header above the disc on its own plate, slow-motion badge
  s += `<rect x="${cx - R - 10}" y="${cy - R - 50}" width="${2 * R + 20}" height="40" rx="10" fill="rgba(250,249,245,.95)" stroke="${C.line}"/>`;
  s += T(cx - R, cy - R - 34, 'DETAIL · OMRON D2FC · SCHEMATIC', `font-size="8.4" font-weight="700" fill="${C.ink}" letter-spacing="1.1"`);
  s += T(cx - R, cy - R - 20, `TRAVEL ${L.p.toFixed(2)} MM · ${closed ? 'CONTACT CLOSED (NO)' : 'OPEN'}`, `font-size="8" font-weight="600" fill="${closed ? C.acc : C.mute}" letter-spacing="1"`);
  if (L.rate < 0.9) {
    const bx = cx + R - 70;
    const by = cy - R - 43;
    s += `<rect x="${bx}" y="${by}" width="76" height="26" rx="13" fill="${C.ink}"/>` + T(bx + 38, by + 16.5, `SLOW ×${L.rate < 0.1 ? L.rate.toFixed(2) : L.rate.toFixed(1)}`, `font-size="8.4" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing=".8"`);
  }
  // the force on the finger against travel
  const gx = cx - R + 4;
  const gy = cy + R + 20;
  const GW = 2 * R - 8;
  const GH = 70;
  const X = (p) => gx + (p / 0.6) * GW;
  const Y = (f) => gy + GH - (f / 0.8) * GH;
  s += `<rect x="${gx - 8}" y="${gy - 16}" width="${GW + 16}" height="${GH + 40}" rx="10" fill="rgba(250,249,245,.95)" stroke="${C.line}"/>`;
  s += T(gx, gy - 4, 'FORCE AT THE PLUNGER (N) · TRAVEL (MM)', `font-size="7.2" font-weight="700" fill="${C.ink}" letter-spacing="1"`);
  let pp = '';
  for (let i = 0; i <= 60; i++) {
    const p = (i / 60) * 0.6;
    pp += `${i ? 'L' : 'M'}${f1(X(p))} ${f1(Y(FORCE.press(p)))}`;
  }
  let rr = `M${f1(X(0.6))} ${f1(Y(FORCE.release(0.6)))}`;
  for (let i = 60; i >= 18; i--) rr += `L${f1(X(i / 100))} ${f1(Y(FORCE.release(i / 100)))}`;
  rr += `L${f1(X(rp))} ${f1(Y(FORCE.press(rp)))}`;
  s += `<line x1="${f1(X(SWITCH.pt))}" y1="${gy}" x2="${f1(X(SWITCH.pt))}" y2="${gy + GH}" stroke="${C.acc}" stroke-dasharray="2 2" stroke-width=".9"/>`;
  s += `<line x1="${f1(X(rp))}" y1="${gy}" x2="${f1(X(rp))}" y2="${gy + GH}" stroke="${C.alt}" stroke-dasharray="2 2" stroke-width=".9"/>`;
  s += `<line x1="${gx}" y1="${gy + GH}" x2="${gx + GW}" y2="${gy + GH}" stroke="${C.faint}"/>`;
  s += `<path d="${pp}" fill="none" stroke="${C.ink}" stroke-width="1.3"/><path d="${rr}" fill="none" stroke="${C.alt}" stroke-width="1.3"/>`;
  const fNow = L.dir < 0 && L.c ? FORCE.release(L.p) : FORCE.press(L.p);
  s += `<circle cx="${f1(X(L.p))}" cy="${f1(Y(fNow))}" r="4" fill="${C.acc}" stroke="#fff" stroke-width="1.5"/>`;
  s += T(X(SWITCH.pt) + 4, Y(SWITCH.of) - 4, `OF ${SWITCH.of} N`, `font-size="6.8" font-weight="700" fill="${C.accInk}"`);
  s += T(X(rp) - 4, Y(SWITCH.rf) + 12, `RF ${SWITCH.rf} N`, `font-size="6.8" font-weight="700" fill="${C.alt}" text-anchor="end"`);
  s += T(gx, gy + GH + 14, 'PRESS ─ BLACK · RELEASE ─ BLUE · SHAPE SCHEMATIC, OF / RF FROM OMRON', `font-size="6.4" font-weight="600" fill="${C.mute}" letter-spacing=".6"`);
  return s + '</g>';
}

export function createConsole(app) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const ui = el(`<div class="ui"></div>`);
  app.appendChild(ui);
  // every panel's parts live in one group, so the console can build in and step panels back as a whole
  const groups = {};
  let host = ui;
  const group = (id) => {
    host = groups[id] = el(`<div class="grp"></div>`);
    ui.appendChild(host);
  };
  const add = (h) => {
    const n = el(h);
    host.appendChild(n);
    return n;
  };
  const panel = (x, y, w, h, title, n) => {
    group(n);
    add(`<div class="cp" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`);
    add(`<div class="ph" style="left:${x + 14}px;top:${y + 13}px"><i></i>${title}</div>`);
    add(`<div class="pn" style="right:${1600 - x - w + 14}px;top:${y + 15}px">${n}</div>`);
  };
  const rule = (x, y, w) => add(`<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:1px;background:${C.line}"></div>`);

  // ------------------------------------------------------------ header
  group('head');
  add(`<div style="position:absolute;left:0;top:0;width:160px;height:89px;background:${C.dark}"></div>`);
  add(`<svg style="position:absolute;left:24px;top:24px" width="40" height="40" viewBox="0 0 40 40"><path d="M20 3 C29 3 35 10 35 20 C35 31 28 37 20 37 C12 37 5 31 5 20 C5 10 11 3 20 3 Z" fill="none" stroke="${C.acc}" stroke-width="2.2"/><path d="M13 14 C17 11 23 11 27 14 M11 22 C16 19 24 19 29 22 M14 30 C18 28 22 28 26 30 M20 6 V34" fill="none" stroke="${C.acc}" stroke-width="1.6"/></svg>`);
  add(`<div class="mo" style="position:absolute;left:76px;top:33px;color:#fff;font-size:17px;font-weight:700;letter-spacing:3px">M1</div>`);
  add(`<div class="mo" style="position:absolute;left:76px;top:54px;color:${C.acc};font-size:9px;font-weight:600;letter-spacing:3px">PRO</div>`);
  add(`<div class="sm" style="position:absolute;left:182px;top:22px;letter-spacing:2.4px">WIRELESS GAMING MOUSE</div>`);
  add(`<div style="position:absolute;left:181px;top:37px;font:500 35px var(--serif);letter-spacing:-.6px;line-height:1">GravaStar Mercury M1 Pro <span style="color:${C.acc};font-weight:400">/</span></div>`);
  add(`<div class="mo" style="position:absolute;left:182px;top:77px;font-size:11.2px;letter-spacing:2.2px;color:#5f5e59">GUNMETAL GRAY / TEARDOWN · SENSOR TO REPORT</div>`);
  add(`<div class="sm xtra" style="position:absolute;left:1046px;top:49px;letter-spacing:2.6px;font-size:9.6px">MAGNESIUM SKELETON · PAW3395 · nRF52833</div>`);
  add(`<div class="xtra" style="position:absolute;left:1386px;top:34px;color:${C.accInk};font:500 42px var(--serif);letter-spacing:-.6px;line-height:1">88<span style="font-size:20px">G</span></div>`);
  add(`<div class="xtra" style="position:absolute;left:1488px;top:33px;width:1px;height:44px;background:${C.faint}"></div>`);
  add(`<div class="sm xtra" style="position:absolute;left:1504px;top:34px;line-height:14px;letter-spacing:2.2px">124 ×<br>64.5 ×<br>39.5 MM</div>`);

  // ------------------------------------------------------------ 01 mouse state
  panel(28, 126, 282, 214, 'MOUSE STATE', '01');
  const chip = add(`<div style="position:absolute;left:42px;top:166px;width:13px;height:24px;border-radius:2px"></div>`);
  const stTitle = add(`<div style="position:absolute;left:66px;top:164px;font-size:15px;font-weight:600"></div>`);
  const stSub = add(`<div class="sm" style="position:absolute;left:67px;top:183px"></div>`);
  rule(42, 202, 254);
  const ROWS = [['SPEED', `/ ${SPEC.ipsMax} IPS`], ['ACCEL', `/ ${SPEC.gMax} G`], ['LIFT', 'LOD'], ['COUNTS', '']];
  const bars = ROWS.map(([n, lim], i) => {
    const y = 214 + i * 24;
    add(`<div class="sm" style="position:absolute;left:42px;top:${y}px">${n}</div>`);
    add(`<div style="position:absolute;left:100px;top:${y + 4}px;width:104px;height:4px;background:#e8e6dc;border-radius:2px"></div>`);
    const f = add(`<div style="position:absolute;left:100px;top:${y + 4}px;height:4px;background:${C.acc};border-radius:2px"></div>`);
    const v = add(`<div class="mo" style="position:absolute;right:${1600 - 296}px;top:${y - 2}px;font-size:11px;font-weight:600"></div>`);
    add(`<div class="sm" style="position:absolute;left:100px;top:${y + 10}px;font-size:7px;letter-spacing:1px">${lim}</div>`);
    return {f, v};
  });
  const lodTick = add(`<div style="position:absolute;top:${214 + 2 * 24 + 1}px;width:1.5px;height:10px;background:${C.flag}"></div>`);
  rule(42, 312, 254);
  const forceLine = add(`<div class="sm" style="position:absolute;left:42px;top:320px;font-size:8.2px"></div>`);

  // ------------------------------------------------------------ 02 report stream
  panel(28, 354, 282, 196, 'REPORT STREAM', '02');
  const rpHead = add(`<div class="mo" style="position:absolute;left:42px;top:388px;font-size:10px;font-weight:700;letter-spacing:1.3px"></div>`);
  const rpChart = add(`<svg style="position:absolute;left:42px;top:406px" width="254" height="78"></svg>`);
  const rpCmp = add(`<div class="mo" style="position:absolute;left:42px;top:492px;width:254px;font-size:9px;line-height:15px;color:#4d4c48"></div>`);
  add(`<div class="sm" style="position:absolute;left:42px;top:530px;font-size:7.6px;letter-spacing:1.1px">WORST CASE 650 IPS × 26K CPI = 16,900 / 1K REPORT · FITS INT16</div>`);

  // ------------------------------------------------------------ 03 switch and wheel
  panel(28, 564, 282, 172, 'SWITCH · WHEEL', '03');
  const swHead = add(`<div class="sm" style="position:absolute;left:42px;top:596px;font-size:8px"></div>`);
  const swChart = add(`<svg style="position:absolute;left:42px;top:610px" width="254" height="58"></svg>`);
  const whHead = add(`<div class="sm" style="position:absolute;left:42px;top:674px;font-size:8px"></div>`);
  const whChart = add(`<svg style="position:absolute;left:42px;top:688px" width="254" height="38"></svg>`);

  // ------------------------------------------------------------ 04 system
  panel(1313, 126, 258, 168, 'SYSTEM', '04');
  add(`<div class="mo" style="position:absolute;left:1327px;top:162px;font-size:10.5px;font-weight:700;letter-spacing:1.6px">ONE SENSOR, ONE RADIO</div>`);
  add(`<div class="mo" style="position:absolute;left:1327px;top:181px;width:232px;font-size:9.1px;line-height:1.7;color:#5a6165">A PAW3395 images the pad under the lens; the nRF52833 sends what moved since the last report. The skeleton is magnesium; the shell inside it glows.</div>`);
  rule(1327, 240, 232);
  [['26K', 'DPI MAX'], ['650', 'IPS'], ['50 G', 'ACCEL']].forEach(([v, n], i) => {
    const x = 1327 + i * 82;
    if (i) add(`<div style="position:absolute;left:${x - 8}px;top:250px;width:1px;height:34px;background:${C.line}"></div>`);
    add(`<div style="position:absolute;left:${x}px;top:250px;font-size:19px;font-weight:700">${v}</div>`);
    add(`<div class="sm" style="position:absolute;left:${x}px;top:273px">${n}</div>`);
  });

  // ------------------------------------------------------------ 05 gesture, 06 link · dpi, 07 views, 08 display
  const btn = {};
  panel(1313, 308, 258, 82, 'GESTURE', '05');
  add(`<div style="position:absolute;left:1327px;top:345px;width:230px;height:30px;border-radius:5px;background:#e8e6dc"></div>`);
  SEQS.forEach((k, i) => {
    btn[k] = add(`<div class="bt" style="left:${1330 + i * 75.3}px;top:348px;width:74px;height:24px;border:none;background:transparent">${k.toUpperCase()}</div>`);
  });
  panel(1313, 404, 258, 116, 'LINK · DPI', '06');
  LINK_KEYS.forEach((k, i) => {
    btn['link_' + k] = add(`<div class="bt" style="left:${1327 + i * 58}px;top:439px;width:52px;height:23px">${LINK_LABEL[k]}</div>`);
  });
  SPEC.dpiPresets.forEach((d, i) => {
    btn['dpi_' + d] = add(`<div class="bt" style="left:${1327 + i * 38.6}px;top:471px;width:34px;height:23px;padding:0;font-size:8.4px;letter-spacing:.4px">${d >= 1000 ? d / 1000 + 'K' : d}</div>`);
  });
  const linkNote = add(`<div class="sm" style="position:absolute;left:1327px;top:500px;font-size:7.4px;letter-spacing:1px"></div>`);
  const btnRow = (keys, labels, x0, y, wmax = 230) => {
    let x = x0;
    let yy = y;
    for (const k of keys) {
      const w = Math.round(labels[k].length * 7.0 + 20);
      if (x + w > x0 + wmax) {
        x = x0;
        yy += 30;
      }
      btn[k] = add(`<div class="bt" style="left:${x}px;top:${yy}px;width:${w}px;height:23px">${labels[k]}</div>`);
      x += w + 6;
    }
  };
  panel(1313, 534, 258, 107, 'VIEWS', '07');
  btnRow(VIEWS, VIEW_LABEL, 1327, 570);
  panel(1313, 655, 258, 81, 'DISPLAY', '08');
  btnRow(DISPLAY, DISPLAY_LABEL, 1327, 690);

  // ------------------------------------------------------------ 09 power
  panel(28, 752, 382, 108, 'BATTERY CLAIMS → CURRENT', '09');
  add(`<div class="sm" style="position:absolute;left:42px;top:786px;font-size:7.6px;letter-spacing:1px">I = Q / T · LEDS OFF · ${BATTERY.mAh} MAH (FCC) · <span style="color:${C.flag}">${BATTERY.alt} MAH FLAGGED</span></div>`);
  const pw = {};
  ['k1', 'bt', 'k4'].forEach((k, i) => {
    const y = 800 + i * 15;
    const L = LINKS[k];
    add(`<div class="mo" style="position:absolute;left:42px;top:${y}px;font-size:9.4px;font-weight:700;letter-spacing:1px">${LINK_LABEL[k]}</div>`);
    add(`<div class="mo" style="position:absolute;left:74px;top:${y}px;font-size:9.4px;color:#4d4c48">${L.life} H</div>`);
    add(`<div style="position:absolute;left:122px;top:${y + 4}px;width:150px;height:4px;background:#e8e6dc;border-radius:2px"></div>`);
    pw[k] = add(`<div style="position:absolute;left:122px;top:${y + 4}px;height:4px;border-radius:2px;width:${((BATTERY.mAh / L.life) / 12) * 150}px;background:${C.acc}"></div>`);
    add(`<div class="mo" style="position:absolute;left:282px;top:${y}px;font-size:9.4px;font-weight:700">${(BATTERY.mAh / L.life).toFixed(2)} mA</div>`);
    add(`<div class="mo" style="position:absolute;left:346px;top:${y}px;font-size:8.6px;color:${C.mute}">${(BATTERY.alt / L.life).toFixed(2)}</div>`);
  });
  add(`<div class="sm" style="position:absolute;left:42px;top:846px;font-size:6.8px;letter-spacing:.8px;color:#a8a69d">LIGHTS ON (GRAVASTAR.DE, FLAGGED): 1K ${LIFE_LIT.k1} H · BT ${LIFE_LIT.bt} H · 4K ${LIFE_LIT.k4} H</div>`);

  // ------------------------------------------------------------ 10 gesture timeline
  panel(430, 752, 740, 108, 'GESTURE TIMELINE', '10');
  btn.play = add(`<div class="bt" style="left:445px;top:795px;width:44px;height:44px;border-radius:50%;border:none;background:${C.acc};color:#fff;font-size:15px"></div>`);
  const opFrom = add(`<div class="sm" style="position:absolute;left:506px;top:791px"></div>`);
  const opPhase = add(`<div class="mo" style="position:absolute;left:506px;width:500px;top:790px;text-align:center;font-size:9.6px;font-weight:700;letter-spacing:1.6px;color:${C.acc}"></div>`);
  const opTo = add(`<div class="sm" style="position:absolute;right:${1600 - 1010}px;top:791px"></div>`);
  const TL = {x: 508, w: 504};
  add(`<div style="position:absolute;left:${TL.x}px;top:820px;width:${TL.w}px;height:3px;background:#e8e6dc;border-radius:2px"></div>`);
  const tlFill = add(`<div style="position:absolute;left:${TL.x}px;top:820px;height:3px;background:${C.acc};border-radius:2px"></div>`);
  const tlKnob = add(`<div style="position:absolute;top:814px;width:15px;height:15px;margin-left:-7.5px;border-radius:50%;background:#fff;border:2px solid ${C.acc};box-sizing:border-box"></div>`);
  const tlTime = add(`<div class="mo" style="position:absolute;left:506px;top:834px;font-size:9.6px;color:${C.mute};letter-spacing:1px"></div>`);
  add(`<div class="sm" style="position:absolute;left:1029px;top:805px">SPEED</div>`);
  const SP = {x: 1031, w: 92};
  add(`<div style="position:absolute;left:${SP.x}px;top:823px;width:${SP.w}px;height:3px;background:#e8e6dc;border-radius:2px"></div>`);
  const spFill = add(`<div style="position:absolute;left:${SP.x}px;top:823px;height:3px;background:${C.acc};border-radius:2px"></div>`);
  const spKnob = add(`<div style="position:absolute;top:817px;width:15px;height:15px;margin-left:-7.5px;border-radius:50%;background:#fff;border:2px solid ${C.acc};box-sizing:border-box"></div>`);
  const spVal = add(`<div class="mo" style="position:absolute;left:1128px;top:818px;font-size:10px;font-weight:700"></div>`);

  // ------------------------------------------------------------ 11 latency
  panel(1190, 752, 381, 108, 'LINK LATENCY (VENDOR)', '11');
  const lat = {};
  LINK_KEYS.forEach((k, i) => {
    const y = 786 + i * 17;
    const L = LINKS[k];
    // log scale, 0.1 .. 30 ms
    const w = (Math.log10(L.latency / 0.1) / Math.log10(300)) * 196;
    lat[k] = {
      n: add(`<div class="mo" style="position:absolute;left:1204px;top:${y}px;font-size:9.4px;font-weight:700;letter-spacing:1px">${LINK_LABEL[k]}</div>`),
      b: add(`<div style="position:absolute;left:1244px;top:${y + 4}px;height:4px;width:${w.toFixed(1)}px;border-radius:2px;background:${C.faint}"></div>`),
      v: add(`<div class="mo" style="position:absolute;left:${1250 + w}px;top:${y}px;font-size:9.4px">${L.latency} ms · ${L.rate >= 1000 ? L.rate / 1000 + ' kHz' : L.rate + ' Hz'}</div>`),
    };
  });

  // ------------------------------------------------------------ footer, floor notes
  group('foot');
  add(`<div class="sm" style="position:absolute;left:27px;top:882px;letter-spacing:2.2px">SOURCES: GRAVASTAR · PIXART · OMRON · FCC ID 2ASXF-M1 &nbsp;·&nbsp; TRACED ±1.5 MM &nbsp;·&nbsp; ASSUMED VALUES MARKED</div>`);
  add(`<div class="sm xtra" style="position:absolute;right:28px;top:882px;letter-spacing:2.2px">ONE INPUT: SECONDS INTO THE GESTURE <span style="color:${C.acc}">//////</span></div>`);
  const notes = add(`<div class="xtra" style="position:absolute;inset:0"></div>`);
  notes.innerHTML = `<svg style="position:absolute;left:398px;top:162px" width="90" height="80"><path d="M0 80V0h80" fill="none" stroke="${C.acc}" stroke-width="1" stroke-dasharray="3 3" opacity=".55"/></svg>
    <svg style="position:absolute;left:1188px;top:640px" width="80" height="80"><path d="M80 0v76H0" fill="none" stroke="${C.acc}" stroke-width="1" stroke-dasharray="3 3" opacity=".55"/></svg>`;
  const viewNote = add(`<div class="sm xtra" style="position:absolute;right:${1600 - 1262}px;top:688px;line-height:15px;letter-spacing:2px;text-align:right"></div>`);
  host = ui;

  // ------------------------------------------------------------ the feature number, the lift dimension, the cards
  const big = add(`<div class="big"></div>`);
  const dimSvg = add(`<svg style="position:absolute;inset:0;overflow:visible" width="1600" height="900"></svg>`);
  const titleCard = add(`<div class="card" style="left:118px;top:318px">
    <div class="mo" style="font-size:12px;font-weight:700;letter-spacing:4px;color:${C.lime}">GRAVASTAR · WIRELESS GAMING MOUSE</div>
    <div style="margin-top:16px;font:500 88px var(--serif);letter-spacing:-2px;line-height:.98;color:#f5f3ec">Mercury<br>M1 Pro</div>
    <div style="margin-top:22px;width:44px;height:3px;background:${C.lime}"></div>
    <div class="mo" style="margin-top:16px;font-size:11.5px;letter-spacing:2.6px;color:#a09e96">GUNMETAL GRAY · MAGNESIUM SKELETON · 88 G</div>
    <div class="mo" style="margin-top:7px;font-size:11.5px;letter-spacing:2.6px;color:#6f777b">A TEARDOWN, FROM THE SENSOR TO THE REPORT</div></div>`);
  const endCard = add(`<div class="card" style="left:96px;top:196px;background:${C.panel};border:1px solid ${C.line};border-radius:8px;box-shadow:0 4px 22px rgba(30,40,30,.14);padding:38px 46px 34px">
    <div class="mo" style="font-size:11.5px;font-weight:700;letter-spacing:4px;color:${C.accInk}">GRAVASTAR · GUNMETAL GRAY</div>
    <div style="margin-top:14px;font:500 80px var(--serif);letter-spacing:-1.8px;line-height:.98;color:${C.ink}">Mercury<br>M1 Pro</div>
    <div style="margin-top:40px;display:flex;gap:40px">${[
      ['88', 'G', 'MAGNESIUM SKELETON'],
      ['26,000', 'DPI', 'PAW3395 · 650 IPS · 50 G'],
      ['4', 'KHZ', 'WITH THE 4K RECEIVER'],
    ]
      .map(([v, u, c]) => `<div><div style="font:500 44px var(--serif);letter-spacing:-.6px;color:${C.ink}">${v}<span style="font-size:18px;color:${C.accInk};margin-left:5px">${u}</span></div><div class="sm" style="margin-top:8px;font-size:8.6px">${c}</div></div>`)
      .join('')}</div>
    <div class="sm" style="margin-top:46px;font-size:8.4px;letter-spacing:2px;line-height:16px">SOURCES: GRAVASTAR · PIXART · OMRON · FCC ID 2ASXF-M1<br>EVERY NUMBER FROM ONE MODEL · ASSUMED VALUES MARKED</div></div>`);

  // ------------------------------------------------------------ the switch detail: a schematic of the D2FC's blade
  const loupe = add(`<svg style="position:absolute;inset:0;overflow:visible" width="1600" height="900"></svg>`);

  // ------------------------------------------------------------ labels, pointer
  const callSvg = add(`<svg data-callouts style="position:absolute;inset:0;overflow:visible" width="1600" height="900"></svg>`);
  const callG = add(`<div data-callouts style="position:absolute;inset:0"></div>`);
  const ring = add(`<div class="ring"></div>`);
  const cur = add(`<div class="cur"><svg width="22" height="22" viewBox="0 0 34 34"><path d="M4 3 L30 13.5 L17.5 17.5 L13.5 30 Z" fill="#111" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg></div>`);
  const centre = (n) => {
    const r = n.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  };
  const spots = Object.fromEntries(Object.entries(btn).map(([k, n]) => [k, centre(n)]));
  const pointer = (c) => {
    cur.style.display = c.x < 0 ? 'none' : 'block';
    cur.style.transform = `translate(${(c.x - 3).toFixed(2)}px, ${(c.y - 2).toFixed(2)}px) scale(${c.press ? 0.88 : 1})`;
    ring.style.left = `${c.ringX}px`;
    ring.style.top = `${c.ringY}px`;
    ring.style.opacity = String(c.ring * 0.85);
    ring.style.transform = `scale(${(0.35 + 0.9 * (1 - c.ring)).toFixed(3)})`;
  };
  const fmtT = (s) => `${s.toFixed(2)} S`;
  const onBtn = (k, on) => {
    if (!btn[k]) return;
    btn[k].style.background = on ? C.acc : '#fefdfa';
    btn[k].style.color = on ? '#fff' : C.ink;
    btn[k].style.borderColor = on ? C.acc : C.faint;
  };

  return {
    spots,
    btn,
    root: ui,
    TL,
    SP,
    update(s) {
      const m = s.m;
      // 01 state
      const [title, sub, kind] = s.state;
      chip.style.background = kind === 'ok' ? C.acc : kind === 'air' ? C.alt : C.flag;
      stTitle.textContent = title;
      stSub.textContent = sub;
      const lodMax = 4;
      const vals = [
        [m.ips / 40, `${m.ips.toFixed(1)} IPS`],
        [Math.log10(1 + m.g * 10) / Math.log10(1 + 50 * 10), `${m.g.toFixed(2)} G`],
        [m.h / lodMax, `${m.h.toFixed(1)} mm`],
        [Math.min(1, Math.abs(m.counts) / 6400), `${m.counts.toLocaleString('en-US')}`],
      ];
      bars.forEach((b, i) => {
        b.f.style.width = `${(Math.min(1, Math.max(0, vals[i][0])) * 104).toFixed(1)}px`;
        b.v.textContent = vals[i][1];
      });
      bars[2].f.style.background = m.tracking ? C.acc : C.alt;
      lodTick.style.left = `${100 + (s.lod / lodMax) * 104}px`;
      forceLine.innerHTML = `F = m·a = 0.088 KG × ${(Math.abs(m.a) / 1000).toFixed(2)} M/S² = <b style="color:${C.ink}">${((0.088 * Math.abs(m.a)) / 1000).toFixed(2)} N</b>`;
      // 02 reports: the last reports as bars, scaled to the largest
      {
        const L = LINKS[s.link];
        rpHead.innerHTML = `${L.name} · ${L.rate >= 1000 ? L.rate / 1000 + ' KHZ' : L.rate + ' HZ'} · ${s.dpi} DPI <span style="color:${C.mute};font-weight:500">#${m.report}</span>`;
        const R = m.reports.slice(-48);
        const peak = nice(Math.max(2, ...R.map(Math.abs)));
        const W = 254;
        const H = 70;
        const bw = W / 48;
        let h = `<line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="${C.faint}" stroke-width="1"/>`;
        h += `<text x="${W}" y="8" text-anchor="end" font-size="7.4" fill="${C.mute}" font-family="JetBrains Mono">±${peak} COUNTS / REPORT</text>`;
        R.forEach((v, i) => {
          const y = (v / peak) * (H / 2 - 4);
          const x = W - (R.length - i) * bw;
          h += `<rect x="${(x + 0.4).toFixed(1)}" y="${(H / 2 - Math.max(0, y)).toFixed(1)}" width="${Math.max(1, bw - 0.8).toFixed(1)}" height="${Math.max(0.8, Math.abs(y)).toFixed(1)}" fill="${v === 0 ? C.faint : C.acc}"/>`;
        });
        h += `<text x="0" y="${H + 7}" font-size="7" fill="${C.mute}" font-family="JetBrains Mono">${((48 * 1000) / L.rate).toFixed(0)} MS AGO</text><text x="${W}" y="${H + 7}" text-anchor="end" font-size="7" fill="${C.mute}" font-family="JetBrains Mono">NOW</text>`;
        rpChart.innerHTML = h;
        const per = (f) => (m.ips * s.dpi) / f;
        rpCmp.innerHTML = m.tracking
          ? `<b style="color:${C.ink}">${per(1000).toFixed(1)}</b> / 1K · <b style="color:${C.ink}">${per(4000).toFixed(1)}</b> / 4K REPORT AT ${m.ips.toFixed(1)} IPS<br>${per(4000) < 2 && m.ips > 0.2 ? '<span style="color:' + C.flag + '">4K REPORTS CARRY 0 OR 1 COUNT</span>' : 'SMALLER PACKETS, FOUR TIMES AS OFTEN'}`
          : `<span style="color:${C.alt}">LIFTED ${m.h.toFixed(1)} MM > ${s.lod} MM LOD · NO COUNTS</span><br>THE HAND MOVES, THE CURSOR STAYS`;
      }
      // 03 switch: plunger travel, the two thresholds, contact; wheel: A/B with the detent count
      {
        const W = 254;
        const H = 46;
        const tr = s.trace;
        const n = tr.p.length;
        const Y = (p) => H - (p / 0.6) * H;
        let h = `<line x1="0" x2="${W}" y1="${Y(SWITCH.pt)}" y2="${Y(SWITCH.pt)}" stroke="${C.acc}" stroke-dasharray="3 3" stroke-width=".9"/><text x="${W}" y="${Y(SWITCH.pt) - 2}" text-anchor="end" font-size="6.8" fill="${C.acc}" font-family="JetBrains Mono">CLOSES 0.30</text>`;
        h += `<line x1="0" x2="${W}" y1="${Y(SWITCH.pt - SWITCH.md)}" y2="${Y(SWITCH.pt - SWITCH.md)}" stroke="${C.alt}" stroke-dasharray="2 3" stroke-width=".8"/><text x="${W}" y="${Y(SWITCH.pt - SWITCH.md) + 8}" text-anchor="end" font-size="6.8" fill="${C.alt}" font-family="JetBrains Mono">OPENS 0.18</text>`;
        let path = '';
        let cpath = '';
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * W;
          path += `${i ? 'L' : 'M'}${x.toFixed(1)} ${Y(tr.p[i]).toFixed(1)}`;
          cpath += `${i ? 'L' : 'M'}${x.toFixed(1)} ${(tr.c[i] ? H + 4 : H + 10).toFixed(1)}`;
        }
        // the debounce window after each closing edge (8 ms default)
        for (const e of tr.edges) {
          const x = (e / tr.span) * W;
          h += `<rect x="${x.toFixed(1)}" y="${H + 2}" width="${((SPEC.debounce / 1000 / tr.span) * W).toFixed(1)}" height="10" fill="${C.acc}" opacity=".22"/>`;
        }
        h += `<path d="${path}" fill="none" stroke="${C.ink}" stroke-width="1.3"/><path d="${cpath}" fill="none" stroke="${C.acc}" stroke-width="1.3"/>`;
        swChart.innerHTML = h;
        swHead.innerHTML = `L PLUNGER ${m.pL.toFixed(2)} MM · ${m.cL ? '<b style="color:' + C.acc + '">CLOSED</b>' : 'OPEN'} · DEBOUNCE ${SPEC.debounce} MS`;
        let a = '';
        let b = '';
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * W;
          a += `${i ? 'L' : 'M'}${x.toFixed(1)} ${tr.A[i] ? 2 : 14}`;
          b += `${i ? 'L' : 'M'}${x.toFixed(1)} ${tr.B[i] ? 22 : 34}`;
        }
        whChart.innerHTML = `<path d="${a}" fill="none" stroke="${C.ink}" stroke-width="1.2"/><path d="${b}" fill="none" stroke="${C.alt}" stroke-width="1.2"/><text x="${W}" y="10" text-anchor="end" font-size="6.8" fill="${C.mute}" font-family="JetBrains Mono">A</text><text x="${W}" y="30" text-anchor="end" font-size="6.8" fill="${C.mute}" font-family="JetBrains Mono">B</text>`;
        whHead.innerHTML = `WHEEL ${m.wheel.toFixed(0)}° · DETENT <b style="color:${C.ink}">${m.detent}</b> · 24 / REV<span class="tier" style="color:${C.flag}">ASSUMED</span>`;
      }
      // buttons
      for (const k of SEQS) {
        const on = s.seq === k;
        btn[k].style.background = on ? C.acc : 'transparent';
        btn[k].style.color = on ? '#fff' : '#85847e';
        btn[k].style.borderRadius = '4px';
      }
      for (const k of LINK_KEYS) onBtn('link_' + k, s.link === k);
      for (const d of SPEC.dpiPresets) onBtn('dpi_' + d, s.dpi === d);
      linkNote.textContent = `${LINKS[s.link].note} · LOD ${s.lod} MM`;
      for (const k of VIEWS) onBtn(k, s.view === k);
      for (const k of DISPLAY) onBtn(k, !!s.display[k]);
      for (const k of LINK_KEYS) {
        lat[k].b.style.background = s.link === k ? C.acc : C.faint;
        lat[k].n.style.color = s.link === k ? C.acc : C.ink;
      }
      for (const k of ['k1', 'bt', 'k4']) pw[k].style.opacity = s.link === k ? '1' : '0.35';
      // timeline
      btn.play.innerHTML = s.paused ? '▶' : '❚❚';
      opFrom.textContent = s.seq.toUpperCase();
      opTo.textContent = `${LINKS[s.link].name}`;
      opPhase.textContent = s.phase;
      const kx = TL.x + s.prog * TL.w;
      tlFill.style.width = `${(s.prog * TL.w).toFixed(1)}px`;
      tlKnob.style.left = `${kx.toFixed(1)}px`;
      tlTime.textContent = `${fmtT(s.tau)} / ${fmtT(s.dur)}`;
      const sk = SP.x + s.speedK * SP.w;
      spFill.style.width = `${(s.speedK * SP.w).toFixed(1)}px`;
      spKnob.style.left = `${sk.toFixed(1)}px`;
      spVal.textContent = `${s.speed.toFixed(2)}×`;
      viewNote.innerHTML = s.note || '';
      // callouts: numbered plates, thin grey leaders with a short level landing, a dot on the part
      let lh = '';
      let ch = '';
      for (const c of s.callouts) {
        if (c.o < 0.02 || !c.at) continue;
        const [ax, ay] = c.at;
        const [lx, ly] = c.label;
        const right = lx > ax;
        const ex = right ? lx - 8 : lx + c.w - 8;
        const kx = ex + (right ? -18 : 18);
        const o = c.o.toFixed(2);
        lh += `<polyline points="${ax.toFixed(1)},${ay.toFixed(1)} ${kx.toFixed(1)},${(ly + 6).toFixed(1)} ${ex.toFixed(1)},${(ly + 6).toFixed(1)}" fill="none" stroke="#85847e" stroke-width=".85" opacity="${o}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="3.2" fill="#fff" opacity="${o}"/><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.1" fill="${C.acc}" opacity="${o}"/>`;
        ch += `<div class="call" style="left:${lx.toFixed(1)}px;top:${(ly - 1).toFixed(1)}px;width:${c.w}px;box-sizing:border-box;opacity:${o}"><b><em>${c.n}</em>${c.name}</b><span>${c.sub}</span></div>`;
      }
      callSvg.innerHTML = lh;
      callG.innerHTML = ch;
      pointer(s.cursor);

      // a lean frame drops the optional captions (the film); the live page keeps them when you drive it
      ui.classList.toggle('lean', !!s.lean);
      // the console builds in panel by panel; panels the shot is not about leave
      const rv = s.reveal ?? 1;
      const lag = 0.055;
      BUILD.forEach((id, i) => {
        const k = smooth((rv * (1 + lag * (BUILD.length - 1)) - lag * i) * 1.0);
        const f = s.focus?.[id] ?? 1;
        const g = groups[id];
        const o = k * f;
        g.style.opacity = o.toFixed(3);
        g.style.transform = o < 0.999 ? `translateY(${((1 - o) * 14).toFixed(1)}px)` : '';
        g.style.visibility = o < 0.003 ? 'hidden' : 'visible';
      });
      for (const [n, k] of [[titleCard, s.title ?? 0], [endCard, s.endcard ?? 0]]) {
        n.style.opacity = k.toFixed(3);
        n.style.transform = `translateY(${((1 - k) * 16).toFixed(1)}px)`;
        n.style.visibility = k < 0.003 ? 'hidden' : 'visible';
      }
      // the feature number
      if (s.big && s.big.k > 0.003) {
        const key = s.big.v + s.big.unit + s.big.cap;
        if (big.dataset.key !== key) {
          big.dataset.key = key;
          big.innerHTML = `<i></i><b>${s.big.v}${s.big.unit ? `<small>${s.big.unit}</small>` : ''}</b><span>${s.big.cap}</span>`;
        }
        big.style.opacity = s.big.k.toFixed(3);
        big.style.transform = `translateX(${((1 - s.big.k) * -14).toFixed(1)}px)`;
        big.style.visibility = 'visible';
      } else big.style.visibility = 'hidden';
      dimSvg.innerHTML = s.dim ? drawDim(s.dim) : '';
      loupe.innerHTML = s.loupe && s.loupe.at ? drawLoupe(s.loupe) : '';
    },
    pointer,
  };
}
