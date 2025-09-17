# Gestionnaire de fichiers — React + Vite

Application web de gestion locale de fichiers (100% client) avec:

- Upload de fichiers (tous formats)
- Liste avec téléchargement, renommage, suppression
- Partage via Web Share API (si disponible), sinon WhatsApp/Email en repli
- Recherche par nom/type
- Thème bleu/blanc et interface responsive mobile
- Stockage des fichiers dans SQLite (sql.js, WebAssembly) avec persistance via IndexedDB

## Lancer en dev

```powershell
npm install
npm run dev
```

Ouvrir l’URL affichée par Vite (ex: http://localhost:5173/). Si le port 5173 est déjà pris, Vite en choisira un autre automatiquement.

## Build production

```powershell
npm run build
npm run preview
```

## Export/Import de la base

- Exporter DB: télécharge un fichier `fichiers.sqlite` contenant toute la base.
- Importer DB: sélectionnez un `.sqlite` pour remplacer la base actuelle (les données affichées seront rechargées).

## Détails techniques

- sql.js charge un module WASM (~660 kB) au premier usage; le premier chargement peut être plus long.
- La base SQLite est gardée en mémoire et synchronisée dans IndexedDB après chaque écriture, garantissant la persistance locale entre sessions.
- Tout s’exécute côté navigateur; aucun serveur n’est requis pour les fonctionnalités présentes.

## Limitations et pistes

- Le partage de fichiers sans Web Share API ne peut pas joindre automatiquement un fichier; un téléchargement local est déclenché, puis l’ouverture WhatsApp/Email avec un message explicatif.
- Possibles extensions: tags/dossiers, tri/pagination SQL, export/import plus fins, mode sombre.
