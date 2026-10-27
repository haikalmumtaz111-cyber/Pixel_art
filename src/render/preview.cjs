// Pratinjau animasi langsung di browser tanpa render video.
// Pemakaian: npm run preview, lalu buka alamat yang muncul. Tekan Ctrl+C untuk berhenti.
//   npm run preview -- film-night-to-dawn s02-inside-train   (hanya satu adegan, diputar berulang)
const { ROOT, loadConfig } = require('./config.cjs');
const { startServer } = require('./server.cjs');

const configName = process.argv[2] || 'film-night-to-dawn';
const sceneId = process.argv[3] || '';
const port = Number(process.env.PORT || 8080);

// Konfigurasi diperiksa dan dirapikan oleh Node, sama seperti saat render.
const routes = {
  '/__config/': (name) => {
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Nama konfigurasi hanya boleh huruf kecil, angka, dan tanda hubung.');
    return loadConfig(`config/${name}.json`);
  }
};

startServer(ROOT, port, routes).then(({ url }) => {
  const config = loadConfig(`config/${configName}.json`);
  console.log(`Pratinjau siap: ${url}/src/engine/page.html?config=${configName}${sceneId ? `&scene=${sceneId}` : ''}`);
  console.log(`Adegan yang tersedia: ${config.timeline.scenes.map((s) => s.id).join(', ')}`);
  console.log('Tekan Ctrl+C untuk berhenti.');
});
