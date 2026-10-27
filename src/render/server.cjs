// Server file statis kecil. Browser butuh alamat http:// agar bisa memuat modul JavaScript.
// Hanya melayani komputer sendiri (127.0.0.1) dan hanya file di dalam folder proyek.
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8'
};

// routes (opsional): { '/awalan/': (sisaPath) => objek JSON } untuk data yang dibuat Node, misalnya konfigurasi film.
function startServer(rootDir, port = 0, routes = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const route = Object.keys(routes).find((prefix) => urlPath.startsWith(prefix));
      if (route) {
        try {
          const body = JSON.stringify(routes[route](urlPath.slice(route.length)));
          res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
          res.end(body);
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(error.message);
        }
        return;
      }
      const filePath = path.normalize(path.join(rootDir, urlPath));
      if (!filePath.startsWith(rootDir + path.sep)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

module.exports = { startServer };
