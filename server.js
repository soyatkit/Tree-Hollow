const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'leaves.json');
const STATIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

function readLeaves() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch { return []; }
}

function writeLeaves(leaves) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(leaves), 'utf-8');
}

function serveStatic(res, filePath) {
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(STATIC_DIR, safePath);
  
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    // Fall back to index.html for SPA-like behavior
    const indexPath = path.join(STATIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(indexPath, 'utf-8'));
      return;
    }
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(fs.readFileSync(fullPath));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // ── CORS for API routes ──
  if (pathname.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── API ROUTES ──

  // GET /api/leaves — fetch all leaves
  if (req.method === 'GET' && pathname === '/api/leaves') {
    const leaves = readLeaves();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(leaves));
    return;
  }

  // POST /api/leaves — add a new leaf
  if (req.method === 'POST' && pathname === '/api/leaves') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const leaf = JSON.parse(body);
        leaf.id = Date.now() + '_' + Math.random().toString(36).slice(2, 9);
        const leaves = readLeaves();
        leaves.push(leaf);
        writeLeaves(leaves);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(leaf));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // DELETE /api/leaves/:id — pick (remove) a specific leaf
  if (req.method === 'DELETE' && pathname.startsWith('/api/leaves/')) {
    const id = pathname.split('/api/leaves/')[1];
    const leaves = readLeaves();
    const idx = leaves.findIndex(l => l.id === id);
    if (idx === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    const [removed] = leaves.splice(idx, 1);
    writeLeaves(leaves);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(removed));
    return;
  }

  // GET /health
  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', leaves: readLeaves().length }));
    return;
  }

  // ── STATIC FILES ──
  const filePath = pathname === '/' ? '/index.html' : pathname;
  serveStatic(res, filePath);
});

ensureDataDir();
server.listen(PORT, () => {
  console.log(`🌳 樹窿 running on http://localhost:${PORT}`);
  console.log(`   Leaves: ${readLeaves().length}`);
});
