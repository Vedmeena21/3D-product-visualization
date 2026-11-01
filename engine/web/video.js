// Runs a scene as a video. A scene is an async setup({cfg, canvas, capture}) that returns {render(t), resize?}.
//
// Two modes share one render(t):
//   capture  (?capture, set by engine/capture.mjs): nothing runs on its own. window.__video.seek(t) draws exactly time t
//            and resolves once the frame is on screen, so the recorder can step through the video at any speed.
//   playback (opened in a browser): plays in real time, loops, scaled to fit the window.
export async function runSim(defaults, setup) {
  const capture = new URLSearchParams(location.search).has('capture');
  const cfg = {...defaults, ...(window.__CFG || {})};
  const app = document.getElementById('app');
  const canvas = document.createElement('canvas');
  canvas.id = 'gl';
  app.appendChild(canvas);

  const video = (window.__video = {ready: false, duration: cfg.duration, fps: cfg.fps});
  const scene = await setup({cfg, canvas, capture});
  await document.fonts.ready;

  const paint = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  video.seek = async (t) => {
    scene.render(t);
    await paint();
  };

  if (capture) {
    await video.seek(0);
    video.ready = true;
    return;
  }

  const fit = () => {
    const k = Math.min(innerWidth / 1600, innerHeight / 900);
    app.style.transform = `translate(${(innerWidth - 1600 * k) / 2}px, ${(innerHeight - 900 * k) / 2}px) scale(${k})`;
    scene.resize?.();
  };
  addEventListener('resize', fit);
  fit();
  video.ready = true;
  const t0 = performance.now();
  const tick = () => {
    scene.render(((performance.now() - t0) / 1000) % cfg.duration);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
