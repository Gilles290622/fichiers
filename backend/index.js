// Simple Express backend
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Endpoints pour fichiers
const db = require('./db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB par fichier

// Liste des fichiers
app.get('/api/files', (req, res) => {
  db.all('SELECT id, name, type, size, createdAt FROM files ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Téléchargement d'un fichier
app.get('/api/files/:id', (req, res) => {
  db.get('SELECT * FROM files WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Not found' });
    res.set('Content-Type', row.type || 'application/octet-stream');
    res.send(row.data);
  });
});

// Upload d'un fichier
app.post('/api/files', (req, res) => {
  const { name, data, type } = req.body;
  if (!name || !data) return res.status(400).json({ error: 'Missing fields' });
  const buffer = Buffer.from(data, 'base64');
  const size = buffer.length;
  const createdAt = Date.now();
  db.run('INSERT INTO files (name, data, type, size, createdAt) VALUES (?, ?, ?, ?, ?)', [name, buffer, type, size, createdAt], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Upload multiple (streaming) via multipart/form-data: champs name[] files[]
app.post('/api/files/multi', upload.array('files', 20), (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'No files' });
  const createdAt = Date.now();
  const stmt = db.prepare('INSERT INTO files (name, data, type, size, createdAt) VALUES (?, ?, ?, ?, ?)');
  try {
    db.serialize(() => {
      files.forEach(f => {
        stmt.run([f.originalname, f.buffer, f.mimetype, f.size, createdAt]);
      });
    });
  } finally {
    stmt.finalize();
  }
  res.json({ ok: true, count: files.length });
});

// Exporter la base SQLite (dump binaire data.db)
app.get('/api/export', (req, res) => {
  const dbPath = path.join(__dirname, 'data.db');
  if (!fs.existsSync(dbPath)) return res.status(404).json({ error: 'Database not found' });
  res.setHeader('Content-Type', 'application/x-sqlite3');
  res.setHeader('Content-Disposition', 'attachment; filename="data.db"');
  fs.createReadStream(dbPath).pipe(res);
});

// Renommer un fichier
app.patch('/api/files/:id', (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Missing name' });
  db.run('UPDATE files SET name = ? WHERE id = ?', [name, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });
});

// Supprimer un fichier
app.delete('/api/files/:id', (req, res) => {
  db.run('DELETE FROM files WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend listening on port ${PORT}`);
});
