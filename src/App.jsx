// Remplace les appels locale DB par l'API backend
import { apiListFiles, apiGetFileBlob, apiUploadFile, apiDeleteFile, apiRenameFile, apiUploadFiles, apiExportDatabase, apiUploadFileWithProgress, apiUploadFilesWithProgress, apiListFolders, apiCreateFolder, apiMoveFile, apiMoveFiles } from './api'
import './App.css'

import { useEffect, useMemo, useState } from 'react'
import { EmailIcon, PsdIcon, ImageIcon, VideoIcon, AudioIcon, ArchiveIcon, TextIcon, DefaultFileIcon, DownloadIcon, UploadIcon, InfoIcon, FolderIcon, SettingsGearIcon, EyeIcon, PencilIcon, SaveIcon, CancelIcon, TrashIcon } from './icons'
import { WhatsAppBrandIcon, PdfBrandIcon, PhotoshopBrandIcon } from './brandIcons'
import { WordLocalIcon, ExcelLocalIcon, PowerPointLocalIcon, WinRARLocalIcon } from './brandLocal'

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

function FileUploader({ onAdded, folderId }) {
  const [uploading, setUploading] = useState(false);
  const [percent, setPercent] = useState(0);

  const onChange = async (e) => {
    const files = Array.from(e.target.files || []);
    try {
      if (!files.length) return;
      setUploading(true);
      setPercent(0);
      // Always use multipart/form-data route (more robust for media)
  await apiUploadFilesWithProgress(files, (p) => setPercent(Math.round(p?.percent || 0)), folderId);
      onAdded?.();
    } finally {
      setTimeout(() => setPercent(0), 400);
      setUploading(false);
      e.target.value = '';
    }
  };
  return (
    <label className="uploader" style={{ pointerEvents: uploading ? 'none' : 'auto', opacity: uploading ? 0.8 : 1 }}>
      <input type="file" multiple onChange={onChange} style={{ display: 'none' }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <UploadIcon />
        {uploading ? `Envoi... ${percent}%` : 'Uploader des fichiers'}
      </span>
      {uploading && (
        <div className="upload-progress" aria-label="Progression de l'envoi" title={`Envoi ${percent}%`}>
          <div className="bar" style={{ width: `${percent}%` }} />
        </div>
      )}
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
  const shareWhatsApp = async () => {
    const text = `Je partage le fichier: ${file.name}. Je te l'enverrai via WhatsApp ou en pièce jointe si besoin.`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, '_blank');
  };

  const shareEmail = async () => {
    const subject = `Partage de fichier: ${file.name}`;
    const body = `Je partage le fichier: ${file.name}.\n\nSi besoin, je te l'enverrai en pièce jointe.`;
    const mail = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mail, '_blank');
  };

  return (
    <span className="share-buttons">
  <button onClick={shareWhatsApp} title="Partager via WhatsApp" aria-label="Partager via WhatsApp" className="icon-btn brand whatsapp"><WhatsAppBrandIcon /></button>
  <button onClick={shareEmail} title="Partager par e-mail" aria-label="Partager par e-mail" className="icon-btn email"><EmailIcon /></button>
    </span>
  );
}

function TypeBadge({ type, name }) {
  const lower = (type || '').toLowerCase();
  const ext = (name || '').toLowerCase().split('.').pop();

  const byExt = (e) => {
    if (!e) return null;
    if (["jpg","jpeg","png","gif","webp","bmp","svg","heic"].includes(e)) return { icon: '🖼️', label: 'Image' };
    if (["mp4","mov","webm","mkv","avi"].includes(e)) return { icon: '🎥', label: 'Vidéo' };
    if (["mp3","wav","ogg","flac","m4a"].includes(e)) return { icon: '🎵', label: 'Audio' };
    if (["pdf"].includes(e)) return { icon: '📕', label: 'PDF' };
    if (e === 'rar') return { icon: '🗜️', label: 'RAR' };
    if (["zip","7z","gz","tar"].includes(e)) return { icon: '🗜️', label: 'Archive' };
    if (["doc","docx"].includes(e)) return { icon: '📄', label: 'DOC' };
    if (["xls","xlsx","csv"].includes(e)) return { icon: '📊', label: 'Feuille' };
    if (["ppt","pptx"].includes(e)) return { icon: '📽️', label: 'Diapo' };
    if (["sqlite","db"].includes(e)) return { icon: '🗃️', label: 'Base' };
    if (["txt","md","json","log"].includes(e)) return { icon: '📝', label: 'Texte' };
    return null;
  };

  const info = (() => {
    if (lower.startsWith('image/')) return { Icon: ImageIcon, label: 'Image' };
    if (lower.startsWith('video/')) return { Icon: VideoIcon, label: 'Vidéo' };
    if (lower.startsWith('audio/')) return { Icon: AudioIcon, label: 'Audio' };
  if (lower === 'application/pdf') return { Icon: PdfBrandIcon, label: 'PDF' };
  if (lower.includes('rar')) return { Icon: ArchiveIcon, label: 'RAR' };
  if (lower.includes('zip') || lower.includes('7z')) return { Icon: ArchiveIcon, label: 'Archive' };
  if (lower.includes('word') || lower.includes('msword') || lower.includes('officedocument.wordprocessingml')) return { Icon: WordLocalIcon, label: 'Word' };
  if (lower.includes('excel') || lower.includes('spreadsheet') || lower.includes('csv') || lower.includes('officedocument.spreadsheetml')) return { Icon: ExcelLocalIcon, label: 'Excel' };
  if (lower.includes('powerpoint') || lower.includes('officedocument.presentationml')) return { Icon: PowerPointLocalIcon, label: 'PowerPoint' };
  if (lower.includes('photoshop') || ext === 'psd') return { Icon: PhotoshopBrandIcon, label: 'PSD' };
    if (lower.includes('sqlite')) return { Icon: DefaultFileIcon, label: 'Base' };
    if (lower.startsWith('text/')) return { Icon: TextIcon, label: 'Texte' };
    const extInfo = byExt(ext);
    if (extInfo) {
      const map = { 'Image': ImageIcon, 'Vidéo': VideoIcon, 'Audio': AudioIcon, 'PDF': PdfBrandIcon, 'Archive': ArchiveIcon, 'DOC': WordLocalIcon, 'Feuille': ExcelLocalIcon, 'Diapo': PowerPointLocalIcon, 'Base': DefaultFileIcon, 'Texte': TextIcon, 'RAR': WinRARLocalIcon };
      return { Icon: map[extInfo.label] || DefaultFileIcon, label: extInfo.label };
    }
    return { Icon: DefaultFileIcon, label: type || 'Fichier' };
  })();

  const I = info.Icon || DefaultFileIcon;
  return (
    <span className="type-badge" title={type || info.label} aria-label={info.label}>
      <I />
      <span className="label">{info.label}</span>
    </span>
  );
}

function FileRow({ index, file, onRefresh, onPreview }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.name);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [dest, setDest] = useState(''); // string id or '' for root
  const [folders, setFolders] = useState([]);

  const download = async () => {
    const blob = await apiGetFileBlob(file.id);
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
  await apiRenameFile(file.id, name.trim());
    setEditing(false);
    onRefresh();
  };

  const del = async () => {
    setConfirmOpen(true);
  };

  const preview = async () => {
    onPreview?.(file);
    setOpen(false);
  };

  const doShareWhatsApp = () => {
    const text = `Je partage le fichier: ${file.name}. Je te l'enverrai via WhatsApp ou en pièce jointe si besoin.`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, '_blank');
    setOpen(false);
  };

  const doShareEmail = () => {
    const subject = `Partage de fichier: ${file.name}`;
    const body = `Je partage le fichier: ${file.name}.\n\nSi besoin, je te l'enverrai en pièce jointe.`;
    const mail = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mail, '_blank');
    setOpen(false);
  };

  const openMove = async () => {
    const fs = await apiListFolders();
    setFolders(fs);
    setDest('');
    setMoveOpen(true);
    setOpen(false);
  };

  const confirmMove = async () => {
    const folderId = dest ? Number(dest) : null;
    await apiMoveFile(file.id, folderId);
    setMoveOpen(false);
    onRefresh?.();
  };

  return (
    <>
    <tr>
      <td className="col-index">{(index ?? 0) + 1}</td>
      <td>
        {editing ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value)}
              onKeyDown={(e)=>{
                if (e.key === 'Enter') rename();
                if (e.key === 'Escape') { setEditing(false); setName(file.name); }
              }}
              style={{ minWidth: 180, maxWidth: 360 }}
              autoFocus
            />
            <button className="icon-btn" title="Enregistrer" onClick={rename}><SaveIcon /></button>
            <button className="icon-btn" title="Annuler" onClick={()=>{ setEditing(false); setName(file.name); }}><CancelIcon /></button>
          </span>
        ) : (
          file.name
        )}
      </td>
  <td><TypeBadge type={file.type} name={file.name} /></td>
      <td>{bytesToSize(file.size || 0)}</td>
      <td>{new Date(file.createdAt).toLocaleString()}</td>
      <td className="actions" style={{ position: 'relative' }}>
        <button onClick={()=>setOpen(o=>!o)} title="Actions" className="icon-btn"><InfoIcon /></button>
        {open && (
          <div className="popover-menu" role="menu" onMouseLeave={()=>setOpen(false)}>
            <button onClick={preview} role="menuitem"><span className="mi"><EyeIcon /></span> Ouvrir</button>
            <button onClick={download} role="menuitem"><span className="mi"><DownloadIcon /></span> Télécharger</button>
            {editing ? (
              <>
                <button onClick={rename} role="menuitem"><span className="mi"><SaveIcon /></span> Enregistrer le nom</button>
                <button onClick={()=>{setEditing(false); setName(file.name);}} role="menuitem"><span className="mi"><CancelIcon /></span> Annuler renommage</button>
              </>
            ) : (
              <button onClick={()=>{setEditing(true); setOpen(false);}} role="menuitem"><span className="mi rename"><PencilIcon /></span> Renommer</button>
            )}
            <button onClick={openMove} role="menuitem"><span className="mi"><FolderIcon /></span> Déplacer…</button>
            <button onClick={del} role="menuitem"><span className="mi danger"><TrashIcon /></span> Supprimer</button>
            <div className="separator"/>
            <button onClick={doShareWhatsApp} role="menuitem"><span className="mi"><WhatsAppBrandIcon /></span> Partager WhatsApp</button>
            <button onClick={doShareEmail} role="menuitem"><span className="mi"><EmailIcon /></span> Partager e-mail</button>
          </div>
        )}
      </td>
    </tr>
    {moveOpen && (
      <div className="modal-overlay" onClick={()=>setMoveOpen(false)}>
        <div className="modal" onClick={(e)=>e.stopPropagation()}>
          <div className="modal-header">
            <strong>Déplacer le fichier</strong>
            <button className="icon-btn" onClick={()=>setMoveOpen(false)}>✖️</button>
          </div>
          <div className="modal-body">
            <label>Choisir le dossier de destination</label>
            <select value={dest} onChange={(e)=>setDest(e.target.value)}>
              <option value="">Racine (sans dossier)</option>
              {folders.map(f => (
                <option key={f.id} value={String(f.id)}>{f.name}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={()=>setMoveOpen(false)}>Annuler</button>
              <button onClick={confirmMove}>Déplacer</button>
            </div>
          </div>
        </div>
      </div>
    )}
    {confirmOpen && (
      <div className="modal-overlay" onClick={()=>setConfirmOpen(false)}>
        <div className="modal" onClick={(e)=>e.stopPropagation()}>
          <div className="modal-header">
            <strong>Confirmer la suppression</strong>
            <button className="icon-btn" onClick={()=>setConfirmOpen(false)}>✖️</button>
          </div>
          <div className="modal-body">
            <p>Voulez-vous vraiment supprimer « {file.name} » ? Cette action est définitive.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={()=>setConfirmOpen(false)}>Annuler</button>
              <button style={{ background: '#e53935', color: '#fff', borderColor: '#e53935' }} onClick={async ()=>{ await apiDeleteFile(file.id); setConfirmOpen(false); onRefresh(); }}>Supprimer</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function FileList({ files, onRefresh, onPreview }) {
  if (!files.length) return <p className="empty">Aucun fichier. Ajoutez-en avec le bouton ci-dessus.</p>;
  const needsScroll = files.length > 10;
  return (
    <div className={`table-wrap ${needsScroll ? 'scroll' : ''}`}>
      <table className="table">
        <thead>
          <tr>
            <th className="col-index">N°</th>
            <th>Nom</th>
            <th>Type</th>
            <th>Taille</th>
            <th>Ajouté</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f, idx) => (
            <FileRow key={f.id} index={idx} file={f} onRefresh={onRefresh} onPreview={onPreview} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewModal({ open, onClose, file, source }) {
  // source: { blob, url, arrayBuffer }
  const [htmlTable, setHtmlTable] = useState('');
  const [textContent, setTextContent] = useState('');
  useEffect(() => {
    if (!open) return;
    setHtmlTable('');
    setTextContent('');
  }, [open]);

  // Compute safely even when file/source are not yet defined, to keep hooks order stable
  const ext = (file?.name || '').toLowerCase().split('.').pop();
  const type = (file?.type || '').toLowerCase();

  const isImage = type.startsWith('image/');
  const isPdf = type === 'application/pdf' || ext === 'pdf';
  const isAudio = type.startsWith('audio/');
  const isVideo = type.startsWith('video/');
  const isText = type.startsWith('text/') || ['txt','log','md','json','csv'].includes(ext);
  const isDocx = ext === 'docx';
  const isXlsx = ext === 'xlsx' || ext === 'xls' || ext === 'csv';
  const isPptx = ext === 'pptx' || ext === 'ppt';

  // Render helpers for docx/xlsx
  useEffect(() => {
    (async () => {
      if (!open) return;
      if (isText) {
        try {
          const t = await source.blob.text();
          setTextContent(t);
        } catch {}
      }
      if (isDocx) {
        try {
          const { renderAsync } = await import('docx-preview');
          const container = document.getElementById('docx-container');
          if (container) {
            container.innerHTML = '';
            await renderAsync(await source.blob.arrayBuffer(), container, undefined, { className: 'docx' });
          }
        } catch (e) {
          setTextContent('Prévisualisation DOCX non disponible: ' + (e?.message || e));
        }
      }
      if (isXlsx) {
        try {
          const mod = await import('xlsx');
          const XLSX = mod?.default ?? mod;
          const data = await source.blob.arrayBuffer();
          const wb = XLSX.read(data, { type: 'array' });
          const first = wb.SheetNames?.[0];
          if (!first) throw new Error('Aucune feuille trouvée');
          const ws = wb.Sheets[first];
          const html = XLSX.utils.sheet_to_html(ws);
          setHtmlTable(html);
        } catch (e) {
          setTextContent('Aperçu tableur non disponible: ' + (e?.message || e));
        }
      }
    })();
  }, [open, isText, isDocx, isXlsx, source]);

  // Only after all hooks are declared, guard rendering
  if (!open || !file || !source) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-header">
          <strong>{file.name}</strong>
          <button className="icon-btn" onClick={onClose}>✖️</button>
        </div>
        <div className="modal-body">
          {isImage && (<img src={source.url} alt={file.name} style={{maxWidth:'100%',height:'auto'}} />)}
          {isPdf && (<iframe src={source.url} title={file.name} style={{width:'100%',height:'70vh',border:'none'}} />)}
          {isAudio && (<audio src={source.url} controls style={{width:'100%'}} />)}
          {isVideo && (<video src={source.url} controls style={{width:'100%'}} />)}
          {isText && !isXlsx && !isDocx && (
            <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{textContent || '...'}</pre>
          )}
          {isDocx && (<div id="docx-container" className="docx-container" />)}
          {isXlsx && htmlTable && (
            <div className="table-preview" dangerouslySetInnerHTML={{ __html: htmlTable }} />
          )}
          {isPptx && (
            <div className="muted">Aperçu PowerPoint non pris en charge. Utilisez Télécharger pour ouvrir dans PowerPoint.</div>
          )}
          {!isImage && !isPdf && !isAudio && !isVideo && !isText && !isDocx && !isXlsx && !isPptx && (
            <div className="muted">Aperçu non pris en charge pour ce type de fichier.</div>
          )}
        </div>
      </div>
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
        <button className={current==='files'?'active':''} onClick={()=>go('files')}><span style={{display:'inline-flex',alignItems:'center',gap:8}}><FolderIcon /> Fichiers</span></button>
        <button className={current==='folders'?'active':''} onClick={()=>go('folders')}><span style={{display:'inline-flex',alignItems:'center',gap:8}}><FolderIcon /> Dossiers</span></button>
        <button className={current==='settings'?'active':''} onClick={()=>go('settings')}><span style={{display:'inline-flex',alignItems:'center',gap:8}}><SettingsGearIcon /> Paramètres</span></button>
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
      </div>
    );
  }

  return (
    <>
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

      {/* Tableau de bord inclus et protégé (visible uniquement après authentification) */}
      <div style={{ marginTop: '1rem' }}>
        <DashboardPage />
      </div>
    </>
  );
}

function FilesPage() {
  const [all, setAll] = useState([]);
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState({ open: false, file: null, source: null });

  const refresh = async () => {
  const list = await apiListFiles();
    setAll(list.map(({ id, name, type, size, createdAt }) => ({ id, name, type, size: size || 0, createdAt: createdAt || Date.now() })));
  };
  useEffect(() => { refresh(); }, []);

  // Today window
  const startOfToday = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }, []);
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) {
      // By default show only files added today
      return all.filter(f => {
        const t = new Date(f.createdAt).getTime();
        return t >= startOfToday && t < endOfToday;
      });
    }
    // When searching, search across all files
    return all.filter(f =>
      (f.name?.toLowerCase()?.includes(s)) ||
      (f.type?.toLowerCase()?.includes(s))
    );
  }, [q, all, startOfToday, endOfToday]);

  // Storage usage (circular progress)
  const totalBytes = useMemo(() => all.reduce((acc, f) => acc + (f.size || 0), 0), [all]);
  const quotaMb = (() => {
    const raw = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_STORAGE_QUOTA_MB) || '';
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 1024; // default 1024 MB
  })();
  const quotaBytes = quotaMb * 1024 * 1024;
  const quotaGbStr = (() => {
    const gb = quotaMb / 1024;
    if (!isFinite(gb) || gb <= 0) return '1 Go';
    // Format: 2 décimales sous 10 Go, entier au-delà
    return gb >= 10 ? `${gb.toFixed(0)} Go` : `${gb.toFixed(2)} Go`;
  })();
  const pct = Math.max(0, Math.min(100, quotaBytes > 0 ? (totalBytes / quotaBytes) * 100 : 0));

  const bytesToHuman = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const CircularProgress = ({ size = 40, stroke = 6, value = 0 }) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const off = c - (Math.max(0, Math.min(100, value)) / 100) * c;
    // color by threshold
    const color = value >= 90 ? '#e53935' : value >= 70 ? '#fb8c00' : '#1e88e5';
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="cprog" aria-label={`Utilisation ${value.toFixed(0)}%`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e6eef7" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size*0.32} fill="#213547">{Math.round(value)}%</text>
      </svg>
    );
  };

  return (
    <div className="container">
      <h2 className="title">Gestionnaire de fichiers</h2>
      <div className="toolbar">
        <FileUploader onAdded={refresh} />
        <SearchBar query={q} setQuery={setQ} />
        <div className="storage-widget" title={`Stockage: ${bytesToHuman(totalBytes)} / ${quotaGbStr}`}>
          <CircularProgress value={pct} />
          <div className="storage-text">
            <div className="label">Stockage</div>
            <div className="value">{bytesToHuman(totalBytes)} / {quotaGbStr}</div>
          </div>
        </div>
      </div>
      <div className="muted" style={{marginBottom:'0.5rem', fontSize:12}}>Affichage: fichiers ajoutés aujourd'hui. Utilisez la recherche pour retrouver les autres.</div>
      <FileList files={filtered} onRefresh={refresh} onPreview={async (file) => {
        try {
          const blob = await apiGetFileBlob(file.id);
          const url = URL.createObjectURL(blob);
          setPreview({ open: true, file, source: { blob, url } });
        } catch (e) {
          alert('Impossible d\'ouvrir: ' + (e?.message || e));
        }
      }} />
      <PreviewModal open={preview.open} file={preview.file} source={preview.source} onClose={()=>{
        if (preview.source?.url) URL.revokeObjectURL(preview.source.url);
        setPreview({ open: false, file: null, source: null });
      }} />
    </div>
  );
}

function FoldersPage() {
  const [folders, setFolders] = useState([]);
  const [current, setCurrent] = useState(null); // current folderId
  const [all, setAll] = useState([]);
  const [newName, setNewName] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [path, setPath] = useState([]); // breadcrumb: array of {id,name}

  const refreshFolders = async () => {
    const fs = await apiListFolders();
    setFolders(fs);
    // Ensure breadcrumb is consistent
    if (current == null) setPath([]);
  };
  const refreshFiles = async () => {
    const list = await apiListFiles(current != null ? current : undefined);
    const scoped = current == null ? list.filter(f => (f.folderId ?? null) === null) : list;
    setAll(scoped.map(({ id, name, type, size, createdAt }) => ({ id, name, type, size: size || 0, createdAt: createdAt || Date.now() })));
  };
  useEffect(() => { refreshFolders(); }, []);
  useEffect(() => { refreshFiles(); }, [current]);

  const createFolder = async () => {
    const n = newName.trim();
    if (!n) return;
    // create under current folder
    const parentId = current ?? null;
    await apiCreateFolder(n, parentId);
    setNewName('');
    setCreateOpen(false);
    await refreshFolders();
    // Stay in the same folder and show new list
    await refreshFiles();
  };

  // Compute child folders of the current folder
  const childFolders = (folders || []).filter(f => (f.parentId ?? null) === (current ?? null));

  const goTo = (folder) => {
    const id = folder?.id ?? null;
    setCurrent(id);
    if (id == null) {
      setPath([]);
    } else {
      // rebuild breadcrumb from root
      const chain = [];
      let cur = folder;
      while (cur) {
        chain.unshift({ id: cur.id, name: cur.name });
        cur = folders.find(x => x.id === cur.parentId);
      }
      setPath(chain);
    }
  };

  return (
    <div className="container">
      <h2 className="title">Dossiers</h2>
      <div className="toolbar" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button onClick={()=>setCreateOpen(true)}>Nouveau dossier</button>
        <div className="breadcrumb" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <button className="icon-btn" onClick={()=>goTo(null)} title="Racine">🏠</button>
          {path.map((p, i) => (
            <span key={p.id} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span>/</span>
              <button className="icon-btn" onClick={()=>goTo(folders.find(f=>f.id===p.id))}>{p.name}</button>
            </span>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', opacity: 0.7 }}>Dossier courant: {folders.find(f=>f.id===current)?.name || 'Racine'}</div>
      </div>

      {/* Grille des sous-dossiers */}
      <div className="folder-grid">
        {childFolders.length === 0 && (<div className="muted">Aucun sous-dossier.</div>)}
        {childFolders.map(fd => (
          <div key={fd.id} className="folder-card" onDoubleClick={()=>goTo(fd)} title="Ouvrir">
            <div className="folder-icon">📁</div>
            <div className="folder-name" title={fd.name}>{fd.name}</div>
          </div>
        ))}
      </div>

      {/* Fichiers du dossier courant */}
      <h3 style={{ marginTop: '1rem' }}>Fichiers</h3>
      <FileList files={all} onRefresh={refreshFiles} onPreview={async (file) => {
        try {
          const blob = await apiGetFileBlob(file.id);
          const url = URL.createObjectURL(blob);
          // Reuse PreviewModal of FilesPage by opening a new modal? For now, simple download to keep page small.
          const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        } catch (e) { alert('Impossible d\'ouvrir: ' + (e?.message || e)); }
      }} />

      {createOpen && (
        <div className="modal-overlay" onClick={()=>setCreateOpen(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <strong>Nouveau dossier</strong>
              <button className="icon-btn" onClick={()=>setCreateOpen(false)}>✖️</button>
            </div>
            <div className="modal-body">
              <label>Nom du dossier</label>
              <input value={newName} onChange={(e)=>setNewName(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') createFolder(); }} autoFocus />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={()=>setCreateOpen(false)}>Annuler</button>
                <button onClick={createFolder}>Créer</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
      const list = await apiListFiles();
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
  const [view, setView] = useState('files'); // 'files' | 'folders' | 'settings'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const defaultPin = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEFAULT_PIN) || 'Gilles29@';
  const [pin, setPin] = useState(localStorage.getItem('app_pin') || defaultPin);

  // Initialise/maj du PIN si non défini ou encore à l'ancienne valeur par défaut
  useEffect(() => {
    const saved = localStorage.getItem('app_pin');
    if (!saved || saved === '1234') {
      localStorage.setItem('app_pin', defaultPin);
      setPin(defaultPin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Astuce PIN par défaut visible dans les paramètres après authentification.

  const go = (v) => { setView(v); setSidebarOpen(false); };

  const handleExport = async () => {
    try {
      const blob = await apiExportDatabase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'data.db';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export échoué: ' + (e?.message || e));
    }
  };

  const handleImport = async (e) => {
    alert("Import DB désactivé (source de vérité côté serveur). Utilisez l'API ou un outil SQLite si besoin.");
    e.target.value = '';
  };

  return (
    <div className={`layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <Topbar onToggleSidebar={()=>setSidebarOpen(s=>!s)} onOpenSettings={()=>go('settings')} />
      <div className="body">
        <Sidebar current={view} go={go} />
        <main className="content">
          {view === 'files' && <FilesPage />}
          {view === 'folders' && <FoldersPage />}
          {view === 'settings' && (
            <Settings authed={authed} setAuthed={setAuthed} onExport={handleExport} onImport={handleImport} pin={pin} setPin={setPin} />
          )}
        </main>
      </div>
    </div>
  );
}
 
