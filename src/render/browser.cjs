// Membuka film di Chromium (lewat Playwright) dan mengambil gambar per frame.
// Setiap error JavaScript di halaman dicatat dan membuat proses berhenti dengan pesan jelas.
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
    if (errors.length) throw new Error(`Error JavaScript di dalam adegan: ${errors[0].message}`);
  };

  let started;
  try {
    await page.goto(`${url}/src/engine/page.html`);
    await page.waitForFunction(() => window.studioReady === true, null, { timeout: 15000 });
    fail();
    started = await page.evaluate((cfg) => window.studio.init(cfg), config);
    fail();
  } catch (error) {
    await browser.close();
    server.close();
    throw error;
  }

  const toBuffer = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

  return {
    browserVersion: browser.version(),
    errors,
    frameSize: { width: started.frameWidth, height: started.frameHeight },
    presenter: started.presenter,
    loadedModules: await page.evaluate(() => window.studio.inspect.loadedModules()),
    // sceneId (opsional): render adegan itu saja tanpa transisi
    async renderFrame(frame, sceneId = null) {
      let rendered;
      try {
        rendered = await page.evaluate(([i, id]) => (id ? window.studio.renderSceneFrame(id, i) : window.studio.renderFrame(i)), [frame, sceneId]);
      } catch (error) {
        errors.push(error);
        throw new Error(`Error JavaScript di dalam adegan (frame ${frame}): ${error.message.split('\n')[0].replace('page.evaluate: ', '')}`);
      }
      fail();
      return { png: toBuffer(rendered.image), info: rendered.info };
    },
    // Memanggil alat bantu pengujian di window.studio.inspect.
    async inspect(method, ...args) {
      const result = await page.evaluate(([m, a]) => window.studio.inspect[m](...a), [method, args]);
      fail();
      return result;
    },
    toBuffer,
    // jalankan fungsi di halaman (dipakai alat uji seperti lab zoom)
    async evaluate(fn, arg) {
      const result = await page.evaluate(fn, arg);
      fail();
      return result;
    },
    async close() {
      await browser.close();
      server.close();
    }
  };
}

module.exports = { openStudio };
