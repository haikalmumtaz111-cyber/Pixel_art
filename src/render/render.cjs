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
const { renderFrames, encodeVideo, run, FFMPEG } = require('./pipeline.cjs');
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.project) {
    console.log(`Pilih proyek dengan --project <id>.\nProyek yang tersedia:\n${describeProjects()}`);
    process.exitCode = 1;
    return;
  }
  const config = loadConfig(args.project);
  const job = planJob(config, args);
  const manifestFile = job.manifestName ? M.manifestFile(config, job.manifestName) : null;
  const base = {
    project: config.id, name: job.manifestName, job: { kind: job.kind, first: job.first, count: job.count, scene: job.sceneId || null },
    configFile: config.configFile, inputsHash: M.inputsHash(args.project), engineHash: M.engineHash(), libraryHash: M.libraryHash(), engineVersion: config.engine.engineVersion
  };
  console.log(`Proyek "${config.title}" (${config.id}), ${job.label}: ${job.count} frame, ${config.width}x${config.height} -> ${config.outputWidth}x${config.outputHeight}, ${config.fps} FPS`);

  let result = null;
  const start = Date.now();
  if (manifestFile) M.writeManifest(manifestFile, { ...base, status: 'rendering', startedAt: new Date().toISOString() });
  try {
    if (!args.encodeOnly) {
      result = await renderFrames(config, {
        first: job.first, count: job.count, framesDir: job.framesDir, sceneId: job.sceneId, globalNames: job.globalNames,
        onProgress: (done, total) => {
          if (done % 30 === 0 || done === total) console.log(`  frame ${done}/${total}`);
        }
      });
    }
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

main().catch((error) => {
  console.error(`\nRENDER GAGAL: ${error.message}`);
  process.exit(1);
});
