// Remplace les appels locale DB par l'API backend
import { apiListFiles, apiGetFileBlob, apiUploadFile, apiDeleteFile, apiRenameFile, apiUploadFiles, apiExportDatabase, apiUploadFileWithProgress, apiUploadFilesWithProgress, apiListFolders, apiCreateFolder, apiMoveFile, apiMoveFiles, apiRenameFolder, apiDeleteFolder, apiSetFolderProtected, apiUpdateFolder, apiLogin, apiListUsers, apiCreateUser, apiUpdateUser, apiDeleteUser, apiChangePassword, setAuthToken, apiGetSubscription, apiExtendSubscription, apiCreateSubscriptionCheckout } from './api'
import './App.css'

import { useEffect, useMemo, useState } from 'react'
import { EmailIcon, PsdIcon, ImageIcon, VideoIcon, AudioIcon, ArchiveIcon, TextIcon, DefaultFileIcon, DownloadIcon, UploadIcon, InfoIcon, FolderIcon, SettingsGearIcon, EyeIcon, PencilIcon, SaveIcon, CancelIcon, TrashIcon, AuthShieldIcon } from './icons'
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

function FileRow({ index, file, onRefresh, onPreview, isSelected, onToggleSelect, folderCode }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.name);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [dest, setDest] = useState(''); // string id or '' for root
  const [folders, setFolders] = useState([]);

  const download = async () => {
    const blob = await apiGetFileBlob(file.id, folderCode);
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
      {onToggleSelect && (
        <td className="col-select">
          <input type="checkbox" checked={!!isSelected} onChange={() => onToggleSelect(file.id)} aria-label="Sélectionner" />
        </td>
      )}
      <td className="col-index">{(index ?? 0) + 1}</td>
      <td>
        {editing ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
            <input className="text-input sm"
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

function FileList({ files, onRefresh, onPreview, selectable = false, selectedIds = new Set(), onToggleSelect, onToggleAll, folderCode, emptyText }) {
  if (!files.length) return <p className="empty">{emptyText || 'Aucun fichier. Ajoutez-en avec le bouton ci-dessus.'}</p>;
  const needsScroll = files.length > 10;
  return (
    <div className={`table-wrap ${needsScroll ? 'scroll' : ''}`}>
      <table className="table">
        <thead>
          <tr>
            {selectable && (
              <th className="col-select">
                <input
                  type="checkbox"
                  checked={files.length > 0 && selectedIds.size === files.length}
                  onChange={(e)=> onToggleAll?.(e.target.checked)}
                  aria-label="Tout sélectionner"
                />
              </th>
            )}
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
            <FileRow
              key={f.id}
              index={idx}
              file={f}
              onRefresh={onRefresh}
              onPreview={onPreview}
              isSelected={selectable ? selectedIds.has(f.id) : undefined}
              onToggleSelect={selectable ? onToggleSelect : undefined}
              folderCode={folderCode}
            />
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

function Topbar({ onToggleSidebar, onOpenSettings, user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="topbar">
      <button className="icon-btn" aria-label="Menu" onClick={onToggleSidebar}>☰</button>
      <div className="brand">Gestionnaire de fichiers</div>
      <div style={{ marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:8, position:'relative' }}>
        <button className="icon-btn" aria-label="Paramètres" onClick={onOpenSettings}>⚙️</button>
        <button className="icon-btn" aria-label="Profil" onClick={()=>setMenuOpen(o=>!o)} title={user?.username || 'Profil'}>
          {user?.username || 'Profil'} ⌄
        </button>
        {menuOpen && (
          <div className="popover-menu" role="menu" style={{ position:'absolute', top:36, right:0 }} onMouseLeave={()=>setMenuOpen(false)}>
            <button role="menuitem" onClick={()=>{ onOpenSettings(); setMenuOpen(false); }}>Paramètres</button>
            <button role="menuitem" onClick={()=>{ onLogout(); setMenuOpen(false); }}>Se déconnecter</button>
          </div>
        )}
      </div>
    </header>
  );
}

function Sidebar({ current, go, isAdmin }) {
  return (
    <aside className="sidebar">
      <nav>
        <button className={current==='files'?'active':''} onClick={()=>go('files')}><span style={{display:'inline-flex',alignItems:'center',gap:8}}><FolderIcon /> Fichiers</span></button>
        <button className={current==='folders'?'active':''} onClick={()=>go('folders')}><span style={{display:'inline-flex',alignItems:'center',gap:8}}><FolderIcon /> Dossiers</span></button>
        {isAdmin && (
          <button className={current==='admin'?'active':''} onClick={()=>go('admin')}><span style={{display:'inline-flex',alignItems:'center',gap:8}}>👤 Admin</span></button>
        )}
        <button className={current==='settings'?'active':''} onClick={()=>go('settings')}><span style={{display:'inline-flex',alignItems:'center',gap:8}}><SettingsGearIcon /> Paramètres</span></button>
      </nav>
    </aside>
  );
}

function LoginPage({ onLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = async () => {
    if (!username || !password) { alert('Entrez identifiant et mot de passe'); return; }
    setLoading(true);
    try {
      const { token, user } = await apiLogin(username, password);
      setAuthToken(token);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      onLoggedIn({ token, user });
    } catch (e) {
      alert(e?.message || 'Connexion échouée');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-icon" aria-hidden>
          <AuthShieldIcon />
        </div>
        <div className="login-head">
          <h1>Connexion</h1>
          <p className="sub">Accédez à votre espace sécurisé</p>
        </div>
        <div className="login-form">
          <input className="text-input" placeholder="Nom d'utilisateur" autoComplete="username" value={username} onChange={(e)=>setUsername(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') login(); }} />
          <input className="text-input" type="password" placeholder="Mot de passe" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') login(); }} />
          <button className="login-btn" onClick={login} disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
        </div>
      </div>
    </div>
  );
}

function Settings({ isAdmin, authed, setAuthed, onExport, onImport, pin, setPin }) {
  const [inputPin, setInputPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [sub, setSub] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app_pin');
    if (!saved) localStorage.setItem('app_pin', pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pour les utilisateurs non-admin: uniquement changement de mot de passe, sans autre section
  if (!isAdmin) {
    return (
      <div className="card">
        <h3>Mon compte</h3>
        <p>Changer mon mot de passe</p>
        <ChangePasswordForm />
      </div>
    );
  }

  // Pour les admins: on conserve l'authentification par PIN pour accéder aux réglages avancés
  if (!authed) {
    return (
      <div className="card settings">
        <h3>Authentification requise</h3>
        <p>Entrez votre code PIN pour accéder aux paramètres.</p>
        <div className="pin-row">
          <input className="text-input pin" type="password" placeholder="Code PIN" value={inputPin} onChange={(e)=>setInputPin(e.target.value)} />
          <button onClick={async ()=>{
            const saved = localStorage.getItem('app_pin') || pin;
            if (inputPin === saved) {
              setAuthed(true);
              try { const r = await apiGetSubscription(); setSub(r); } catch {}
            } else alert('PIN incorrect');
          }}>Se connecter</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Charger l'abonnement au montage si non chargé */}
      <LoadSubscription sub={sub} setSub={setSub} />
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Abonnement</h3>
        <p className="muted">L'application requiert un abonnement actif. Renouvelez tous les 30 jours.</p>
        <div className="actions-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <strong>Statut:</strong>{' '}
            <span>
              {sub?.expiresAt ? `Expire le ${new Date(sub.expiresAt).toLocaleString()}` : 'Inconnu'}
            </span>
          </div>
          <div style={{ display: 'inline-flex', gap: 8 }}>
            <button className="icon-btn" title="Payer l'abonnement" onClick={async ()=>{
              try {
                const { paymentUrl } = await apiCreateSubscriptionCheckout(30);
                if (paymentUrl) window.open(paymentUrl, '_blank');
                // Optionally start a light polling for few times
                setChecking(true);
                let tries = 0;
                const tick = async () => {
                  tries++;
                  try { const r = await apiGetSubscription(); setSub(r); } catch {}
                  if (tries < 12) { setTimeout(tick, 5000); } else { setChecking(false); }
                };
                setTimeout(tick, 5000);
              } catch (e) {
                alert(e?.message || 'Échec de création du paiement');
              }
            }}>Payer en ligne</button>
            <button onClick={async ()=>{ try { const r = await apiExtendSubscription(30); setSub(r); alert('Abonnement prolongé de 30 jours'); } catch(e){ alert(e?.message||'Échec prolongation'); } }}>Marquer comme payé (30j)</button>
            <button onClick={async ()=>{ try { const r = await apiGetSubscription(); setSub(r); } catch(e){ alert(e?.message||'Échec actualisation'); } }}>Actualiser</button>
          </div>
        </div>
        {checking && (<div className="muted" style={{marginTop:8}}>En attente de la confirmation du paiement…</div>)}
      </div>

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
            <input className="text-input pin" type="password" placeholder="Nouveau PIN" value={newPin} onChange={(e)=>setNewPin(e.target.value)} />
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
        <div className="card">
          <h3>Mon compte</h3>
          <p>Changer mon mot de passe</p>
          <ChangePasswordForm />
        </div>
      </div>

      {/* Tableau de bord inclus et protégé (réservé aux admins) */}
      <div style={{ marginTop: '1rem' }}>
        <DashboardPage />
      </div>
    </>
  );
}

function LoadSubscription({ sub, setSub }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sub != null) return;
      try { const r = await apiGetSubscription(); if (!cancelled) setSub(r); } catch {}
    })();
    return () => { cancelled = true; };
  }, [sub]);
  return null;
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const doChange = async () => {
    if (!currentPassword || !newPassword) { alert('Champs requis'); return; }
    setLoading(true);
    try {
      await apiChangePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword('');
      alert('Mot de passe mis à jour');
    } catch (e) {
      alert(e?.message || 'Échec mise à jour');
    } finally { setLoading(false); }
  };
  return (
    <div className="input-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <input className="text-input" type="password" placeholder="Mot de passe actuel" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} />
      <input className="text-input" type="password" placeholder="Nouveau mot de passe" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} />
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button onClick={doChange} disabled={loading}>{loading ? 'Mise à jour…' : 'Mettre à jour'}</button>
      </div>
    </div>
  );
}

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const refresh = async () => { try { const list = await apiListUsers(); setUsers(list); } catch (e) { alert(e?.message || 'Erreur chargement'); } };
  useEffect(() => { refresh(); }, []);
  const create = async () => {
    const u = username.trim(); const p = password.trim();
    if (!u || !p) { alert('Champs requis'); return; }
    try { await apiCreateUser(u, p, isAdmin); setUsername(''); setPassword(''); setIsAdmin(false); refresh(); } catch (e) { alert(e?.message || 'Erreur création'); }
  };
  return (
    <div className="container">
      <h2 className="title">Administration</h2>
      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Créer un utilisateur</h3>
        <div className="input-row">
          <input className="text-input" placeholder="Nom d'utilisateur" value={username} onChange={(e)=>setUsername(e.target.value)} />
          <input className="text-input" type="password" placeholder="Mot de passe" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <label style={{ display:'inline-flex', alignItems:'center', gap:8 }}><input type="checkbox" checked={isAdmin} onChange={(e)=>setIsAdmin(e.target.checked)} /> Admin</label>
          <button onClick={create}>Créer</button>
        </div>
      </div>
      <div className="card">
        <h3>Utilisateurs</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>N°</th><th>Nom</th><th>Admin</th><th>Créé</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}>
                  <td className="col-index">{i+1}</td>
                  <td>{u.username}</td>
                  <td>{u.isAdmin ? 'Oui' : 'Non'}</td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : ''}</td>
                  <td className="actions">
                    <button title="Basculer admin" onClick={async ()=>{ await apiUpdateUser(u.id, { isAdmin: !u.isAdmin }); refresh(); }}>Admin</button>
                    <button title="Réinitialiser mot de passe" onClick={async ()=>{ const np = window.prompt('Nouveau mot de passe:')||''; if (!np) return; await apiUpdateUser(u.id, { password: np }); alert('Mot de passe réinitialisé'); }}>Reset</button>
                    <button title="Supprimer" onClick={async ()=>{ if (!window.confirm('Supprimer cet utilisateur ?')) return; await apiDeleteUser(u.id); refresh(); }}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilesPage({ folderFilter, setFolderFilter }) {
  const [all, setAll] = useState([]);
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState({ open: false, file: null, source: null });
  const [selected, setSelected] = useState(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDest, setBulkDest] = useState('');
  const [allFolders, setAllFolders] = useState([]);
  const [foldersList, setFoldersList] = useState([]);
  // Code de dossier pour le dossier actuellement sélectionné (non persistant)
  const [currentFolderCode, setCurrentFolderCode] = useState(null);
  // Modal PIN pour sélection d'un dossier protégé
  const [pinOpen, setPinOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pendingFolder, setPendingFolder] = useState(null); // { id, name }

  const refresh = async () => {
    let list = [];
    if (folderFilter === '') {
      // Tous les fichiers (global, protégés exclus par design côté API)
      list = await apiListFiles();
    } else if (folderFilter === 'root') {
      // Fichiers de la racine uniquement
      const allFiles = await apiListFiles();
      list = allFiles.filter(f => (f.folderId ?? null) === null);
    } else {
      // Fichiers d'un dossier spécifique (gérer PIN si protégé)
      const fid = Number(folderFilter);
      const fd = foldersList.find(f => f.id === fid);
      const code = fd?.protected ? currentFolderCode : null;
      if (fd?.protected && (!code || String(code).length !== 4)) {
        // Code manquant: attendre sélection via la modale
        setAll([]);
        return;
      }
      list = await apiListFiles(fid, code || undefined);
    }
    setAll(list.map(({ id, name, type, size, createdAt }) => ({ id, name, type, size: size || 0, createdAt: createdAt || Date.now() })));
    setSelected(new Set());
  };
  useEffect(() => { refresh(); }, [folderFilter]);
  useEffect(() => { (async ()=>{ const fs = await apiListFolders(); setFoldersList(fs); })(); }, []);
  // Reset code when folder filter changes away
  useEffect(() => { if (folderFilter === '' || folderFilter === 'root') setCurrentFolderCode(null); }, [folderFilter]);

  // Today window
  const startOfToday = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }, []);
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    // Si un dossier est sélectionné, on n'applique PAS le filtre "aujourd'hui" par défaut
    if (!s) {
      if (folderFilter === '') {
        // Par défaut (tous), n'afficher que les fichiers du jour
        return all.filter(f => {
          const t = new Date(f.createdAt).getTime();
          return t >= startOfToday && t < endOfToday;
        });
      }
      // Un dossier est filtré (root ou id): on affiche tout le contenu du dossier
      return all;
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
        <div style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          <label style={{ fontSize:12, opacity:0.8 }}>Dossier</label>
          <select
            value={folderFilter}
            onChange={(e)=>{
              const v = e.target.value;
              if (v === '' || v === 'root') {
                setCurrentFolderCode(null);
                setFolderFilter(v);
                return;
              }
              const fid = Number(v);
              const fd = foldersList.find(f => f.id === fid);
              if (fd?.protected) {
                setPendingFolder({ id: fd.id, name: fd.name });
                setPinValue('');
                setPinOpen(true);
                // ne change pas le filtre ici; on attend la validation du PIN
              } else {
                setCurrentFolderCode(null);
                setFolderFilter(v);
              }
            }}
          >
            <option value="">(Tous)</option>
            <option value="root">(Racine)</option>
            {foldersList.map(fd => (
              <option key={fd.id} value={String(fd.id)}>
                {fd.name}{fd.protected ? ' 🔒' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="storage-widget" title={`Stockage: ${bytesToHuman(totalBytes)} / ${quotaGbStr}`}>
          <CircularProgress value={pct} />
          <div className="storage-text">
            <div className="label">Stockage</div>
            <div className="value">{bytesToHuman(totalBytes)} / {quotaGbStr}</div>
          </div>
        </div>
      </div>
      {folderFilter === '' && (
        <div className="muted" style={{marginBottom:'0.5rem', fontSize:12}}>Affichage: fichiers ajoutés aujourd'hui. Utilisez la recherche pour retrouver les autres.</div>
      )}
      {selected.size > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:8, margin:'6px 0' }}>
          <strong>{selected.size} sélectionné(s)</strong>
          <button onClick={async ()=>{ const f = await apiListFolders(); setAllFolders(f); setBulkDest(''); setBulkOpen(true); }}>Déplacer…</button>
          <button onClick={()=>setSelected(new Set())}>Tout désélectionner</button>
        </div>
      )}
      <FileList
        files={filtered}
        onRefresh={refresh}
            onPreview={async (file) => {
        try {
              // Utilise le code du dossier courant si nécessaire
              const blob = await apiGetFileBlob(file.id, currentFolderCode || undefined);
          const url = URL.createObjectURL(blob);
          setPreview({ open: true, file, source: { blob, url } });
        } catch (e) {
          alert('Impossible d\'ouvrir: ' + (e?.message || e));
        }
      }}
        selectable
        selectedIds={selected}
        onToggleSelect={(id)=> setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
        onToggleAll={(checked)=> setSelected(checked ? new Set(filtered.map(f=>f.id)) : new Set())}
    // Transmet le code du dossier courant (non persistant)
    folderCode={(folderFilter && folderFilter !== '' && folderFilter !== 'root') ? (currentFolderCode || undefined) : undefined}
      />
      <PreviewModal open={preview.open} file={preview.file} source={preview.source} onClose={()=>{
        if (preview.source?.url) URL.revokeObjectURL(preview.source.url);
        setPreview({ open: false, file: null, source: null });
      }} />

      {pinOpen && (
        <div className="modal-overlay" onClick={()=>{ setPinOpen(false); setPendingFolder(null); setPinValue(''); }}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <strong>Déverrouiller le dossier</strong>
              <button className="icon-btn" onClick={()=>{ setPinOpen(false); setPendingFolder(null); setPinValue(''); }}>✖️</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 8 }}>Dossier: <strong>{pendingFolder?.name || ''}</strong></div>
              <label>Code PIN</label>
              <input className="text-input pin" type="password" value={pinValue} onChange={(e)=>setPinValue(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') {
                if ((pinValue||'').length !== 4) { alert('Le code doit contenir 4 caractères'); return; }
                setCurrentFolderCode(pinValue);
                setPinOpen(false);
                const id = pendingFolder?.id;
                setPendingFolder(null);
                setFolderFilter(String(id));
                setPinValue('');
              } }} autoFocus />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={()=>{ setPinOpen(false); setPendingFolder(null); setPinValue(''); }}>Annuler</button>
                <button onClick={()=>{
                  if ((pinValue||'').length !== 4) { alert('Le code doit contenir 4 caractères'); return; }
                  setCurrentFolderCode(pinValue);
                  setPinOpen(false);
                  const id = pendingFolder?.id;
                  setPendingFolder(null);
                  setFolderFilter(String(id));
                  setPinValue('');
                }}>Déverrouiller</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkOpen && (
        <div className="modal-overlay" onClick={()=>setBulkOpen(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <strong>Déplacer les fichiers sélectionnés</strong>
              <button className="icon-btn" onClick={()=>setBulkOpen(false)}>✖️</button>
            </div>
            <div className="modal-body">
              <label>Choisir le dossier de destination</label>
              <select value={bulkDest} onChange={(e)=>setBulkDest(e.target.value)}>
                <option value="">Racine (sans dossier)</option>
                {allFolders.map(f => (
                  <option key={f.id} value={String(f.id)}>{f.name}</option>
                ))}
              </select>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
                <button onClick={()=>setBulkOpen(false)}>Annuler</button>
                <button onClick={async ()=>{
                  const ids = Array.from(selected);
                  if (ids.length === 0) { setBulkOpen(false); return; }
                  await apiMoveFiles(ids, bulkDest ? Number(bulkDest) : null);
                  setBulkOpen(false);
                  setSelected(new Set());
                  await refresh();
                }}>Déplacer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FoldersPage() {
  const [folders, setFolders] = useState([]);
  const [current, setCurrent] = useState(null); // current folderId
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState({ open: false, file: null, source: null });
  const [newName, setNewName] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createProtected, setCreateProtected] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [path, setPath] = useState([]); // breadcrumb: array of {id,name}
  const [renameTarget, setRenameTarget] = useState(null); // folder object
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // folder object
  const [pinPrompt, setPinPrompt] = useState({ open: false, folder: null, value: '' });
  // Code éphémère pour le dossier actuel
  const [currentCode, setCurrentCode] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [stats, setStats] = useState({}); // { [folderId]: { count:number, size:number } | { locked:true } }

  const refreshFolders = async () => {
    const fs = await apiListFolders();
    setFolders(fs);
    // Ensure breadcrumb is consistent
    if (current == null) setPath([]);
  };
  useEffect(() => { refreshFolders(); }, []);

  const createFolder = async () => {
    const n = newName.trim();
    if (!n) return;
    // create under current folder
    const parentId = current ?? null;
    try {
      await apiCreateFolder(n, parentId, createProtected, createProtected ? createCode : undefined);
    } catch (e) {
      alert(e?.message || 'Erreur lors de la création du dossier');
      return;
    }
    setNewName('');
    setCreateProtected(false);
    setCreateCode('');
    setCreateOpen(false);
    await refreshFolders();
  };

  // Compute child folders of the current folder
  const childFolders = (folders || []).filter(f => (f.parentId ?? null) === (current ?? null));

  // Load files for the current folder (show files only when inside a folder; hide at root)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (current == null) { setFiles([]); return; }
        const fd = folders.find(f => f.id === current);
        const code = fd?.protected ? currentCode : undefined;
        if (fd?.protected && (!code || String(code).length !== 4)) { setFiles([]); return; }
        const list = await apiListFiles(current, code);
        if (!cancelled) setFiles(list.map(({ id, name, type, size, createdAt }) => ({ id, name, type, size: size || 0, createdAt: createdAt || Date.now() })));
      } catch (e) {
        if (!cancelled) setFiles([]);
      }
    })();
    return () => { cancelled = true };
  }, [current, currentCode, folders.map(f=>f.id).join(',')]);

  // Charger les stats (nb de fichiers, taille totale) pour chaque sous-dossier non protégé
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!childFolders.length) { setStats({}); return; }
      const entries = await Promise.all(childFolders.map(async (fd) => {
        if (fd.protected) return [fd.id, { locked: true }];
        try {
          const list = await apiListFiles(fd.id);
          const count = list.length;
          const size = list.reduce((a, b) => a + (b.size || 0), 0);
          return [fd.id, { count, size }];
        } catch (_) {
          return [fd.id, { error: true }];
        }
      }));
      if (!cancelled) {
        const map = {};
        for (const [id, val] of entries) map[id] = val;
        setStats(map);
      }
    })();
    // Recalcule si la liste de sous-dossiers change
    return () => { cancelled = true };
  }, [childFolders.map(f=>f.id).join(',')]);

  const goTo = (folder) => {
    const id = folder?.id ?? null;
    if (id != null) {
      const fd = folders.find(f=>f.id===id);
      const isProt = !!fd?.protected;
      if (isProt) {
        setPinPrompt({ open: true, folder: fd, value: '' });
        return;
      }
    }
    // Open folder in-place
    setCurrent(id);
    setCurrentCode(null);
    // rebuild breadcrumb
    const chain = [];
    let cur = id == null ? null : folders.find(x => x.id === id);
    while (cur) { chain.unshift({ id: cur.id, name: cur.name }); cur = folders.find(x => x.id === cur.parentId); }
    setPath(chain);
  };

  const goUp = () => {
    if (current == null) return;
    const cur = folders.find(f=>f.id===current);
    const parentId = cur?.parentId ?? null;
    setCurrent(parentId);
    setCurrentCode(null);
    const chain = [];
    let p = parentId == null ? null : folders.find(x => x.id === parentId);
    while (p) { chain.unshift({ id: p.id, name: p.name }); p = folders.find(x => x.id === p.parentId); }
    setPath(chain);
  };

  const onConfirmPin = () => {
    const fd = pinPrompt.folder;
    const code = (pinPrompt.value||'').trim();
    if (code.length !== 4) { alert('Le code doit contenir 4 caractères'); return; }
    setCurrentCode(code);
    setPinPrompt({ open: false, folder: null, value: '' });
    setCurrent(fd.id);
    // rebuild path
    const chain = [];
    let cur = fd;
    while (cur) { chain.unshift({ id: cur.id, name: cur.name }); cur = folders.find(x => x.id === cur.parentId); }
    setPath(chain);
  };

  const toggleProtect = async (fd) => {
    const nextVal = !fd.protected;
    if (nextVal) {
      const code = window.prompt('Entrer le code (4 caractères) pour protéger ce dossier:') || '';
      if (code.length !== 4) { alert('Code invalide (4 caractères requis)'); return; }
      await apiUpdateFolder(fd.id, { protected: true, code });
    } else {
      await apiUpdateFolder(fd.id, { protected: false, code: null });
    }
    await refreshFolders();
  };

  const askRename = (fd) => { setRenameTarget(fd); setRenameValue(fd.name); };
  const doRename = async () => {
    const n = renameValue.trim(); if (!n) return;
    await apiRenameFolder(renameTarget.id, n);
    setRenameTarget(null); setRenameValue('');
    await refreshFolders();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiDeleteFolder(confirmDelete.id);
      setConfirmDelete(null);
      await refreshFolders();
    } catch (e) {
      // Si le serveur renvoie 404, le dossier n'existe plus (déjà supprimé). On rafraîchit l'UI et on informe doucement.
      if (e && (e.status === 404)) {
        setConfirmDelete(null);
        await refreshFolders();
        alert('Ce dossier n’existe plus (il a peut-être déjà été supprimé). La liste a été actualisée.');
      } else {
        alert(e?.message || 'Erreur lors de la suppression du dossier');
      }
    }
  };

  return (
    <div className="container">
      <h2 className="title">Dossiers</h2>
      <div className="toolbar" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="icon-btn" onClick={goUp} title="Retour">
          ←
        </button>
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
          <div key={fd.id} className="folder-card" title="Ouvrir" style={{ position:'relative' }}>
            <div className="folder-icon" onDoubleClick={()=>goTo(fd)}>{fd.protected ? '🔒' : '📁'}</div>
            <div className="folder-name" title={fd.name} onDoubleClick={()=>goTo(fd)}>
              {fd.name}
            </div>
            <div className="folder-meta" aria-label="Statistiques du dossier">
              {fd.protected ? (
                <span>Protégé</span>
              ) : stats[fd.id] && stats[fd.id].count != null ? (
                <span>{stats[fd.id].count} fichier(s) • {bytesToSize(stats[fd.id].size || 0)}</span>
              ) : (
                <span>…</span>
              )}
            </div>
            <button
              className="icon-btn"
              aria-label="Actions"
              title="Actions"
              onClick={()=>setMenuOpenId(menuOpenId===fd.id?null:fd.id)}
              style={{ position:'absolute', top:8, right:8, padding:'0.35rem 0.45rem' }}
            >
              ⋮
            </button>
            {menuOpenId === fd.id && (
              <div className="popover-menu" role="menu" onMouseLeave={()=>setMenuOpenId(null)} style={{ position:'absolute', top:32, right:8, zIndex:5 }}>
                <button onClick={()=>{ goTo(fd); setMenuOpenId(null); }} role="menuitem"><span className="mi"><EyeIcon /></span> Ouvrir</button>
                <button onClick={()=>{ toggleProtect(fd); setMenuOpenId(null); }} role="menuitem">
                  <span className="mi"><FolderIcon /></span> {fd.protected ? 'Retirer protection' : 'Protéger'}
                </button>
                <button onClick={()=>{ askRename(fd); setMenuOpenId(null); }} role="menuitem"><span className="mi rename"><PencilIcon /></span> Renommer</button>
                <button onClick={()=>{ setConfirmDelete(fd); setMenuOpenId(null); }} role="menuitem"><span className="mi danger"><TrashIcon /></span> Supprimer</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Afficher les fichiers seulement à l'intérieur d'un dossier (pas à la racine) */}
      {current != null && (
        <div style={{ marginTop: '1rem' }}>
          <FileList
            files={files}
            onRefresh={async () => {
              try {
                const fd = folders.find(f=>f.id===current);
                const code = fd?.protected ? currentCode : undefined;
                const list = await apiListFiles(current, code);
                setFiles(list.map(({ id, name, type, size, createdAt }) => ({ id, name, type, size: size || 0, createdAt: createdAt || Date.now() })));
              } catch {}
            }}
            onPreview={async (file) => {
              try {
                const fd = folders.find(f=>f.id===current);
                const code = fd?.protected ? currentCode : undefined;
                const blob = await apiGetFileBlob(file.id, code);
                const url = URL.createObjectURL(blob);
                setPreview({ open: true, file, source: { blob, url } });
              } catch (e) {
                alert('Impossible d\'ouvrir: ' + (e?.message || e));
              }
            }}
            selectable={false}
            folderCode={(folders.find(f=>f.id===current)?.protected ? currentCode : undefined)}
            emptyText={'Aucun fichier dans ce dossier.'}
          />
          <PreviewModal open={preview.open} file={preview.file} source={preview.source} onClose={()=>{
            if (preview.source?.url) URL.revokeObjectURL(preview.source.url);
            setPreview({ open: false, file: null, source: null });
          }} />
        </div>
      )}

      {createOpen && (
        <div className="modal-overlay" onClick={()=>setCreateOpen(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <strong>Nouveau dossier</strong>
              <button className="icon-btn" onClick={()=>setCreateOpen(false)}>✖️</button>
            </div>
            <div className="modal-body">
              <label>Nom du dossier</label>
              <input className="text-input" value={newName} onChange={(e)=>setNewName(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') createFolder(); }} autoFocus />
              <label style={{ display:'inline-flex', alignItems:'center', gap:8, marginTop:8 }}>
                <input type="checkbox" checked={createProtected} onChange={(e)=>setCreateProtected(e.target.checked)} />
                Protéger ce dossier (PIN requis)
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={()=>setCreateOpen(false)}>Annuler</button>
                <button onClick={createFolder}>Créer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {renameTarget && (
        <div className="modal-overlay" onClick={()=>setRenameTarget(null)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <strong>Renommer le dossier</strong>
              <button className="icon-btn" onClick={()=>setRenameTarget(null)}>✖️</button>
            </div>
            <div className="modal-body">
              <label>Nouveau nom</label>
              <input className="text-input" value={renameValue} onChange={(e)=>setRenameValue(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') doRename(); }} autoFocus />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={()=>setRenameTarget(null)}>Annuler</button>
                <button onClick={doRename}>Renommer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={()=>setConfirmDelete(null)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <strong>Supprimer le dossier</strong>
              <button className="icon-btn" onClick={()=>setConfirmDelete(null)}>✖️</button>
            </div>
            <div className="modal-body">
              <p>Supprimer « {confirmDelete.name} » et tout son contenu (sous-dossiers et fichiers) ? Cette action est définitive.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={()=>setConfirmDelete(null)}>Annuler</button>
                <button style={{ background: '#e53935', color: '#fff', borderColor: '#e53935' }} onClick={doDelete}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pinPrompt.open && (
        <div className="modal-overlay" onClick={()=>setPinPrompt({ open:false, folder:null, value:'' })}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <strong>Déverrouiller le dossier</strong>
              <button className="icon-btn" onClick={()=>setPinPrompt({ open:false, folder:null, value:'' })}>✖️</button>
            </div>
            <div className="modal-body">
              <label>Code PIN</label>
              <input className="text-input pin" type="password" value={pinPrompt.value} onChange={(e)=>setPinPrompt(p=>({ ...p, value: e.target.value }))} onKeyDown={(e)=>{ if (e.key==='Enter') onConfirmPin(); }} autoFocus />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={()=>setPinPrompt({ open:false, folder:null, value:'' })}>Annuler</button>
                <button onClick={onConfirmPin}>Déverrouiller</button>
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
  const [auth, setAuth] = useState(()=>{
    try {
      const token = localStorage.getItem('auth_token') || '';
      const user = JSON.parse(localStorage.getItem('auth_user')||'null');
      if (token) setAuthToken(token);
      return { token, user };
    } catch { return { token: '', user: null }; }
  });
  const [authed, setAuthed] = useState(false);
  const defaultPin = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEFAULT_PIN) || 'Gilles29@';
  const [pin, setPin] = useState(localStorage.getItem('app_pin') || defaultPin);
  const [folderFilter, setFolderFilter] = useState('');

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

  // Auto-logout on 401 from API
  useEffect(() => {
    const onUnauth = () => {
      setAuth({ token: '', user: null });
      setAuthToken('');
    };
    window.addEventListener('app:unauthorized', onUnauth);
    return () => window.removeEventListener('app:unauthorized', onUnauth);
  }, []);

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

  if (!auth?.token || !auth?.user) {
    return <LoginPage onLoggedIn={(a)=>{ setAuth(a); setView('files'); }} />;
  }

  return (
    <div className={`layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <Topbar onToggleSidebar={()=>setSidebarOpen(s=>!s)} onOpenSettings={()=>go('settings')} user={auth?.user} onLogout={()=>{ setAuth({ token:'', user:null }); setAuthToken(''); localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); }} />
      <div className="body">
        <Sidebar current={view} go={go} isAdmin={!!auth?.user?.isAdmin} />
        <main className="content">
          {view === 'files' && <FilesPage folderFilter={folderFilter} setFolderFilter={setFolderFilter} />}
          {view === 'folders' && <FoldersPage />}
          {view === 'admin' && auth?.user?.isAdmin && <AdminPage />}
          {view === 'settings' && (
            <Settings isAdmin={!!auth?.user?.isAdmin} authed={authed} setAuthed={setAuthed} onExport={handleExport} onImport={handleImport} pin={pin} setPin={setPin} />
          )}
        </main>
      </div>
    </div>
  );
}
 
