const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'leaves.json');
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

function readLeaves() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeLeaves(leaves) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(leaves), 'utf-8');
}

const server = http.createServer((req, res) => {
  // CORS headers
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

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

  // Health check
  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', leaves: readLeaves().length }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

ensureDataDir();
server.listen(PORT, () => {
  console.log(`🌳 樹窿 API running on port ${PORT}`);
  console.log(`   Leaves: ${readLeaves().length}`);
});
