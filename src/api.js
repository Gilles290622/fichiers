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

export async function apiListFiles(folderId) {
  const q = folderId != null ? `?folderId=${encodeURIComponent(folderId)}` : '';
  const r = await fetch(`${BASE}/api/files${q}`);
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

export async function apiUploadFiles(files, folderId) {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  if (folderId != null) form.append('folderId', String(folderId));
  const r = await fetch(`${BASE}/api/files/multi`, {
    method: 'POST',
    body: form,
  });
  if (!r.ok) throw new Error('Multi upload failed');
  return r.json();
}

// Progress-enabled uploads using XHR
function xhrRequest({ url, method = 'POST', body, headers = {}, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (evt) => {
      if (onProgress && evt.lengthComputable) {
        const pct = evt.total > 0 ? (evt.loaded / evt.total) * 100 : 0;
        onProgress({ loaded: evt.loaded, total: evt.total, percent: pct });
      } else if (onProgress) {
        onProgress({ loaded: evt.loaded || 0, total: evt.total || 0, percent: 0 });
      }
    };
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = xhr.responseText ? JSON.parse(xhr.responseText) : null;
          if (onProgress) onProgress({ loaded: 1, total: 1, percent: 100 });
          resolve(json);
        } catch (e) {
          resolve(null);
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(body);
  });
}

export async function apiUploadFileWithProgress(file, onProgress, folderId) {
  const data = await toBase64(file);
  const payload = JSON.stringify({ name: file.name, type: file.type, data, folderId });
  return xhrRequest({
    url: `${BASE}/api/files`,
    method: 'POST',
    body: payload,
    headers: { 'Content-Type': 'application/json' },
    onProgress,
  });
}

export async function apiUploadFilesWithProgress(files, onProgress, folderId) {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  if (folderId != null) form.append('folderId', String(folderId));
  return xhrRequest({
    url: `${BASE}/api/files/multi`,
    method: 'POST',
    body: form,
    onProgress,
  });
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

// Folders API
export async function apiListFolders() {
  const r = await fetch(`${BASE}/api/folders`);
  if (!r.ok) throw new Error('API error');
  return r.json();
}

export async function apiCreateFolder(name, parentId = null, isProtected = false) {
  const r = await fetch(`${BASE}/api/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentId, protected: !!isProtected })
  });
  if (!r.ok) {
    let msg = 'Create folder failed';
    try {
      const data = await r.json();
      if (data?.error) msg += `: ${data.error}`;
    } catch {
      try { msg += ` (HTTP ${r.status}) - ` + (await r.text()); } catch {}
    }
    throw new Error(msg);
  }
  return r.json();
}

export async function apiMoveFile(id, folderId) {
  const r = await fetch(`${BASE}/api/files/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderId })
  });
  if (!r.ok) throw new Error('Move failed');
  return r.json();
}

export async function apiMoveFiles(ids, folderId) {
  const r = await fetch(`${BASE}/api/files/move-bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, folderId })
  });
  if (!r.ok) throw new Error('Move bulk failed');
  return r.json();
}

// Folder operations
export async function apiRenameFolder(id, name) {
  const r = await fetch(`${BASE}/api/folders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!r.ok) throw new Error('Rename folder failed');
  return r.json();
}

export async function apiSetFolderProtected(id, isProtected) {
  const r = await fetch(`${BASE}/api/folders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ protected: !!isProtected })
  });
  if (!r.ok) throw new Error('Protect toggle failed');
  return r.json();
}

export async function apiDeleteFolder(id) {
  const r = await fetch(`${BASE}/api/folders/${id}`, { method: 'DELETE' });
  if (!r.ok) {
    try {
      const data = await r.json();
      const err = data?.error ? `: ${data.error}` : '';
      const e = new Error(`Delete folder failed (HTTP ${r.status})${err}`);
      e.status = r.status;
      throw e;
    } catch {
      let text = '';
      try { text = await r.text(); } catch {}
      const e = new Error(`Delete folder failed (HTTP ${r.status})${text ? ' - ' + text : ''}`);
      e.status = r.status;
      throw e;
    }
  }
  return r.json();
}
