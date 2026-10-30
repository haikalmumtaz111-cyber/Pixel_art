// Pengujian negatif: sengaja membuat hasil atau konfigurasi yang SALAH, lalu memastikan validator menolaknya.
// Kalau validator meloloskan kesalahan, pengujian ini gagal.
// Semua file uji dibuat di folder sementara sistem (atau salinan repository) dan dibersihkan setelah selesai.
// Pemakaian (setelah render): node src/render/negative-tests.cjs --project <id>
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { readConfig, buildConfig, frameFile } = require('./config.cjs');
const { describeProjects } = require('./projects.cjs');
const { parseArgs } = require('./cli.cjs');
const { openStudio } = require('./browser.cjs');
const { FFMPEG, run, renderFrames, encodeVideo } = require('./pipeline.cjs');
const { makeSandbox } = require('./sandbox.cjs');
const C = require('./checks.cjs');
const B = require('./browser-checks.cjs');
const M = require('./manifest.cjs');

const clone = (v) => JSON.parse(JSON.stringify(v));
const NODE = process.execPath;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) {
    console.log(`Pilih proyek dengan --project <id>.\nProyek yang tersedia:\n${describeProjects()}`);
    process.exitCode = 1;
    return;
  }
  const { file, raw, includes } = readConfig(args.project);
  const config = buildConfig(raw, file, { includes });
  if (!fs.existsSync(config.paths.video) || !fs.existsSync(frameFile(config.paths.frames, config.totalFrames - 1))) {
    throw new Error(`Video dan frame belum ada. Jalankan "npm run render -- --project ${config.id}" dulu.`);
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-negative-'));
  const expect = { width: config.outputWidth, height: config.outputHeight, fps: config.fps, frames: config.totalFrames, pixelFormat: config.encoding.pixelFormat };
  const limits = config.validationLimits;
  const fast = { preset: 'ultrafast' };
  const frame1 = 1 / config.fps;
  const scenes = config.timeline.scenes;
  const transitions = config.timeline.transitions;
  const composed = scenes.some((s) => config.engine.builtinScenes.includes(s.module));
  const results = [];

  // Pengujian lulus bila SEMUA pemeriksaan `ids` GAGAL (artinya kesalahan terdeteksi).
  // KNOWN ISSUE dan TIDAK DIPERIKSA bukan deteksi (T19).
  const expectFail = (checks, ids) => {
    const hit = ids.map((id) => checks.find((c) => c.id === id || c.id.startsWith(`${id}:`)));
    const detected = hit.every((c) => c && C.statusOf(c) === 'fail');
    return { detected, detail: hit.map((c, i) => (c ? `${c.name}: ${C.statusOf(c) === 'fail' ? 'GAGAL' : `${C.STATUS_LABEL[C.statusOf(c)]} (tidak terdeteksi)`}, ${c.detail}` : `${ids[i]}: tidak dijalankan`)).join(' | ') };
  };
  // Kesalahan konfigurasi harus ditolak DENGAN pesan yang tepat, bukan sekadar gagal karena hal lain.
  const expectIssue = (cfg, pattern) => {
    const ok = C.timelineChecks(cfg)[0].pass;
    const hit = cfg.timelineIssues.find((i) => pattern.test(i));
    return { detected: !ok && Boolean(hit), detail: hit || `tidak ada pesan yang cocok dengan ${pattern}; masalah: ${cfg.timelineIssues.slice(0, 3).join(' | ') || '-'}` };
  };
  const test = async (name, fn) => {
    process.stdout.write(`- ${name} ... `);
    try {
      const r = await fn();
      if (r.skipped) {
        console.log(`DILEWATI (${r.skipped})`);
        return;
      }
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
    return buildConfig(r, file, { strict: false, includes });
  };
  const copyFrames = (dir, skip = []) => {
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < config.totalFrames; i++) if (!skip.includes(i)) fs.copyFileSync(frameFile(config.paths.frames, i), frameFile(dir, i));
  };
  const cli = (...argv) => spawnSync(NODE, [path.join(config.paths.root, 'src', 'render', 'render.cjs'), ...argv], { encoding: 'utf8' });

  try {
    console.log(`Pengujian negatif proyek "${config.title}" (${config.id}), hasil salah harus ditolak validator:\n`);

    // ---------- konfigurasi dan timeline ----------
    await test('Celah di timeline: adegan 2 mulai 1 frame terlambat', () => expectIssue(variant((r) => {
      r.timeline.scenes[1].start += frame1;
    }), /celah/));

    await test('Tumpang tindih: adegan 2 mulai 1 frame lebih awal', () => expectIssue(variant((r) => {
      r.timeline.scenes[1].start -= frame1;
    }), /tumpang tindih/));

    await test('Durasi adegan tidak valid (akhir = awal)', () => expectIssue(variant((r) => {
      r.timeline.scenes[0].end = r.timeline.scenes[0].start;
    }), /durasi tidak valid/));

    await test('Durasi yang tidak menjadi frame bulat (0,01 detik)', () => expectIssue(variant((r) => {
      r.timeline.scenes[0].end += 0.01;
    }), /tidak menjadi frame bulat/));

    await test('ID adegan ganda', () => expectIssue(variant((r) => {
      r.timeline.scenes[1].id = r.timeline.scenes[0].id;
    }), /id adegan ganda/));

    await test('Adegan terakhir tidak menutup akhir film', () => expectIssue(variant((r) => {
      r.timeline.scenes[r.timeline.scenes.length - 1].end -= frame1;
    }), /berakhir tepat di akhir film/));

    await test('Transisi tidak melewati batas adegan', () => {
      const i = scenes.findIndex((s) => s.transitionOut);
      if (i < 0) return { skipped: 'proyek tanpa transisi' };
      return expectIssue(variant((r) => {
        r.timeline.scenes[i].transitionOut.start = scenes[i].startFrame / config.fps;
      }), /harus melewati batas adegan/);
    });

    await test('Jenis transisi tidak dikenal', () => {
      if (scenes.length < 2) return { skipped: 'proyek satu adegan' };
      return expectIssue(variant((r) => {
        r.timeline.scenes[0].transitionOut = { type: 'wipe-hantu', start: (scenes[1].startFrame - 4) / config.fps, duration: 8 / config.fps };
      }), /jenis "wipe-hantu" tidak dikenal/);
    });

    await test('ID aset tidak dikenal', () => {
      if (!raw.timeline) return { skipped: 'konfigurasi lama tanpa timeline' };
      return expectIssue(variant((r) => {
        const s = r.timeline.scenes[0];
        if (composed) s.entities = [...(s.entities || []), { id: 'hantu', asset: 'aset-hantu', layer: r.stages[s.stage].layers[0].id }];
        else s.assets.push('aset-hantu');
      }), /aset "aset-hantu" tidak/);
    });

    await test('Track kamera tidak dikenal', () => {
      if (!raw.timeline) return { skipped: 'konfigurasi lama tanpa timeline' };
      return expectIssue(variant((r) => {
        r.timeline.scenes[0].camera = { ...(r.timeline.scenes[0].camera || {}), track: 'track-hantu' };
      }), /track kamera "track-hantu" tidak ditemukan/);
    });

    await test('Keyframe tidak valid (frame mundur)', () => {
      if (!raw.timeline) return { skipped: 'konfigurasi lama tanpa timeline' };
      return expectIssue(variant((r) => {
        r.environment = { ...(r.environment || {}), uji: [[20, 0], [10, 1]] };
      }), /frame harus berurutan naik/);
    });

    await test('Keyframe dengan easing tidak dikenal', () => {
      if (!raw.timeline) return { skipped: 'konfigurasi lama tanpa timeline' };
      return expectIssue(variant((r) => {
        r.environment = { ...(r.environment || {}), uji: [[0, 0], [10, 1, 'memantul-hantu']] };
      }), /easing "memantul-hantu" tidak dikenal/);
    });

    await test('Parameter entitas/aset tidak valid', () => {
      if (!raw.timeline) return { skipped: 'konfigurasi lama tanpa timeline' };
      if (composed) {
        const id = Object.keys(raw.cast || {})[0];
        if (!id) return { skipped: 'tidak ada pemeran' };
        return expectIssue(variant((r) => {
          r.cast[id].params = { ...(r.cast[id].params || {}), parameterHantu: 1 };
        }), /parameter "parameterHantu" tidak dikenal/);
      }
      const key = Object.keys(raw.assets || {})[0];
      return expectIssue(variant((r) => {
        r.assets[key].warnaHantu = '#123456';
      }), /parameter "warnaHantu" tidak dikenal/);
    });

    await test('Nilai parameter di luar batas', () => {
      if (composed) {
        const id = Object.keys(raw.cast || {}).find((k) => raw.assets[raw.cast[k].asset]?.type === 'rig-character');
        if (!id) return { skipped: 'tidak ada karakter rig' };
        return expectIssue(variant((r) => {
          r.cast[id].paramTracks = { ...(r.cast[id].paramTracks || {}), headTurn: [[0, 0], [10, 5]] };
        }), /nilai 5 di luar batas/);
      }
      const key = Object.keys(raw.assets || {}).find((k) => raw.assets[k].type === 'steam-train');
      if (!key) return { skipped: 'tidak ada aset dengan parameter berbatas' };
      return expectIssue(variant((r) => {
        r.assets[key].railY = -5;
      }), /lebih kecil dari batas 0/);
    });

    // ---------- karakter rig: gerak dan cahaya (Tahap 5) ----------
    const rigAsset = Object.keys(raw.assets || {}).find((k) => raw.assets[k].type === 'rig-character');
    const rigCast = composed ? Object.keys(raw.cast || {}).find((k) => raw.assets[raw.cast[k].asset]?.type === 'rig-character') : null;

    await test('Mode gerak karakter salah ketik', () => {
      if (!rigAsset) return { skipped: 'tidak ada karakter rig' };
      return expectIssue(variant((r) => { r.assets[rigAsset].motion = 'melayang'; }), /motion: nilai "melayang" bukan salah satu dari: classic, natural/);
    });

    await test('Pose lengan karakter tidak dikenal', () => {
      if (!rigAsset) return { skipped: 'tidak ada karakter rig' };
      return expectIssue(variant((r) => { r.assets[rigAsset].frontArm = 'terbang'; }), /frontArm: nilai "terbang" bukan salah satu dari/);
    });

    await test('Palet adegan belum punya warna cahaya karakter', () => {
      if (!rigCast) return { skipped: 'tidak ada pemeran karakter rig' };
      return expectIssue(variant((r) => {
        r.cast[rigCast].params = { ...(r.cast[rigCast].params || {}), light: 'cahayaHantu' };
      }), /belum punya warna: .*cahayaHantuLight, cahayaHantuLift, cahayaHantuRim/);
    });

    await test('Arah cahaya karakter di luar batas', () => {
      if (!rigCast) return { skipped: 'tidak ada pemeran karakter rig' };
      return expectIssue(variant((r) => {
        r.cast[rigCast].paramTracks = { ...(r.cast[rigCast].paramTracks || {}), lightDirection: [[0, 0], [10, 3]] };
      }), /lightDirection key 1: nilai 3 di luar batas -1\.\.1/);
    });

    await test('Track arah cahaya karakter tidak ada', () => {
      if (!rigAsset) return { skipped: 'tidak ada karakter rig' };
      return expectIssue(variant((r) => { r.assets[rigAsset].lightTrack = 'matahari-hantu'; }), /track lingkungan "matahari-hantu" tidak ada di bagian environment/);
    });

    // Kode gerak natural sengaja dirusak di salinan repository; pemeriksaan gerak validator harus menangkapnya,
    // sedangkan kode asli lolos (kontrol).
    const naturalWalkers = composed && Object.values(raw.cast || {}).some((c) => {
      const a = raw.assets[c.asset];
      const walks = c.state === 'walk' || (Array.isArray(c.state) && c.state.some((k) => k[1] === 'walk'));
      return a?.type === 'rig-character' && walks && (c.params?.motion ?? a.motion) === 'natural';
    });
    const brokenMotion = async (file, from, to, id) => {
      const real = await openStudio(config);
      let control;
      try {
        control = (await B.motionChecks(real, config)).find((c) => c.id === id);
      } finally {
        await real.close();
      }
      const sandbox = makeSandbox('pixel-gerak-rusak-');
      try {
        const target = path.join(sandbox.dir, file);
        const code = fs.readFileSync(target, 'utf8');
        if (!code.includes(from)) throw new Error(`kode yang mau dirusak tidak ditemukan di ${file}`);
        fs.writeFileSync(target, code.replace(from, to));
        const sconfig = sandbox.require('src/render/projects.cjs').loadProject(config.id);
        const studio = await sandbox.require('src/render/browser.cjs').openStudio(sconfig);
        try {
          const verdict = expectFail(await sandbox.require('src/render/browser-checks.cjs').motionChecks(studio, sconfig), [id]);
          return { detected: verdict.detected && control.pass, detail: `${verdict.detail} | kontrol kode asli: ${control.pass ? 'lolos' : 'gagal'}` };
        } finally {
          await studio.close();
        }
      } finally {
        sandbox.cleanup();
      }
    };

    await test('Kaki meluncur saat berjalan (telapak ikut terseret tubuh)', () => {
      if (!naturalWalkers) return { skipped: 'proyek tanpa karakter berjalan dengan gerak natural' };
      return brokenMotion('src/assets/characters/gait.js', '  let foot = plant;\n', '  let foot = plant + (d - (step + offset) * cycle) * 0.5;\n', 'motion-feet');
    });

    await test('Tubuh bergetar saat berjalan (pinggul bolak-balik tiap frame)', () => {
      if (!naturalWalkers) return { skipped: 'proyek tanpa karakter berjalan dengan gerak natural' };
      return brokenMotion('src/assets/characters/gait.js', '  return Math.cos(4 * Math.PI * u) >= 0.5 ? depth : 0;\n', '  return Math.floor(u * 64) % 2;\n', 'motion-bob');
    });

    // Pemeriksaan pose (T19): kode gambar sengaja dirusak di salinan repository. Pemeriksaan pose harus GAGAL
    // (bukan KNOWN ISSUE atau TIDAK DIPERIKSA), sedangkan kode asli memberi status yang diharapkan sebagai kontrol.
    const rigUses = [
      ...Object.values(raw.cast || {}),
      ...Object.values(raw.stages || {}).flatMap((s) => s.entities || []),
      ...(raw.timeline?.scenes || []).flatMap((s) => s.entities || [])
    ].map((d) => ({ d, a: raw.assets?.[d.asset] })).filter(({ d, a }) => a?.type === 'rig-character' && (d.params?.motion ?? a.motion) === 'natural');
    const statesOf = (d) => (Array.isArray(d.state) ? d.state.map((k) => k[1]) : [d.state || 'idle']);
    const naturalIn = (states, test = () => true) => composed && rigUses.some(({ d, a }) => statesOf(d).some((s) => states.includes(s)) && test(a));
    const STANDING = ['walk', 'idle', 'stand', 'gesture'];
    let realPose = null;
    // `ids` harus GAGAL di salinan; `controlStatus` = status kode asli yang diharapkan untuk setiap id (kontrol).
    // Opsi: `edit(r)` mengubah konfigurasi proyek di salinan (ditulis utuh tanpa $include), `copyAs` = id proyek baru
    // yang dibuat di salinan dari konfigurasi ini, `check(hasil, kontrol)` = syarat tambahan { ok, detail }.
    const brokenPose = async (file, swaps, ids, controlStatus = 'pass', { edit, copyAs, check } = {}) => {
      ids = [].concat(ids);
      const wanted = ids.map((_, i) => [].concat(controlStatus)[i] ?? [].concat(controlStatus)[0]);
      if (!realPose) {
        const real = await openStudio(config);
        try {
          realPose = await B.poseChecks(real, config);
        } finally {
          await real.close();
        }
      }
      const controls = ids.map((id) => realPose.find((c) => c.id === id));
      const absent = ids.find((id, i) => !controls[i] && id.startsWith('known:'));
      if (absent) return { skipped: `${absent.slice(6)} tidak terjadi di proyek ini` };
      const sandbox = makeSandbox('pixel-pose-rusak-');
      try {
        if (file) {
          const target = path.join(sandbox.dir, file);
          let code = fs.readFileSync(target, 'utf8');
          for (const [from, to] of swaps) {
            if (code.split(from).length !== 2) throw new Error(`kode yang mau dirusak tidak ditemukan tepat satu kali di ${file}`);
            code = code.replace(from, to);
          }
          fs.writeFileSync(target, code);
        }
        if (edit) {
          const r = clone(raw);
          edit(r);
          fs.writeFileSync(path.join(sandbox.dir, config.configFile), JSON.stringify(r, null, 2));
        }
        if (copyAs) fs.writeFileSync(path.join(sandbox.dir, 'config', `${copyAs}.json`), JSON.stringify({ ...clone(raw), id: copyAs, name: copyAs }, null, 2));
        const sconfig = sandbox.require('src/render/projects.cjs').loadProject(copyAs || config.id);
        const studio = await sandbox.require('src/render/browser.cjs').openStudio(sconfig);
        try {
          const found = await sandbox.require('src/render/browser-checks.cjs').poseChecks(studio, sconfig);
          const verdict = expectFail(found, ids);
          const ok = controls.every((c, i) => c && C.statusOf(c) === wanted[i]);
          const extra = check ? check(found, controls) : { ok: true, detail: '' };
          const label = (c) => (c ? C.STATUS_LABEL[C.statusOf(c)] : 'tidak ada');
          return {
            detected: verdict.detected && ok && extra.ok,
            detail: `${verdict.detail}${extra.detail ? ` | ${extra.detail}` : ''} | kontrol kode asli: ${ids.map((id, i) => `${id} ${label(controls[i])} (diharapkan ${C.STATUS_LABEL[wanted[i]]})`).join(', ')}`
          };
        } finally {
          await studio.close();
        }
      } finally {
        sandbox.cleanup();
      }
    };
    // KNOWN ISSUE proyek ini (known-issues.cjs) dan pemerannya, untuk kontrol bahwa masalah serupa di luar catatan GAGAL
    const knownHere = require('./known-issues.cjs').filter((k) => k.project === config.id);
    const knownCast = (check) => [...new Set(knownHere.filter((k) => k.check === check).flatMap((k) => (k.entity ? [k.entity] : Object.keys(k.occurrences))))];
    // ganti nama pemeran di konfigurasi (cast, daftar pemeran adegan, induk); gambar dan geraknya tidak berubah
    const renameCast = (names) => (r) => {
      const to = (id) => (names.includes(id) ? `${id}-lain` : id);
      r.cast = Object.fromEntries(Object.entries(r.cast).map(([id, d]) => [to(id), d.parent ? { ...d, parent: to(d.parent) } : d]));
      for (const s of r.timeline.scenes) if (Array.isArray(s.cast)) s.cast = s.cast.map(to);
    };
    // banyak pelanggaran pemeriksaan utama = jumlah kejadian KNOWN ISSUE di kode asli (masalah yang sama persis)
    const violations = (found, id) => Number((found.find((c) => c.id === id)?.detail.match(/^(\d+) pelanggaran/) || [])[1] || 0);
    const sameCount = (pairs) => (found, controls) => {
      const rows = pairs.map(([id, knownIds]) => {
        const expected = knownIds.reduce((n, k) => n + (realPose.find((c) => c.id === k)?.count || 0), 0);
        return { id, expected, got: violations(found, id) };
      });
      return { ok: rows.every((x) => x.expected > 0 && x.got === x.expected), detail: rows.map((x) => `${x.id} ${x.got} pelanggaran (sama dengan ${x.expected} kejadian KNOWN ISSUE di kode asli)`).join(', ') };
    };
    const RIG = 'src/assets/characters/rig.js';
    const skipPose = (what) => ({ skipped: `proyek tanpa ${what} gerak natural` });

    await test('Telapak yang menapak melayang 1 piksel (pose: kaki tidak di tanah)', () => {
      if (!naturalIn(['walk'])) return skipPose('karakter berjalan');
      return brokenPose('src/assets/characters/gait.js', [['  let h = 0;\n', '  let h = 1;\n']], 'motion-joints');
    });

    await test('Siku bergeser 3 piksel dari tulang lengan (pose: lengan memanjang)', () => {
      if (!rigUses.length || !composed) return skipPose('karakter rig');
      return brokenPose(RIG, [['    const E = pt(elbow);\n', '    const E = pt({ x: elbow.x + 3, y: elbow.y });\n']], 'motion-limbs');
    });

    await test('Paha dan betis tidak sama panjang dengan desain (pose: tulang kaki salah)', () => {
      if (!naturalIn([...STANDING, 'sweep'], (a) => !a.sarong)) return skipPose('karakter bercelana (tanpa sarung) yang berdiri');
      return brokenPose(RIG, [['twoBone(hip, ankle, span / 2, span / 2, -1)', 'twoBone(hip, ankle, span / 2 + 2, span / 2 - 2, -1)']], 'motion-limbs');
    });

    await test('Sepatu pengayuh lepas 3 piksel dari pedal (pose: sentuhan)', () => {
      if (!naturalIn(['cycle'])) return skipPose('pengayuh sepeda');
      return brokenPose(RIG, [['y: boxH - (p.crankDrop ?? 2) }', 'y: boxH - (p.crankDrop ?? 5) }']], 'motion-contact');
    });

    await test('Tangan dekat penyapu lepas dari gagang sapu (pose: sentuhan)', () => {
      if (!naturalIn(['sweep'], (a) => a.accessory === 'broom')) return skipPose('penyapu bersapu');
      return brokenPose(RIG, [["{ target: top }, true, { drivers: ['sweep'] }", "{ target: { x: top.x + 4, y: top.y } }, true, { drivers: ['sweep'] }"]], 'motion-contact');
    });

    await test('Bakul tidak di tangan (pose: sentuhan)', () => {
      if (!naturalIn(STANDING, (a) => a.accessory === 'basket')) return skipPose('pembawa bakul');
      // bibir bakul selebar 6 piksel: geser 5 piksel ke bawah supaya benar-benar lepas dari tangan
      return brokenPose(RIG, [['    if (basketHand) drawBasket(ctx, basketHand);\n', '    if (basketHand) basketHand.y += 5;\n    if (basketHand) drawBasket(ctx, basketHand);\n']], 'motion-contact');
    });

    await test('Badan duduk melayang 4 piksel di atas tempat duduk (pose: posisi duduk)', () => {
      if (!naturalIn(['seated', 'cycle'])) return skipPose('karakter duduk');
      return brokenPose(RIG, [[
        '  function drawNaturalSeated(ctx, { breath, turn, blink, gesture, pedal }) {\n    const footY = boxH;\n    const hipY = footY - Math.round(legLen * 0.55);\n',
        '  function drawNaturalSeated(ctx, { breath, turn, blink, gesture, pedal }) {\n    const footY = boxH;\n    const hipY = footY - Math.round(legLen * 0.55) - 4;\n'
      ]], 'motion-seat');
    });

    await test('Bahu bergetar: napas berganti setiap frame (pose: stabil antar-frame)', () => {
      if (!naturalIn(['idle', 'stand', 'seated', 'gesture'])) return skipPose('karakter diam');
      return brokenPose(RIG, [['breath: Math.sin((time / (p.breathSeconds ?? 3.4)) * Math.PI * 2) > 0.2 ? 1 : 0', 'breath: Math.round(time * 30) % 2']], 'motion-stable');
    });

    await test('Lengan jauh bergetar di puncak isyarat (pengecualian titik balik hanya untuk sendi dengan penggerak itu)', () => {
      if (!naturalIn(['gesture'])) return skipPose('isyarat');
      return brokenPose(RIG, [["armAngles(backKind, -swing, amp), false, { drivers: ['swing'] }", "armAngles(backKind, -swing + (gesture > 0.85 ? 1.5 : 0), amp), false, { drivers: ['swing'] }"]], 'motion-stable');
    });

    // V29 sudah diperbaiki (tidak ada lagi KNOWN ISSUE-nya): masing-masing tangan pengayuh yang lepas dari setang GAGAL
    await test('Tangan dekat pengayuh lepas 2 piksel di atas setang (pose: sentuhan)', () => {
      if (!naturalIn(['cycle'])) return skipPose('pengayuh sepeda');
      return brokenPose(RIG, [['const target = pedal ? { x: pedal.grip.x + 1, y: pedal.grip.y - 2 }', 'const target = pedal ? { x: pedal.grip.x + 1, y: pedal.grip.y - 4 }']], 'motion-contact');
    });

    await test('Tangan jauh pengayuh lepas 2 piksel di atas setang (pose: sentuhan)', () => {
      if (!naturalIn(['cycle'])) return skipPose('pengayuh sepeda');
      return brokenPose(RIG, [['const backTarget = pedal ? { x: pedal.grip.x - 1, y: pedal.grip.y - 2 }', 'const backTarget = pedal ? { x: pedal.grip.x - 1, y: pedal.grip.y - 4 }']], 'motion-contact');
    });

    await test('KNOWN ISSUE V30 memburuk: ujung lengan jauh penyapu makin jauh dari tangannya', () => {
      if (!naturalIn(['sweep'], (a) => a.accessory === 'broom')) return skipPose('penyapu bersapu');
      return brokenPose(RIG, [["{ target: low }, false, { hand: false, drivers: ['sweep'] }", "{ target: { x: low.x + 6, y: low.y } }, false, { hand: false, drivers: ['sweep'] }"]], 'known:V30', 'known');
    });

    await test('KNOWN ISSUE V31 memburuk: kedip lutut yang tercatat melompat 2 piksel', () => {
      if (!naturalIn(['walk'])) return skipPose('karakter berjalan');
      // pecahan .5 dibulatkan 1 piksel lebih jauh: kedip pembulatan di frame yang sama menjadi 2 piksel
      return brokenPose(RIG, [['      const knee = pt(bone.joint);\n', '      const knee = pt({ x: bone.joint.x, y: bone.joint.y + (bone.joint.y % 1 >= 0.5 ? 1 : 0) });\n']], 'known:V31', 'known');
    });

    await test('KNOWN ISSUE V32 memburuk: getar lutut yang tercatat melompat 2 piksel', () => {
      if (!naturalIn(['walk'])) return skipPose('karakter berjalan');
      // jarak lutut dari pinggul digandakan di sumbu x: pola a, b, a yang sama, lompatannya dua kali lipat
      return brokenPose(RIG, [['      const knee = pt(bone.joint);\n', '      const knee = pt(bone.joint);\n      knee.x = 2 * knee.x - Math.round(hip.x);\n']], 'known:V32', 'known');
    });

    await test('Kedip pembulatan baru di luar daftar V31 (frame dan pemeran lain) tetap GAGAL', () => {
      if (!naturalIn(['walk'])) return skipPose('karakter berjalan');
      return brokenPose(RIG, [['      const knee = pt(bone.joint);\n', '      const knee = pt({ x: bone.joint.x + (ankle.x % 2 ? 0.6 : 0), y: bone.joint.y });\n']], 'motion-stable');
    });

    await test('Getar lutut baru di luar daftar V32 (frame dan pemeran lain) tetap GAGAL', () => {
      if (!naturalIn(['walk'])) return skipPose('karakter berjalan');
      return brokenPose(RIG, [['      const ankle = { x: hipX + f.dx, y: footY - 1 - f.lift };\n      const bone', '      const ankle = { x: hipX + f.dx, y: footY - 1 - f.lift };\n      const bone = twoBone(hip, { x: ankle.x + (ankle.x % 2 ? 3 : 0), y: ankle.y }, span / 2, span / 2, -1);\n      const unused']], 'motion-stable');
    });

    await test('Masalah KNOWN ISSUE sentuhan (V30) di pemeran lain (nama pemeran diganti) GAGAL, bukan KNOWN ISSUE', () => {
      const names = knownCast('motion-contact');
      if (!names.length) return { skipped: 'proyek tanpa KNOWN ISSUE sentuhan' };
      const ids = knownHere.filter((k) => k.check === 'motion-contact').map((k) => `known:${k.id}`);
      return brokenPose(null, [], ['motion-contact', ...ids], ['pass', ...ids.map(() => 'known')], { edit: renameCast(names), check: sameCount([['motion-contact', ids]]) });
    });

    await test('Masalah V31 dan V32 di pemeran lain (nama pemeran diganti) GAGAL, bukan KNOWN ISSUE', () => {
      const names = knownCast('motion-stable');
      if (!names.length) return { skipped: 'proyek tanpa KNOWN ISSUE gerak' };
      const ids = knownHere.filter((k) => k.check === 'motion-stable').map((k) => `known:${k.id}`);
      return brokenPose(null, [], ['motion-stable', ...ids], ['pass', ...ids.map(() => 'known')], { edit: renameCast(names), check: sameCount([['motion-stable', ids]]) });
    });

    await test('KNOWN ISSUE tidak berlaku di proyek baru (salinan proyek ini dengan id lain) = GAGAL', () => {
      if (!knownHere.length) return { skipped: 'proyek tanpa KNOWN ISSUE' };
      const byCheck = (check) => knownHere.filter((k) => k.check === check).map((k) => `known:${k.id}`);
      const pairs = [['motion-contact', byCheck('motion-contact')], ['motion-stable', byCheck('motion-stable')]].filter(([, ids]) => ids.length);
      const counts = sameCount(pairs);
      return brokenPose(null, [], pairs.map(([id]) => id), 'pass', {
        copyAs: `${config.id}-salinan`,
        check: (found, controls) => {
          const c = counts(found, controls);
          const leaked = found.filter((x) => x.id.startsWith('known:'));
          return { ok: c.ok && !leaked.length, detail: `${c.detail}, baris KNOWN ISSUE di proyek baru: ${leaked.length}` };
        }
      });
    });

    await test('Skala entitas bukan bilangan bulat (grid piksel rusak)', () => {
      if (!composed) return { skipped: 'proyek tanpa adegan tersusun' };
      const id = Object.keys(raw.cast || {})[0];
      return expectIssue(variant((r) => {
        r.cast[id].scale = 1.5;
      }), /scale harus bilangan bulat/);
    });

    await test('Zoom kamera tanpa mode upscale "browser" (piksel jadi tidak tajam)', () => {
      if (!raw.timeline) return { skipped: 'konfigurasi lama tanpa timeline' };
      return expectIssue(variant((r) => {
        if (r.rendering?.upscale === 'browser') r.rendering.upscale = 'ffmpeg';
        else {
          const key = Object.keys(r.cameraTracks || {})[0];
          if (key) r.cameraTracks[key].zoom = [[0, 1], [10, 2]];
          else r.timeline.scenes[0].camera = { type: 'keys', zoom: [[0, 1], [10, 2]] };
        }
      }), /zoom kamera hanya didukung/);
    });

    await test('Mode zoom salah ketik', () => expectIssue(variant((r) => {
      r.rendering = { ...(r.rendering || {}), upscale: 'browser', zoomMode: 'zoom-hantu' };
    }), /zoomMode "zoom-hantu" tidak dikenal/));

    await test('Lensa zoom di mode upscale ffmpeg', () => {
      if (!raw.timeline) return { skipped: 'konfigurasi lama tanpa timeline' };
      return expectIssue(variant((r) => {
        r.rendering = { ...(r.rendering || {}), upscale: 'ffmpeg' };
        delete r.rendering.zoomMode;
        r.timeline.scenes[0].lens = { zoom: [[0, 1], [10, 1.3]] };
      }), /zoom kamera hanya didukung/);
    });

    await test('Zoom pecahan dengan cara lama (nearest): grid piksel merayap', async () => {
      const manifest = M.readManifest(M.manifestFile(config));
      const frac = (manifest?.segments || []).filter((sg) => sg.grid?.length === 1 && Math.abs(sg.grid[0].zoom * 4 - Math.round(sg.grid[0].zoom * 4)) > 1e-6);
      if (config.rendering.upscale !== 'browser' || frac.length < 2) return { skipped: 'proyek tanpa zoom kamera pecahan' };
      const old = variant((r) => { r.rendering = { ...r.rendering, zoomMode: 'nearest' }; });
      const first = frac[0].frame;
      const count = Math.min(30, frac.length);
      const info = await renderFrames(old, { first, count, framesDir: path.join(temp, 'zoom-nearest'), globalNames: true });
      const bad = expectFail(await C.gridChecks(old, info), ['grid-stability']);
      // kontrol: rentang yang sama dengan mode bawaan harus lolos
      const good = await C.gridChecks(config, { segments: manifest.segments.filter((sg) => sg.frame >= first && sg.frame < first + count) });
      return { detected: bad.detected && good[0].pass, detail: `${bad.detail} | kontrol anchored: ${good[0].pass ? 'lolos' : 'gagal'}` };
    });

    await test('Nama efek salah ketik', () => {
      if (!raw.timeline) return { skipped: 'konfigurasi lama tanpa timeline' };
      return expectIssue(variant((r) => {
        const s = r.timeline.scenes[r.timeline.scenes.length > 1 ? 1 : 0];
        s.environment = { ...(s.environment || {}), effects: [...(s.environment?.effects || []), 'hujan-deras-salah-ketik'] };
      }), /efek "hujan-deras-salah-ketik" tidak dikenal/);
    });

    await test('Proyek yang tidak ada', () => {
      const r = cli('--project', 'proyek-hantu');
      const detected = r.status !== 0 && /tidak ditemukan/.test(r.stderr) && r.stderr.includes(config.id);
      return { detected, detail: `exit ${r.status}: ${r.stderr.trim().split('\n').slice(0, 2).join(' / ')}` };
    });

    await test('Adegan yang tidak ada', () => {
      const r = cli('--project', config.id, '--scene', 'adegan-hantu');
      const detected = r.status !== 0 && /tidak ada di proyek/.test(r.stderr) && r.stderr.includes(scenes[0].id);
      return { detected, detail: `exit ${r.status}: ${r.stderr.trim().split('\n').slice(0, 2).join(' / ')}` };
    });

    // ---------- video ----------
    await test(`Video kurang 1 frame (${config.totalFrames - 1} frame)`, () => {
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

    const middle = Math.floor(config.totalFrames * 0.45);
    await test(`Frame hitam disisipkan di frame ${middle}`, () => {
      const dir = path.join(temp, 'frame-hitam');
      copyFrames(dir);
      run(FFMPEG, ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=black:s=${config.frameSize.width}x${config.frameSize.height}`, '-frames:v', '1', frameFile(dir, middle)]);
      const video = path.join(temp, 'frame-hitam.mp4');
      encodeVideo(config, { framesDir: dir, count: config.totalFrames, video, overrides: fast });
      const stats = C.lumaStats(video);
      return expectFail([...C.frameChecks(stats, C.frameHashes(video), config.totalFrames, limits), ...C.transitionLumaChecks(stats, transitions, 0, limits)], ['blank', 'no-flash']);
    });

    await test('Film berakhir di layar hitam', () => {
      const dir = path.join(temp, 'akhir-hitam');
      copyFrames(dir);
      run(FFMPEG, ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=black:s=${config.frameSize.width}x${config.frameSize.height}`, '-frames:v', '1', frameFile(dir, config.totalFrames - 1)]);
      const video = path.join(temp, 'akhir-hitam.mp4');
      encodeVideo(config, { framesDir: dir, count: config.totalFrames, video, overrides: fast });
      return expectFail(C.frameChecks(C.lumaStats(video), C.frameHashes(video), config.totalFrames, limits), ['end-frame']);
    });

    await test(`Frame ${middle} hilang dari folder frame`, () => {
      const dir = path.join(temp, 'frame-hilang');
      copyFrames(dir, [middle]);
      return expectFail(C.pngChecks(dir, config.totalFrames, config.frameSize.width, config.frameSize.height).checks, ['png-frames']);
    });

    // ---------- hasil render lama ----------
    await test('Render gagal, tetapi MP4 lama masih ada', async () => {
      const sandbox = makeSandbox('pixel-render-gagal-');
      try {
        sandbox.copyOutputs(config, M.manifestFile(config));
        // rusak mesin di salinan: frame 5 melempar error
        const runtime = path.join(sandbox.dir, 'src', 'engine', 'runtime.js');
        const code = fs.readFileSync(runtime, 'utf8').replace('function renderFrame(frame) {', "function renderFrame(frame) {\n  if (frame === 5) throw new Error('Render sengaja digagalkan (uji negatif)');");
        fs.writeFileSync(runtime, code);
        const r = spawnSync(NODE, [path.join(sandbox.dir, 'src', 'render', 'render.cjs'), '--project', config.id], { encoding: 'utf8' });
        const SC = sandbox.require('src/render/checks.cjs');
        const SM = sandbox.require('src/render/manifest.cjs');
        const sconfig = sandbox.require('src/render/projects.cjs').loadProject(config.id);
        const oldVideoLooksFine = SC.videoChecks(sconfig.paths.video, expect).every((c) => c.pass);
        const checks = SC.manifestChecks(sconfig, SM.readManifest(SM.manifestFile(sconfig)));
        const verdict = expectFail(checks, ['manifest:status']);
        return {
          detected: r.status !== 0 && oldVideoLooksFine && verdict.detected,
          detail: `render exit ${r.status}, MP4 lama ${oldVideoLooksFine ? 'masih ada dan terlihat sah' : 'tidak ada'}, ${verdict.detail}`
        };
      } finally {
        sandbox.cleanup();
      }
    });

    await test('MP4 diganti tanpa render ulang', () => {
      const video = path.join(temp, 'kurang-frame.mp4');
      const manifest = M.readManifest(M.manifestFile(config));
      return expectFail(C.manifestChecks(config, manifest, { video }), ['manifest:fresh']);
    });

    await test('Konfigurasi diubah setelah render (MP4 kedaluwarsa)', () => {
      const manifest = { ...M.readManifest(M.manifestFile(config)), inputsHash: 'konfigurasi-lama' };
      return expectFail(C.manifestChecks(config, manifest), ['manifest:fresh']);
    });

    // ---------- transisi dan aset ----------
    await test('Pergantian adegan dengan potongan kasar (hard cut)', async () => {
      const t = transitions.find((x) => x.type !== 'cut');
      if (!t) return { skipped: 'proyek tanpa transisi bertahap' };
      const cut = variant((r) => {
        for (const s of r.timeline.scenes) if (s.transitionOut) s.transitionOut = { ...s.transitionOut, type: 'cut', params: {} };
        // Adegan tersusun bisa saja berakhir dengan framing yang sama persis dengan adegan berikutnya
        // (seperti push-in Project B), sehingga potongan langsung nyaris tidak terlihat. Supaya ujinya berupa
        // potongan kasar sungguhan, adegan tujuan dibuka dengan framing yang jauh berbeda.
        const next = r.timeline.scenes.find((s) => s.id === t.to);
        if (config.engine.builtinScenes.includes(next.module)) next.camera = { type: 'keys', x: [[0, 640]] };
      });
      const first = t.startFrame - 3;
      const count = t.durationFrames + 6;
      const dir = path.join(temp, 'hard-cut');
      await renderFrames(cut, { first, count, framesDir: dir });
      const video = path.join(temp, 'hard-cut.mp4');
      encodeVideo(cut, { framesDir: dir, count, video, overrides: fast });
      const bad = expectFail(C.transitionLumaChecks(C.lumaStats(video), cut.timeline.transitions, first, limits), ['no-hard-cut']);
      // kontrol: frame yang sama dengan transisi asli harus lolos
      const control = C.transitionLumaChecks(C.lumaStats(config.paths.video).slice(first, first + count), transitions, first, limits);
      const controlPass = control.every((c) => c.pass);
      return { detected: bad.detected && controlPass, detail: `${bad.detail} | kontrol transisi ${t.type}: ${controlPass ? 'lolos' : 'gagal'}` };
    });

    await test('Portal terlalu kecil sehingga gambar melompat di akhir transisi', async () => {
      const i = scenes.findIndex((s) => s.transitionOut?.type === 'portal');
      if (i < 0) return { skipped: 'proyek tanpa transisi portal' };
      const small = variant((r) => { r.timeline.scenes[i].transitionOut.params.zoom = 3; });
      const t = small.timeline.transitions.find((x) => x.from === scenes[i].id);
      const dir = path.join(temp, 'portal-kecil');
      const info = await renderFrames(small, { first: t.startFrame, count: t.durationFrames, framesDir: dir });
      const studio = await openStudio(small);
      try {
        return expectFail(await B.transitionBoundaryChecks(studio, { ...small, timeline: { ...small.timeline, transitions: [t] } }, info), ['portal']);
      } finally {
        await studio.close();
      }
    });

    for (const rule of config.validation?.consistency || []) {
      const label = rule.asset || rule.assetType;
      await test(`Aset ${label} tampil berbeda di adegan terakhir`, async () => {
        const last = scenes[scenes.length - 1];
        let other;
        if (rule.assetType) {
          // aset kereta kedua dengan warna lain, dipakai lewat set pemandangan di adegan terakhir
          const key = Object.keys(raw.assets).find((k) => raw.assets[k].type === rule.assetType);
          const holder = Object.keys(raw.assets).find((k) => raw.assets[k].train === key);
          if (!key || !holder) return { skipped: 'struktur aset tidak dikenali' };
          other = variant((r) => {
            r.assets[`${key}-b`] = { ...clone(r.assets[key]), colors: { coach: '#1f5a3a', locoShine: '#7a5a3a' } };
            r.assets[`${holder}-b`] = { ...clone(r.assets[holder]), train: `${key}-b` };
            const s = r.timeline.scenes[r.timeline.scenes.length - 1];
            s.assets = s.assets.map((a) => (a === key ? `${key}-b` : a === holder ? `${holder}-b` : a));
          });
        } else {
          // pemeran diganti "kembaran" berbaju lain di adegan terakhir
          // pemeran di adegan terakhir yang memakai aset itu (satu aset boleh dipakai beberapa pemeran)
          const castId = (last.cast || []).find((k) => raw.cast?.[k]?.asset === rule.asset);
          if (!castId || !last.cast?.includes(castId)) return { skipped: 'aset tidak dipakai pemeran di adegan terakhir' };
          other = variant((r) => {
            r.assets[`${rule.asset}-b`] = { ...clone(r.assets[rule.asset]), shirt: '#3a6a9a', shirtShade: '#2a4a7a', pants: '#8a8a8a', hatColor: '#c03a3a', hair: '#c03a3a' };
            const s = r.timeline.scenes[r.timeline.scenes.length - 1];
            s.cast = s.cast.filter((c) => c !== castId);
            s.entities = [...(s.entities || []), { ...clone(r.cast[castId]), id: `${castId}-kembar`, asset: `${rule.asset}-b` }];
          });
        }
        const studio = await openStudio(other);
        try {
          return expectFail(await B.consistencyChecks(studio, other), [`consistency:${label}-colors`]);
        } finally {
          await studio.close();
        }
      });
    }

    // ---------- kode adegan yang melanggar aturan ----------
    const fixture = (module) => buildConfig({
      id: 'uji', name: 'uji', title: 'Uji', seed: raw.seed, width: raw.width, height: raw.height, outputWidth: raw.outputWidth, outputHeight: raw.outputHeight,
      fps: raw.fps, durationSeconds: 1, assets: {},
      timeline: { scenes: [{ id: 'uji', name: 'Uji', module, start: 0, end: 1, assets: [], characters: {}, camera: {}, environment: {}, transitionOut: null }] }
    }, file);

    await test('Adegan memakai Math.random() (tidak deterministik)', async () => {
      const cfg = fixture('/tests/fixtures/scenes/random-noise');
      const dir = path.join(temp, 'acak');
      await renderFrames(cfg, { framesDir: dir });
      const hashes = C.pngChecks(dir, cfg.totalFrames, cfg.frameSize.width, cfg.frameSize.height).hashes;
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
  fs.writeFileSync(path.join(config.paths.reports, `${config.name}-negative-tests.json`), JSON.stringify({ testedAt, project: config.id, allDetected, detected, total: results.length, results }, null, 2) + '\n');
  const rows = results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.detected ? 'TERDETEKSI' : 'TIDAK TERDETEKSI'} | ${r.detail.replace(/\|/g, '/')} |`).join('\n');
  fs.writeFileSync(path.join(config.paths.reports, `${config.name}-negative-tests.md`), `# Pengujian Negatif: ${config.title}

Setiap baris adalah hasil yang SENGAJA dibuat salah. Pengujian lulus bila validator menolaknya (TERDETEKSI).
Dibuat otomatis oleh \`npm run test:negative -- --project ${config.id}\` pada ${testedAt}.

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
