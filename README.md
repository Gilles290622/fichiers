# Gestionnaire de fichiers — React + Vite + Express (SQLite)

Application web de gestion de fichiers avec:

- Upload multi-formats (via API Express + SQLite)
- Liste avec prévisualisation, téléchargement, renommage, suppression
- Partage via WhatsApp/Email (liens)
- Recherche par nom/type
- Dossiers: création, renommage, suppression (récursive), protection par PIN
- Thème bleu/blanc, responsive mobile → bureau
- Tableau de bord (KPIs, tendance 7j, récents)
- Page Paramètres protégée par PIN (export DB serveur)

## Démarrage développement

Prérequis: Node.js LTS.

1) Installer les dépendances racine et backend:

```powershell
npm install
cd .\backend; npm install; cd ..
```

2) Lancer le backend (Express + SQLite) sur 3001:

```powershell
npm run start --prefix .\backend
```

3) Lancer le front (Vite). Par défaut, la config est réglée pour servir sur le port 80 avec l’hôte "fichiers" pour une URL courte `http://fichiers`.

```powershell
npm run dev
```

Notes dev:
- Sur Windows, écouter sur le port 80 peut nécessiter d’exécuter le terminal en Administrateur. Sinon, changez le port dans `vite.config.js` (ex: 5175) et ouvrez l’URL affichée.
- Un proxy de dev redirige `/api` vers le backend (variable `.env` VITE_API_PROXY, par défaut http://localhost:3001).
- Pour un nom d’hôte personnalisé (`http://fichiers`), ajoutez une entrée dans `C:\Windows\System32\drivers\etc\hosts`: `127.0.0.1   fichiers`.

## Build production

```powershell
npm run build
npm run preview
```

## Prévisualisation intégrée (Office & co.)

- Word (.docx): rendu dans une modale grâce à `docx-preview`.
- Excel (.xlsx/.xls/.csv): rendu table HTML via `xlsx`.
- PDF: aperçu dans un iframe.
- Images/Audio/Vidéo: tags HTML natifs.
- Texte (.txt/.md/.json/.log): affichage brut.
- PowerPoint (.ppt/.pptx): non pris en charge en aperçu (utiliser Télécharger pour ouvrir dans PowerPoint).

Limitations:
- .doc (ancien format binaire) non supporté en aperçu; convertir en .docx.
- .xls binaire peut s’afficher partiellement; .xlsx recommandé.

Utilisation: dans la page Fichiers, menu Actions → Ouvrir.

## Export de la base

- Paramètres → Exporter DB: télécharge le fichier SQLite du serveur.
- Import DB côté front est désactivé (source de vérité: serveur). Utilisez l’API/outil SQLite si besoin.

## Architecture rapide

- `backend/` Express + sqlite3 sur fichier (persistant), endpoints REST `/api/files`...
- `src/` React + Vite, proxy `/api` → backend en dev.
- `.env` (dev): `VITE_API_PROXY=http://localhost:3002`.

## Sécurité

- Accès Paramètres protégé par PIN (modifiable). Par défaut, initialisé depuis `VITE_DEFAULT_PIN`.
- Dossiers protégés: vous pouvez protéger un dossier (icône 🔒). L'ouverture d'un dossier protégé demande le PIN. Le déverrouillage est mémorisé uniquement pour la session du navigateur (effacé à la fermeture de l'onglet).

## Prochaines pistes

- Aperçu PowerPoint via conversion serveur (ex: LibreOffice headless → PDF).
- Zoom/plein écran pour les aperçus.
- Rôles/permissions si multi-utilisateurs.
