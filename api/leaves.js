const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join('/tmp', 'leaves.json');

function readLeaves() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function writeLeaves(leaves) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(leaves), 'utf-8');
}

module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const idParam = url.searchParams.get('id');

  // GET /api/leaves — list all
  if (req.method === 'GET') {
    const leaves = readLeaves();
    res.status(200).json(leaves);
    return;
  }

  // POST /api/leaves — add new leaf
  if (req.method === 'POST') {
    try {
      const leaf = req.body;
      leaf.id = Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      const leaves = readLeaves();
      leaves.push(leaf);
      writeLeaves(leaves);
      res.status(201).json(leaf);
    } catch {
      res.status(400).json({ error: 'Invalid JSON' });
    }
    return;
  }

  // DELETE /api/leaves?id=xxx — remove a leaf
  if (req.method === 'DELETE' && idParam) {
    const leaves = readLeaves();
    const idx = leaves.findIndex(l => l.id === idParam);
    if (idx === -1) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const [removed] = leaves.splice(idx, 1);
    writeLeaves(leaves);
    res.status(200).json(removed);
    return;
  }

  res.status(404).json({ error: 'Not found' });
};
