const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join('/tmp', 'leaves.json');

// Helper to parse request body
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function readLeaves() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading leaves.json:', e);
  }
  return [];
}

function writeLeaves(leaves) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(leaves), 'utf-8');
  } catch (e) {
    console.error('Error writing leaves.json:', e);
  }
}

module.exports = async (req, res) => {
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
      const leaf = await getRequestBody(req);
      if (!leaf || typeof leaf.text !== 'string') {
        res.status(400).json({ error: 'Invalid leaf data' });
        return;
      }
      leaf.id = Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      const leaves = readLeaves();
      leaves.push(leaf);
      writeLeaves(leaves);
      res.status(201).json(leaf);
    } catch (e) {
      console.error('Error processing POST request:', e);
      res.status(400).json({ error: 'Invalid JSON or data', details: e.message });
    }
    return;
  }

  // DELETE /api/leaves?id=xxx — remove a leaf
  if (req.method === 'DELETE' && idParam) {
    try {
      const leaves = readLeaves();
      const idx = leaves.findIndex(l => l.id === idParam);
      if (idx === -1) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      const [removed] = leaves.splice(idx, 1);
      writeLeaves(leaves);
      res.status(200).json(removed);
    } catch (e) {
      console.error('Error processing DELETE request:', e);
      res.status(500).json({ error: 'Server error', details: e.message });
    }
    return;
  }

  res.status(404).json({ error: 'Not found' });
};
