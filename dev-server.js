'use strict';
// Servidor local só para testar no seu computador: node scripts/dev-server.js
// Sem variáveis definidas, roda em modo DEMO com a senha "demo-1234".
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

process.env.DEMO = process.env.DEMO || '1';
process.env.APP_PASSWORD = process.env.APP_PASSWORD || 'demo-1234';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const root = path.join(__dirname, '..');
const pub = path.join(root, 'public');
const port = Number(process.env.PORT) || 3000;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json'
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z]/g, '');
    const file = path.join(root, 'api', name + '.js');
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('not found'); }
    try { return await require(file)(req, res); } catch (e) { console.error(e); res.statusCode = 500; return res.end('error'); }
  }
  let p = url.pathname === '/' ? '/index.html' : url.pathname;
  const full = path.join(pub, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!full.startsWith(pub) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('Content-Type', types[path.extname(full)] || 'application/octet-stream');
  fs.createReadStream(full).pipe(res);
}).listen(port, () => console.log('http://localhost:' + port + '  (senha de teste: ' + process.env.APP_PASSWORD + ')'));
