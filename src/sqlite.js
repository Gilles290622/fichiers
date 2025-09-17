import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { openDB } from 'idb';

let sqlInitPromise;
let dbInstance; // SQL.Database
let SQLModule; // keep module to re-create DB on import

const IDB_NAME = 'sqlite-store';
const IDB_STORE = 'db';
const IDB_KEY = 'main';

async function getIDB() {
  return openDB(IDB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    },
  });
}

async function loadOrCreateDatabase(SQL) {
  const idb = await getIDB();
  const saved = await idb.get(IDB_STORE, IDB_KEY);
  if (saved && saved.byteLength) {
    return new SQL.Database(new Uint8Array(saved));
  }
  return new SQL.Database();
}

async function getSQL() {
  if (dbInstance) return dbInstance;
  if (!sqlInitPromise) {
    sqlInitPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => wasmUrl });
      SQLModule = SQL;
      const db = await loadOrCreateDatabase(SQL);
      // Schema
      db.exec(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT,
          size INTEGER,
          createdAt INTEGER,
          blob BLOB
        );
      `);
      dbInstance = db;
      return dbInstance;
    })();
  }
  return sqlInitPromise;
}

async function persist() {
  const db = await getSQL();
  const data = db.export(); // Uint8Array
  const idb = await getIDB();
  await idb.put(IDB_STORE, data, IDB_KEY);
}

export async function addFile({ name, type, size, blob }) {
  const db = await getSQL();
  // ensure Uint8Array
  let u8;
  if (blob instanceof Blob) {
    const buf = await blob.arrayBuffer();
    u8 = new Uint8Array(buf);
  } else if (blob instanceof Uint8Array) {
    u8 = blob;
  } else if (blob && blob.buffer) {
    u8 = new Uint8Array(blob.buffer);
  } else {
    u8 = new Uint8Array(0);
  }
  const createdAt = Date.now();
  const stmt = db.prepare('INSERT INTO files (name, type, size, createdAt, blob) VALUES (?, ?, ?, ?, ?);');
  stmt.run([name, type || null, size || 0, createdAt, u8]);
  stmt.free();
  const idRow = db.exec('SELECT last_insert_rowid() as id;');
  const id = idRow?.[0]?.values?.[0]?.[0] ?? null;
  await persist();
  return { id, name, type, size, createdAt };
}

export async function getFiles() {
  const db = await getSQL();
  const stmt = db.prepare('SELECT id, name, type, size, createdAt FROM files ORDER BY createdAt DESC;');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

export async function deleteFile(id) {
  const db = await getSQL();
  const stmt = db.prepare('DELETE FROM files WHERE id = ?;');
  stmt.run([id]);
  stmt.free();
  await persist();
}

export async function updateFileName(id, name) {
  const db = await getSQL();
  const stmt = db.prepare('UPDATE files SET name = ? WHERE id = ?;');
  stmt.run([name, id]);
  stmt.free();
  await persist();
}

export async function getFileBlob(id) {
  const db = await getSQL();
  const stmt = db.prepare('SELECT blob, type, name FROM files WHERE id = ?;');
  stmt.bind([id]);
  let row;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  if (!row) throw new Error('File not found');
  const data = row.blob instanceof Uint8Array ? row.blob : new Uint8Array(0);
  const type = row.type || 'application/octet-stream';
  return new Blob([data], { type });
}

// Optional: expose a manual save (not used directly)
export async function saveNow() { await persist(); }

// Export the whole database as a Blob
export async function exportDatabaseBlob() {
  const db = await getSQL();
  const u8 = db.export();
  return new Blob([u8], { type: 'application/x-sqlite3' });
}

// Import a database file and replace current
export async function importDatabaseFromFile(file) {
  if (!SQLModule) {
    await getSQL();
  }
  if (!SQLModule) throw new Error('SQL module not initialized');
  const buf = await file.arrayBuffer();
  const u8 = new Uint8Array(buf);
  // close existing db
  if (dbInstance?.close) {
    try { dbInstance.close(); } catch {}
  }
  const newDb = new SQLModule.Database(u8);
  newDb.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT,
      size INTEGER,
      createdAt INTEGER,
      blob BLOB
    );
  `);
  dbInstance = newDb;
  await persist();
  return true;
}
