import { addFile, deleteFile, getFileBlob, getFiles, updateFileName, exportDatabaseBlob, importDatabaseFromFile } from './sqlite'
import './App.css'

import { useEffect, useMemo, useState } from 'react'

function bytesToSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function timeAgo(date) {
  const d = typeof date === 'number' ? new Date(date) : new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `il y a ${diff}s`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `il y a ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days}j`;
  return d.toLocaleDateString();
}

function FileUploader({ onAdded }) {
  const onChange = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const blob = f;
      await addFile({ name: f.name, type: f.type, size: f.size, blob });
    }
    onAdded?.();
    e.target.value = '';
  };
  return (
    <label className="uploader">
      <input type="file" multiple onChange={onChange} style={{ display: 'none' }} />
      <span>➕ Uploader des fichiers</span>
    </label>
  );
}

function SearchBar({ query, setQuery }) {
  return (
    <input
      placeholder="Rechercher par nom ou type..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      className="search"
    />
  );
}

function ShareButtons({ file }) {
  const share = async () => {
    try {
      const blob = await getFileBlob(file.id);
      const fileForShare = new File([blob], file.name, { type: file.type || 'application/octet-stream' });
      if (navigator.canShare && navigator.canShare({ files: [fileForShare] })) {
        await navigator.share({ files: [fileForShare], title: file.name, text: 'Partagé depuis le gestionnaire' });
        return;
      }
    } catch {
      // fallthrough to URL-based share
    }
    // Fallback: download then open compose windows
    const blob = await getFileBlob(file.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    const text = `Je partage le fichier: ${file.name}. Il a été téléchargé sur mon appareil. Je te l'enverrai en pièce jointe.`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const mail = `mailto:?subject=${encodeURIComponent('Partage de fichier: ' + file.name)}&body=${encodeURIComponent(text)}`;
    window.open(wa, '_blank');
    setTimeout(() => window.open(mail, '_blank'), 400);
  };

  return (
    <button onClick={share} title="Partager">Partager</button>
  );
}

function FileRow({ file, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.name);

  const download = async () => {
    const blob = await getFileBlob(file.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const rename = async () => {
    if (!name.trim()) return;
    await updateFileName(file.id, name.trim());
    setEditing(false);
    onRefresh();
  };

  const del = async () => {
    if (!confirm('Supprimer ce fichier ?')) return;
    await deleteFile(file.id);
    onRefresh();
  };

  return (
    <tr>
      <td>{editing ? <input value={name} onChange={(e)=>setName(e.target.value)} /> : file.name}</td>
      <td>{file.type || '—'}</td>
      <td>{bytesToSize(file.size || 0)}</td>
      <td>{new Date(file.createdAt).toLocaleString()}</td>
      <td className="actions">
        <button onClick={download} title="Télécharger">⬇️</button>
        {editing ? (
          <>
            <button onClick={rename}>💾</button>
            <button onClick={()=>{setEditing(false); setName(file.name);}}>✖️</button>
          </>
        ) : (
          <button onClick={()=>setEditing(true)} title="Renommer">✏️</button>
        )}
        <button onClick={del} title="Supprimer">🗑️</button>
        <ShareButtons file={file} />
      </td>
    </tr>
  );
}

function FileList({ files, onRefresh }) {
  if (!files.length) return <p className="empty">Aucun fichier. Ajoutez-en avec le bouton ci-dessus.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Type</th>
            <th>Taille</th>
            <th>Ajouté</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <FileRow key={f.id} file={f} onRefresh={onRefresh} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Topbar({ onToggleSidebar, onOpenSettings }) {
  return (
    <header className="topbar">
      <button className="icon-btn" aria-label="Menu" onClick={onToggleSidebar}>☰</button>
      <div className="brand">Gestionnaire de fichiers</div>
      <button className="icon-btn" aria-label="Paramètres" onClick={onOpenSettings}>⚙️</button>
    </header>
  );
}

function Sidebar({ current, go }) {
  return (
    <aside className="sidebar">
      <nav>
        <button className={current==='dashboard'?'active':''} onClick={()=>go('dashboard')}>Tableau de bord</button>
        <button className={current==='files'?'active':''} onClick={()=>go('files')}>Fichiers</button>
        <button className={current==='settings'?'active':''} onClick={()=>go('settings')}>Paramètres</button>
      </nav>
    </aside>
  );
}

function Settings({ authed, setAuthed, onExport, onImport, pin, setPin }) {
  const [inputPin, setInputPin] = useState('');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('app_pin');
    if (!saved) localStorage.setItem('app_pin', pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authed) {
    return (
      <div className="card settings">
        <h3>Authentification requise</h3>
        <p>Entrez votre code PIN pour accéder aux paramètres.</p>
        <div className="pin-row">
          <input type="password" placeholder="Code PIN" value={inputPin} onChange={(e)=>setInputPin(e.target.value)} />
          <button onClick={()=>{
            const saved = localStorage.getItem('app_pin') || pin;
            if (inputPin === saved) setAuthed(true); else alert('PIN incorrect');
          }}>Se connecter</button>
        </div>
        <p className="hint">PIN par défaut: 1234 (modifiez-le après connexion)</p>
      </div>
    );
  }

  return (
    <div className="settings-grid">
      <div className="card">
        <h3>Base de données</h3>
        <div className="actions-row">
          <button onClick={onExport}>Exporter DB</button>
          <label className="uploader" title="Importer DB">
            <input type="file" accept=".sqlite,.db,application/x-sqlite3" style={{ display: 'none' }} onChange={onImport} />
            <span>Importer DB</span>
          </label>
        </div>
      </div>
      <div className="card">
        <h3>Sécurité</h3>
        <div className="pin-row">
          <input type="password" placeholder="Nouveau PIN" value={newPin} onChange={(e)=>setNewPin(e.target.value)} />
          <button onClick={()=>{
            const np = (newPin||'').trim();
            if (np.length < 4) { alert('PIN trop court (min 4)'); return; }
            localStorage.setItem('app_pin', np);
            setPin(np);
            setNewPin('');
            alert('PIN mis à jour');
          }}>Mettre à jour PIN</button>
        </div>
        <button onClick={()=>setAuthed(false)}>Se déconnecter</button>
      </div>
    </div>
  );
}

function FilesPage() {
  const [all, setAll] = useState([]);
  const [q, setQ] = useState('');

  const refresh = async () => {
    const list = await getFiles();
    setAll(list.map(({ id, name, type, size, createdAt }) => ({ id, name, type, size, createdAt })));
  };
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter(f =>
      (f.name?.toLowerCase()?.includes(s)) ||
      (f.type?.toLowerCase()?.includes(s))
    );
  }, [q, all]);

  return (
    <div className="container">
      <h2 className="title">Gestionnaire de fichiers</h2>
      <div className="toolbar">
        <FileUploader onAdded={refresh} />
        <SearchBar query={q} setQuery={setQ} />
      </div>
      <FileList files={filtered} onRefresh={refresh} />
    </div>
  );
}

function Sparkline({ values = [], width = 160, height = 36, stroke = '#1976d2' }) {
  const max = Math.max(1, ...values);
  const stepX = values.length > 1 ? (width - 4) / (values.length - 1) : width - 4;
  const points = values.map((v, i) => {
    const x = 2 + i * stepX;
    const y = height - 2 - (v / max) * (height - 6);
    return `${x},${y}`;
  });
  const path = points.length ? `M ${points[0]} L ${points.slice(1).join(' ')}` : '';
  const last = points.length ? points[points.length - 1].split(',').map(Number) : [0, 0];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline" aria-hidden preserveAspectRatio="none">
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={stroke} />
    </svg>
  );
}

function DashboardPage() {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    (async () => {
      const list = await getFiles();
      setFiles(list);
    })();
  }, []);

  const totalFiles = files.length;
  const totalSize = files.reduce((a, b) => a + (b.size || 0), 0);
  const avgSize = totalFiles ? totalSize / totalFiles : 0;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const millisInDay = 24 * 60 * 60 * 1000;
  const last7 = Array.from({ length: 7 }, (_, i) => startOfToday - (6 - i) * millisInDay);
  const counts7 = last7.map((dayStart) => {
    const dayEnd = dayStart + millisInDay;
    return files.filter(f => {
      const t = new Date(f.createdAt).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
  });
  const uploads7 = counts7.reduce((a, b) => a + b, 0);
  const recent = [...files].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  return (
    <div className="dashboard">
      <h2 className="title">Tableau de bord</h2>
      <div className="kpi-grid">
        <div className="kpi-card gradient-blue">
          <div className="kpi-label">Fichiers</div>
          <div className="kpi-value">{totalFiles}</div>
          <div className="kpi-sub">Total d'éléments</div>
        </div>
        <div className="kpi-card gradient-purple">
          <div className="kpi-label">Stockage utilisé</div>
          <div className="kpi-value">{bytesToSize(totalSize)}</div>
          <div className="kpi-sub">Taille cumulée</div>
        </div>
        <div className="kpi-card gradient-teal">
          <div className="kpi-label">Ajouts (7j)</div>
          <div className="kpi-value">{uploads7}</div>
          <div className="kpi-sub">Derniers 7 jours</div>
        </div>
        <div className="kpi-card gradient-amber">
          <div className="kpi-label">Taille moyenne</div>
          <div className="kpi-value">{bytesToSize(avgSize)}</div>
          <div className="kpi-sub">Par fichier</div>
        </div>
      </div>

      <div className="cards-grid">
        <div className="card card-spark">
          <div className="card-header">
            <h3>Tendance des ajouts (7j)</h3>
          </div>
          <div className="card-body spark-body">
            <Sparkline values={counts7} />
            <div className="spark-legend">
              {counts7.map((v, i) => (
                <span key={i}>{i === counts7.length - 1 ? 'Aujourd\'hui' : ''}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="card card-recent">
          <div className="card-header"><h3>Fichiers récents</h3></div>
          <ul className="recent-list">
            {recent.length === 0 && (<li className="muted">Aucun fichier pour l'instant.</li>)}
            {recent.map(f => (
              <li key={f.id} className="recent-item">
                <div className="recent-name" title={f.name}>{f.name}</div>
                <div className="recent-meta">{bytesToSize(f.size || 0)} • {timeAgo(f.createdAt)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'files' | 'settings'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState(localStorage.getItem('app_pin') || '1234');

  const go = (v) => { setView(v); setSidebarOpen(false); };

  const handleExport = async () => {
    const blob = await exportDatabaseBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fichiers.sqlite';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await importDatabaseFromFile(f);
      alert('Import réussi');
    } catch (err) {
      alert('Import échoué: ' + (err?.message || err));
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className={`layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <Topbar onToggleSidebar={()=>setSidebarOpen(s=>!s)} onOpenSettings={()=>go('settings')} />
      <div className="body">
        <Sidebar current={view} go={go} />
        <main className="content">
          {view === 'dashboard' && <DashboardPage />}
          {view === 'files' && <FilesPage />}
          {view === 'settings' && (
            <Settings authed={authed} setAuthed={setAuthed} onExport={handleExport} onImport={handleImport} pin={pin} setPin={setPin} />
          )}
        </main>
      </div>
    </div>
  );
}
 
