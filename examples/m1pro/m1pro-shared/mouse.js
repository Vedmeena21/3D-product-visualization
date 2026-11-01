// The GravaStar Mercury M1 Pro, Gunmetal Gray, built from code in millimetres. The magnesium skeleton and the
// paddles come from the traced skin (skin.js); everything inside is placed from the FCC photos' board map
// (dims.js, PCB-MAP rev 2): the main board with the PAW3395 and its lens, the nRF52833, the Omron switches, the
// encoder and the wheel, the USB-C, the 602030 cell in its bracket, the KEY board with the DPI and side switches,
// the receiver stored upright in its pocket, the base with six skates. update(state) poses it from the model:
// paddle travel, wheel angle, the slider, the glow, and the exploded, x-ray and section displays.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {BATTERY, BOARD, DETENTS, PADDLES, SIDE_POCKET, SWITCH, WALL, WHEEL} from './dims.js';
import {chartBoxSide, chartBoxTop, crestAt, footAt, halfWidth, holeField, makeSurface, meshSkin, rasterHole, SKELETON_HOLES} from './skin.js';
import {rng} from 'teardown-kit/util.js';

const V3 = THREE.Vector3;
// board map (x forward from the board's rear edge, y toward the mouse's right) → three.js (X forward, Z right)
const MX = (x) => x - BOARD.offset;
const MZ = (y) => y - 18.9;
const BT = BOARD.top;
const BB = BOARD.top - BOARD.thick;
export const XS = (s) => 62 - s;

// ------------------------------------------------------------ materials
export const LIME = new THREE.Color('#b6e61f');
const std = (o) => new THREE.MeshStandardMaterial({envMapIntensity: 0.6, ...o});
// cast-metal grain: roughness wanders a little over a few millimetres and a fine speckle, from object position, so
// the highlights on the rounded struts break up like a real casting (no texture, no UVs)
const castGrain = (m, amt = 0.32) => {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCast;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCast = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vCast;
float cHash(vec3 p){ return fract(sin(dot(p, vec3(17.1, 113.7, 41.3))) * 43758.5453); }
float cNoise(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cHash(i), cHash(i + vec3(1,0,0)), f.x), mix(cHash(i + vec3(0,1,0)), cHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(cHash(i + vec3(0,0,1)), cHash(i + vec3(1,0,1)), f.x), mix(cHash(i + vec3(0,1,1)), cHash(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor * (1.0 - ${(amt / 2).toFixed(3)} + ${amt.toFixed(3)} * (0.7 * cNoise(vCast * 0.22) + 0.3 * cNoise(vCast * 2.3))), 0.05, 1.0);`);
  };
  m.customProgramCacheKey = () => 'cast' + amt;
  return m;
};
export function makeMaterials() {
  return {
    gunmetal: castGrain(std({color: '#868d92', metalness: 0.95, roughness: 0.3, envMapIntensity: 0.95})),
    gunmetalDark: std({color: '#6d7377', metalness: 0.85, roughness: 0.46}),
    paddle: std({color: '#b3b7ba', metalness: 0.55, roughness: 0.52}),
    black: std({color: '#1d1f21', metalness: 0.0, roughness: 0.55}),
    btn: std({color: '#1d1f21', metalness: 0.0, roughness: 0.5}),
    rubber: std({color: '#1a1b1c', metalness: 0.0, roughness: 0.8}),
    under: std({color: '#2b3033', metalness: 0.2, roughness: 0.55}),
    ptfe: std({color: '#15171a', metalness: 0.0, roughness: 0.25, envMapIntensity: 1.2}),
    bezel: std({color: '#2c2f32', metalness: 0.1, roughness: 0.6}),
    pcb: std({color: '#16191b', metalness: 0.1, roughness: 0.42}),
    gold: std({color: '#d4a64a', metalness: 1, roughness: 0.35}),
    steel: std({color: '#c3c6c9', metalness: 1, roughness: 0.3}),
    chip: std({color: '#232527', metalness: 0.2, roughness: 0.38}),
    omron: std({color: '#1c1d1f', metalness: 0.0, roughness: 0.5}),
    blue: std({color: '#2b63c6', metalness: 0.0, roughness: 0.45}),
    white: std({color: '#ecebe6', metalness: 0.0, roughness: 0.5}),
    tan: std({color: '#c49a63', metalness: 0.1, roughness: 0.5}),
    pouch: std({color: '#c9cdd1', metalness: 0.75, roughness: 0.32}),
    kapton: std({color: '#d39b1f', metalness: 0.1, roughness: 0.4}),
    lens: new THREE.MeshPhysicalMaterial({color: '#d9ecf2', metalness: 0, roughness: 0.08, transparent: true, opacity: 0.55, envMapIntensity: 1}),
    smoke: new THREE.MeshPhysicalMaterial({color: '#3a4044', metalness: 0, roughness: 0.15, transparent: true, opacity: 0.6, envMapIntensity: 0.9}),
    led: std({color: '#f4f8e8', emissive: LIME.clone(), emissiveIntensity: 0.0, roughness: 0.3}),
    wire: {r: std({color: '#c8352a', roughness: 0.5}), y: std({color: '#e0b425', roughness: 0.5}), k: std({color: '#151515', roughness: 0.5})},
    ribbon: std({color: '#3a6fd0', roughness: 0.45}),
  };
}

// the inner shell: tinted translucent plastic lit from inside by LED1-3 at the board's rear (no transmission pass)
const SHELL_VERT = /* glsl */ `
#include <common>
#include <clipping_planes_pars_vertex>
varying vec3 vN; varying vec3 vV; varying vec3 vO;
void main(){
  #include <begin_vertex>
  vO = position;
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
}`;
const SHELL_FRAG = /* glsl */ `
#include <common>
#include <clipping_planes_pars_fragment>
uniform vec3 uTint; uniform vec3 uLime; uniform float uGlow; uniform float uA; uniform vec3 uL1; uniform vec3 uL2; uniform vec3 uL3;
varying vec3 vN; varying vec3 vV; varying vec3 vO;
void main(){
  #include <clipping_planes_fragment>
  vec3 n = normalize(vN);
  float f = pow(clamp(1.0 - abs(dot(n, normalize(vV))), 0.0, 1.0), 2.0);
  // light from the three rear LEDs, carried through the light-guide shell and falling off toward the nose
  float g = exp(-distance(vO, uL1) / 44.0) + exp(-distance(vO, uL2) / 44.0) + exp(-distance(vO, uL3) / 44.0);
  g = clamp(g * 0.75, 0.0, 1.0);
  // fine moulded ribs running around the section
  float rib = 0.9 + 0.1 * smoothstep(0.35, 0.5, abs(fract(vO.x / 2.4) - 0.5));
  vec3 lit = uTint * (0.45 + 0.4 * clamp(n.y * 0.5 + 0.5, 0.0, 1.0)) * rib;
  vec3 col = lit + uLime * uGlow * (0.3 + 0.95 * g) * rib + vec3(0.2) * f * (1.0 - 0.6 * uGlow);
  float a = uA * (0.62 + 0.3 * f + 0.08 * uGlow * g);
  gl_FragColor = vec4(min(col, vec3(1.25)), a);
}`;
// the x-ray ghost: a fresnel outline, bright at the silhouette
const GHOST_FRAG = /* glsl */ `
#include <common>
#include <clipping_planes_pars_fragment>
uniform vec3 uCol; uniform float uA; varying vec3 vN; varying vec3 vV; varying vec3 vO;
void main(){
  #include <clipping_planes_fragment>
  float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 2.2);
  gl_FragColor = vec4(uCol, uA * (0.015 + 0.34 * f));
}`;

// ------------------------------------------------------------ helpers
const box = (w, h, d, mat, r = 0) => new THREE.Mesh(r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), mat);
/** a flat part: outline [[X, Z]...] (+ holes), extruded up by `thick` from y0 */
function flat(pts, holes, thick, y0, mat, bevel = 0) {
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes) sh.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const g = new THREE.ExtrudeGeometry(sh, {depth: thick - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8});
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + bevel, 0);
  return new THREE.Mesh(g, mat);
}
const rrect = (x0, x1, z0, z1, r, n = 5) => {
  const out = [];
  const c = [[x1 - r, z1 - r, 0], [x0 + r, z1 - r, 90], [x0 + r, z0 + r, 180], [x1 - r, z0 + r, 270]];
  for (const [cx, cz, a0] of c) for (let i = 0; i <= n; i++) {
    const a = ((a0 + (90 * i) / n) * Math.PI) / 180;
    out.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  return out;
};
const ellipse = (cx, cz, rx, rz, n = 40) => Array.from({length: n}, (_, i) => [cx + rx * Math.cos((i / n) * Math.PI * 2), cz + rz * Math.sin((i / n) * Math.PI * 2)]);
/** a point on the outer skin above (s, z) and the skin's normal there */
function onSkin(surf, s, z) {
  const W = halfWidth(s);
  const phi = Math.sign(z) * Math.asin(Math.pow(Math.min(1, Math.abs(z) / W), 3.4 / 2));
  const P = [0, 0, 0];
  const N = [0, 0, 0];
  surf.frame(s, phi, P, N);
  return {p: new V3(...P), n: new V3(...N)};
}
const tube = (pts, r, mat) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 8), mat);
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ------------------------------------------------------------ the main board's faces: mask, traces, silkscreen
// One atlas, board-map mm: the top side in the upper half, the underside in the lower half. Only the silkscreen the
// FCC photos show is printed (MB, LED1-3, CON2, the SWD pads; RoHS, 94V-0, E520458, NTC, MODE, BAT underneath); the
// traces are drawn between the parts they must join, routed by hand, not traced.
const ATLAS = {x0: 0, x1: 86, y0: -2, y1: 44, px: 12};
function boardFaces(yBottom) {
  const {x0, x1, y0, y1, px} = ATLAS;
  const W = Math.round((x1 - x0) * px);
  const H = Math.round((y1 - y0) * px);
  const tex = canvasTex(W, H * 2, (c) => {
    const X = (x) => (x - x0) * px;
    const Y = (y) => (y - y0) * px;
    c.fillStyle = '#16191b';
    c.fillRect(0, 0, W, H * 2);
    const r = rng(52833);
    // ---- top side (upper half)
    const trace = (pts, w = 0.22) => {
      c.strokeStyle = '#242a2d';
      c.lineWidth = w * px;
      c.lineJoin = 'round';
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))));
      c.stroke();
    };
    // 45° router: along x to k of the way, a 45° jog, along y, then along x into the pad
    const route = (a, b, k = 0.5) => {
      const [ax, ay] = a;
      const [bx, by] = b;
      const sx = Math.sign(bx - ax) || 1;
      const sy = Math.sign(by - ay);
      const mx = ax + (bx - ax) * k;
      const h = Math.min(Math.abs(by - ay) / 2, Math.abs(bx - ax) / 4);
      return [a, [mx - sx * h, ay], [mx + sx * h, ay + sy * 2 * h], [mx + sx * h, by], b];
    };
    const MCU = [53.8, 26.5];
    const bus = (from, to, n, gap = 0.6, k = 0.5) => {
      for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * gap;
        trace(route([from[0], from[1] + o], [to[0], to[1] + o], k));
      }
    };
    bus([44.5, 22.8], [50.2, 25.4], 4, 0.55, 0.6); // sensor SPI + motion
    bus([57.4, 25.0], [66.5, 6.5], 2, 0.7, 0.4); // LB switch
    bus([57.4, 28.5], [66.0, 33.4], 2, 0.7, 0.4); // RB switch
    bus([57.4, 23.2], [63.8, 11.8], 3, 0.6, 0.55); // encoder A/B/C
    trace(route([57.4, 30.0], [75.8, 32.9], 0.7), 0.45); // RF feed to the chip antenna
    bus([57.4, 20.5], [77.0, 18.9], 2, 0.5, 0.75); // USB D+ D-
    bus([50.2, 29.5], [29.8, 32.5], 4, 0.55, 0.3); // CON2 to the KEY board
    for (const L of [[12.0, 8.0], [5.0, 17.8], [10.9, 28.9]]) trace(route([22.0, L[1] < 18 ? 15 : 22], [L[0] + 1.2, L[1]], 0.4));
    bus([24.8, 18.5], [50.2, 23.5], 3, 0.6, 0.5); // LED drivers to the MCU
    trace(route([55.6, 5.5], [52.0, 23.0], 0.5), 0.6); // battery to the regulator
    for (let i = 0; i < 4; i++) trace(route([45.1 + i * 2.05, 35.4], [52.0 + i * 0.5, 30.0], 0.5));
    // vias and a stitched ground edge
    c.fillStyle = '#2b3236';
    for (let i = 0; i < 70; i++) {
      const x = 3 + r() * 72;
      const y = 0.5 + r() * 40;
      c.beginPath();
      c.arc(X(x), Y(y), 0.32 * px, 0, Math.PI * 2);
      c.fill();
    }
    for (let x = 4; x < 70; x += 2.4) {
      c.beginPath();
      c.arc(X(x), Y(41.2), 0.25 * px, 0, Math.PI * 2);
      c.fill();
    }
    // silkscreen: outlines round the parts and the strings in the photos
    c.strokeStyle = 'rgba(214,218,214,.78)';
    c.fillStyle = 'rgba(214,218,214,.82)';
    c.lineWidth = 0.14 * px;
    const outline = (cx, cy, w, h) => c.strokeRect(X(cx - w / 2), Y(cy - h / 2), w * px, h * px);
    outline(40.05, 18.1, 17.0, 9.8);
    outline(53.8, 26.5, 7.8, 7.8);
    outline(68.0, 4.0, 13.4, 6.4);
    outline(67.0, 35.8, 13.4, 6.4);
    outline(66.0, 28.3, 6.8, 6.8);
    outline(55.6, 2.9, 7.0, 5.8);
    outline(28.3, 32.5, 5.8, 4.8);
    c.beginPath();
    c.arc(X(50.6), Y(23.3), 0.35 * px, 0, Math.PI * 2);
    c.fill();
    let mirror = 1;
    const txt = (s, x, y, size = 1.1) => {
      c.save();
      c.translate(X(x), Y(y));
      c.scale(1, mirror);
      c.font = `700 ${size * px}px 'JetBrains Mono', monospace`;
      c.fillText(s, 0, 0);
      c.restore();
    };
    txt('MB', 62.6, 32.4);
    txt('LED1', 13.6, 7.0, 0.9);
    txt('LED2', 12.6, 31.4, 0.9);
    txt('LED3', 6.6, 16.0, 0.9);
    txt('CON2', 25.4, 36.2, 0.9);
    ['GND', 'VDD', 'SW', 'CLK'].forEach((s, i) => txt(s, 44.5 + i * 2.05, 38.2, 0.62));
    // ---- underside (lower half), in the same board-map frame; read from below, so its strings are mirrored
    c.save();
    c.translate(0, H);
    mirror = -1;
    for (let i = 0; i < 26; i++) {
      const y = 2 + r() * 38;
      const xa = 4 + r() * 30;
      trace(route([xa, y], [xa + 8 + r() * 30, y + (r() - 0.5) * 10], 0.5));
    }
    c.fillStyle = 'rgba(214,218,214,.82)';
    c.strokeStyle = 'rgba(214,218,214,.78)';
    c.lineWidth = 0.14 * px;
    outline(56.5, 20.25, 8.6, 17.4);
    txt('MODE', 51.0, 30.6, 1.0);
    txt('SW1', 51.0, 10.6, 1.0);
    txt('BAT', 58.5, 5.6, 1.0);
    txt('NTC', 46.5, 5.6, 0.9);
    txt('RoHS', 24.0, 36.0, 0.9);
    txt('XSC-D 94V-0', 24.0, 38.0, 0.9);
    txt('E520458', 24.0, 40.0, 0.9);
    c.restore();
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const mat = std({map: tex, color: '#ffffff', metalness: 0.1, roughness: 0.42});
  // ExtrudeGeometry's caps carry the shape's (X, -Z) as uv; onBeforeCompile maps them into the atlas halves
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
      {
        vec2 mm = vec2(uv.x + 31.0, 18.9 - uv.y);
        float bot = position.y < ${(yBottom + 0.01).toFixed(3)} ? 1.0 : 0.0;
        vec2 a = vec2((mm.x - ${x0.toFixed(1)}) / ${(x1 - x0).toFixed(1)}, (mm.y - ${y0.toFixed(1)}) / ${(y1 - y0).toFixed(1)});
        vMapUv = vec2(a.x, bot > 0.5 ? 0.5 - a.y * 0.5 : 1.0 - a.y * 0.5);
      }`,
    );
  };
  mat.customProgramCacheKey = () => 'board';
  return mat;
}
/** a printed marking on a part's face: a transparent plane w × h mm */
function marking(w, h, lines, {color = 'rgba(205,209,212,.9)', px = 40, weight = 700} = {}) {
  const tex = canvasTex(Math.round(w * px), Math.round(h * px), (c, W, H) => {
    c.clearRect(0, 0, W, H);
    c.fillStyle = color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    lines.forEach(([s, size, dy], i) => {
      c.font = `${weight} ${size * px}px 'JetBrains Mono', monospace`;
      c.fillText(s, W / 2, H / 2 + (dy ?? (i - (lines.length - 1) / 2) * size * 1.3) * px);
    });
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({map: tex, transparent: true, roughness: 0.5, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3, depthWrite: false}));
  m.renderOrder = 2;
  return m;
}

// ------------------------------------------------------------ the build
export function buildMouse() {
  const M = makeMaterials();
  const root = new THREE.Group();
  const layer = (name) => {
    const g = new THREE.Group();
    g.name = name;
    root.add(g);
    return g;
  };
  const L = {base: layer('base'), pcb: layer('pcb'), wheel: layer('wheel'), battery: layer('battery'), key: layer('key'), shell: layer('shell'), skeleton: layer('skeleton')};
  const shells = []; // meshes that turn to ghosts in x-ray
  const outer = makeSurface();

  // ---------------- skeleton: the traced skin with its openings, rounded edges, 1.4 mm wall
  const skel = new THREE.Mesh(meshSkin(outer, holeField(SKELETON_HOLES), {nu: 360, nv: 270, reach: 1.9}), M.gunmetal);
  skel.castShadow = true;
  skel.receiveShadow = true;
  L.skeleton.add(skel);
  shells.push(skel);

  // DPI ring boss, the logo medallion: oriented on the skin
  const sitOn = (obj, s, z, lift = 0) => {
    const {p, n} = onSkin(outer, s, z);
    obj.position.copy(p).addScaledVector(n, lift);
    obj.quaternion.setFromUnitVectors(new V3(0, 1, 0), n);
    return obj;
  };
  {
    const ringPts = rrect(-5.4, 5.4, -5.0, 5.0, 3.2);
    const ringHole = rrect(-4.1, 4.1, -3.7, 3.7, 2.3);
    const ring = flat(ringPts, [ringHole], 1.6, -1.0, M.gunmetal, 0.35);
    const g = sitOn(new THREE.Group(), 49.2, 0, 0);
    g.add(ring);
    L.skeleton.add(g);
    shells.push(ring);
    const med = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 6.9, 1.2, 64), M.gunmetal);
    med.position.y = -0.35;
    const mg = sitOn(new THREE.Group(), 87.6, 0, 0);
    mg.add(med);
    // the emblem, a shallow raised ring and mark
    const emb = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.32, 8, 48), M.gunmetalDark);
    emb.rotation.x = Math.PI / 2;
    emb.position.y = 0.3;
    mg.add(emb);
    L.skeleton.add(mg);
    shells.push(med, emb);
  }

  // ---------------- paddles: the skin inside each paddle outline, 1.6 mm, printed, hinged at the rear (assumed)
  const printL = canvasTex(1024, 512, (c, w, h) => {
    c.fillStyle = '#b3b7ba';
    c.fillRect(0, 0, w, h);
    c.save();
    c.translate(w * 0.62, h * 0.78);
    c.fillStyle = '#3b3f43';
    c.font = '800 34px Inter, sans-serif';
    c.letterSpacing = '6px';
    c.fillText('GAME BEYOND LIMITS', 0, 0);
    c.restore();
    c.strokeStyle = '#3b3f43';
    c.lineWidth = 7;
    const x0 = w * 0.17;
    const y0 = h * 0.3;
    c.beginPath();
    c.moveTo(x0 - 16, y0 - 16);
    c.lineTo(x0 + 16, y0 + 16);
    c.moveTo(x0 + 16, y0 - 16);
    c.lineTo(x0 - 16, y0 + 16);
    c.stroke();
  });
  const printR = canvasTex(1024, 512, (c, w, h) => {
    c.fillStyle = '#b3b7ba';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#4a4f53';
    c.font = '900 150px Inter, sans-serif';
    c.fillText('M1', w * 0.5, h * 0.62);
    c.fillStyle = '#3b3f43';
    c.font = '800 30px Inter, sans-serif';
    c.fillText('GAME BEYOND LIMITS', w * 0.2, h * 0.24);
  });
  const paddles = {};
  for (const side of ['L', 'R']) {
    const pts = PADDLES[side];
    const ras = rasterHole({view: 'top', pts});
    const field = (P, n) => [n[1] > 0.05 ? -ras.sample(62 - P[0], P[2]) - 0.45 : -1, 0.7];
    const geo = meshSkin(outer, field, {...chartBoxTop(outer, pts, 1.5), nu: 150, nv: 80, t: 1.6, o: 0.15});
    // uv: the paddle's top-view box, s across, z up
    const ss = pts.map((p) => p[0]);
    const zz = pts.map((p) => p[1]);
    const s0 = Math.min(...ss);
    const s1 = Math.max(...ss);
    const z0 = Math.min(...zz);
    const z1 = Math.max(...zz);
    const P = geo.attributes.position;
    const uv = new Float32Array(P.count * 2);
    for (let i = 0; i < P.count; i++) {
      uv[2 * i] = (62 - P.getX(i) - s0) / (s1 - s0);
      uv[2 * i + 1] = (P.getZ(i) - z0) / (z1 - z0);
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const mat = M.paddle.clone();
    mat.map = side === 'L' ? printL : printR;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    // hinge (assumed) across the paddle's rear at s 50, the plunger under s 21.5
    const sH = 50;
    const zc = side === 'L' ? -16 : 16;
    const hinge = onSkin(outer, sH, zc).p;
    const pivot = new THREE.Group();
    pivot.position.set(XS(sH), hinge.y - 1.6, 0);
    mesh.position.set(-XS(sH), -(hinge.y - 1.6), 0);
    pivot.add(mesh);
    // the actuator post under the paddle, down to the plunger
    const sw = side === 'L' ? {x: 71.5, y: 4.0} : {x: 71.5, y: 35.8};
    const top = onSkin(outer, 62 - MX(sw.x), MZ(sw.y)).p;
    const plungerTop = BT + SWITCH.body[2] + 0.6;
    const postH = top.y - 1.7 - plungerTop - 0.05;
    const post = box(2.6, postH, 2.6, M.black, 0.4);
    post.position.set(MX(sw.x) - XS(sH), plungerTop + 0.05 + postH / 2 - (hinge.y - 1.6), MZ(sw.y));
    pivot.add(post);
    L.skeleton.add(pivot);
    paddles[side] = {pivot, mesh, arm: sH - (62 - MX(sw.x)), post};
    shells.push(mesh);
  }

  // ---------------- side buttons: the skin inside the pocket, split front and rear, black, 0.5 proud
  const sideBtns = [];
  {
    const ras = rasterHole({view: 'left', pts: SIDE_POCKET});
    const split = [[45, 59.85], [60.15, 76.5]];
    for (const [a, b] of split) {
      const field = (P, n) => {
        const s = 62 - P[0];
        if (n[2] > -0.05) return [-1, 0.6];
        return [Math.min(-ras.sample(s, P[1]) - 0.35, s - a, b - s), 0.6];
      };
      const geo = meshSkin(outer, field, {...chartBoxSide(outer, SIDE_POCKET.filter(([s]) => s >= a - 1 && s <= b + 1), -1, 1.5), nu: 70, nv: 40, t: 1.4, o: 0.5});
      const m = new THREE.Mesh(geo, M.btn);
      m.castShadow = true;
      L.skeleton.add(m);
      sideBtns.push(m);
      shells.push(m);
    }
  }

  // ---------------- the vents' dark backing panel, just inside the wall on each side (Gunmetal renders)
  {
    const backer = makeSurface({inset: 1.7, drop: 1.7});
    const ras = rasterHole({view: 'left', pts: [[25.5, 5.2], [61.5, 5.2], [61.5, 9.2], [58.5, 15.2], [36, 15.2], [25.5, 11]]});
    for (const side of [-1, 1]) {
      const field = (P, n) => (n[2] * side > 0.1 ? [-ras.sample(62 - P[0], P[1]), 0.4] : [-1, 0.4]);
      const box = chartBoxSide(backer, [[24, 4.5], [63, 4.5], [63, 16], [24, 16]], side, 0.5);
      const m = new THREE.Mesh(meshSkin(backer, field, {...box, nu: 90, nv: 30, t: 0.8, inner: false}), M.bezel);
      L.skeleton.add(m);
      shells.push(m);
    }
  }

  // ---------------- DPI cap and its stem down to K1 on the KEY board
  const K1 = {x: 44.2, y: 18.9};
  const dpi = new THREE.Group();
  {
    const {p, n} = onSkin(outer, 49.0, 0);
    const cap = box(6.2, 2.4, 5.8, M.btn, 1.1);
    const g = new THREE.Group();
    g.position.copy(p).addScaledVector(n, -0.2);
    g.quaternion.setFromUnitVectors(new V3(0, 1, 0), n);
    g.add(cap);
    dpi.add(g);
    dpi.userData.capY = p.y - 1.4;
    L.skeleton.add(dpi);
    shells.push(cap);
  }

  // ---------------- inner shell: the skin pulled in, lit from the rear LEDs
  const inner = makeSurface({inset: 2.6, drop: 2.9, lift: 0.7});
  const LED = [[12.0, 8.0], [5.0, 17.8], [10.9, 28.9]].map(([x, y]) => new V3(MX(x), BT + 0.6, MZ(y)));
  // what the lit shell throws back onto the skeleton's inner walls and the board (no shadow: it is all inside)
  const glowLight = new THREE.PointLight(LIME.clone(), 0, 80, 1.0);
  glowLight.position.set(MX(14), BT + 9, 0);
  L.shell.add(glowLight);
  const shellMat = new THREE.ShaderMaterial({
    vertexShader: SHELL_VERT,
    fragmentShader: SHELL_FRAG,
    uniforms: {uTint: {value: new THREE.Color('#33392a')}, uLime: {value: LIME.clone()}, uGlow: {value: 1}, uA: {value: 1}, uL1: {value: LED[0]}, uL2: {value: LED[1]}, uL3: {value: LED[2]}},
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    clipping: true,
  });
  {
    const holes = [
      {view: 'top', pts: [[14, 0], [14.5, 3.5], [17, 4.6], [38, 4.6], [40.6, 3], [41, 0], [40.6, -3], [38, -4.6], [17, -4.6], [14.5, -3.5]]},
      {view: 'top', pts: rrect(46.5, 51.5, -2.6, 2.6, 1.2)},
      {view: 'top', pts: ellipse(62 - MX(71.5), MZ(4.0), 2.6, 2.6, 16)},
      {view: 'top', pts: ellipse(62 - MX(71.5), MZ(35.8), 2.6, 2.6, 16)},
      {view: 'front', pts: rrect(-5.4, 5.4, 8.2, 13.0, 1.8)},
      {view: 'left', pts: SIDE_POCKET.map(([s, y]) => [s, y - 1.2])},
    ].map((h) => rasterHole(h, 0.4));
    const geo = meshSkin(inner, holeField(holes), {nu: 220, nv: 150, t: 1.0, inner: false});
    const m = new THREE.Mesh(geo, shellMat);
    m.renderOrder = 4;
    L.shell.add(m);
    // the dark bezel around the wheel, just under the skeleton's wheel opening
    const outerRas = rasterHole({view: 'top', pts: [[11.3, 0], [12, 2.5], [13.5, 4.0], [17, 5.0], [25, 5.3], [35, 5.3], [39, 4.6], [41, 2.8], [41.6, 0], [41, -2.8], [39, -4.6], [35, -5.3], [25, -5.3], [17, -5.0], [13.5, -4.0], [12, -2.5]]});
    const innerRas = rasterHole({view: 'top', pts: [[15.5, 0], [16, 3.0], [18, 3.9], [38, 3.9], [40.2, 2.6], [40.6, 0], [40.2, -2.6], [38, -3.9], [18, -3.9], [16, -3.0]]});
    const bez = makeSurface({inset: 0.4, drop: 1.6});
    const bfield = (P, n) => {
      const s = 62 - P[0];
      return [Math.min(1.2 - outerRas.sample(s, P[2]), innerRas.sample(s, P[2])), 0.5];
    };
    const bezel = new THREE.Mesh(meshSkin(bez, bfield, {...chartBoxTop(bez, [[10, -7], [43, 7]], 1), nu: 90, nv: 40, t: 1.6}), M.bezel);
    L.shell.add(bezel);
    shells.push(bezel);
  }

  // ---------------- base tray: the planform pulled in, a chin at the nose, near-black underneath
  {
    const pts = [];
    const N = 90;
    const sA = -0.9;
    const sB = 120.6;
    const wB = (s) => {
      const w = halfWidth(Math.max(0, s)) - 0.4 + Math.max(0, 1 - s / 25) * 1.2;
      return s < 0.8 ? Math.min(w, Math.sqrt(Math.max(0, 60 * (s - sA)))) : w;
    };
    for (let i = 0; i <= N; i++) {
      const s = sA + ((sB - sA) * i) / N;
      pts.push([XS(s), -wB(s)]);
    }
    // the rear: a rounded end across the tail
    const wEnd = wB(sB);
    for (let i = 1; i < 12; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 12;
      pts.push([XS(sB) - 2.4 * Math.cos(a), wEnd * Math.sin(a)]);
    }
    for (let i = N; i >= 0; i--) {
      const s = sA + ((sB - sA) * i) / N;
      pts.push([XS(s), wB(s)]);
    }
    const S = (s, z) => [XS(s), z];
    const holes = [
      rrect(XS(62), XS(31), -11.2, 11.6, 5).map(([x, z]) => [x, z]), // the window: lens and slider
      ellipse(XS(46), -19.5, 10, 4.6, 28), // left smoked window
      ellipse(XS(46), 19.5, 10, 4.6, 28), // right smoked window
      rrect(XS(83.2), XS(77.8), -6.4, 6.4, 0.8), // the receiver pocket
      ellipse(XS(100.5), -18, 5, 6, 24),
      ellipse(XS(100.5), 18, 5, 6, 24),
      ellipse(XS(112.5), -13.5, 4.2, 5.5, 24),
      ellipse(XS(112.5), 13.5, 4.2, 5.5, 24),
    ];
    void S;
    const tray = flat(pts, holes, 3.1, 0.7, [M.under, M.gunmetalDark], 0.6);
    tray.castShadow = true;
    tray.receiveShadow = true;
    L.base.add(tray);
    shells.push(tray);
    // smoked inserts in the three windows
    for (const h of holes.slice(0, 3)) {
      const w = flat(h, [], 1.0, 1.4, M.smoke);
      w.renderOrder = 3;
      L.base.add(w);
    }
    // six PTFE skates: four corners, the sensor ring, a frame around the pocket
    const sk = (outline, holesK = []) => {
      const m = flat(outline, holesK, 0.7, 0.0, M.ptfe, 0.15);
      L.base.add(m);
      return m;
    };
    const tri = (s0, s1, z0, z1) => {
      // a rounded triangle tucked into a corner: one side along the outline, the inner side bowing in to |z0|
      const out = [];
      const n = 14;
      const sg = Math.sign(z1);
      for (let i = 0; i <= n; i++) {
        const s = s0 + ((s1 - s0) * i) / n;
        out.push([XS(s), sg * (halfWidth(s) - 2.6)]);
      }
      for (let i = n - 1; i > 0; i--) {
        const k = i / n;
        const s = s0 + (s1 - s0) * k;
        const w = halfWidth(s) - 2.6;
        out.push([XS(s), sg * (w - (w - Math.abs(z0)) * Math.pow(Math.sin(Math.PI * k), 0.7))]);
      }
      return out;
    };
    sk(tri(7, 21, -15, -26));
    sk(tri(7, 21, 15, 26));
    sk(tri(103, 117, -13, -24));
    sk(tri(103, 117, 13, 24));
    const lensS = 62 - MX(39.0);
    sk(ellipse(XS(lensS), MZ(20.8), 6.8, 6.8, 40), [ellipse(XS(lensS), MZ(20.8), 4.4, 4.4, 32)]);
    sk(rrect(XS(90), XS(71), -11.5, 11.5, 4), [rrect(XS(83.6), XS(77.4), -6.8, 6.8, 1)]);
    // the label, at the front
    const lab = canvasTex(512, 384, (c, w, h) => {
      c.fillStyle = '#26292b';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#9ca2a6';
      c.font = '700 26px Inter, sans-serif';
      c.fillText('GravaStar', 150, 92);
      c.font = '500 15px Inter, sans-serif';
      ['Model: Mercury M1 Pro', 'FCC ID: 2ASXF-M1', 'Input: 5V ⎓ 450mA', 'Battery: 3.7V 300mAh', 'MADE IN CHINA'].forEach((t, i) => c.fillText(t, 150, 130 + i * 26));
      c.strokeStyle = '#9ca2a6';
      c.lineWidth = 2;
      c.strokeRect(150, 270, 46, 34);
      c.font = '700 22px Inter';
      c.fillText('CE', 206, 296);
      c.fillText('FC', 252, 296);
    });
    const label = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({map: lab, roughness: 0.6, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2}));
    label.scale.set(9.5, 12.5, 1);
    label.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    label.position.set(XS(19), 0.68, 0);
    L.base.add(label);
    // two exposed screws flanking the pocket
    for (const [s, z] of [[74, 14.5], [88, -13.5]]) {
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.6, 24), M.steel);
      sc.position.set(XS(s), 0.62, z);
      L.base.add(sc);
      const x1 = box(2.6, 0.3, 0.5, M.chip);
      x1.position.set(XS(s), 0.4, z);
      const x2 = x1.clone();
      x2.rotation.y = Math.PI / 2;
      L.base.add(x1, x2);
    }
  }

  // ---------------- main board, 1.2 mm FR4, outline and cut-outs from the FCC photos
  {
    const B = [[0.4, -1], [0.4, 16], [2.2, 16], [2.2, 20], [0.4, 20], [0.4, 42.2], [72, 42.2], [78.3, 37], [78.3, 23], [84.5, 23], [84.5, 14.8], [77.0, 14.8], [77.0, 3.5], [73, -1]];
    const pts = B.map(([x, y]) => [MX(x), MZ(y)]);
    const cut = rrect(MX(8.3), MX(20.3), MZ(8.5), MZ(26.3), 1.5);
    const slot = rrect(MX(62.1), MX(70.3), MZ(12.5), MZ(25.2), 1.0);
    const holes = [[32.2, 11.9], [31.6, 27.6], [60.0, 30.8], [73.5, 11.4], [22.8, 9.7], [22.0, 27.5], [53.1, 8.9], [47.9, 7.5]].map(([x, y], i) => ellipse(MX(x), MZ(y), i < 4 ? 1.4 : 1.1, i < 4 ? 1.4 : 1.1, 16).reverse());
    const pcb = flat(pts, [cut, slot, ...holes], BOARD.thick, BB, [boardFaces(BB), M.pcb]);
    pcb.castShadow = true;
    pcb.receiveShadow = true;
    L.pcb.add(pcb);
    // gold rings around the plated holes, screws in them
    for (const [x, y] of [[32.2, 11.9], [31.6, 27.6], [60.0, 30.8], [73.5, 11.4]]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.3, 24), M.gold);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(MX(x), BT + 0.02, MZ(y));
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 1.1, 20), M.steel);
      sc.position.set(MX(x), BT + 0.55, MZ(y));
      L.pcb.add(ring, sc);
    }
  }
  const onBoard = (mesh, x, y, h, under = false) => {
    mesh.position.set(MX(x), under ? BB - h / 2 : BT + h / 2, MZ(y));
    mesh.castShadow = true;
    L.pcb.add(mesh);
    return mesh;
  };
  // PAW3395 on top, its lens through the board below
  const sensor = onBoard(box(16.3, 3.2, 9.0, M.chip, 0.3), 40.05, 18.1, 3.2);
  for (let i = 0; i < 8; i++) for (const yy of [-5.2, 5.2]) {
    const pin = box(0.5, 1.2, 0.9, M.steel);
    pin.position.set(MX(40.05) - 7 + i * 2, BT + 0.6, MZ(18.1) + yy);
    L.pcb.add(pin);
  }
  const lens = new THREE.Group();
  {
    const blk = box(16.8, BB - 2.4 - 1.2, 10.8, M.lens, 0.8);
    blk.position.set(MX(40.1), (BB + 2.4 + 1.2) / 2, MZ(20.8));
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 1.2, 32), M.lens);
    nose.position.set(MX(39.0), 2.4 + 0.6, MZ(20.8));
    lens.add(blk, nose);
    L.pcb.add(lens);
  }
  onBoard(box(7, 0.85, 7, M.chip, 0.15), 53.8, 26.5, 0.85);
  onBoard(box(3.7, 1.5, 4.5, M.chip, 0.3), 37.7, 5.2, 1.5);
  for (const [x, y, rot] of [[34.5, 1.9], [43.0, 3.4], [34.5, 8.4], [38.4, 8.4], [29.2, 16.0, 1], [36.2, 34.1]]) {
    const c = box(rot ? 1.25 : 2.0, 1.25, rot ? 2.0 : 1.25, M.tan, 0.15);
    onBoard(c, x, y, 1.25);
  }
  for (const [x, y] of [[21.4, 14.2], [23.1, 19], [24.8, 23.6], [6.4, 13], [13.5, 30.5]]) onBoard(box(2.9, 1.0, 1.3, M.chip), x, y, 1.0);
  const leds = [[12.0, 8.0], [5.0, 17.8], [10.9, 28.9]].map(([x, y]) => onBoard(box(1.7, 0.6, 1.7, M.led), x, y, 0.6));
  onBoard(box(6.2, 4.3, 5.0, M.white, 0.3), 55.6, 2.9, 4.3);
  onBoard(box(5.0, 3.6, 4.0, M.white, 0.3), 28.3, 32.5, 3.6);
  onBoard(box(1.7, 1.0, 8.3, M.white, 0.2), 77.0, 32.9, 1.0);
  for (let i = 0; i < 4; i++) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), M.gold);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(MX(45.1 + i * 2.05), BT + 0.02, MZ(36.0));
    L.pcb.add(pad);
  }
  // USB-C receptacle at the nose
  onBoard(box(7.2, 3.26, 8.94, M.steel, 1.2), 80.9, 18.9, 3.26);
  // ~60 passives (0402) in the clusters the photos show, placed once from a seed
  {
    const r = rng(3395);
    const zones = [[48, 62, 15, 35, 22], [34, 46, 10, 13, 10], [34, 48, 24, 26, 10], [2, 16, 9, 33, 18]];
    const taken = [[35, 45, 13.5, 22.7], [50, 57.5, 22.8, 30.2], [52.5, 58.7, 0.3, 5.5], [5, 20.5, 8.5, 26.3]];
    for (const [x0, x1, y0, y1, n] of zones) {
      let k = 0;
      for (let tries = 0; k < n && tries < 400; tries++) {
        const x = x0 + r() * (x1 - x0);
        const y = y0 + r() * (y1 - y0);
        if (taken.some(([a, b, c, d]) => x > a && x < b && y > c && y < d)) continue;
        taken.push([x - 0.8, x + 0.8, y - 0.6, y + 0.6]);
        const rot = r() < 0.5;
        onBoard(box(rot ? 0.5 : 1.0, 0.35, rot ? 1.0 : 0.5, r() < 0.6 ? M.tan : M.chip), x, y, 0.35);
        k++;
      }
    }
  }
  // the mode slider on the underside (2.4G / OFF / BT), knob travelling across the mouse
  const slider = new THREE.Group();
  {
    const body = box(8.0, 2.4, 16.7, M.chip, 0.3);
    body.position.set(MX(56.5), BB - 1.2, MZ(20.25));
    const knob = box(2.2, 2.6, 3.0, M.white, 0.4);
    knob.position.set(MX(56.3), BB - 2.4 - 1.3, MZ(22.6));
    slider.add(body, knob);
    slider.userData.knob = knob;
    L.pcb.add(slider);
  }
  // Omron D2FC under the paddles: black body (12.8 long, 5.8 wide, 6.5 tall), blue plunger toward the front
  const omron = {};
  for (const [side, x, y] of [['L', 68.0, 4.0], ['R', 67.0, 35.8]]) {
    const [bl, bw, bh] = SWITCH.body;
    const b = onBoard(box(bl, bh, bw, M.omron, 0.25), x, y, bh);
    const pl = box(2.8, 1.2, 2.2, M.blue, 0.3);
    pl.position.set(MX(71.5), BT + bh, MZ(y));
    L.pcb.add(pl);
    omron[side] = {body: b, plunger: pl, y0: pl.position.y};
    for (const sg of [-1, 1]) {
      const mk = marking(10.5, 4.4, [['OMRON', 1.5, -0.55], ['D2FC-F-K(50M)', 0.62, 1.05]]);
      mk.position.set(MX(x), BT + bh / 2, MZ(y) + sg * (bw / 2 + 0.02));
      mk.rotation.y = sg > 0 ? 0 : Math.PI;
      L.pcb.add(mk);
    }
  }
  // part markings on the chips' tops
  {
    const up = (m, x, y, top) => {
      m.rotation.x = -Math.PI / 2;
      m.position.set(MX(x), top + 0.01, MZ(y));
      L.pcb.add(m);
      return m;
    };
    up(marking(13, 6.4, [['PixArt', 0.9, -1.5], ['PAW3395DM', 1.45, 0.4]]), 40.05, 18.1, BT + 3.2);
    up(marking(6.2, 6.2, [['N52833', 1.0, -0.6], ['QDAA', 0.8, 0.8]]), 53.8, 26.5, BT + 0.85);
  }
  // middle-click tact switch under the wheel carrier
  onBoard(box(6, 3.4, 6, M.omron, 0.3), 66, 28.3, 3.4);
  const mbCap = onBoard(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.0, 20), M.black), 66, 28.3, 1.0);
  mbCap.position.y = BT + 3.4 + 0.5;
  // encoder: steel frame round a black core, the shaft at the wheel's axle
  const axleY = BT + WHEEL.h;
  {
    const frame = box(12, axleY + 3.4 - BT, 6, M.steel, 0.4);
    frame.position.set(MX(66.3), BT + (axleY + 3.4 - BT) / 2, MZ(10.5));
    const core = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 6.4, 32), M.chip);
    core.rotation.x = Math.PI / 2;
    core.position.set(MX(66.0), axleY, MZ(10.5));
    for (const m of [frame, core]) {
      m.castShadow = true;
      L.pcb.add(m);
    }
  }

  // ---------------- the wheel: Ø23.5 × 7.3, X tread, on its axle; the carrier rests on the middle switch
  const wheel = new THREE.Group();
  wheel.position.set(MX(WHEEL.x), axleY, MZ(WHEEL.y));
  {
    const R = WHEEL.d / 2;
    const w = WHEEL.w;
    const seg = 160;
    const rows = 22;
    const pos = [];
    const idx = [];
    for (let j = 0; j <= rows; j++) {
      const k = j / rows;
      const zz = -w / 2 + w * k;
      // a rounded shoulder at each side, the X tread in the middle
      const edge = Math.min(k, 1 - k) * w;
      const sh = edge < 1.1 ? 1.1 - Math.sqrt(Math.max(0, 1.1 * 1.1 - (1.1 - edge) * (1.1 - edge))) : 0;
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        const arc = a * R;
        const f1 = ((((arc + zz * 1.25) / 7.6) % 1) + 1) % 1;
        const f2 = ((((arc - zz * 1.25) / 7.6) % 1) + 1) % 1;
        const line = (f) => 1 - Math.min(1, Math.max(0, (Math.min(f, 1 - f) - 0.05) / 0.04));
        const groove = edge > 0.9 ? 0.55 * Math.max(line(f1), line(f2)) : 0;
        const r = R - sh - groove;
        pos.push(r * Math.cos(a), r * Math.sin(a), zz);
      }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i;
      const b = a + seg + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const tyre = new THREE.Mesh(g, M.rubber);
    tyre.castShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(R - 1.0, R - 1.0, w - 0.4, 48), M.black);
    hub.rotation.x = Math.PI / 2;
    const spin = new THREE.Group();
    spin.add(tyre, hub);
    // a light index mark on the hub face so the turn reads
    const mark = box(0.8, 3.2, 0.2, M.steel);
    mark.position.set(0, R - 3.4, w / 2 - 0.15);
    spin.add(mark);
    wheel.add(spin);
    wheel.userData.spin = spin;
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 17, 12), M.steel);
    axle.rotation.x = Math.PI / 2;
    axle.position.z = 2.0;
    wheel.add(axle);
    // the carrier arm on the right, down onto the middle switch
    const arm = box(5, axleY - (BT + 4.4) + 1.5, 1.6, M.chip, 0.3);
    arm.position.set(0, -(axleY - (BT + 4.4)) / 2 + 0.75, 8.6);
    wheel.add(arm);
  }
  L.wheel.add(wheel);

  // ---------------- battery: 602030 in its bracket, bridging over the sensor; leads to the 3-pin connector
  const BAT_Y = BT + 3.2 + 0.6 + 0.4;
  {
    const [bl, bw, bh] = BATTERY.dims;
    const brk = new THREE.Group();
    const plate = box(bl + 2, 0.4, bw + 2.4, M.steel);
    plate.position.set(MX(34.5), BAT_Y - 0.2, MZ(18.9));
    brk.add(plate);
    for (const [x, y] of [[20, 7.6], [20, 30.2], [49, 7.6], [49, 30.2]]) {
      const leg = box(3, BAT_Y - BT, 0.4, M.steel);
      leg.position.set(MX(x), BT + (BAT_Y - BT) / 2, MZ(y));
      brk.add(leg);
    }
    L.battery.add(brk);
    const cell = box(bl - 2.5, bh, bw, M.pouch, 1.0);
    cell.position.set(MX(34.5) - 1.25, BAT_Y + bh / 2, MZ(18.9));
    cell.castShadow = true;
    const prot = box(2.6, bh - 1.4, bw - 1, M.kapton, 0.4);
    prot.position.set(MX(34.5) + bl / 2 - 1.3, BAT_Y + bh / 2, MZ(18.9));
    const lab = canvasTex(512, 340, (c, w, h) => {
      c.fillStyle = '#c9cdd1';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#41464b';
      c.font = '700 42px Inter, sans-serif';
      c.fillText('HSZ 602030', 40, 90);
      c.font = '500 30px Inter, sans-serif';
      c.fillText('3.7V  300mAh  1.11Wh', 40, 150);
      c.fillText('Li-polymer', 40, 200);
    });
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(bl - 6, bw - 3), new THREE.MeshStandardMaterial({map: lab, metalness: 0.5, roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -2}));
    tag.rotation.x = -Math.PI / 2;
    tag.position.set(MX(34.5) - 1.5, BAT_Y + bh + 0.01, MZ(18.9));
    L.battery.add(cell, prot, tag);
    const from = new V3(MX(34.5) + bl / 2, BAT_Y + bh / 2, MZ(18.9) - 6);
    const to = new V3(MX(55.6), BT + 4.0, MZ(2.9));
    [[M.wire.r, -0.9], [M.wire.y, 0], [M.wire.k, 0.9]].forEach(([m, dz]) => {
      const a = from.clone().add(new V3(0, 0, dz));
      const b = to.clone().add(new V3(-1, 0, dz));
      L.battery.add(tube([a, a.clone().add(new V3(3, 0.5, -3)), b.clone().add(new V3(-2, 2, 2)), b], 0.45, m));
    });
  }

  // ---------------- KEY board: flat over the battery; K1 (DPI) on the centreline, B4/B5 at its left edge
  const KEY_Y = BAT_Y + BATTERY.dims[2] + 0.5;
  {
    const pts = [[17, 1], [48, 1], [48, 24], [38, 24], [38, 33.5], [17, 33.5]].map(([x, y]) => [MX(x), MZ(y)]);
    const kb = flat(pts, [], 1.0, KEY_Y, M.pcb);
    kb.castShadow = true;
    L.key.add(kb);
    const at = (m, x, y, h) => {
      m.position.set(MX(x), KEY_Y + 1.0 + h / 2, MZ(y));
      m.castShadow = true;
      L.key.add(m);
      return m;
    };
    at(box(6, 2.0, 6, M.omron, 0.3), K1.x, K1.y, 2.0);
    const k1cap = at(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.8, 20), M.blue), K1.x, K1.y, 0.8);
    k1cap.position.y += 2.0;
    for (const x of [40.8, 26.2]) {
      at(box(5.8, 3.5, 3.6, M.omron, 0.3), x, 3.0, 3.5);
      const pl = box(2.2, 1.6, 1.4, M.blue, 0.2);
      pl.position.set(MX(x), KEY_Y + 1 + 1.9, MZ(1.0) - 0.4);
      L.key.add(pl);
    }
    at(box(4.5, 1.6, 3.0, M.white, 0.2), 22, 30, 1.6);
    // the short blue flat cable from J1 down to CON2 on the main board
    const a = new V3(MX(22), KEY_Y, MZ(30));
    const b = new V3(MX(28.3), BT + 3.6, MZ(32.5));
    const rib = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().add(new V3(1, -3, 2)), b.clone().add(new V3(-1, 3, 1)), b]), 20, 0.5, 6), M.ribbon);
    rib.scale.set(1, 1, 1);
    L.key.add(rib);
  }
  // side-button stems from each button in to its switch plunger
  for (const [s, x] of [[52.4, 40.8], [67.8, 26.2]]) {
    const y = KEY_Y + 1 + 1.9;
    const zIn = MZ(1.0) - 1.2;
    const zOut = -(halfWidth(s) - 2.0);
    const st = box(2.0, 2.0, zIn - zOut, M.black, 0.3);
    st.position.set(XS(s) * 0.5 + MX(x) * 0.5, y, (zIn + zOut) / 2);
    L.skeleton.add(st);
  }
  // the DPI stem, from under the cap down onto K1
  {
    const top = dpi.userData.capY;
    const bottom = KEY_Y + 1.0 + 2.0 + 0.8 + 0.05;
    const stem = box(2.2, top - bottom, 2.2, M.black, 0.3);
    stem.position.set(MX(K1.x), (top + bottom) / 2, 0);
    dpi.add(stem);
  }

  // ---------------- the receiver, stored upright in its pocket through the board's rear cut-out
  {
    const plug = box(4.6, 12, 12, M.steel, 0.4);
    plug.position.set(XS(80.5), 0.75 + 6, 0);
    const body = box(6.2, 6.5, 13.4, M.black, 1.2);
    body.position.set(XS(80.5), 0.75 + 12 + 3.25, 0);
    L.base.add(plug, body);
  }

  // ---------------- registry for labels, cameras and x-ray
  const anchors = {
    skeleton: new V3(XS(96), crestAt(96) + 0.5, -14),
    paddle: new V3(XS(28), crestAt(28) - 1, -15),
    wheel: new V3(MX(WHEEL.x), axleY + WHEEL.d / 2, 0),
    encoder: new V3(MX(66.3), axleY, MZ(10.5) - 3),
    sensor: new V3(MX(40.05), BT + 3.2, MZ(18.1)),
    lens: new V3(MX(39.0), 2.6, MZ(20.8)),
    mcu: new V3(MX(53.8), BT + 0.9, MZ(26.5)),
    lb: new V3(MX(71.5), BT + SWITCH.body[2] + 0.6, MZ(4.0)),
    rb: new V3(MX(71.5), BT + SWITCH.body[2] + 0.6, MZ(35.8)),
    usb: new V3(MX(84.5), BT + 1.6, 0),
    battery: new V3(MX(30), BAT_Y + BATTERY.dims[2], MZ(12)),
    key: new V3(MX(K1.x), KEY_Y + 1, MZ(K1.y)),
    side: new V3(XS(60), 23, -(halfWidth(60) + 0.4)),
    dongle: new V3(XS(80.5), 16, 0),
    slider: new V3(MX(56.3), BB - 3.8, MZ(22.6)),
    leds: new V3(MX(5.0), BT + 0.6, MZ(17.8)),
    shell: new V3(XS(78), crestAt(78) - 3, 8),
    antenna: new V3(MX(77.0), BT + 1, MZ(32.9)),
    base: new V3(XS(110), 2.4, 20),
    skates: new V3(XS(14), 0.3, -20),
  };
  const ghostMat = new THREE.ShaderMaterial({vertexShader: SHELL_VERT, fragmentShader: GHOST_FRAG, uniforms: {uCol: {value: new THREE.Color('#e4e8ea')}, uA: {value: 0}}, transparent: true, depthWrite: false, side: THREE.DoubleSide, clipping: true});
  for (const m of shells) {
    m.userData.solid = m.material;
    m.userData.base = Array.isArray(m.material) ? m.material : [m.material];
  }
  // exploded offsets per layer, bottom-up (mm)
  const EXPLODE = {base: [0, 0, 0], pcb: [0, 22, 0], wheel: [0, 44, 0], battery: [0, 40, 0], key: [0, 58, 0], shell: [0, 82, 0], skeleton: [0, 112, 0]};

  // section: one plane down the centreline, the right half kept
  const clip = new THREE.Plane(new V3(0, 0, 1), 0);
  const allMats = new Set();
  root.traverse((o) => {
    if (o.isMesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) allMats.add(m);
  });
  allMats.add(ghostMat);
  allMats.add(shellMat);

  let sectionOn = false;
  const update = (st) => {
    // paddles: plunger travel rotates each paddle about its rear hinge; ex = the macro view's travel exaggeration
    const ex = st.travelX ?? 1;
    for (const side of ['L', 'R']) {
      const p = (side === 'L' ? st.pL : st.pR) ?? 0;
      paddles[side].pivot.rotation.z = -(p * ex) / paddles[side].arm;
      omron[side].plunger.position.y = omron[side].y0 - Math.min(p, SWITCH.pt + SWITCH.ot) * ex;
    }
    wheel.userData.spin.rotation.z = ((st.wheel ?? 0) * Math.PI) / 180;
    const knob = slider.userData.knob;
    knob.position.z = MZ(22.6) + (st.link === 'bt' ? -3.4 : 0);
    // glow: the rear LEDs and the inner shell
    const glow = st.glow ?? 1;
    M.led.emissiveIntensity = 0.9 * glow;
    shellMat.uniforms.uGlow.value = glow;
    glowLight.intensity = 16 * glow * (1 - (st.xray ?? 0)) * (1 - (st.explode ?? 0));
    // exploded: the layers leave one after another from the base up (and land top-down), each with a slight overshoot
    const e = st.explode ?? 0;
    const ORDER = ['base', 'pcb', 'wheel', 'battery', 'key', 'shell', 'skeleton'];
    const lag = 0.12;
    const ek = (i) => {
      const u = Math.min(1, Math.max(0, e * (1 + lag * (ORDER.length - 1)) - lag * i)) - 1;
      return 1 + 2.4 * u * u * u + 1.4 * u * u;
    };
    ORDER.forEach((k, i) => {
      const [x, y, z] = EXPLODE[k];
      const f = ek(i);
      L[k].position.set(x * f, y * f, z * f);
    });
    const es = ek(ORDER.length - 1);
    for (const side of ['L', 'R']) paddles[side].pivot.position.y = paddles[side].pivot.userData.y0 + 16 * es;
    sideBtns.forEach((m) => m.position.set(0, 4 * es, -16 * es));
    dpi.position.y = 12 * es;
    // x-ray: shells become ghosts, the inside stays solid
    const x = st.xray ?? 0;
    shellMat.uniforms.uA.value = 1 - x;
    L.shell.visible = x < 0.995;
    for (const m of shells) {
      if (x < 0.01) m.material = m.userData.solid;
      else if (x > 0.99) m.material = ghostMat;
      else {
        m.material = m.userData.solid;
        for (const b of m.userData.base) {
          b.transparent = true;
          b.opacity = 1 - x;
          b.depthWrite = x < 0.5;
        }
      }
      if (x < 0.01) for (const b of m.userData.base) {
        b.transparent = false;
        b.opacity = 1;
        b.depthWrite = true;
      }
    }
    ghostMat.uniforms.uA.value = Math.min(1, x * 1.4) * 0.85;
    // section
    if (!!st.section !== sectionOn) {
      sectionOn = !!st.section;
      for (const m of allMats) {
        m.clippingPlanes = sectionOn ? [clip] : null;
        m.side = sectionOn || m === shellMat || m === ghostMat ? THREE.DoubleSide : THREE.FrontSide;
        m.needsUpdate = true;
      }
    }
  };
  for (const side of ['L', 'R']) paddles[side].pivot.userData.y0 = paddles[side].pivot.position.y;
  return {root, update, anchors, layers: L, clip, materials: M, shellMat, ghostMat, axleY, BAT_Y, KEY_Y, DETENTS, footAt, WALL};
}
