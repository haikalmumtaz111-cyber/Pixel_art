// Menguji hasil render: file video, metadata FFprobe, decoding penuh FFmpeg,
// frame PNG, gerakan antar frame, dan determinisme (render ulang harus identik).
// Hasilnya ditulis ke output/reports/ dalam bentuk JSON dan Markdown berbahasa Indonesia.
// Pemakaian: node src/render/validate.cjs config/train-night-rain.json
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { loadConfig, frameFile } = require('./config.cjs');
const { openStudio } = require('./browser.cjs');

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw new Error(`${cmd} tidak bisa dijalankan: ${result.error.message}`);
  return result;
}

function pngSize(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function main() {
  const config = loadConfig(process.argv[2]);
  const video = config.paths.video;
  const relVideo = path.relative(config.paths.root, video);
  const checks = [];
  const check = (name, pass, detail) => {
    checks.push({ name, pass: Boolean(pass), detail });
    console.log(`${pass ? 'LULUS' : 'GAGAL'}  ${name}: ${detail}`);
  };

  // 1. File video ada
  const exists = fs.existsSync(video);
  const size = exists ? fs.statSync(video).size : 0;
  check('File MP4 ada', exists && size > 0, exists ? `${relVideo} (${(size / 1024 / 1024).toFixed(2)} MB)` : `${relVideo} tidak ditemukan`);
  if (!exists) return finish(config, checks, {});

  // 2. Metadata FFprobe (dengan menghitung frame satu per satu)
  const probe = run(FFPROBE, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', video]);
  const info = JSON.parse(probe.stdout || '{}');
  const stream = (info.streams || []).find((s) => s.codec_type === 'video') || {};
  const format = info.format || {};
  const duration = Number(format.duration);
  const frames = Number(stream.nb_read_frames);
  check('Kontainer MP4', /mp4/.test(format.format_name || ''), format.format_name);
  check('Codec video H.264', stream.codec_name === 'h264', `${stream.codec_name} (${stream.profile})`);
  check('Resolusi output', stream.width === config.outputWidth && stream.height === config.outputHeight, `${stream.width}x${stream.height}`);
  check('Rasio 16:9', stream.width * 9 === stream.height * 16, `${stream.width}:${stream.height}`);
  check('Frame rate', stream.r_frame_rate === `${config.fps}/1` && stream.avg_frame_rate === `${config.fps}/1`, `${stream.r_frame_rate} (rata-rata ${stream.avg_frame_rate})`);
  check('Jumlah frame', frames === config.totalFrames, `${frames} dari ${config.totalFrames} frame`);
  check('Durasi', Math.abs(duration - config.durationSeconds) < 0.05, `${duration.toFixed(3)} detik`);
  check('Format piksel', stream.pix_fmt === config.encoding.pixelFormat, stream.pix_fmt);

  // 3. Decoding penuh: seluruh video dibaca FFmpeg, error sekecil apa pun dianggap gagal
  const decode = run(FFMPEG, ['-v', 'error', '-xerror', '-i', video, '-f', 'null', '-']);
  check('Decoding FFmpeg tanpa error', decode.status === 0 && decode.stderr.trim() === '', decode.status === 0 && !decode.stderr.trim() ? 'semua frame terbaca bersih' : decode.stderr.trim().slice(0, 300));

  // 4. Video benar-benar bergerak: setiap frame hasil decode dibandingkan dengan frame sebelumnya
  const md5 = run(FFMPEG, ['-v', 'error', '-i', video, '-f', 'framemd5', '-']);
  const hashes = md5.stdout.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').pop().trim());
  const unique = new Set(hashes).size;
  let identicalPairs = 0;
  for (let i = 1; i < hashes.length; i++) if (hashes[i] === hashes[i - 1]) identicalPairs++;
  check('Frame hasil decode', hashes.length === config.totalFrames, `${hashes.length} frame ter-decode`);
  check('Animasi bergerak (bukan gambar statis)', identicalPairs === 0 && unique === hashes.length, `${unique} frame unik, ${identicalPairs} pasang frame berurutan yang identik`);

  // 5. Frame PNG mentah lengkap dan beresolusi internal
  let pngOk = 0;
  const pngHashes = [];
  for (let i = 0; i < config.totalFrames; i++) {
    const file = frameFile(config, i);
    if (!fs.existsSync(file)) continue;
    const buffer = fs.readFileSync(file);
    const dim = pngSize(buffer);
    if (dim && dim.width === config.width && dim.height === config.height) pngOk++;
    pngHashes.push(sha256(buffer));
  }
  check('Frame PNG lengkap', pngOk === config.totalFrames, `${pngOk}/${config.totalFrames} file PNG ${config.width}x${config.height}`);

  // 6. Determinisme: browser baru, urutan acak, hasil harus identik byte demi byte
  const sample = [config.totalFrames - 1, 0, Math.floor(config.totalFrames / 2), 1, config.totalFrames - 2, 37];
  const studio = await openStudio(config);
  let same = 0;
  try {
    for (const i of sample) {
      const fresh = sha256(await studio.renderFrame(i));
      const again = sha256(await studio.renderFrame(i));
      if (fresh === pngHashes[i] && again === fresh) same++;
    }
  } finally {
    await studio.close();
  }
  check('Deterministik berdasarkan indeks frame', same === sample.length, `${same}/${sample.length} frame sampel (${sample.join(', ')}) identik saat dirender ulang tanpa urutan`);

  // 7. Lembar kontak: 4 cuplikan dari video untuk dilihat cepat
  const sheet = path.join(config.paths.reports, `${config.name}-contact-sheet.png`);
  const picks = [0, 50, 100, config.totalFrames - 1].map((n) => `eq(n\\,${n})`).join('+');
  fs.mkdirSync(config.paths.reports, { recursive: true });
  const thumb = run(FFMPEG, ['-v', 'error', '-y', '-i', video, '-vf', `select='${picks}',scale=960:540:flags=neighbor,tile=2x2`, '-frames:v', '1', '-update', '1', sheet]);
  check('Lembar kontak dibuat', thumb.status === 0 && fs.existsSync(sheet), path.relative(config.paths.root, sheet));

  finish(config, checks, { stream, format, chromium: studio.browserVersion });
}

function versionLine(cmd) {
  const r = spawnSync(cmd, ['-version'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split('\n')[0] : 'tidak tersedia';
}

function finish(config, checks, extra) {
  const passed = checks.filter((c) => c.pass).length;
  const allPass = passed === checks.length;
  const reportDir = config.paths.reports;
  fs.mkdirSync(reportDir, { recursive: true });

  const renderInfoFile = path.join(reportDir, `${config.name}-render.json`);
  const renderInfo = fs.existsSync(renderInfoFile) ? JSON.parse(fs.readFileSync(renderInfoFile, 'utf8')) : null;
  const environment = {
    os: `${os.type()} ${os.release()} (${os.platform()}/${os.arch()})`,
    node: process.version,
    chromium: extra.chromium || renderInfo?.chromiumVersion || '-',
    ffmpeg: versionLine(FFMPEG),
    ffprobe: versionLine(FFPROBE)
  };
  const testedAt = new Date().toISOString();

  fs.writeFileSync(path.join(reportDir, `${config.name}-validation.json`), JSON.stringify({ testedAt, config: config.configFile, allPass, passed, total: checks.length, checks, environment, renderInfo }, null, 2) + '\n');

  const rows = checks.map((c, i) => `| ${i + 1} | ${c.name} | ${c.pass ? 'LULUS' : 'GAGAL'} | ${String(c.detail).replace(/\|/g, '/')} |`).join('\n');
  const md = `# Laporan Pengujian: ${config.title}

Laporan ini dibuat otomatis oleh \`npm run validate\`.

- Waktu uji: ${testedAt}
- Konfigurasi: \`${config.configFile}\`
- Video: \`${config.output.video}\`
- Spesifikasi: ${config.width}x${config.height} internal, ${config.outputWidth}x${config.outputHeight} output, ${config.fps} FPS, ${config.durationSeconds} detik, ${config.totalFrames} frame
${renderInfo ? `- Lama render frame: ${renderInfo.renderSeconds.toFixed(1)} detik, lama encoding: ${renderInfo.encodeSeconds.toFixed(1)} detik\n` : ''}
## Hasil

| No | Pemeriksaan | Hasil | Detail |
|----|-------------|-------|--------|
${rows}

Status akhir: **${allPass ? 'SEMUA LULUS' : 'ADA YANG GAGAL'}** (${passed}/${checks.length})

## Lingkungan

- Sistem operasi: ${environment.os}
- Node.js: ${environment.node}
- Chromium: ${environment.chromium}
- ${environment.ffmpeg}
- ${environment.ffprobe}
${renderInfo ? `\n## Perintah encoding\n\n\`\`\`\n${renderInfo.ffmpegCommand}\n\`\`\`\n` : ''}`;
  fs.writeFileSync(path.join(reportDir, `${config.name}-validation.md`), md);

  console.log(`\n${allPass ? 'SEMUA LULUS' : 'ADA YANG GAGAL'} (${passed}/${checks.length}). Laporan: ${path.relative(config.paths.root, reportDir)}/${config.name}-validation.md`);
  if (!allPass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nVALIDASI GAGAL: ${error.message}`);
  process.exit(1);
});
