// Satu pipeline render untuk semua proyek.
// Contoh:
//   npm run render -- --project old-town-morning                         seluruh film (PNG + MP4)
//   npm run render -- --project night-to-dawn --scene s02-inside-train   satu adegan saja, tanpa transisi
//   npm run render -- --project old-town-morning --frames 100-140        rentang frame (PNG saja)
//   npm run render -- --project old-town-morning --frame 250             satu frame (PNG saja)
//   npm run render -- --project old-town-morning --no-encode             semua frame PNG tanpa MP4
//   npm run render -- --project old-town-morning --encode-only           MP4 dari frame PNG yang sudah ada
// Tanpa --project, daftar proyek yang tersedia ditampilkan.
const fs = require('fs');
const path = require('path');
const { loadConfig, frameFile } = require('./config.cjs');
const { describeProjects } = require('./projects.cjs');
const { parseArgs } = require('./cli.cjs');
const { renderFrames, encodeVideo, encodeToTemp, replaceFile, run, FFMPEG } = require('./pipeline.cjs');
const { probe } = require('./fingerprint.cjs');
const M = require('./manifest.cjs');

function planJob(config, args) {
  if (args.scene && args.frames) throw new Error('Pilih salah satu: --scene atau --frames/--frame.');
  if (args.scene) {
    const scene = config.timeline.scenes.find((s) => s.id === args.scene);
    if (!scene) throw new Error(`Adegan "${args.scene}" tidak ada di proyek ${config.id}. Pilihan: ${config.timeline.scenes.map((s) => s.id).join(', ')}`);
    return {
      kind: 'scene', label: `adegan ${scene.id} saja, tanpa transisi (frame ${scene.startFrame}-${scene.endFrame - 1})`, sceneId: scene.id,
      first: scene.startFrame, count: scene.durationFrames, globalNames: false,
      framesDir: `${config.paths.frames}--${scene.id}`,
      video: path.join(config.paths.root, 'output', 'scenes', `${config.name}--${scene.id}.mp4`),
      manifestName: `${config.name}--${scene.id}`
    };
  }
  if (args.frames) {
    const [a, b] = args.frames;
    if (b > config.totalFrames - 1) throw new Error(`Frame ${b} di luar film (0..${config.totalFrames - 1}).`);
    return {
      kind: 'stills', label: `frame ${a}${b > a ? `-${b}` : ''}`, first: a, count: b - a + 1, globalNames: true,
      framesDir: path.join(config.paths.root, 'output', 'stills', config.name), video: null, manifestName: null
    };
  }
  return {
    kind: 'film', label: 'seluruh film', first: 0, count: config.totalFrames, globalNames: true,
    framesDir: config.paths.frames, video: config.paths.video, manifestName: config.name
  };
}

const rel = (config, p) => path.relative(config.paths.root, p);

// Salinan 1920x1080 untuk frame lepas, supaya mudah dilihat di HP.
function makeHdStills(config, job) {
  const dir = path.join(job.framesDir, 'hd');
  fs.mkdirSync(dir, { recursive: true });
  for (let f = job.first; f < job.first + job.count; f++) {
    run(FFMPEG, ['-v', 'error', '-y', '-i', frameFile(job.framesDir, f), '-vf', `scale=${config.outputWidth}:${config.outputHeight}:flags=neighbor`, frameFile(dir, f)]);
  }
  return dir;
}

// Pemeriksaan pasca-render (AC2a-07): konfigurasi yang dikirim ke browser tidak boleh berubah selama render,
// karena compiledHash di manifest dicatat sebelum render dimulai.
function assertCompiledUnchanged(config, recorded) {
  if (M.compiledHash(config) !== recorded) throw new Error('konfigurasi hasil kompilasi berubah selama render');
}

// Penolakan --encode-only sebelum ada file yang ditulis (TK1-TK6): manifest, MP4, dan frame tidak disentuh.
class EncodeRefused extends Error {}

// --encode-only: MP4 baru dari frame PNG yang sudah ada (Tahap 6A-2a). Frame hanya boleh di-encode ulang kalau terbukti
// berasal dari kode dan konfigurasi saat ini, jadi sidik jari manifest lama diperiksa dulu (TK1-TK6) lalu diwariskan,
// tidak pernah dihitung ulang lalu ditulis. MP4 dan manifest lama tidak berubah sebelum semua pemeriksaan lulus.
// Keduanya diganti lewat dua rename atomik terpisah (MP4 dulu, lalu manifest), bukan satu transaksi.
// deps hanya untuk pengujian (pengganti encodeToTemp, replaceFile, writeManifest, probe).
function encodeOnlyFilm(config, { manifestFile, framesDir = config.paths.frames, video = config.paths.video, deps = {} }) {
  const d = { encodeToTemp, replaceFile, writeManifest: M.writeManifest, probe, ...deps };
  const count = config.totalFrames;
  const refuse = (code, message) => {
    throw new EncodeRefused(`${code}: ${message}, jalankan render penuh dulu`);
  };

  // A. praperiksa
  let old;
  try {
    old = M.readManifest(manifestFile);
  } catch (error) {
    refuse('TK1', `manifest lama tidak bisa dibaca (${error.message})`);
  }
  if (!old) refuse('TK1', 'tidak ada render sebelumnya');
  if (!['frames-only', 'complete'].includes(old.status)) refuse('TK2', `render sebelumnya tidak selesai (status "${old.status}")`);
  if (old.job?.kind !== 'film' || old.job.first !== 0 || old.job.count !== count) refuse('TK3', 'frame di manifest lama bukan film penuh');
  const missing = M.FINGERPRINT_KEYS.filter((k) => !old[k]);
  if (missing.length) refuse('TK4', `manifest lama tanpa ${missing.join(', ')}`);
  const now = M.fingerprints(config);
  const differ = M.FINGERPRINT_KEYS.filter((k) => old[k] !== now[k]);
  if (differ.length) refuse('TK5', `frame dibuat dari kode atau konfigurasi lain (${differ.join(', ')} berubah)`);
  if (!old.framesHash || M.framesHash(framesDir, count) !== old.framesHash) refuse('TK6', 'frame PNG berubah sejak render');

  const inherited = {
    project: old.project, name: old.name, job: old.job, configFile: old.configFile,
    ...Object.fromEntries(M.FINGERPRINT_KEYS.map((k) => [k, old[k]])), engineVersion: old.engineVersion,
    renderSeconds: old.renderSeconds, chromiumVersion: old.chromiumVersion, jsErrors: old.jsErrors, loadedModules: old.loadedModules,
    frameSize: old.frameSize, framesHash: old.framesHash, segments: old.segments, encodeOnly: true
  };
  const startedAt = new Date().toISOString();
  const encodeStart = Date.now();
  let temp = null;
  let command;
  let videoSha256;
  try {
    // B. encode ke file sementara
    ({ temp, command } = d.encodeToTemp(config, { framesDir, count, video, startNumber: 0 }));
    // C. verifikasi file sementara sebelum MP4 lama disentuh
    if (!fs.existsSync(temp) || fs.statSync(temp).size === 0) throw new Error('C1: MP4 sementara tidak ada atau kosong');
    if (M.framesHash(framesDir, count) !== old.framesHash) throw new Error('C2: frame PNG berubah selama encode');
    const info = d.probe(temp);
    if (info.codec !== 'h264' || info.width !== config.outputWidth || info.height !== config.outputHeight || info.frames !== count) {
      throw new Error(`C3: MP4 sementara tidak utuh (${info.codec}, ${info.width}x${info.height}, ${info.frames} frame; seharusnya h264, ${config.outputWidth}x${config.outputHeight}, ${count} frame)`);
    }
    videoSha256 = M.sha256(fs.readFileSync(temp));
    // D. titik komit: MP4 diganti secara atomik
    d.replaceFile(temp, video);
    temp = null;
  } catch (error) {
    if (temp) fs.rmSync(temp, { force: true });
    // catatan percobaan yang gagal; bila pencatatan ini ikut gagal, manifest dan MP4 lama tetap seperti sebelum dijalankan
    try {
      d.writeManifest(manifestFile, { ...inherited, status: 'failed', startedAt, failedAt: new Date().toISOString(), error: error.message });
    } catch (recordError) {
      error.message += ` (status "failed" juga gagal dicatat: ${recordError.message}; manifest dan MP4 lama tidak berubah)`;
    }
    throw error;
  }
  // E. catat: manifest diganti secara atomik
  try {
    d.writeManifest(manifestFile, {
      ...inherited, status: 'complete', startedAt, framesFinishedAt: old.framesFinishedAt ?? old.finishedAt,
      finishedAt: new Date().toISOString(), encodeSeconds: (Date.now() - encodeStart) / 1000,
      video: rel(config, video), videoSha256, ffmpegCommand: command.replaceAll(config.paths.root + path.sep, '')
    });
  } catch (error) {
    error.message = `MP4 baru sudah terpasang, tetapi manifest gagal ditulis: ${error.message}. Jalankan ulang --encode-only`;
    throw error;
  }
  return { videoSha256 };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) {
    console.log(`Pilih proyek dengan --project <id>.\nProyek yang tersedia:\n${describeProjects()}`);
    process.exitCode = 1;
    return;
  }
  const config = loadConfig(args.project);
  const job = planJob(config, args);
  if (args.encodeOnly) {
    if (job.kind !== 'film') throw new Error('--encode-only hanya untuk film penuh (tanpa --scene, --frame, atau --frames).');
    if (!args.encode) throw new Error('--encode-only tidak bisa dipakai bersama --no-encode.');
    console.log(`Proyek "${config.title}" (${config.id}): MP4 dari ${job.count} frame PNG yang sudah ada (--encode-only)`);
    encodeOnlyFilm(config, { manifestFile: M.manifestFile(config, job.manifestName), framesDir: job.framesDir, video: job.video });
    const size = fs.statSync(job.video).size;
    console.log(`Video jadi: ${rel(config, job.video)} (${(size / 1024 / 1024).toFixed(2)} MB)`);
    return;
  }
  const manifestFile = job.manifestName ? M.manifestFile(config, job.manifestName) : null;
  const base = {
    project: config.id, name: job.manifestName, job: { kind: job.kind, first: job.first, count: job.count, scene: job.sceneId || null },
    configFile: config.configFile, ...M.fingerprints(config), engineVersion: config.engine.engineVersion
  };
  console.log(`Proyek "${config.title}" (${config.id}), ${job.label}: ${job.count} frame, ${config.width}x${config.height} -> ${config.outputWidth}x${config.outputHeight}, ${config.fps} FPS`);

  let result = null;
  const start = Date.now();
  if (manifestFile) M.writeManifest(manifestFile, { ...base, status: 'rendering', startedAt: new Date().toISOString() });
  try {
    result = await renderFrames(config, {
      first: job.first, count: job.count, framesDir: job.framesDir, sceneId: job.sceneId, globalNames: job.globalNames,
      onProgress: (done, total) => {
        if (done % 30 === 0 || done === total) console.log(`  frame ${done}/${total}`);
      }
    });
    assertCompiledUnchanged(config, base.compiledHash);
    const renderSeconds = (Date.now() - start) / 1000;
    if (job.kind === 'stills') {
      // mode upscale "browser" sudah menghasilkan PNG ukuran output, jadi tidak perlu salinan HD
      const native = result && result.frameSize.width === config.outputWidth;
      const hd = native ? job.framesDir : makeHdStills(config, job);
      console.log(`Frame selesai dalam ${renderSeconds.toFixed(1)} detik.\nPNG asli: ${rel(config, job.framesDir)}/\nPNG ${config.outputWidth}x${config.outputHeight}: ${rel(config, hd)}/`);
      return;
    }
    let command = null;
    let encodeSeconds = 0;
    if (args.encode) {
      console.log(`Frame selesai dalam ${renderSeconds.toFixed(1)} detik. Menggabungkan jadi MP4...`);
      const encodeStart = Date.now();
      command = encodeVideo(config, { framesDir: job.framesDir, count: job.count, video: job.video, startNumber: 0 });
      encodeSeconds = (Date.now() - encodeStart) / 1000;
    }
    const previous = M.readManifest(manifestFile) || {};
    M.writeManifest(manifestFile, {
      ...base,
      status: args.encode ? 'complete' : 'frames-only',
      startedAt: previous.startedAt,
      finishedAt: new Date().toISOString(),
      renderSeconds,
      encodeSeconds,
      chromiumVersion: result?.chromiumVersion ?? previous.chromiumVersion,
      jsErrors: result?.jsErrors ?? 0,
      loadedModules: result?.loadedModules ?? previous.loadedModules,
      frameSize: result?.frameSize ?? previous.frameSize,
      framesHash: M.framesHash(job.framesDir, job.count),
      video: job.video && args.encode ? rel(config, job.video) : null,
      videoSha256: job.video && args.encode ? M.sha256(fs.readFileSync(job.video)) : null,
      ffmpegCommand: command ? command.replaceAll(config.paths.root + path.sep, '') : null,
      segments: result?.segments ?? previous.segments
    });
    if (args.encode) {
      const size = fs.statSync(job.video).size;
      console.log(`Video jadi: ${rel(config, job.video)} (${(size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.log(`Frame PNG tersimpan di ${rel(config, job.framesDir)}/ (tanpa MP4).`);
    }
  } catch (error) {
    if (manifestFile) M.writeManifest(manifestFile, { ...base, status: 'failed', failedAt: new Date().toISOString(), error: error.message });
    throw error;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`\nRENDER GAGAL: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { planJob, assertCompiledUnchanged, encodeOnlyFilm, EncodeRefused };
