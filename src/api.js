// Client API pour communiquer avec le backend Express
// Par défaut, utilise le proxy Vite (BASE = '').
// En prod, définir VITE_API_URL pour pointer vers l'API publique.
const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '';

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || '');
      const base64 = res.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function apiListFiles() {
  const r = await fetch(`${BASE}/api/files`);
  if (!r.ok) throw new Error('API error');
  return r.json();
}

export async function apiGetFileBlob(id) {
  const r = await fetch(`${BASE}/api/files/${id}`);
  if (!r.ok) throw new Error('Not found');
  const blob = await r.blob();
  return blob;
}

export async function apiUploadFile(file) {
  const data = await toBase64(file);
  const body = { name: file.name, type: file.type, data };
  const r = await fetch(`${BASE}/api/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Upload failed');
  return r.json();
}

export async function apiUploadFiles(files) {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  const r = await fetch(`${BASE}/api/files/multi`, {
    method: 'POST',
    body: form,
  });
  if (!r.ok) throw new Error('Multi upload failed');
  return r.json();
}

export async function apiRenameFile(id, name) {
  const r = await fetch(`${BASE}/api/files/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!r.ok) throw new Error('Rename failed');
  return r.json();
}

export async function apiDeleteFile(id) {
  const r = await fetch(`${BASE}/api/files/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('Delete failed');
  return r.json();
}

export async function apiExportDatabase() {
  const r = await fetch(`${BASE}/api/export`);
  if (!r.ok) throw new Error('Export failed');
  const blob = await r.blob();
  return blob;
}
