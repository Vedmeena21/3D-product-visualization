// The M1 Pro's stage, in millimetres: a pale studio, a dark cloth mousepad the mouse slides and lifts on, soft
// shadows, GTAO kept off the pad and the translucent shell. frame(state, cam) poses the mouse from the model and
// draws one frame; the camera's target follows the mouse across the pad.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Pass} from 'three/addons/postprocessing/Pass.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {buildMouse} from './mouse.js';

const V3 = THREE.Vector3;
export const COL = {bg: '#f5f4ed', desk: '#f0eee6', pad: '#e8e6dc', stitch: '#c2c0b6', shadow: '#0c0e10'};
export const PAD = {w: 460, d: 380, t: 3};

const PAD_VERT = /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const PAD_FRAG = /* glsl */ `uniform vec3 uPad; uniform vec3 uStitch; uniform vec3 uDesk; uniform vec3 uBg; uniform vec2 uHalf; uniform vec3 uC; uniform vec3 uSpot; uniform float uSpotA;
  uniform vec3 uGlowP; uniform float uGlowA; uniform vec3 uLime; uniform float uStudio;
  varying vec3 vW;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    vec2 p = vW.xz;
    vec2 q = abs(p) - (uHalf - 9.0);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 9.0;
    // the pad: a fine weave, a stitched edge; the desk around it
    vec2 g = p * 1.6;
    float weave = 0.5 + 0.5 * sin(g.x * 3.14159) * sin(g.y * 3.14159);
    float n = hash(floor(p * 3.0));
    vec3 pad = uPad * (0.93 + 0.05 * weave + 0.04 * n);
    float st = step(abs(d + 2.2), 0.55) * step(0.5, fract((p.x + p.y) * 0.25));
    pad = mix(pad, uStitch, st * 0.8);
    // what the sensor images: a soft spot under the lens (schematic)
    pad += vec3(0.55, 0.12, 0.10) * uSpotA * exp(-dot(p - uSpot.xz, p - uSpot.xz) / 9.0);
    vec3 desk = uDesk * (0.99 + 0.02 * n);
    vec3 col = d < 0.0 ? pad : mix(uDesk * 0.86, desk, smoothstep(0.0, 6.0, d));
    float far = length(vW.xz - uC.xz);
    col = mix(col, uBg, smoothstep(520.0, 1400.0, far));
    // the studio lights: down to a dark room for the opening
    col *= mix(0.04, 1.0, uStudio);
    // the lit shell's spill through the openings onto the cloth around the mouse
    vec2 gq = (vW.xz - uGlowP.xz) / vec2(62.0, 44.0);
    col += uLime * uGlowA * 0.2 * exp(-dot(gq, gq)) * (0.8 + 0.2 * weave);
    gl_FragColor = vec4(col, 1.0);
  }`;

export function createStage({canvas}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.bg);
  const camera = new THREE.PerspectiveCamera(24, 16 / 9, 4, 6000);
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, {type: THREE.HalfFloatType, samples: 8}));
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 4, 4);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.75;
  gtao.updateGtaoMaterial({radius: 6, distanceExponent: 1.4, thickness: 4, scale: 1.0, samples: 16, distanceFallOff: 1.0, screenSpaceRadius: false});
  gtao.updatePdMaterial({lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16});
  class Toggle extends Pass {
    constructor(fn) {
      super();
      this.needsSwap = false;
      this.fn = fn;
    }
    render() {
      this.fn();
    }
  }
  const hideForAO = [];
  const vis = new Map();
  composer.addPass(new Toggle(() => {
    for (const o of hideForAO) {
      vis.set(o, o.visible);
      o.visible = false;
    }
  }));
  composer.addPass(gtao);
  composer.addPass(new Toggle(() => {
    for (const o of hideForAO) o.visible = vis.get(o);
  }));
  composer.addPass(new OutputPass());

  // a studio for the metal to reflect: a grey room, bright strips overhead and to the sides, a dark floor
  {
    const env = new THREE.Scene();
    env.background = new THREE.Color('#8e9294');
    const strip = (w, h, pos, k) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: new THREE.Color(1, 1, 0.98).multiplyScalar(k), side: THREE.DoubleSide}));
      m.position.copy(pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    strip(10, 3, new V3(0, 12, 2), 3.2);
    strip(3, 12, new V3(-11, 5, 5), 2.6);
    strip(3, 12, new V3(11, 5, -5), 1.8);
    strip(16, 2.2, new V3(0, 3, 12), 1.3);
    strip(16, 2.2, new V3(0, 3, -12), 0.9);
    const g = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({color: '#2a2d30', side: THREE.DoubleSide}));
    g.rotation.x = -Math.PI / 2;
    g.position.y = -2;
    env.add(g);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.03).texture;
    scene.environmentIntensity = 1.0;
    pm.dispose();
  }
  const SUN_DIR = new V3(-0.45, 0.85, -0.35).normalize();
  const sun = new THREE.DirectionalLight('#fffaf2', 2.2);
  sun.castShadow = true;
  const EXT = 150;
  Object.assign(sun.shadow.camera, {left: -EXT, right: EXT, top: EXT, bottom: -EXT, near: 50, far: 1400});
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.radius = 8;
  sun.shadow.blurSamples = 16;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.15;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#ffffff', '#5a5f62', 0.7);
  scene.add(hemi);
  const BG = {pale: new THREE.Color(COL.bg), dark: new THREE.Color('#0c0e10')};
  // a fill from below, on only when the camera looks at the underside
  const under = new THREE.DirectionalLight('#ffffff', 0);
  under.position.set(0.3, -1, 0.2);
  scene.add(under);

  // the desk and the pad: one shader plane with the pad's top face, plus the pad's edge band
  const padMat = new THREE.ShaderMaterial({
    vertexShader: PAD_VERT,
    fragmentShader: PAD_FRAG,
    uniforms: {
      uPad: {value: new THREE.Color(COL.pad)},
      uStitch: {value: new THREE.Color(COL.stitch)},
      uDesk: {value: new THREE.Color(COL.desk)},
      uBg: {value: new THREE.Color(COL.bg)},
      uHalf: {value: new THREE.Vector2(PAD.w / 2, PAD.d / 2)},
      uC: {value: new V3()},
      uSpot: {value: new V3()},
      uSpotA: {value: 0},
      uGlowP: {value: new V3()},
      uGlowA: {value: 0},
      uLime: {value: new THREE.Color('#b6e61f')},
      uStudio: {value: 1},
    },
  });
  const ground = new THREE.Group();
  const top = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), padMat);
  top.rotation.x = -Math.PI / 2;
  ground.add(top);
  // the pad's rubber edge, so it reads as 3 mm proud of the desk
  {
    const r = 9;
    const sh = new THREE.Shape();
    const w = PAD.w / 2;
    const d = PAD.d / 2;
    sh.moveTo(-w + r, -d);
    sh.lineTo(w - r, -d);
    sh.quadraticCurveTo(w, -d, w, -d + r);
    sh.lineTo(w, d - r);
    sh.quadraticCurveTo(w, d, w - r, d);
    sh.lineTo(-w + r, d);
    sh.quadraticCurveTo(-w, d, -w, d - r);
    sh.lineTo(-w, -d + r);
    sh.quadraticCurveTo(-w, -d, -w + r, -d);
    const g = new THREE.ExtrudeGeometry(sh, {depth: PAD.t - 0.05, bevelEnabled: false, curveSegments: 6});
    g.rotateX(-Math.PI / 2);
    g.translate(0, -PAD.t, 0);
    const edge = new THREE.Mesh(g, [new THREE.MeshBasicMaterial({visible: false}), new THREE.MeshStandardMaterial({color: '#1b1d1f', roughness: 0.9})]);
    ground.add(edge);
  }
  scene.add(ground);
  const shade = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    new THREE.ShadowMaterial({color: COL.shadow, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8}),
  );
  shade.rotation.x = -Math.PI / 2;
  shade.receiveShadow = true;
  scene.add(shade);

  const mouse = buildMouse();
  scene.add(mouse.root);
  mouse.root.traverse((o) => {
    if (o.isMesh && !o.material.transparent) o.receiveShadow = true;
  });
  hideForAO.push(ground, shade, mouse.layers.shell);

  const size = {w: 1600, h: 900};
  const resize = (w, h, pr) => {
    size.w = w;
    size.h = h;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  let gtaoClipped = false;
  const tmp = new V3();
  const right = new V3().crossVectors(new V3(0, 1, 0), SUN_DIR).normalize();
  const upL = new V3().crossVectors(SUN_DIR, right);
  let texel = (2 * EXT) / sun.shadow.mapSize.x;

  // st: the model state + {explode, xray, section, link, travelX}; cam: {tx, ty, tz, az, el, d, sx, sy, follow}
  // (radians, mm, target relative to the mouse's rest point; follow 0..1 tracks the mouse across the pad)
  const frame = (st, cam) => {
    const mz = st.x ?? 0;
    // the section plane is in world space: it rides with the mouse
    mouse.clip.constant = -mz;
    if (!!st.section !== gtaoClipped) {
      gtaoClipped = !!st.section;
      gtao.normalMaterial.clippingPlanes = gtaoClipped ? [mouse.clip] : null;
      gtao.normalMaterial.needsUpdate = true;
    }
    mouse.update(st);
    mouse.root.position.set(0, st.h ?? 0, mz);
    const f = cam.follow ?? 0.85;
    const tx = cam.tx;
    const ty = cam.ty + (st.h ?? 0) * f;
    const tz = cam.tz + mz * f;
    camera.position.set(tx + cam.d * Math.cos(cam.el) * Math.sin(cam.az), ty + cam.d * Math.sin(cam.el), tz + cam.d * Math.cos(cam.el) * Math.cos(cam.az));
    camera.lookAt(tx, ty, tz);
    camera.setViewOffset(size.w, size.h, -(cam.sx ?? 0), -(cam.sy ?? 0), size.w, size.h);
    camera.updateMatrixWorld();
    // from below the pad there is nothing to see through: the desk goes away
    const below = camera.position.y < 0;
    ground.visible = !below;
    shade.visible = !below;
    under.intensity = below ? 2.2 : 0;
    padMat.uniforms.uC.value.set(tx, 0, tz);
    padMat.uniforms.uSpot.value.set(mouse.anchors.lens.x, 0, mouse.anchors.lens.z + mz);
    padMat.uniforms.uSpotA.value = st.spot ?? 0;
    // studio level (1 = the pale studio, 0 = a dark room lit by the reflections alone) and the reflection sweep
    const studio = st.studio ?? 1;
    scene.background.copy(BG.dark).lerp(BG.pale, studio);
    padMat.uniforms.uBg.value.copy(BG.pale);
    padMat.uniforms.uStudio.value = studio;
    sun.intensity = 2.2 * studio * studio;
    hemi.intensity = 0.7 * studio;
    scene.environmentIntensity = 0.32 + 0.68 * studio;
    scene.environmentRotation.set(0, st.envRot ?? 0, 0);
    padMat.uniforms.uGlowP.value.set(-8, 0, mz);
    padMat.uniforms.uGlowA.value = (st.glow ?? 1) * (1 - (st.xray ?? 0)) * (1 - (st.explode ?? 0)) * Math.exp(-(st.h ?? 0) / 20);
    tmp.set(0, 10, mz);
    const rr = Math.round(tmp.dot(right) / texel) * texel;
    const uu = Math.round(tmp.dot(upL) / texel) * texel;
    sun.target.position.copy(right).multiplyScalar(rr).addScaledVector(upL, uu).addScaledVector(SUN_DIR, tmp.dot(SUN_DIR));
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 600);
    sun.target.updateMatrixWorld();
    composer.render();
  };
  const pv = new V3();
  /** screen position (1600 x 900 layout px) of a point in the mouse frame, following the mouse and its layers */
  const project = (p, layer) => {
    pv.copy(p);
    if (layer) pv.add(mouse.layers[layer].position);
    pv.add(mouse.root.position);
    pv.project(camera);
    if (pv.z > 1) return null;
    return [(pv.x * 0.5 + 0.5) * size.w, (-pv.y * 0.5 + 0.5) * size.h];
  };
  const setQuality = ({samples, ao, shadow}) => {
    if (samples !== undefined)
      for (const t of [composer.renderTarget1, composer.renderTarget2]) {
        t.samples = samples;
        t.dispose();
      }
    if (ao !== undefined) gtao.enabled = ao;
    if (shadow !== undefined) {
      sun.shadow.mapSize.set(shadow, shadow);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
      texel = (2 * EXT) / shadow;
    }
  };
  return {renderer, scene, camera, mouse, composer, gtao, sun, resize, frame, project, size, setQuality};
}
