// Jembatan antara browser dan perender.
// Perender (Playwright) memanggil window.studio.init(config) lalu renderFrame(i) untuk tiap frame.
// Setiap frame digambar ulang dari nol hanya berdasarkan nomor frame, jadi urutannya bebas.

const canvas = document.getElementById('screen');
let ctx = null;
let scene = null;
let config = null;

async function init(cfg) {
  config = { ...cfg, totalFrames: cfg.totalFrames ?? Math.round(cfg.fps * cfg.durationSeconds) };
  canvas.width = config.width;
  canvas.height = config.height;
  ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  const module = await import(`../scenes/${config.sceneModule}.js`);
  scene = module.createScene(config);
  return { totalFrames: config.totalFrames };
}

function drawFrame(frame) {
  const time = frame / config.fps;
  ctx.save();
  scene.render(ctx, { frame, time, totalFrames: config.totalFrames });
  ctx.restore();
}

function renderFrame(frame) {
  drawFrame(frame);
  return canvas.toDataURL('image/png');
}

// Mode pratinjau: buka page.html?config=train-night-rain lewat "npm run preview".
async function startPreview(name) {
  const response = await fetch(`/config/${name}.json`);
  await init(await response.json());
  document.body.classList.add('preview');
  const info = document.getElementById('info');
  const start = performance.now();
  let last = -1;
  const tick = (now) => {
    const frame = Math.floor(((now - start) / 1000) * config.fps) % config.totalFrames;
    if (frame !== last) {
      drawFrame(frame);
      info.textContent = `${config.title} | frame ${frame + 1}/${config.totalFrames}`;
      last = frame;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

window.studio = { init, drawFrame, renderFrame };
window.studioReady = true;

const previewName = new URLSearchParams(location.search).get('config');
if (previewName) startPreview(previewName);
