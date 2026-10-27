// Pratinjau animasi langsung di browser tanpa render video.
// Pemakaian: npm run preview, lalu buka alamat yang muncul. Tekan Ctrl+C untuk berhenti.
const { ROOT } = require('./config.cjs');
const { startServer } = require('./server.cjs');

const configName = process.argv[2] || 'train-night-rain';
const port = Number(process.env.PORT || 8080);

startServer(ROOT, port).then(({ url }) => {
  console.log(`Pratinjau siap: ${url}/src/engine/page.html?config=${configName}`);
  console.log('Tekan Ctrl+C untuk berhenti.');
});
