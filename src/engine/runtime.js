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
  film = await createFilm(config);
  canvas.width = film.frameWidth;
  canvas.height = film.frameHeight;
  ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  return { totalFrames: config.totalFrames, frameWidth: film.frameWidth, frameHeight: film.frameHeight, presenter: film.presenter.mode };
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

// Alat bantu pengujian otomatis. Semuanya generik: tidak ada pengetahuan tentang cerita tertentu.
const inspect = {
  renderScene(sceneId, frame) {
    return renderSceneFrame(sceneId, frame).image;
  },
  // Gambar acuan setiap aset berjenis `type` yang punya drawSnapshot().
  assetSnapshots(type) {
    const result = {};
    for (const key of film.assets.keys()) {
      if (film.assets.typeOf(key) !== type) continue;
      const asset = film.assets.get(key);
      if (!asset.drawSnapshot) continue;
      const layer = createLayer(config.width, config.height);
      asset.drawSnapshot(layer.ctx, config.width);
      result[key] = layer.canvas.toDataURL('image/png');
    }
    return result;
  },
  // Aset berjenis `type` yang dipakai tiap adegan, langsung maupun lewat aset lain.
  assetUsage(type) {
    const usage = {};
    for (const [id, scene] of Object.entries(film.scenes)) {
      const keys = new Set();
      for (const key of scene.entry.assets || []) {
        for (const k of [key, ...film.assets.dependencies(key)]) if (film.assets.typeOf(k) === type) keys.add(k);
      }
      usage[id] = [...keys];
    }
    return usage;
  },
  // Warna identitas sebuah aset (bila aset menyediakannya).
  identityColors(key) {
    const asset = film.assets.get(key);
    return asset.identityColors ? asset.identityColors() : [];
  },
  // Modul aset dan adegan yang dimuat proyek ini.
  loadedModules() {
    return film.loadedModules();
  },
  // Buat setiap aset proyek sekali. Mengembalikan daftar aset yang berhasil dibuat beserta jenisnya.
  createAllAssets() {
    return film.assets.keys().map((key) => {
      film.assets.get(key);
      return { key, type: film.assets.typeOf(key) };
    });
  },
  // Semua file JavaScript yang benar-benar diunduh browser (termasuk impor tidak langsung).
  fetchedScripts() {
    return performance.getEntriesByType('resource').map((e) => new URL(e.name).pathname).filter((p) => p.endsWith('.js'));
  },
  // Hitung jumlah piksel yang warnanya persis sama dengan daftar warna (hex) pada frame tertentu.
  colorCounts(frame, colors) {
    drawFrame(frame);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
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

// Mode pratinjau: buka page.html?project=<id>&scene=<id> lewat "npm run preview".
async function startPreview(projectId, sceneId) {
  const response = await fetch(`/__project/${projectId}`);
  if (!response.ok) {
    document.getElementById('info').textContent = await response.text();
    return;
  }
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
      const result = scene ? (film.drawScene(scene.id, ctx, frame), { segment: scene.id }) : drawFrame(frame);
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
if (params.get('project')) startPreview(params.get('project'), params.get('scene'));
