// Client API pour communiquer avec le backend Express
// Par défaut, utilise le proxy Vite (BASE = '').
// En prod, définir VITE_API_URL pour pointer vers l'API publique.
const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || '';
let authToken = '';
export function setAuthToken(t) { authToken = t || ''; }
function authHeaders(extra = {}) { return authToken ? { ...extra, Authorization: `Bearer ${authToken}` } : extra; }

// --- Global 401 handler (auto-logout) ---
let onUnauthorized = () => {
  try { window.dispatchEvent(new CustomEvent('app:unauthorized')); } catch {}
};
export function setUnauthorizedHandler(fn) { if (typeof fn === 'function') onUnauthorized = fn; }
function handleUnauthorizedStatus(status) {
  if (status === 401) {
    try { authToken = ''; localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); } catch {}
    onUnauthorized();
    return true;
  }
  return false;
}
// Patch fetch once to detect 401 globally
if (typeof window !== 'undefined' && !window.__fetch401Patched) {
  try {
    const _origFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const res = await _origFetch(...args);
      const st = res?.status;
      if (handleUnauthorizedStatus(st) || handlePaymentRequiredStatus(st)) {
        // let callers handle the non-ok response; we just notified
      }
      return res;
    };
    window.__fetch401Patched = true;
  } catch {}
}

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

export async function apiListFiles(folderId, code) {
  const q = folderId != null ? `?folderId=${encodeURIComponent(folderId)}` : '';
  const headers = {};
  if (folderId != null && code) headers['x-folder-code'] = code;
  const r = await fetch(`${BASE}/api/files${q}`, { headers: { ...authHeaders(headers) } });
  if (!r.ok) throw new Error('API error');
  return r.json();
}

export async function apiGetFileBlob(id, code) {
  const headers = {};
  if (code) headers['x-folder-code'] = code;
  const r = await fetch(`${BASE}/api/files/${id}`, { headers: authHeaders(headers) });
  if (!r.ok) throw new Error('Not found');
  const blob = await r.blob();
  return blob;
}

export async function apiUploadFile(file) {
  const data = await toBase64(file);
  const body = { name: file.name, type: file.type, data };
  const r = await fetch(`${BASE}/api/files`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
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
    headers: authHeaders(),
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
      if (xhr.status === 401) {
        handleUnauthorizedStatus(401);
        reject(new Error('HTTP 401'));
        return;
      }
      if (xhr.status === 402) {
        handlePaymentRequiredStatus(402);
        reject(new Error('HTTP 401'));
        return;
      }
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
  headers: authHeaders({ 'Content-Type': 'application/json' }),
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
    headers: authHeaders(),
    onProgress,
  });
}

export async function apiRenameFile(id, name) {
  const r = await fetch(`${BASE}/api/files/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name }),
  });
  if (!r.ok) throw new Error('Rename failed');
  return r.json();
}

export async function apiDeleteFile(id) {
  const r = await fetch(`${BASE}/api/files/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!r.ok) throw new Error('Delete failed');
  return r.json();
}

export async function apiExportDatabase() {
  const r = await fetch(`${BASE}/api/export`, { headers: authHeaders() });
  if (!r.ok) throw new Error('Export failed');
  const blob = await r.blob();
  return blob;
}

// Folders API
export async function apiListFolders() {
  const r = await fetch(`${BASE}/api/folders`, { headers: authHeaders() });
  if (!r.ok) throw new Error('API error');
  return r.json();
}

export async function apiCreateFolder(name, parentId = null, isProtected = false, code) {
  const r = await fetch(`${BASE}/api/folders`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, parentId, protected: !!isProtected, code: isProtected ? code : undefined })
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
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ folderId })
  });
  if (!r.ok) throw new Error('Move failed');
  return r.json();
}

export async function apiMoveFiles(ids, folderId) {
  const r = await fetch(`${BASE}/api/files/move-bulk`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ids, folderId })
  });
  if (!r.ok) throw new Error('Move bulk failed');
  return r.json();
}

// Folder operations
export async function apiRenameFolder(id, name) {
  const r = await fetch(`${BASE}/api/folders/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name })
  });
  if (!r.ok) throw new Error('Rename folder failed');
  return r.json();
}

export async function apiSetFolderProtected(id, isProtected) {
  const r = await fetch(`${BASE}/api/folders/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ protected: !!isProtected })
  });
  if (!r.ok) throw new Error('Protect toggle failed');
  return r.json();
}

export async function apiDeleteFolder(id) {
  const r = await fetch(`${BASE}/api/folders/${id}`, { method: 'DELETE', headers: authHeaders() });
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

export async function apiUpdateFolder(id, payload) {
  const r = await fetch(`${BASE}/api/folders/${id}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload || {})
  });
  if (!r.ok) throw new Error('Update folder failed');
  return r.json();
}

// --- Payment required (402) handler ---
let onPaymentRequired = () => {
  try { window.dispatchEvent(new CustomEvent('app:payment-required')); } catch {}
};
export function setPaymentRequiredHandler(fn) { if (typeof fn === 'function') onPaymentRequired = fn; }

function handlePaymentRequiredStatus(status) {
  if (status === 402) {
    onPaymentRequired();
    return true;
  }
  return false;
}

// Auth client
export async function apiLogin(username, password) {
  const r = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  if (!r.ok) throw new Error('Login failed');
  const data = await r.json();
  setAuthToken(data.token);
  return data;
}
export async function apiChangePassword(currentPassword, newPassword) {
  const r = await fetch(`${BASE}/api/auth/change-password`, { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ currentPassword, newPassword }) });
  if (!r.ok) throw new Error('Change password failed');
  return r.json();
}
export async function apiListUsers() { const r = await fetch(`${BASE}/api/users`, { headers: authHeaders() }); if (!r.ok) throw new Error('Users list failed'); return r.json(); }
export async function apiCreateUser(username, password, isAdmin) { const r = await fetch(`${BASE}/api/users`, { method:'POST', headers: authHeaders({ 'Content-Type':'application/json' }), body: JSON.stringify({ username, password, isAdmin }) }); if (!r.ok) throw new Error('Create user failed'); return r.json(); }
export async function apiUpdateUser(id, payload) { const r = await fetch(`${BASE}/api/users/${id}`, { method:'PATCH', headers: authHeaders({ 'Content-Type':'application/json' }), body: JSON.stringify(payload || {}) }); if (!r.ok) throw new Error('Update user failed'); return r.json(); }
export async function apiDeleteUser(id) { const r = await fetch(`${BASE}/api/users/${id}`, { method:'DELETE', headers: authHeaders() }); if (!r.ok) throw new Error('Delete user failed'); return r.json(); }

// Subscription (admin)
export async function apiGetSubscription() {
  const r = await fetch(`${BASE}/api/subscription`, { headers: authHeaders() });
  if (!r.ok) throw new Error('Subscription fetch failed');
  return r.json();
}
export async function apiExtendSubscription(days = 30) {
  const r = await fetch(`${BASE}/api/subscription/extend`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ days })
  });
  if (!r.ok) throw new Error('Subscription extend failed');
  return r.json();
}

// Create checkout (admin)
export async function apiCreateSubscriptionCheckout(days = 30) {
  const r = await fetch(`${BASE}/api/subscription/checkout`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ days })
  });
  if (!r.ok) throw new Error('Subscription checkout failed');
  return r.json();
}
