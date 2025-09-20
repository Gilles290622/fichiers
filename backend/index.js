// Simple Express backend
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const SUB_ENFORCE = process.env.SUB_ENFORCE === '0' ? false : true; // allow disabling in dev
const WAVE_WEBHOOK_SECRET = process.env.WAVE_WEBHOOK_SECRET || '';

app.use(cors());
// Raw body for webhook signature verification (must be before express.json)
app.use('/api/webhooks/wave', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Auth helpers
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
}
function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, username, isAdmin }
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
function adminRequired(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// Subscription enforcement
function subscriptionRequired(req, res, next) {
  if (!SUB_ENFORCE) return next();
  db.get('SELECT value FROM settings WHERE key = ?', ['subscription_expires_at'], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const expiresAt = row ? parseInt(row.value, 10) : 0;
    if (!expiresAt || Date.now() > expiresAt) {
      return res.status(402).json({ error: 'Subscription expired' });
    }
    next();
  });
}

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  db.get('SELECT id, username, passwordHash, salt, isAdmin FROM users WHERE username = ?', [username], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    const hash = hashPassword(password, row.salt);
    if (hash !== row.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: row.id, username: row.username, isAdmin: !!row.isAdmin }, JWT_SECRET, { expiresIn: '12h' });
    // Also return subscription status for UI convenience
    db.get('SELECT value FROM settings WHERE key = ?', ['subscription_expires_at'], (e2, srow) => {
      const expiresAt = srow ? parseInt(srow.value, 10) : 0;
      res.json({ token, user: { id: row.id, username: row.username, isAdmin: !!row.isAdmin }, subscription: { expiresAt } });
    });
  });
});

app.post('/api/auth/change-password', authRequired, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
  db.get('SELECT passwordHash, salt FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'User not found' });
    const curHash = hashPassword(currentPassword, row.salt);
    if (curHash !== row.passwordHash) return res.status(400).json({ error: 'Wrong current password' });
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(newPassword, salt);
    db.run('UPDATE users SET passwordHash = ?, salt = ? WHERE id = ?', [hash, salt, req.user.id], function(e2) {
      if (e2) return res.status(500).json({ error: e2.message });
      res.json({ ok: true });
    });
  });
});

// Admin: manage users
app.get('/api/users', authRequired, adminRequired, (req, res) => {
  db.all('SELECT id, username, isAdmin, createdAt FROM users ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Subscription endpoints
app.get('/api/subscription', authRequired, adminRequired, (req, res) => {
  db.get('SELECT value FROM settings WHERE key = ?', ['subscription_expires_at'], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const expiresAt = row ? parseInt(row.value, 10) : 0;
    res.json({ expiresAt });
  });
});
app.post('/api/subscription/extend', authRequired, adminRequired, (req, res) => {
  const days = Number(req.body?.days || 30);
  db.get('SELECT value FROM settings WHERE key = ?', ['subscription_expires_at'], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const current = row ? parseInt(row.value, 10) : Date.now();
    const base = isFinite(current) && current > Date.now() ? current : Date.now();
    const next = base + days * 24 * 60 * 60 * 1000;
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['subscription_expires_at', String(next)], (e2) => {
      if (e2) return res.status(500).json({ error: e2.message });
      res.json({ expiresAt: next });
    });
  });
});

// Create a checkout intent (frontend opens returned paymentUrl)
app.post('/api/subscription/checkout', authRequired, adminRequired, (req, res) => {
  const days = Number(req.body?.days || 30);
  const amount = Number(process.env.SUB_PRICE_AMOUNT || 50); // integer (e.g., XOF)
  const currency = process.env.SUB_PRICE_CURRENCY || 'XOF';
  const invoiceId = `SUB-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  const createdAt = Date.now();
  const provider = 'wave';
  // If you have Wave API to generate a link, call it here. For static link, append ref if supported.
  const baseLink = process.env.WAVE_PAYMENT_LINK || 'https://pay.wave.com/m/M_ci_y9beit5q7GUj/c/ci/?amount=5000';
  const paymentUrl = baseLink; // TODO: if Wave supports reference param, include invoiceId
  db.run(
    'INSERT INTO payments (provider, invoiceId, amount, currency, status, days, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [provider, invoiceId, amount, currency, 'pending', days, JSON.stringify({}), createdAt],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ invoiceId, paymentUrl, amount, currency, days });
    }
  );
});

// Webhook receiver for Wave
app.post('/api/webhooks/wave', (req, res) => {
  try {
    // Verify signature if provided by Wave. Placeholder: X-Signature header HMAC with secret over raw body
    const sig = req.get('X-Signature') || req.get('x-signature') || '';
    if (WAVE_WEBHOOK_SECRET) {
      const h = crypto.createHmac('sha256', WAVE_WEBHOOK_SECRET).update(req.body).digest('hex');
      if (sig && sig !== h) {
        return res.status(401).end();
      }
    }
    const text = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
    let payload = {};
    try { payload = JSON.parse(text); } catch {}
    // Expected fields (adapt to Wave format): status, amount, currency, txId, invoiceId/reference
    const status = payload.status || payload.event || 'unknown';
    // Map a few common status values
    const succeeded = /success|paid|succeeded/i.test(status);
    const providerTxId = payload.txId || payload.id || payload.transaction_id || null;
    const invoiceId = payload.invoiceId || payload.reference || (payload.metadata && payload.metadata.reference) || null;
    const amount = Number(payload.amount || payload.total || 0);
    const currency = payload.currency || 'XOF';
    if (!invoiceId) {
      // try soft-accept: don't process without invoiceId to avoid false positives
      return res.status(400).json({ error: 'Missing invoiceId/reference' });
    }
    if (!succeeded) {
      // Mark failed
      db.run('UPDATE payments SET status = ?, verifiedAt = ? WHERE invoiceId = ?', ['failed', Date.now(), invoiceId], () => res.json({ ok: true }));
      return;
    }
    // Idempotency: if providerTxId already exists, exit 200
    if (providerTxId) {
      db.get('SELECT id, status FROM payments WHERE providerTxId = ?', [providerTxId], (e0, row0) => {
        if (row0) return res.json({ ok: true });
        proceed();
      });
    } else {
      proceed();
    }
    function proceed() {
      db.get('SELECT * FROM payments WHERE invoiceId = ?', [invoiceId], (err, prow) => {
        if (err || !prow) return res.status(404).json({ error: 'Invoice not found' });
        // Optional: validate amount and currency
        if (prow.amount && amount && prow.amount !== amount) {
          // amount mismatch, reject
          return res.status(400).json({ error: 'Amount mismatch' });
        }
        if (prow.currency && currency && prow.currency !== currency) {
          return res.status(400).json({ error: 'Currency mismatch' });
        }
        const verifiedAt = Date.now();
        db.run('UPDATE payments SET status = ?, providerTxId = ?, verifiedAt = ? WHERE id = ?', ['succeeded', providerTxId || null, verifiedAt, prow.id], (e2) => {
          if (e2) return res.status(500).json({ error: e2.message });
          // Extend subscription by prow.days
          const days = Number(prow.days || 30);
          db.get('SELECT value FROM settings WHERE key = ?', ['subscription_expires_at'], (e3, srow) => {
            if (e3) return res.status(500).json({ error: e3.message });
            const current = srow ? parseInt(srow.value, 10) : Date.now();
            const base = isFinite(current) && current > Date.now() ? current : Date.now();
            const next = base + days * 24 * 60 * 60 * 1000;
            db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['subscription_expires_at', String(next)], (e4) => {
              if (e4) return res.status(500).json({ error: e4.message });
              res.json({ ok: true, expiresAt: next });
            });
          });
        });
      });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Webhook error' });
  }
});
app.post('/api/users', authRequired, adminRequired, (req, res) => {
  const { username, password, isAdmin } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const createdAt = Date.now();
  db.run('INSERT INTO users (username, passwordHash, salt, isAdmin, createdAt) VALUES (?, ?, ?, ?, ?)', [username, hash, salt, isAdmin ? 1 : 0, createdAt], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID, username, isAdmin: !!isAdmin, createdAt });
  });
});
app.patch('/api/users/:id', authRequired, adminRequired, (req, res) => {
  const id = Number(req.params.id);
  const { password, isAdmin } = req.body || {};
  const fields = [];
  const params = [];
  if (password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    fields.push('passwordHash = ?', 'salt = ?');
    params.push(hash, salt);
  }
  if (isAdmin != null) { fields.push('isAdmin = ?'); params.push(isAdmin ? 1 : 0); }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(id);
  db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });
});
app.delete('/api/users/:id', authRequired, adminRequired, (req, res) => {
  const id = Number(req.params.id);
  db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });
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
app.get('/api/folders', authRequired, subscriptionRequired, (req, res) => {
  db.all('SELECT id, name, createdAt, parentId, protected FROM folders ORDER BY createdAt DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Créer un dossier
app.post('/api/folders', authRequired, subscriptionRequired, (req, res) => {
  const { name, parentId, protected: prot, code } = req.body || {};
  const n = (name || '').trim();
  if (!n) return res.status(400).json({ error: 'Missing name' });
  const createdAt = Date.now();
  const protectedVal = prot ? 1 : 0;
  if (protectedVal) {
    if (!code || typeof code !== 'string' || code.length !== 4) {
      return res.status(400).json({ error: 'code must be 4 characters' });
    }
  }
  db.run('INSERT INTO folders (name, createdAt, parentId, protected, code) VALUES (?, ?, ?, ?, ?)', [n, createdAt, parentId || null, protectedVal, protectedVal ? String(code) : null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name: n, parentId: parentId || null, createdAt, protected: !!protectedVal });
  });
});

// Renommer/toggle protection d'un dossier
app.patch('/api/folders/:id', authRequired, subscriptionRequired, (req, res) => {
  const id = Number(req.params.id);
  const { name, protected: prot, code } = req.body || {};
  if (name == null && prot == null && code == null) return res.status(400).json({ error: 'Nothing to update' });
  const fields = [];
  const params = [];
  if (name != null) { fields.push('name = ?'); params.push(String(name)); }
  if (prot != null) { fields.push('protected = ?'); params.push(prot ? 1 : 0); }
  if (code !== undefined) {
    if (prot && (code == null || typeof code !== 'string' || code.length !== 4)) {
      return res.status(400).json({ error: 'code must be 4 characters' });
    }
    fields.push('code = ?'); params.push(code ? String(code) : null);
  }
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

app.delete('/api/folders/:id', authRequired, subscriptionRequired, (req, res) => {
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
app.get('/api/files', authRequired, subscriptionRequired, (req, res) => {
  const folderId = req.query.folderId ? Number(req.query.folderId) : null;
  const providedCode = req.get('x-folder-code');
  if (folderId != null) {
    db.get('SELECT protected, code FROM folders WHERE id = ?', [folderId], (e1, frow) => {
      if (e1) return res.status(500).json({ error: e1.message });
      if (!frow) return res.status(404).json({ error: 'Folder not found' });
      if (frow.protected) {
        if (!providedCode || typeof providedCode !== 'string' || providedCode.length !== 4 || providedCode !== frow.code) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
      db.all('SELECT id, name, type, size, createdAt, folderId FROM files WHERE folderId = ? ORDER BY createdAt DESC', [folderId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      });
    });
  } else {
    db.all('SELECT id, name, type, size, createdAt, folderId FROM files WHERE folderId IS NULL OR folderId NOT IN (SELECT id FROM folders WHERE protected = 1) ORDER BY createdAt DESC', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  }
});

// Téléchargement d'un fichier (stream si filepath, sinon BLOB) avec support Range
app.get('/api/files/:id', authRequired, subscriptionRequired, (req, res) => {
  const providedCode = req.get('x-folder-code');
  db.get('SELECT * FROM files WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Not found' });
    // Enforce protection if file is in a protected folder
    if (row.folderId) {
      db.get('SELECT protected, code FROM folders WHERE id = ?', [row.folderId], (e2, frow) => {
        if (e2) return res.status(500).json({ error: e2.message });
        if (frow && frow.protected) {
          if (!providedCode || typeof providedCode !== 'string' || providedCode.length !== 4 || providedCode !== frow.code) {
            return res.status(403).json({ error: 'Forbidden' });
          }
        }
        streamOrSend(row, req, res);
      });
      return;
    }
    streamOrSend(row, req, res);
  });
});

function streamOrSend(row, req, res) {
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
}

// Upload d'un fichier (JSON base64 legacy or multipart single file)
app.post('/api/files', authRequired, subscriptionRequired, (req, res) => {
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
app.post('/api/files/multi', authRequired, subscriptionRequired, upload.array('files'), (req, res) => {
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
app.patch('/api/files/:id/move', authRequired, subscriptionRequired, (req, res) => {
  const id = Number(req.params.id);
  const { folderId } = req.body || {};
  db.run('UPDATE files SET folderId = ? WHERE id = ?', [folderId || null, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });
});

// Déplacer plusieurs fichiers
app.post('/api/files/move-bulk', authRequired, subscriptionRequired, (req, res) => {
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
app.get('/api/export', authRequired, subscriptionRequired, (req, res) => {
  const dbPath = path.join(__dirname, 'data.db');
  if (!fs.existsSync(dbPath)) return res.status(404).json({ error: 'Database not found' });
  res.setHeader('Content-Type', 'application/x-sqlite3');
  res.setHeader('Content-Disposition', 'attachment; filename="data.db"');
  fs.createReadStream(dbPath).pipe(res);
});

// Renommer un fichier
app.patch('/api/files/:id', authRequired, subscriptionRequired, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Missing name' });
  db.run('UPDATE files SET name = ? WHERE id = ?', [name, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });
});

// Supprimer un fichier (supprime aussi le fichier disque si présent)
app.delete('/api/files/:id', authRequired, subscriptionRequired, (req, res) => {
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
