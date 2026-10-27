// Pratinjau animasi langsung di browser tanpa render video.
// Pemakaian: npm run preview -- --project old-town-morning [--scene s02-morning-walk]
// lalu buka alamat yang muncul. Tekan Ctrl+C untuk berhenti.
const { ROOT, loadProject, describeProjects } = require('./projects.cjs');
const { startServer } = require('./server.cjs');
const { parseArgs } = require('./cli.cjs');

const args = parseArgs(process.argv.slice(2));
if (!args.project) {
  console.log(`Pilih proyek dengan --project <id>.\nProyek yang tersedia:\n${describeProjects()}`);
  process.exit(1);
}
const config = loadProject(args.project);
const port = Number(process.env.PORT || 8080);

// Konfigurasi diperiksa dan dirapikan oleh Node, sama seperti saat render.
const routes = {
  '/__project/': (id) => {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Id proyek hanya boleh huruf kecil, angka, dan tanda hubung.');
    return loadProject(id);
  }
};

startServer(ROOT, port, routes).then(({ url }) => {
  console.log(`Pratinjau siap: ${url}/src/engine/page.html?project=${config.id}${args.scene ? `&scene=${args.scene}` : ''}`);
  console.log(`Adegan yang tersedia: ${config.timeline.scenes.map((s) => s.id).join(', ')}`);
  console.log('Tekan Ctrl+C untuk berhenti.');
});
