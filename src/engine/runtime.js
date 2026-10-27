// Jembatan antara browser dan perender.
// Perender (Playwright) memanggil window.studio.init(config) lalu renderFrame(i) untuk tiap frame.
// Setiap frame digambar ulang dari nol hanya berdasarkan nomor frame, jadi urutannya bebas.
import { createFilm } from './film.js';
import { createLayer } from './pixel.js';

const canvas = document.getElementById('screen');
let ctx = null;
let film = null;
let config = null;

async function init(cfg) {
  config = cfg;
  canvas.width = config.width;
  canvas.height = config.height;
  ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  film = await createFilm(config);
  return { totalFrames: config.totalFrames };
}

function drawFrame(frame) {
  ctx.save();
  try {
    return film.render(ctx, frame);
  } finally {
    ctx.restore();
  }
}

function renderFrame(frame) {
  const info = drawFrame(frame);
  return { image: canvas.toDataURL('image/png'), info };
}

// Render satu adegan saja (tanpa transisi), untuk mengembangkan dan menguji adegan secara terpisah.
function renderSceneFrame(sceneId, frame) {
  ctx.save();
  try {
    film.drawScene(sceneId, ctx, frame);
  } finally {
    ctx.restore();
  }
  return { image: canvas.toDataURL('image/png'), info: { segment: sceneId } };
}

// Alat bantu pengujian otomatis. Tidak dipakai saat render biasa.
const inspect = {
  // Gambar satu adegan saja pada frame tertentu (tanpa transisi).
  renderScene(sceneId, frame) {
    ctx.save();
    film.drawScene(sceneId, ctx, frame);
    ctx.restore();
    return canvas.toDataURL('image/png');
  },
  // Gambar kereta dari setiap aset kereta dengan parameter tetap.
  trainSnapshots() {
    const result = {};
    for (const key of film.assets.keys()) {
      if (film.assets.typeOf(key) !== 'steam-train') continue;
      const layer = createLayer(config.width, config.height);
      film.assets.get(key).drawSnapshot(layer.ctx, config.width);
      result[key] = layer.canvas.toDataURL('image/png');
    }
    return result;
  },
  // Aset kereta yang dipakai tiap adegan (langsung atau lewat set pedesaan/interior).
  trainUsage() {
    const usage = {};
    for (const [id, scene] of Object.entries(film.scenes)) {
      const keys = new Set();
      for (const key of scene.entry.assets) {
        const def = config.assets[key];
        if (def?.type === 'steam-train') keys.add(key);
        if (def?.train) keys.add(def.train);
      }
      usage[id] = [...keys];
    }
    return usage;
  },
  // Warna identitas kereta utama (badan gerbong, garis emas, roda merah, kilap lokomotif, kuningan).
  trainColors() {
    const key = film.assets.keys().find((k) => film.assets.typeOf(k) === 'steam-train');
    if (!key) return [];
    const D = film.assets.get(key).design;
    return [D.coach, D.coachStripe, D.wheelRed, D.locoShine, D.brass];
  },
  // Hitung jumlah piksel yang warnanya persis sama dengan daftar warna (hex) pada frame tertentu.
  colorCounts(frame, colors) {
    drawFrame(frame);
    const data = ctx.getImageData(0, 0, config.width, config.height).data;
    const wanted = colors.map((hex) => parseInt(hex.slice(1), 16));
    const counts = Object.fromEntries(colors.map((c) => [c, 0]));
    for (let i = 0; i < data.length; i += 4) {
      const v = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      const j = wanted.indexOf(v);
      if (j >= 0) counts[colors[j]]++;
    }
    return counts;
  }
};

// Mode pratinjau: buka page.html?config=<nama>&scene=<id> lewat "npm run preview".
async function startPreview(name, sceneId) {
  const response = await fetch(`/__config/${name}`);
  await init(await response.json());
  document.body.classList.add('preview');
  const scene = config.timeline.scenes.find((s) => s.id === sceneId);
  const first = scene ? scene.startFrame : 0;
  const count = scene ? scene.durationFrames : config.totalFrames;
  const info = document.getElementById('info');
  const start = performance.now();
  let last = -1;
  const tick = (now) => {
    const frame = first + (Math.floor(((now - start) / 1000) * config.fps) % count);
    if (frame !== last) {
      const result = drawFrame(frame);
      info.textContent = `${config.title} | frame ${frame}/${config.totalFrames - 1} | ${result.segment}`;
      last = frame;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

window.studio = { init, drawFrame, renderFrame, renderSceneFrame, inspect };
window.studioReady = true;

const params = new URLSearchParams(location.search);
if (params.get('config')) startPreview(params.get('config'), params.get('scene'));
