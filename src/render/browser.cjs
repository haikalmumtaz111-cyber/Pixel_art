// Membuka adegan di Chromium (lewat Playwright) dan mengambil gambar per frame.
const { startServer } = require('./server.cjs');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    throw new Error('Playwright belum terpasang. Jalankan "npm install" lalu "npx playwright install chromium".');
  }
}

async function openStudio(config) {
  const { chromium } = loadPlaywright();
  const { server, url } = await startServer(config.paths.root);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: config.width, height: config.height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(new Error(msg.text()));
  });
  const fail = () => {
    if (errors.length) throw new Error(`Error di dalam adegan: ${errors[0].message}`);
  };

  await page.goto(`${url}/src/engine/page.html`);
  await page.waitForFunction(() => window.studioReady === true, null, { timeout: 15000 });
  fail();
  await page.evaluate((cfg) => window.studio.init(cfg), config);
  fail();

  return {
    browserVersion: browser.version(),
    async renderFrame(frame) {
      const dataUrl = await page.evaluate((i) => window.studio.renderFrame(i), frame);
      fail();
      return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    },
    async close() {
      await browser.close();
      server.close();
    }
  };
}

module.exports = { openStudio };
