// server.js — Local HTTP server + REST API for Void Map Task Sync
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3457;
const TASKS_FILE = path.join(__dirname, 'void-tasks-live.json');
const root = __dirname;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // REST API: GET /api/tasks
  if (pathname === '/api/tasks' && req.method === 'GET') {
    if (fs.existsSync(TASKS_FILE)) {
      fs.readFile(TASKS_FILE, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to read tasks store' }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(data);
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
    }
    return;
  }

  // REST API: POST /api/tasks
  if (pathname === '/api/tasks' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const tasks = payload.tasks || [];
        fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8', err => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to save tasks store' }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, count: tasks.length }));
          }
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // REST API: DELETE /api/tasks
  if (pathname === '/api/tasks' && req.method === 'DELETE') {
    if (fs.existsSync(TASKS_FILE)) {
      fs.unlink(TASKS_FILE, err => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to delete tasks store' }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    }
    return;
  }

  // Static files server
  let rel = pathname;
  if (rel === '/') rel = '/void-map.html';
  const file = path.resolve(root, '.' + rel);

  if (!file.toLowerCase().startsWith(root.toLowerCase())) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(file, (err, stats) => {
    if (err || stats.isDirectory()) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      fs.createReadStream(file).pipe(res);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Void Server] running at http://localhost:${PORT}/`);
  console.log(`[Void Server] serving map on root, tasks API on /api/tasks`);
});
