// Pengujian negatif: sengaja membuat hasil yang SALAH, lalu memastikan validator menolaknya.
// Kalau validator meloloskan hasil yang salah, pengujian ini gagal.
// Semua file uji dibuat di folder sementara sistem dan dibersihkan setelah selesai.
// Pemakaian (setelah npm run render): node src/render/negative-tests.cjs config/film-night-to-dawn.json
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readConfig, buildConfig, frameFile } = require('./config.cjs');
const { openStudio } = require('./browser.cjs');
const { FFMPEG, run, renderFrames, encodeVideo } = require('./pipeline.cjs');
const C = require('./checks.cjs');
const B = require('./browser-checks.cjs');

const clone = (v) => JSON.parse(JSON.stringify(v));

async function main() {
  const { file, raw } = readConfig(process.argv[2]);
  const config = buildConfig(raw, file);
  if (!fs.existsSync(config.paths.video) || !fs.existsSync(frameFile(config.paths.frames, config.totalFrames - 1))) {
    throw new Error('Video dan frame belum ada. Jalankan "npm run render" dulu.');
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-negative-'));
  const expect = { width: config.outputWidth, height: config.outputHeight, fps: config.fps, frames: config.totalFrames, pixelFormat: config.encoding.pixelFormat };
  const fast = { preset: 'ultrafast' };
  const results = [];

  // Pengujian lulus bila SEMUA pemeriksaan bernomor `ids` gagal (artinya kesalahan terdeteksi).
  const expectFail = (checks, ids) => {
    const hit = ids.map((id) => checks.find((c) => c.id === id || c.id.startsWith(`${id}:`)));
    const detected = hit.every((c) => c && !c.pass);
    return { detected, detail: hit.map((c, i) => (c ? `${c.name}: ${c.pass ? 'LOLOS (tidak terdeteksi)' : 'GAGAL'}, ${c.detail}` : `${ids[i]}: tidak dijalankan`)).join(' | ') };
  };
  const test = async (name, fn) => {
    process.stdout.write(`- ${name} ... `);
    try {
      const r = await fn();
      results.push({ name, ...r });
      console.log(r.detected ? 'TERDETEKSI' : 'TIDAK TERDETEKSI');
    } catch (error) {
      results.push({ name, detected: false, detail: `pengujian error: ${error.message}` });
      console.log(`ERROR: ${error.message}`);
    }
  };
  const variant = (mutate) => {
    const r = clone(raw);
    mutate(r);
    return buildConfig(r, file, { strict: false });
  };
  const copyFrames = (dir, skip = []) => {
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < config.totalFrames; i++) if (!skip.includes(i)) fs.copyFileSync(frameFile(config.paths.frames, i), frameFile(dir, i));
  };

  try {
    console.log('Pengujian negatif (hasil salah harus ditolak validator):\n');

    await test('Timeline berlubang: adegan 2 mulai 1 frame terlambat', () => expectFail(C.timelineChecks(variant((r) => {
      r.timeline.scenes[1].startFrame += 1;
      r.timeline.scenes[1].durationFrames -= 1;
    })), ['timeline']));

    await test('Timeline tumpang tindih: adegan 3 mulai di frame 290', () => expectFail(C.timelineChecks(variant((r) => {
      r.timeline.scenes[2].startFrame = 290;
      r.timeline.scenes[2].durationFrames = 160;
    })), ['timeline']));

    await test('Durasi adegan tidak cocok dengan rentang frame', () => expectFail(C.timelineChecks(variant((r) => {
      r.timeline.scenes[0].durationFrames = 151;
    })), ['timeline']));

    await test('Transisi tidak melewati batas adegan', () => expectFail(C.timelineChecks(variant((r) => {
      r.timeline.scenes[0].transitionOut.startFrame = 100;
      r.timeline.scenes[0].transitionOut.endFrame = 140;
    })), ['timeline']));

    await test('Nama efek salah ketik di timeline', () => expectFail(C.timelineChecks(variant((r) => {
      r.timeline.scenes[1].environment.effects.push('hujan-deras-salah-ketik');
    })), ['timeline']));

    await test('Video kurang 1 frame (449 frame)', () => {
      const video = path.join(temp, 'kurang-frame.mp4');
      encodeVideo(config, { framesDir: config.paths.frames, count: config.totalFrames - 1, video, overrides: fast });
      return expectFail(C.videoChecks(video, expect), ['frame-count', 'duration']);
    });

    await test('Resolusi salah (1280x720)', () => {
      const video = path.join(temp, 'resolusi.mp4');
      encodeVideo(config, { framesDir: config.paths.frames, count: config.totalFrames, video, overrides: { ...fast, width: 1280, height: 720 } });
      return expectFail(C.videoChecks(video, expect), ['resolution']);
    });

    await test('FPS salah (25 FPS)', () => {
      const video = path.join(temp, 'fps.mp4');
      encodeVideo(config, { framesDir: config.paths.frames, count: config.totalFrames, video, overrides: { ...fast, fps: 25 } });
      return expectFail(C.videoChecks(video, expect), ['fps', 'duration']);
    });

    await test('Format yang sulit diputar perangkat umum (yuv444p)', () => {
      const video = path.join(temp, 'yuv444.mp4');
      encodeVideo(config, { framesDir: config.paths.frames, count: config.totalFrames, video, overrides: { ...fast, pixelFormat: 'yuv444p', profile: null, level: null } });
      return expectFail(C.videoChecks(video, expect), ['playable', 'pixel-format']);
    });

    await test('Frame hitam disisipkan di frame 200', () => {
      const dir = path.join(temp, 'frame-hitam');
      copyFrames(dir);
      run(FFMPEG, ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=black:s=${config.width}x${config.height}`, '-frames:v', '1', frameFile(dir, 200)]);
      const video = path.join(temp, 'frame-hitam.mp4');
      encodeVideo(config, { framesDir: dir, count: config.totalFrames, video, overrides: fast });
      const stats = C.lumaStats(video);
      return expectFail([...C.frameChecks(stats, C.frameHashes(video), config.totalFrames), ...C.transitionLumaChecks(stats, config.timeline.transitions)], ['blank', 'no-flash']);
    });

    await test('Frame 123 hilang dari folder frame', () => {
      const dir = path.join(temp, 'frame-hilang');
      copyFrames(dir, [123]);
      return expectFail(C.pngChecks(dir, config.totalFrames, config.width, config.height).checks, ['png-frames']);
    });

    await test('Pergantian adegan dengan potongan kasar (hard cut)', async () => {
      const cut = variant((r) => {
        for (const s of r.timeline.scenes) if (s.transitionOut) s.transitionOut = { ...s.transitionOut, type: 'cut', params: {} };
      });
      const first = 135;
      const count = 31;
      const dir = path.join(temp, 'hard-cut');
      await renderFrames(cut, { first, count, framesDir: dir });
      const video = path.join(temp, 'hard-cut.mp4');
      encodeVideo(cut, { framesDir: dir, count, video, overrides: fast });
      const bad = expectFail(C.transitionLumaChecks(C.lumaStats(video), cut.timeline.transitions, first), ['no-hard-cut']);
      // kontrol: frame yang sama dengan transisi portal asli harus lolos
      const control = C.transitionLumaChecks(C.lumaStats(config.paths.video).slice(first, first + count), config.timeline.transitions, first);
      const controlPass = control.every((c) => c.pass);
      return { detected: bad.detected && controlPass, detail: `${bad.detail} | kontrol transisi portal: ${controlPass ? 'lolos' : 'gagal'}` };
    });

    await test('Portal terlalu kecil sehingga gambar melompat di akhir transisi', async () => {
      const small = variant((r) => { r.timeline.scenes[0].transitionOut.params.zoom = 3; });
      const t = small.timeline.transitions[0];
      const dir = path.join(temp, 'portal-kecil');
      const info = await renderFrames(small, { first: t.startFrame, count: t.endFrame - t.startFrame + 1, framesDir: dir });
      const studio = await openStudio(small);
      try {
        return expectFail(await B.transitionBoundaryChecks(studio, { ...small, timeline: { ...small.timeline, transitions: [t] } }, info), ['portal']);
      } finally {
        await studio.close();
      }
    });

    await test('Kereta dengan desain berbeda dipakai di adegan 3', async () => {
      const other = variant((r) => {
        r.assets['train-b'] = { ...clone(r.assets.train), colors: { coach: '#1f5a3a', locoShine: '#7a5a3a' } };
        r.assets['countryside-b'] = { ...clone(r.assets.countryside), train: 'train-b' };
        r.timeline.scenes[2].assets = ['countryside-b', 'train-b'];
      });
      const studio = await openStudio(other);
      try {
        return expectFail(await B.trainConsistencyChecks(studio, other, other.validation.trainVisibleFrames), ['train-asset', 'train-colors']);
      } finally {
        await studio.close();
      }
    });

    const fixture = (module) => buildConfig({
      ...clone(raw), name: 'uji', durationSeconds: 1, environment: {}, cameraTracks: {}, assets: {},
      timeline: { scenes: [{ id: 'uji', name: 'Uji', module, startFrame: 0, endFrame: 29, durationFrames: 30, assets: [], characters: {}, camera: {}, environment: {}, transitionOut: null }] }
    }, file);

    await test('Adegan memakai Math.random() (tidak deterministik)', async () => {
      const cfg = fixture('/tests/fixtures/scenes/random-noise');
      const dir = path.join(temp, 'acak');
      await renderFrames(cfg, { framesDir: dir });
      const hashes = C.pngChecks(dir, cfg.totalFrames, cfg.width, cfg.height).hashes;
      const studio = await openStudio(cfg);
      try {
        return expectFail(await B.determinismChecks(studio, hashes, {}), ['determinism']);
      } finally {
        await studio.close();
      }
    });

    await test('Error JavaScript di tengah render', async () => {
      const cfg = fixture('/tests/fixtures/scenes/throws-error');
      try {
        await renderFrames(cfg, { framesDir: path.join(temp, 'error') });
        return { detected: false, detail: 'render selesai tanpa melaporkan error' };
      } catch (error) {
        const detected = /Error JavaScript/.test(error.message);
        return { detected, detail: `render dihentikan: ${error.message}` };
      }
    });
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }

  const detected = results.filter((r) => r.detected).length;
  const allDetected = detected === results.length;
  const testedAt = new Date().toISOString();
  fs.mkdirSync(config.paths.reports, { recursive: true });
  fs.writeFileSync(path.join(config.paths.reports, `${config.name}-negative-tests.json`), JSON.stringify({ testedAt, allDetected, detected, total: results.length, results }, null, 2) + '\n');
  const rows = results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.detected ? 'TERDETEKSI' : 'TIDAK TERDETEKSI'} | ${r.detail.replace(/\|/g, '/')} |`).join('\n');
  fs.writeFileSync(path.join(config.paths.reports, `${config.name}-negative-tests.md`), `# Pengujian Negatif: ${config.title}

Setiap baris adalah hasil yang SENGAJA dibuat salah. Pengujian lulus bila validator menolaknya (TERDETEKSI).
Dibuat otomatis oleh \`npm run test:negative\` pada ${testedAt}.

| No | Kesalahan yang disengaja | Hasil | Detail |
|----|--------------------------|-------|--------|
${rows}

Status akhir: **${allDetected ? 'SEMUA KESALAHAN TERDETEKSI' : 'ADA KESALAHAN YANG LOLOS'}** (${detected}/${results.length})
`);
  console.log(`\n${allDetected ? 'SEMUA KESALAHAN TERDETEKSI' : 'ADA KESALAHAN YANG LOLOS'} (${detected}/${results.length}). Laporan: output/reports/${config.name}-negative-tests.md`);
  if (!allDetected) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nPENGUJIAN NEGATIF GAGAL: ${error.message}`);
  process.exit(1);
});
