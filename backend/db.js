// SQLite database setup
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(DB_PATH);

// Init schema
const init = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      data BLOB,
      type TEXT,
      size INTEGER,
      createdAt INTEGER
    )`);
    // Add missing columns if upgrading existing DB (ignore errors if already exist)
    db.run('ALTER TABLE files ADD COLUMN size INTEGER', () => {});
    db.run('ALTER TABLE files ADD COLUMN createdAt INTEGER', () => {});
  });
};

init();

module.exports = db;
