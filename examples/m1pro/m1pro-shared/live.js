// The M1 Pro as a page you drive: the video's mouse, pad and console in real time. FLICK, CLICK and SCROLL start a
// gesture, the play button pauses it, the timeline scrubs it, SPEED sets its pace (slow motion down to 0.1×); the link
// and DPI buttons change what the reports carry; seven views, five displays, an orbit you drag and a zoom on the
// wheel. Left alone it plays the video's script as an auto tour with the operator's cursor, looped; a click, drag,
// wheel or key hands control to the visitor, 25 s of quiet hands it back.
import {warmComposer} from 'rig/warm.js';
import {createConsole, DISPLAY, SEQS, VIEWS} from './console.js';
import {LINK_KEYS, SPEC} from './dims.js';
import {camAt, displayAt, DURATION, videoAt, makeConsoleFrame, makeCursor, sceneState, seqAt, viewAt, VIEW_FN} from './video.js';
import {SEQ, stateAt} from './model.js';
import {createStage} from './stage.js';

const W = 1600;
const H = 900;
const IDLE = 25;
const D2R = Math.PI / 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smoother = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const ss = (a, b, t) => smoother((t - a) / (b - a));
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;
const SPEED = [0.05, 2];
const speedK = (v) => (v - SPEED[0]) / (SPEED[1] - SPEED[0]);

const CSS = `
html,body{background:#f5f4ed;overflow:hidden}
#app{position:absolute!important;inset:auto!important;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0}
#gl{touch-action:none;cursor:grab}
#gl.drag{cursor:grabbing}
.bt{pointer-events:auto;cursor:pointer}
.bt:hover{filter:brightness(.96)}
.hit{position:absolute;pointer-events:auto;cursor:ew-resize}
.tourchip{position:absolute;left:800px;top:104px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;height:22px;padding:0 11px;border:1px solid #e8e6dc;border-radius:4px;background:rgba(250,249,245,.95);color:#1f2326;font:700 9px 'JetBrains Mono',monospace;letter-spacing:1.3px;white-space:nowrap;cursor:pointer;pointer-events:auto}
.tourchip i{display:block;width:6px;height:6px;border-radius:50%;background:#d97757}
.tourchip.on i{animation:blink 1.2s steps(2) infinite}
@keyframes blink{50%{opacity:.15}}
.turn{position:fixed;left:0;right:0;bottom:18px;text-align:center;font:600 12px/1.4 'JetBrains Mono',monospace;letter-spacing:1px;color:#87867f;text-transform:uppercase;display:none}
@media (orientation:portrait) and (max-width:820px){.turn{display:block}}
`;

export function runLive() {
  const top = Number(document.body.dataset.top || 0);
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const app = document.getElementById('app');
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  app.appendChild(canvas);
  const st = createStage({canvas});
  const ui = createConsole(app);
  const tourCursor = makeCursor(ui);
  const frameConsole = makeConsoleFrame(ui, st);

  // ------------------------------------------------------------ quality tiers
  const TIERS = [
    {samples: 8, ao: true, shadow: 4096, pr: 2},
    {samples: 4, ao: false, shadow: 2048, pr: 1.5},
    {samples: 0, ao: false, shadow: 1024, pr: 1},
  ];
  const light = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;
  let tier = light ? 2 : 0;
  let scale = 1;
  const fit = () => {
    const h = innerHeight - top;
    scale = Math.min(innerWidth / W, h / H);
    app.style.transform = `translate(${(innerWidth - W * scale) / 2}px, ${top + (h - H * scale) / 2}px) scale(${scale})`;
    st.resize(W, H, clamp((devicePixelRatio || 1) * scale, 0.75, TIERS[tier].pr));
  };
  const applyTier = () => {
    const {pr, ...q} = TIERS[tier];
    st.setQuality(q);
    fit();
  };
  applyTier();
  addEventListener('resize', fit);
  const toStage = (cx, cy) => {
    const r = app.getBoundingClientRect();
    return [(cx - r.left) / scale, (cy - r.top) / scale];
  };
  const tourChip = document.createElement('div');
  tourChip.className = 'tourchip';
  ui.root.appendChild(tourChip);
  const note = document.createElement('div');
  note.className = 'turn';
  note.textContent = 'Turn your phone sideways for the full console';
  document.body.appendChild(note);

  // ------------------------------------------------------------ state
  let T = 0;
  let seq = 'flick';
  let tau = 0;
  let speed = 1;
  let paused = false;
  let view = 'hero';
  let viewAt0 = 0;
  let link = 'k1';
  let dpi = SPEC.dpiDefault;
  const disp = Object.fromEntries(DISPLAY.map((k) => [k, {on: 0, t: -9}]));
  const off = {az: 0, el: 0, k: 1};
  const cam = {...VIEW_FN.hero(0), travelX: 1};
  // the video's own layer (studio light, console build, cards, the shell's power-on, the switch detail), eased
  const fx = {studio: 0, reveal: 0, title: 0, endcard: 0, gate: 0, loupe: 0, envRot: -2.3};
  let ring = {t: -9, x: 0, y: 0};
  const eased = (k, dur = 0.7) => {
    const d = disp[k];
    const x = ss(d.t, d.t + dur, T);
    return d.on ? x : 1 - x;
  };
  const pulse = (k) => (ring = {t: T, x: ui.spots[k][0], y: ui.spots[k][1]});

  // ------------------------------------------------------------ the tour
  const AP = {on: true, t0: 0};
  let lastInput = 0;
  const startTour = () => {
    AP.on = true;
    AP.t0 = T;
    paused = false;
    speed = 1;
    Object.assign(off, {az: 0, el: 0, k: 1});
  };
  const takeOver = () => {
    lastInput = T;
    if (!AP.on) return;
    AP.on = false;
    const cyc = (T - AP.t0) % DURATION;
    const [t0, v] = viewAt(cyc);
    view = v;
    viewAt0 = T - (cyc - t0);
    speed = seqAt(cyc).rate;
  };
  tourChip.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    lastInput = T;
    if (AP.on) takeOver();
    else startTour();
  });
  addEventListener('pointerdown', (e) => {
    if (e.target !== tourChip) takeOver();
  });
  const syncDisplay = (cyc) => {
    const want = displayAt(cyc);
    for (const k of DISPLAY) {
      if (disp[k].on !== want[k]) {
        disp[k].on = want[k];
        disp[k].t = T;
      }
    }
  };

  // ------------------------------------------------------------ controls
  const startSeq = (s) => {
    seq = s;
    tau = 0;
    paused = false;
  };
  for (const s of SEQS)
    ui.btn[s].addEventListener('click', () => {
      takeOver();
      pulse(s);
      startSeq(s);
    });
  for (const k of LINK_KEYS)
    ui.btn['link_' + k].addEventListener('click', () => {
      takeOver();
      pulse('link_' + k);
      link = k;
    });
  for (const d of SPEC.dpiPresets)
    ui.btn['dpi_' + d].addEventListener('click', () => {
      takeOver();
      pulse('dpi_' + d);
      dpi = d;
    });
  for (const v of VIEWS)
    ui.btn[v].addEventListener('click', () => {
      takeOver();
      pulse(v);
      view = v;
      viewAt0 = T;
      Object.assign(off, {az: 0, el: 0, k: 1});
    });
  for (const k of DISPLAY)
    ui.btn[k].addEventListener('click', () => {
      takeOver();
      pulse(k);
      disp[k].on = disp[k].on ? 0 : 1;
      disp[k].t = T;
    });
  ui.btn.play.addEventListener('click', () => {
    takeOver();
    pulse('play');
    if (tau >= SEQ[seq].dur - 1e-3) tau = 0;
    paused = !paused;
  });
  const slider = (x0, w, y, apply) => {
    const d = document.createElement('div');
    d.className = 'hit';
    Object.assign(d.style, {left: `${x0 - 8}px`, top: `${y - 11}px`, width: `${w + 16}px`, height: '22px'});
    const move = (e) => {
      const [x] = toStage(e.clientX, e.clientY);
      apply(clamp((x - x0) / w, 0, 1));
      lastInput = T;
    };
    d.addEventListener('pointerdown', (e) => {
      takeOver();
      d.setPointerCapture(e.pointerId);
      const up = () => {
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
      };
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
      move(e);
    });
    ui.root.appendChild(d);
  };
  slider(ui.TL.x, ui.TL.w, 821, (k) => {
    tau = k * SEQ[seq].dur;
    paused = true;
  });
  slider(ui.SP.x, ui.SP.w, 824, (k) => (speed = SPEED[0] + k * (SPEED[1] - SPEED[0])));
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    const v = VIEWS[Number(key) - 1];
    if (/^[1-7]$/.test(key) && v) ui.btn[v].click();
    else if (key === ' ') ui.btn.play.click();
    else if (key === 'f') ui.btn.flick.click();
    else if (key === 'c') ui.btn.click.click();
    else if (key === 's') ui.btn.scroll.click();
    else if (key === 'x') ui.btn.xray.click();
    else if (key === 'e') ui.btn.exploded.click();
    else if (key === 'l') ui.btn.labels.click();
    else return;
    e.preventDefault();
  });
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = {x: e.clientX, y: e.clientY};
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('drag');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    off.az += ((e.clientX - drag.x) / scale) * 0.3;
    off.el = clamp(off.el + ((e.clientY - drag.y) / scale) * 0.2, -80, 70);
    drag = {x: e.clientX, y: e.clientY};
    lastInput = T;
  });
  const endDrag = () => {
    drag = null;
    canvas.classList.remove('drag');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      takeOver();
      off.k = clamp(off.k * Math.exp(e.deltaY * 0.0012), 0.35, 2.6);
    },
    {passive: false},
  );

  // ------------------------------------------------------------ the frame
  startTour();
  let last = performance.now();
  const perf = {n: 0, sum: 0, slow: 0, age: 0};
  const frame = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    T += dt;
    if (tier < TIERS.length - 1) {
      perf.age += dt;
      if (perf.age > 0.6) {
        perf.sum += dt;
        perf.n++;
        if (perf.sum >= 0.5 && perf.n >= 6) {
          perf.slow = perf.sum / perf.n > 0.022 ? perf.slow + 1 : 0;
          perf.sum = 0;
          perf.n = 0;
          if (perf.slow >= (perf.age < 6 ? 1 : 2)) {
            tier++;
            applyTier();
            Object.assign(perf, {age: 0, slow: 0});
          }
        }
      }
    }

    let tgt;
    let cursor;
    let since;
    let f = null;
    if (AP.on) {
      const c = T - AP.t0;
      const loop = Math.floor(c / DURATION);
      const cyc = c - loop * DURATION;
      f = videoAt(cyc);
      seq = f.seq;
      tau = f.tau;
      speed = f.rate;
      link = f.link;
      dpi = f.dpi;
      syncDisplay(cyc);
      tgt = camAt(cyc, f.disp.orbit);
      view = f.view;
      since = f.since;
      cursor = f.reveal > 0.6 ? tourCursor(cyc) : {x: -99, y: -99, press: false, ring: 0, ringX: 0, ringY: 0};
    } else {
      if (T - lastInput > IDLE) startTour();
      if (!paused) tau = Math.min(SEQ[seq].dur, tau + dt * speed);
      since = T - viewAt0;
      tgt = {travelX: 1, ...VIEW_FN[view](since)};
      const ex = eased('exploded', 1.0);
      tgt.d *= 1 + 0.9 * ex;
      tgt.ty += 52 * ex;
      tgt.follow = (tgt.follow ?? 0.8) * (1 - ex);
      tgt.az += off.az + (disp.orbit.on ? 16 * (T - disp.orbit.t) : 0);
      tgt.el = clamp(tgt.el + off.el, -85, 89);
      tgt.d *= off.k;
      const rk = Math.max(0, 1 - (T - ring.t) / 0.55);
      cursor = {x: -99, y: -99, press: false, ring: rk, ringX: ring.x, ringY: ring.y};
    }
    const m = stateAt(seq, tau, {dpi, link, lod: 1});

    const k = 1 - Math.exp(-dt / (AP.on ? 0.18 : 0.4));
    cam.az += wrap(tgt.az - cam.az) * k;
    for (const key of ['tx', 'ty', 'tz', 'el', 'd', 'sx', 'sy', 'follow', 'travelX']) cam[key] += ((tgt[key] ?? cam[key]) - cam[key]) * k;
    const explode = eased('exploded', 2.0);
    const section = eased('section', 0.6);
    const want = f
      ? f
      : {studio: 1, reveal: 1, title: 0, endcard: 0, gate: 1, loupe: view === 'switch' && explode < 0.5 ? 1 : 0, envRot: 0};
    const fk = 1 - Math.exp(-dt / 0.3);
    for (const key in fx) fx[key] += (want[key] - fx[key]) * (f ? Math.max(fk, 0.5) : fk);
    st.frame(sceneState(m, {link, xray: eased('xray'), explode, section: section > 0.5, travelX: cam.travelX, studio: fx.studio, envRot: fx.envRot, gate: fx.gate}), {...cam, az: cam.az * D2R, el: cam.el * D2R});
    const display = Object.fromEntries(DISPLAY.map((x) => [x, disp[x].on]));
    frameConsole({m, seq, tau, link, dpi, lod: 1, view, display, explode, section: section > 0.5, labels: eased('labels', 0.5) * ss(1.1, 1.7, since), cursor, paused: AP.on ? false : paused, speed, speedK: speedK(speed), reveal: fx.reveal, lean: !!f, title: fx.title, endcard: fx.endcard, loupe: fx.loupe, big: f ? f.big : null, focus: f ? f.focus : null});
    if (tourChip.classList.contains('on') !== AP.on || !tourChip.firstChild) {
      tourChip.classList.toggle('on', AP.on);
      tourChip.innerHTML = AP.on ? '<i></i>AUTO TOUR · CLICK TO TAKE OVER' : '▶ RESUME TOUR';
    }
    if (!window.SIM_SHOWN) {
      window.SIM_SHOWN = true;
      dispatchEvent(new Event('simframe'));
    }
    requestAnimationFrame(frame);
  };
  // every shader compiles at once off the main thread before the first frame (kit/warm.js)
  warmComposer(st.renderer, st.composer, st.scene, st.camera).then(() => requestAnimationFrame(frame));
  window.LIVE = {st, cam, startTour, takeOver, get tier() {
    return tier;
  }, get T() {
    return T;
  }};
}
