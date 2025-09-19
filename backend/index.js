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
const os = require('os');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_');
    cb(null, `${ts}__${safe}`);
  }
});
// Limite de taille configurable (MB) via .env MAX_UPLOAD_MB, défaut 1024 MB
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '1024', 10);
const upload = multer({ storage, limits: { fileSize: Math.max(1, MAX_UPLOAD_MB) * 1024 * 1024 } });

// Liste des dossiers
app.get('/api/folders', (req, res) => {
  db.all('SELECT id, name, createdAt, parentId, protected FROM folders ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Créer un dossier
app.post('/api/folders', (req, res) => {
  const { name, parentId, protected: prot } = req.body || {};
  const n = (name || '').trim();
  if (!n) return res.status(400).json({ error: 'Missing name' });
  const createdAt = Date.now();
  const protectedVal = prot ? 1 : 0;
  db.run('INSERT INTO folders (name, createdAt, parentId, protected) VALUES (?, ?, ?, ?)', [n, createdAt, parentId || null, protectedVal], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name: n, parentId: parentId || null, createdAt, protected: !!protectedVal });
  });
});

// Renommer/toggle protection d'un dossier
app.patch('/api/folders/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, protected: prot } = req.body || {};
  if (name == null && prot == null) return res.status(400).json({ error: 'Nothing to update' });
  const fields = [];
  const params = [];
  if (name != null) { fields.push('name = ?'); params.push(String(name)); }
  if (prot != null) { fields.push('protected = ?'); params.push(prot ? 1 : 0); }
  params.push(id);
  db.run(`UPDATE folders SET ${fields.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });
});

// Suppression récursive d'un dossier (sous-dossiers + fichiers)
function deleteFolderRecursive(folderId, cb) {
  // 1) Supprimer fichiers du dossier
  db.all('SELECT id, filepath FROM files WHERE folderId = ?', [folderId], (err, files) => {
    if (err) return cb(err);
    const removeFile = (file, done) => {
      if (file.filepath) {
        try { fs.unlinkSync(file.filepath); } catch {}
      }
      db.run('DELETE FROM files WHERE id = ?', [file.id], () => done());
    };
    let i = 0;
    const nextFile = () => {
      if (!files || i >= files.length) return afterFiles();
      const f = files[i++];
      removeFile(f, nextFile);
    };
    const afterFiles = () => {
      // 2) Traiter sous-dossiers
      db.all('SELECT id FROM folders WHERE parentId = ?', [folderId], (e2, subs) => {
        if (e2) return cb(e2);
        let j = 0;
        const nextFolder = () => {
          if (!subs || j >= subs.length) return afterFolders();
          const sub = subs[j++];
          deleteFolderRecursive(sub.id, (e3) => {
            if (e3) return cb(e3);
            nextFolder();
          });
        };
        const afterFolders = () => {
          // 3) Enfin supprimer le dossier lui-même
          db.run('DELETE FROM folders WHERE id = ?', [folderId], (e4) => cb(e4));
        };
        nextFolder();
      });
    };
    nextFile();
  });
}

app.delete('/api/folders/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  db.get('SELECT id FROM folders WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Folder not found' });
    // Begin transaction
    db.serialize(() => {
      db.run('BEGIN IMMEDIATE', (e1) => {
        if (e1) return res.status(500).json({ error: e1.message });
        deleteFolderRecursive(id, (eDel) => {
          if (eDel) {
            db.run('ROLLBACK', () => res.status(500).json({ error: eDel.message }));
          } else {
            db.run('COMMIT', (e2) => {
              if (e2) return res.status(500).json({ error: e2.message });
              res.json({ ok: true });
            });
          }
        });
      });
    });
  });
});

// Liste des fichiers (optionnellement filtrés par dossier)
app.get('/api/files', (req, res) => {
  const folderId = req.query.folderId ? Number(req.query.folderId) : null;
  const sql = folderId != null ?
    'SELECT id, name, type, size, createdAt, folderId FROM files WHERE folderId = ? ORDER BY createdAt DESC' :
    'SELECT id, name, type, size, createdAt, folderId FROM files ORDER BY createdAt DESC';
  const params = folderId != null ? [folderId] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Téléchargement d'un fichier (stream si filepath, sinon BLOB) avec support Range
app.get('/api/files/:id', (req, res) => {
  db.get('SELECT * FROM files WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Not found' });
    const ctype = row.type || 'application/octet-stream';
    if (row.filepath && fs.existsSync(row.filepath)) {
      try {
        const stat = fs.statSync(row.filepath);
        const fileSize = stat.size;
        const range = req.headers.range;
        if (range) {
          const match = /bytes=(\d*)-(\d*)/.exec(range);
          let start = match && match[1] ? parseInt(match[1], 10) : 0;
          let end = match && match[2] ? parseInt(match[2], 10) : fileSize - 1;
          if (isNaN(start)) start = 0;
          if (isNaN(end) || end >= fileSize) end = fileSize - 1;
          if (start >= fileSize || end < start) {
            res.status(416).set({ 'Content-Range': `bytes */${fileSize}` }).end();
            return;
          }
          const chunkSize = end - start + 1;
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': ctype,
          });
          const stream = fs.createReadStream(row.filepath, { start, end });
          stream.on('error', () => res.status(500).end());
          stream.pipe(res);
        } else {
          res.writeHead(200, {
            'Accept-Ranges': 'bytes',
            'Content-Length': fileSize,
            'Content-Type': ctype,
          });
          const stream = fs.createReadStream(row.filepath);
          stream.on('error', () => res.status(500).end());
          stream.pipe(res);
        }
      } catch (e) {
        res.status(500).json({ error: 'File read error' });
      }
    } else if (row.data) {
      res.set('Content-Type', ctype);
      res.send(row.data);
    } else {
      res.status(404).json({ error: 'Data not found' });
    }
  });
});

// Upload d'un fichier (JSON base64 legacy or multipart single file)
app.post('/api/files', (req, res) => {
  // if body contains base64 data (legacy)
  if (req.is('application/json')) {
    const { name, data, type, folderId } = req.body || {};
    if (!name || !data) return res.status(400).json({ error: 'Missing fields' });
    const buffer = Buffer.from(data, 'base64');
    const size = buffer.length;
    const createdAt = Date.now();
    db.run('INSERT INTO files (name, data, type, size, createdAt, folderId) VALUES (?, ?, ?, ?, ?, ?)', [name, buffer, type, size, createdAt, folderId || null], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
  } else {
    // Support multipart single file via field name 'file'
    const single = upload.single('file');
    single(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file' });
      const f = req.file;
      const createdAt = Date.now();
      const folderId = req.body?.folderId ? Number(req.body.folderId) : null;
      db.run('INSERT INTO files (name, data, type, size, createdAt, filepath, folderId) VALUES (?, ?, ?, ?, ?, ?, ?)', [f.originalname, null, f.mimetype, f.size, createdAt, f.path, folderId], function(e) {
        if (e) return res.status(500).json({ error: e.message });
        res.json({ id: this.lastID });
      });
    });
  }
});

// Upload multiple via multipart/form-data: field 'files'
app.post('/api/files/multi', upload.array('files'), (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'No files' });
  const createdAt = Date.now();
  const folderId = req.body?.folderId ? Number(req.body.folderId) : null;
  const stmt = db.prepare('INSERT INTO files (name, data, type, size, createdAt, filepath, folderId) VALUES (?, ?, ?, ?, ?, ?, ?)');
  try {
    db.serialize(() => {
      files.forEach(f => {
        stmt.run([f.originalname, null, f.mimetype, f.size, createdAt, f.path, folderId]);
      });
    });
  } finally {
    stmt.finalize();
  }
  res.json({ ok: true, count: files.length });
});

// Déplacer un fichier (changer de dossier)
app.patch('/api/files/:id/move', (req, res) => {
  const id = Number(req.params.id);
  const { folderId } = req.body || {};
  db.run('UPDATE files SET folderId = ? WHERE id = ?', [folderId || null, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });
});

// Déplacer plusieurs fichiers
app.post('/api/files/move-bulk', (req, res) => {
  const { ids, folderId } = req.body || {};
  const list = Array.isArray(ids) ? ids : [];
  if (!list.length) return res.status(400).json({ error: 'No ids' });
  const stmt = db.prepare('UPDATE files SET folderId = ? WHERE id = ?');
  try {
    db.serialize(() => { list.forEach(id => stmt.run([folderId || null, id])); });
  } finally { stmt.finalize(); }
  res.json({ ok: true, count: list.length });
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

// Supprimer un fichier (supprime aussi le fichier disque si présent)
app.delete('/api/files/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT filepath FROM files WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const removeRow = () => {
      db.run('DELETE FROM files WHERE id = ?', [id], function(e2) {
        if (e2) return res.status(500).json({ error: e2.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ ok: true });
      });
    };
    if (row && row.filepath) {
      fs.unlink(row.filepath, () => removeRow()); // ignore fs errors
    } else {
      removeRow();
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend listening on port ${PORT}`);
});
