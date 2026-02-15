/**
 * Lokal server som mottar eksport fra appen og skriver til iCloud-mappen.
 * Start med: npm run export-server
 * Deretter bruk "Eksporter til telefon" i appen – filen lagres i Regnskap-mappen.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const EXPORT_DIR = '/Users/vigleiknorheim/Library/Mobile Documents/com~apple~CloudDocs/Regnskap';
const FILENAME = 'budget-export.json';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/save-export') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        JSON.parse(body);
        ensureDir(EXPORT_DIR);
        const filePath = path.join(EXPORT_DIR, FILENAME);
        fs.writeFileSync(filePath, body, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: filePath }));
      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(err.message) }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Export-server på http://localhost:${PORT}`);
  console.log(`Eksport lagres i: ${EXPORT_DIR}`);
});
