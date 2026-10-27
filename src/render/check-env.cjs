// Memeriksa apakah semua alat yang dibutuhkan sudah terpasang.
// Pemakaian: npm run check
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');
const { ROOT } = require('./config.cjs');
const { describeProjects } = require('./projects.cjs');

const results = [];
const report = (name, ok, detail, fix = '') => results.push({ name, ok, detail, fix });

function versionOf(cmd) {
  const r = spawnSync(cmd, ['-version'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split('\n')[0] : null;
}

async function main() {
  report('Sistem operasi', true, `${os.type()} ${os.release()} (${os.platform()}/${os.arch()})`);

  const major = Number(process.versions.node.split('.')[0]);
  report('Node.js (runtime JavaScript)', major >= 20, process.version, 'Pasang Node.js versi 20 ke atas dari https://nodejs.org');

  let playwright = null;
  try {
    playwright = require('playwright');
    report('Playwright', true, `versi ${require('playwright/package.json').version}`);
  } catch {
    report('Playwright', false, 'belum terpasang', 'Jalankan: npm install');
  }

  if (playwright) {
    try {
      const browser = await playwright.chromium.launch();
      report('Chromium', true, `versi ${browser.version()}`);
      await browser.close();
    } catch (error) {
      report('Chromium', false, error.message.split('\n')[0], 'Jalankan: npx playwright install chromium');
    }
  } else {
    report('Chromium', false, 'tidak bisa dicek tanpa Playwright', 'Pasang Playwright dulu');
  }

  for (const tool of ['ffmpeg', 'ffprobe']) {
    const version = versionOf(process.env[`${tool.toUpperCase()}_PATH`] || tool);
    report(tool === 'ffmpeg' ? 'FFmpeg' : 'FFprobe', Boolean(version), version || 'belum terpasang', 'Linux: sudo apt install ffmpeg | macOS: brew install ffmpeg | Windows: winget install ffmpeg');
  }

  let writable = true;
  try {
    fs.accessSync(ROOT, fs.constants.W_OK);
  } catch {
    writable = false;
  }
  report('Folder proyek', writable, ROOT, 'Folder proyek harus bisa ditulisi');

  console.log('\nPemeriksaan lingkungan Pixel History Studio\n');
  for (const r of results) {
    console.log(`${r.ok ? '[OK]       ' : '[BELUM ADA]'} ${r.name}: ${r.detail}`);
    if (!r.ok && r.fix) console.log(`            cara pasang: ${r.fix}`);
  }
  const missing = results.filter((r) => !r.ok).length;
  console.log(`\nProyek yang tersedia:\n${describeProjects()}`);
  console.log(missing ? `\n${missing} komponen belum siap.` : '\nSemua komponen siap. Contoh: npm run build -- --project old-town-morning');
  if (missing) process.exitCode = 1;
}

main();
