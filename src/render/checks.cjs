// Kumpulan pemeriksaan hasil render. Setiap fungsi mengembalikan daftar hasil:
// { id, name, pass, detail }. Dipakai validate.cjs (uji normal) dan negative-tests.cjs (uji negatif).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { frameFile } = require('./config.cjs');
const { FFMPEG, FFPROBE, run } = require('./pipeline.cjs');

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const result = (id, name, pass, detail) => ({ id, name, pass: Boolean(pass), detail: String(detail) });
// Dua status lain (T19), keduanya bukan LULUS (pass false) dan bukan kegagalan:
// known = masalah yang sudah tercatat di BACKLOG dan tidak lebih buruk dari batas tercatatnya (src/render/known-issues.cjs),
//         `approval` "usulan" bila belum disetujui pemilik, `count` = banyak kejadian;
// skip  = tidak ada yang bisa diperiksa (misalnya proyek tanpa karakter gerak natural).
const known = (id, name, detail, extra = {}) => ({ ...result(id, name, false, detail), status: 'known', ...extra });
const skipped = (id, name, detail) => ({ ...result(id, name, false, detail), status: 'skip' });
const statusOf = (c) => c.status || (c.pass ? 'pass' : 'fail');
const STATUS_LABEL = { pass: 'LULUS', fail: 'GAGAL', known: 'KNOWN ISSUE', skip: 'TIDAK DIPERIKSA' };
// Teks hasil validasi satu proyek dari laporan JSON validate.cjs: KNOWN ISSUE dan TIDAK DIPERIKSA tidak ditulis LULUS.
const knownText = (n, proposed) => `${n} KNOWN ISSUE${proposed ? ` (${proposed} usulan, belum disetujui pemilik)` : ''}`;
const validationVerdict = (v) => (v.allPass ? 'LULUS' : v.noFailure === false || v.noFailure === undefined ? 'GAGAL'
  : `tanpa kegagalan (${[v.known ? knownText(v.known, v.proposed) : '', v.skipped ? `${v.skipped} tidak diperiksa` : ''].filter(Boolean).join(', ')})`);

// Batas bawaan pemeriksaan transisi dan frame kosong. Nilai resminya ada di config/engine.json
// (bagian "validation") dan diteruskan lewat config.validationLimits.
const LIMITS = {
  maxLumaStep: 8, // perubahan kecerahan rata-rata maksimum antar frame (skala 0-255)
  cutSpikeRatio: 3, // lonjakan perbedaan frame dianggap potongan kasar bila 3x tetangganya
  cutSpikeMin: 10,
  blankRange: 16, // frame dianggap kosong bila selisih piksel tergelap dan terterang di bawah ini
  blankMean: 6
};

function pngSize(buffer) {
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// ---------- timeline ----------

function timelineChecks(config) {
  const scenes = config.timeline.scenes;
  const issues = config.timelineIssues || [];
  const covered = scenes.reduce((sum, s) => sum + s.durationFrames, 0);
  const ranges = scenes.map((s) => `${s.id} [${s.startFrame}, ${s.endFrame})`).join(', ');
  const out = [
    result('timeline', 'Interval adegan valid', issues.length === 0 && covered === config.totalFrames,
      issues.length ? issues.join(' | ') : `${scenes.length} adegan menutup ${covered}/${config.totalFrames} frame tanpa celah: ${ranges}`)
  ];
  const transitions = config.timeline.transitions;
  // endFrame tidak ikut (setengah terbuka), lastFrame = frame terakhir transisi
  out.push(result('timeline-transitions', 'Transisi berada di dalam durasi film', transitions.every((t) => t.startFrame >= 0 && t.endFrame <= config.totalFrames && t.lastFrame === t.endFrame - 1),
    transitions.length ? transitions.map((t) => `${t.type} ${t.startFrame}-${t.lastFrame}`).join(', ') : 'tidak ada transisi'));
  return out;
}

// ---------- video ----------

function probeVideo(file) {
  const probe = run(FFPROBE, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]);
  const info = JSON.parse(probe.stdout || '{}');
  return {
    stream: (info.streams || []).find((s) => s.codec_type === 'video') || {},
    format: info.format || {}
  };
}

// Urutan kotak teratas MP4: moov sebelum mdat berarti video bisa langsung diputar (faststart).
function topLevelAtoms(file) {
  const fd = fs.openSync(file, 'r');
  const atoms = [];
  try {
    const size = fs.fstatSync(fd).size;
    const header = Buffer.alloc(16);
    let pos = 0;
    while (pos + 8 <= size && atoms.length < 64) {
      fs.readSync(fd, header, 0, 16, pos);
      let len = header.readUInt32BE(0);
      const type = header.toString('latin1', 4, 8);
      if (len === 1) len = Number(header.readBigUInt64BE(8));
      if (len === 0) len = size - pos;
      if (len < 8) break;
      atoms.push(type);
      pos += len;
    }
  } finally {
    fs.closeSync(fd);
  }
  return atoms;
}

function videoChecks(file, expect) {
  const exists = fs.existsSync(file);
  const size = exists ? fs.statSync(file).size : 0;
  const out = [result('file', 'File MP4 ada', exists && size > 0, exists ? `${path.basename(file)} (${(size / 1024 / 1024).toFixed(2)} MB)` : 'tidak ditemukan')];
  if (!exists) return out;
  const { stream, format } = probeVideo(file);
  const frames = Number(stream.nb_read_frames);
  const duration = Number(format.duration);
  out.push(
    result('container', 'Kontainer MP4', /mp4/.test(format.format_name || ''), format.format_name),
    result('codec', 'Codec video H.264', stream.codec_name === 'h264', `${stream.codec_name} (${stream.profile})`),
    result('resolution', 'Resolusi output', stream.width === expect.width && stream.height === expect.height, `${stream.width}x${stream.height}`),
    result('aspect', 'Rasio 16:9', stream.width * 9 === stream.height * 16, `${stream.width}:${stream.height}`),
    result('fps', 'Frame rate', stream.r_frame_rate === `${expect.fps}/1` && stream.avg_frame_rate === `${expect.fps}/1`, `${stream.r_frame_rate} (rata-rata ${stream.avg_frame_rate})`),
    result('frame-count', 'Jumlah frame', frames === expect.frames, `${frames} dari ${expect.frames} frame`),
    // toleransi setengah frame: selisih 1 frame saja sudah dianggap salah
    result('duration', 'Durasi', Math.abs(duration - expect.frames / expect.fps) < 0.5 / expect.fps, `${duration.toFixed(3)} detik (target ${(expect.frames / expect.fps).toFixed(3)})`),
    result('pixel-format', 'Format piksel', stream.pix_fmt === expect.pixelFormat, stream.pix_fmt)
  );
  // Bisa diputar di perangkat umum: H.264 profil Baseline/Main/High 8-bit 4:2:0, level <= 4.2,
  // piksel persegi, dan indeks video (moov) di depan supaya bisa langsung diputar.
  const atoms = topLevelAtoms(file);
  const faststart = atoms.indexOf('moov') >= 0 && atoms.indexOf('moov') < atoms.indexOf('mdat');
  const profileOk = ['Baseline', 'Constrained Baseline', 'Main', 'High'].includes(stream.profile);
  const levelOk = Number(stream.level) > 0 && Number(stream.level) <= 42;
  const sarOk = !stream.sample_aspect_ratio || ['1:1', 'N/A', '0:1'].includes(stream.sample_aspect_ratio);
  out.push(result('playable', 'Video dapat diputar di perangkat umum',
    profileOk && levelOk && stream.pix_fmt === 'yuv420p' && sarOk && faststart,
    `profil ${stream.profile}, level ${(Number(stream.level) / 10).toFixed(1)}, ${stream.pix_fmt}, piksel ${stream.sample_aspect_ratio || '1:1'}, faststart ${faststart ? 'ya' : 'tidak'}`));
  return out;
}

function decodeChecks(file) {
  const decode = run(FFMPEG, ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
  const clean = decode.status === 0 && decode.stderr.trim() === '';
  return [result('decode', 'FFmpeg membaca seluruh video tanpa error', clean, clean ? 'semua frame terbaca bersih' : decode.stderr.trim().slice(0, 300))];
}

// Statistik kecerahan (luma) tiap frame hasil decode: rata-rata, minimum, maksimum, dan beda dari frame sebelumnya.
function lumaStats(file) {
  const r = run(FFMPEG, ['-v', 'error', '-i', file, '-vf', 'signalstats,metadata=print:file=-', '-f', 'null', '-']);
  const frames = [];
  let current = null;
  for (const line of r.stdout.split('\n')) {
    if (line.startsWith('frame:')) {
      current = {};
      frames.push(current);
    }
    const m = line.match(/lavfi\.signalstats\.(YAVG|YMIN|YMAX|YDIF)=([\d.]+)/);
    if (m && current) current[m[1].toLowerCase()] = Number(m[2]);
  }
  return frames;
}

function frameHashes(file) {
  const r = run(FFMPEG, ['-v', 'error', '-i', file, '-f', 'framemd5', '-']);
  return r.stdout.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
}

const isBlank = (s, limits) => s.ymax - s.ymin < limits.blankRange || s.yavg < limits.blankMean;

function frameChecks(stats, hashes, expectFrames, limits = LIMITS) {
  const blank = stats.map((s, i) => ({ i, s })).filter(({ s }) => isBlank(s, limits));
  const last = stats[expectFrames - 1];
  let identical = 0;
  for (let i = 1; i < hashes.length; i++) if (hashes[i] === hashes[i - 1]) identical++;
  return [
    result('decoded-frames', 'Tidak ada frame yang hilang saat decode', hashes.length === expectFrames && stats.length === expectFrames, `${hashes.length} frame ter-decode, ${stats.length} frame terukur`),
    result('blank', 'Tidak ada frame kosong', blank.length === 0,
      blank.length ? `frame kosong: ${blank.slice(0, 8).map((b) => b.i).join(', ')}` : `kecerahan rata-rata terendah ${Math.min(...stats.map((s) => s.yavg)).toFixed(1)}, rentang terendah ${Math.min(...stats.map((s) => s.ymax - s.ymin))}`),
    result('motion', 'Animasi bergerak (bukan gambar statis)', identical === 0 && new Set(hashes).size === hashes.length, `${new Set(hashes).size} frame unik, ${identical} pasang frame berurutan identik`),
    // film harus berakhir di gambar yang utuh, bukan layar hitam atau frame yang hilang
    result('end-frame', 'Frame terakhir valid', Boolean(last) && !isBlank(last, limits),
      last ? `frame ${expectFrames - 1}: kecerahan rata-rata ${last.yavg.toFixed(1)}, rentang ${last.ymax - last.ymin}` : `frame ${expectFrames - 1} tidak ada di video`)
  ];
}

// Cari kilatan (lompatan kecerahan) dan potongan kasar (lonjakan beda frame yang berdiri sendiri).
function lumaEvents(stats, offset = 0, limits = LIMITS) {
  const flashes = [];
  const cuts = [];
  for (let i = 1; i < stats.length; i++) {
    const step = stats[i].yavg - stats[i - 1].yavg;
    if (Math.abs(step) > limits.maxLumaStep) flashes.push({ frame: i + offset, step });
    const around = [i - 2, i - 1, i + 1, i + 2].filter((j) => j >= 1 && j < stats.length).map((j) => stats[j].ydif);
    const neighbor = Math.max(...around, 0.5);
    if (stats[i].ydif > limits.cutSpikeMin && stats[i].ydif > limits.cutSpikeRatio * neighbor) cuts.push({ frame: i + offset, ydif: stats[i].ydif });
  }
  let maxStep = 0;
  for (let i = 1; i < stats.length; i++) maxStep = Math.max(maxStep, Math.abs(stats[i].yavg - stats[i - 1].yavg));
  return { flashes, cuts, maxStep };
}

function transitionLumaChecks(stats, transitions, offset = 0, limits = LIMITS) {
  const { flashes, cuts, maxStep } = lumaEvents(stats, offset, limits);
  const where = (f) => {
    const t = transitions.find((x) => f >= x.startFrame - 1 && f <= x.endFrame);
    return t ? `, di transisi ${t.type}` : '';
  };
  return [
    result('no-flash', 'Tidak ada kilatan cahaya mendadak', flashes.length === 0,
      flashes.length ? `lompatan kecerahan di frame ${flashes.slice(0, 6).map((f) => `${f.frame} (${f.step.toFixed(1)})`).join(', ')}` : `perubahan kecerahan terbesar antar frame ${maxStep.toFixed(1)} (batas ${limits.maxLumaStep})`),
    result('no-hard-cut', 'Tidak ada potongan kasar (hard cut)', cuts.length === 0,
      cuts.length ? `lonjakan di frame ${cuts.slice(0, 6).map((c) => `${c.frame} (beda ${c.ydif.toFixed(1)}${where(c.frame)})`).join(', ')}` : 'semua pergantian gambar berlangsung bertahap')
  ];
}

// ---------- manifest render ----------

// MP4 hanya diterima bila berasal dari render terakhir yang selesai dengan sukses, dan konfigurasi,
// mesin, pustaka aset, frame PNG, serta file MP4 masih sama persis dengan yang dicatat saat itu.
// Jadi render yang gagal tidak bisa "tertolong" oleh MP4 lama yang kebetulan masih ada.
function manifestChecks(config, manifest, { framesDir = config.paths.frames, video = config.paths.video } = {}) {
  const M = require('./manifest.cjs');
  if (!manifest) {
    return [result('manifest:status', 'Render terakhir selesai dengan sukses', false, 'manifest render tidak ditemukan, jalankan render dulu')];
  }
  const out = [result('manifest:status', 'Render terakhir selesai dengan sukses', manifest.status === 'complete',
    manifest.status === 'complete' ? `status complete, selesai ${manifest.finishedAt}` : `status "${manifest.status}"${manifest.error ? `: ${manifest.error}` : ''}`)];
  const current = {
    'konfigurasi proyek': [manifest.inputsHash, M.inputsHash(config.configFile)],
    'mesin inti': [manifest.engineHash, M.engineHash()],
    'pustaka aset': [manifest.libraryHash, M.libraryHash()],
    'frame PNG': [manifest.framesHash, fs.existsSync(framesDir) ? M.framesHash(framesDir, config.totalFrames) : 'tidak ada'],
    'file MP4': [manifest.videoSha256, fs.existsSync(video) ? sha256(fs.readFileSync(video)) : 'tidak ada']
  };
  const changed = Object.entries(current).filter(([, [then, now]]) => !then || then !== now).map(([what]) => what);
  out.push(result('manifest:fresh', 'Video berasal dari render terbaru (bukan sisa render lama)', changed.length === 0,
    changed.length ? `berubah sejak render terakhir: ${changed.join(', ')}` : 'konfigurasi, mesin, pustaka aset, frame, dan MP4 cocok dengan manifest'));
  return out;
}

// ---------- grid piksel saat kamera bergerak dan zoom ----------

// Dari catatan render (manifest.segments[].grid: mode zoom, nilai zoom, geseran tiap lapisan) dihitung ulang
// ukuran setiap kolom/baris DUNIA per frame dengan model yang sama seperti penyaji (src/engine/pixel-grid.js).
// "Crawl" = kolom dunia yang berubah ukuran padahal zoom tidak berubah (pola bergeser di atas gambar).
// "Bolak-balik" = kolom yang mengecil saat zoom naik (atau membesar saat zoom turun).
async function gridChecks(config, renderInfo) {
  const name = 'Grid piksel stabil saat kamera bergerak dan zoom (tidak merayap)';
  if (config.rendering?.upscale !== 'browser') return [result('grid-stability', name, true, 'proyek memakai upscale ffmpeg tanpa zoom kamera')];
  const segments = renderInfo?.segments || [];
  if (!segments.length) return [result('grid-stability', name, false, 'catatan render tidak ditemukan')];
  const G = await import(require('url').pathToFileURL(path.join(__dirname, '..', 'engine', 'pixel-grid.js')).href);
  const axes = [
    { size: config.width, outSize: config.outputWidth, axis: 'x', i: 0 },
    { size: config.height, outSize: config.outputHeight, axis: 'y', i: 1 }
  ];
  // ukuran kolom dunia yang terlihat untuk satu lapisan di satu frame
  const widths = (grid, anchor, ax) => {
    const map = grid.zoomMode === 'nearest'
      ? G.nearestAxisMap({ size: ax.size, outSize: ax.outSize, zoom: grid.zoom })
      : G.axisMap({ size: ax.size, outSize: ax.outSize, zoom: grid.zoom, anchor: anchor[ax.i], mode: grid.zoomMode, axis: ax.axis });
    const out = new Map();
    for (let s = map.first; s <= map.last; s++) out.set(s + anchor[ax.i], map.size[s]);
    return out;
  };
  let fractional = 0;
  let crawl = 0;
  let flips = 0;
  let compared = 0;
  const mode = segments.find((s) => s.grid)?.grid?.[0]?.zoomMode || config.rendering.zoomMode;
  for (let k = 1; k < segments.length; k++) {
    const a = segments[k - 1].grid;
    const b = segments[k].grid;
    if (b?.some((g) => G.cellOf(config.outputWidth / config.width, g.zoom, g.zoomMode).f > 0)) fractional++;
    if (!a || !b || a.length !== 1 || b.length !== 1 || a[0].scene !== b[0].scene || a[0].layers.length !== b[0].layers.length) continue;
    const dz = b[0].zoom - a[0].zoom;
    for (let L = 0; L < b[0].layers.length; L++) {
      for (const ax of axes) {
        const before = widths(a[0], a[0].layers[L], ax);
        for (const [j, w] of widths(b[0], b[0].layers[L], ax)) {
          if (!before.has(j)) continue;
          compared++;
          const old = before.get(j);
          if (w === old) continue;
          if (dz === 0) crawl++;
          else if ((dz > 0) !== (w > old)) flips++;
        }
      }
    }
  }
  const pass = crawl === 0 && flips === 0;
  return [result('grid-stability', name, pass,
    `mode zoom "${mode}", ${fractional} frame zoom pecahan, ${crawl} perubahan ukuran saat zoom tetap (crawl), ${flips} bolak-balik dari ${compared} perbandingan kolom/baris dunia` +
    (pass ? '' : ' (pakai rendering.zoomMode "anchored" agar tidak merayap)'))];
}

// ---------- frame PNG ----------

function pngChecks(framesDir, count, width, height) {
  let ok = 0;
  const missing = [];
  const hashes = [];
  for (let i = 0; i < count; i++) {
    const file = frameFile(framesDir, i);
    if (!fs.existsSync(file)) {
      missing.push(i);
      hashes.push(null);
      continue;
    }
    const buffer = fs.readFileSync(file);
    const dim = pngSize(buffer);
    if (dim && dim.width === width && dim.height === height) ok++;
    hashes.push(sha256(buffer));
  }
  return {
    hashes,
    checks: [result('png-frames', 'Frame PNG lengkap dan berurutan', ok === count && missing.length === 0,
      missing.length ? `frame hilang: ${missing.slice(0, 8).join(', ')}` : `${ok}/${count} file PNG ${width}x${height}`)]
  };
}

module.exports = {
  LIMITS, sha256, result, known, skipped, statusOf, STATUS_LABEL, knownText, validationVerdict, timelineChecks, probeVideo, videoChecks, decodeChecks,
  lumaStats, frameHashes, frameChecks, lumaEvents, transitionLumaChecks, manifestChecks, gridChecks, pngChecks
};
