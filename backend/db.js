// SQLite database setup
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

// Init schema
const init = () => {
  db.serialize(() => {
    // Pragmas for better reliability
    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA busy_timeout = 3000');
    db.run(`CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      data BLOB,
      type TEXT,
      size INTEGER,
      createdAt INTEGER,
      filepath TEXT,
      folderId INTEGER
    )`);
    // Dossiers
    db.run(`CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      createdAt INTEGER,
      parentId INTEGER,
      protected INTEGER DEFAULT 0,
      code TEXT
    )`);
    // Add missing columns if upgrading existing DB (ignore errors if already exist)
  db.run('ALTER TABLE files ADD COLUMN size INTEGER', () => {});
  db.run('ALTER TABLE files ADD COLUMN createdAt INTEGER', () => {});
  db.run('ALTER TABLE files ADD COLUMN filepath TEXT', () => {});
  db.run('ALTER TABLE files ADD COLUMN folderId INTEGER', () => {});
  db.run('ALTER TABLE folders ADD COLUMN parentId INTEGER', () => {});
  db.run('ALTER TABLE folders ADD COLUMN protected INTEGER DEFAULT 0', () => {});
  db.run('ALTER TABLE folders ADD COLUMN code TEXT', () => {});

    // Users table (authentication)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      passwordHash TEXT,
      salt TEXT,
      isAdmin INTEGER DEFAULT 0,
      createdAt INTEGER
    )`);

    // Settings key/value store (for subscription, etc.)
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // Payments table for subscription renewals (idempotent by providerTxId or invoiceId)
    db.run(`CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT,
      invoiceId TEXT UNIQUE,
      providerTxId TEXT UNIQUE,
      amount INTEGER,
      currency TEXT,
      status TEXT,
      days INTEGER,
      metadata TEXT,
      createdAt INTEGER,
      verifiedAt INTEGER
    )`);
    // Best-effort add columns on existing DBs (ignore errors if already exist)
    db.run('ALTER TABLE payments ADD COLUMN days INTEGER', () => {});
    db.run('ALTER TABLE payments ADD COLUMN metadata TEXT', () => {});
    db.run('ALTER TABLE payments ADD COLUMN verifiedAt INTEGER', () => {});

    // Seed subscription expiry if missing (default: now + 30 days)
    db.get('SELECT value FROM settings WHERE key = ?', ['subscription_expires_at'], (err, row) => {
      if (err) return; // ignore
      if (!row) {
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['subscription_expires_at', String(expiresAt)]);
      }
    });
    // Seed default admin if no users exist
    db.get('SELECT COUNT(*) as c FROM users', [], (err, row) => {
      if (err) return;
      if ((row?.c || 0) === 0) {
        try {
          const crypto = require('crypto');
          const username = process.env.ADMIN_USERNAME || 'Gilles';
          const password = process.env.ADMIN_PASSWORD || 'Gilles29@';
          const salt = crypto.randomBytes(16).toString('hex');
          const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
          const createdAt = Date.now();
          db.run('INSERT INTO users (username, passwordHash, salt, isAdmin, createdAt) VALUES (?, ?, ?, ?, ?)', [username, hash, salt, 1, createdAt]);
          // eslint-disable-next-line no-console
          console.log(`Seeded admin user '${username}' with default password.`);
        } catch {}
      }
    });
  });
};

init();

module.exports = db;
