// Simple IndexedDB wrapper using idb for storing files locally
import { openDB } from 'idb';

const DB_NAME = 'file-manager-db';
const STORE = 'files';

export async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    },
  });
}

// Data shape: { id, name, type, size, createdAt, blob }
export async function addFile({ name, type, size, blob }) {
  const db = await getDB();
  const createdAt = Date.now();
  const id = await db.add(STORE, { name, type, size, createdAt, blob });
  return { id, name, type, size, createdAt };
}

export async function getFiles() {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function deleteFile(id) {
  const db = await getDB();
  await db.delete(STORE, id);
}

export async function updateFileName(id, name) {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.store;
  const existing = await store.get(id);
  if (!existing) throw new Error('File not found');
  existing.name = name;
  await store.put(existing);
  await tx.done;
}

export async function getFileBlob(id) {
  const db = await getDB();
  const item = await db.get(STORE, id);
  if (!item) throw new Error('File not found');
  return item.blob;
}
