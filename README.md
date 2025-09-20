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

- Authentification (JWT): toute l'application est protégée; un compte admin par défaut est disponible à l'installation.
	- Admin par défaut: identifiant `Gilles` — mot de passe `Gilles29@`
	- Pensez à le modifier dès que possible (via la page Admin ou l'API).
- Paramètres: protégés par PIN (modifiable). Par défaut, initialisé depuis `VITE_DEFAULT_PIN`.
- Dossiers protégés: vous pouvez protéger un dossier (icône 🔒). L'ouverture d'un dossier protégé demande le PIN. Le déverrouillage est mémorisé uniquement pour la session du navigateur (effacé à la fermeture de l'onglet).

Backend (auth):
- Variables optionnelles: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`.
- À défaut, l'admin par défaut ci-dessus est utilisé et les tokens sont signés avec la clé serveur.

## Abonnement et paiements (Wave)

Principe: l'application exige un abonnement actif. À l'expiration, les routes protégées renvoient HTTP 402 et le front invite l'admin à renouveler.

Variables d'environnement backend utiles:
- `SUB_ENFORCE=1` pour activer le contrôle d'abonnement (défaut: activé). Mettez à `0` pour désactiver en dev.
- `SUB_PRICE_AMOUNT=50` montant attendu (entier, XOF par défaut) pour 30 jours.
- `SUB_PRICE_CURRENCY=XOF` devise (défaut XOF).
- `WAVE_PAYMENT_LINK` lien de paiement Wave (ex: lien marchand). Le back renvoie cette URL pour «Payer en ligne».
- `WAVE_WEBHOOK_SECRET` secret HMAC pour vérifier la signature du webhook (à adapter selon la spec Wave de votre compte marchand).

Endpoints:
- `POST /api/subscription/checkout` (admin) → crée une «intention» de paiement (table `payments`) et renvoie `paymentUrl` à ouvrir.
- `POST /api/webhooks/wave` → reçoit la confirmation de Wave, vérifie la signature si configurée, applique l'idempotence et prolonge l'abonnement (`settings.subscription_expires_at`).
- `GET /api/subscription` / `POST /api/subscription/extend` (admin) → consulter/forcer l’extension manuelle.

Test local du webhook:
1) Démarrez le backend sur 3001. Exposez-le en HTTPS public via un tunnel (exemples: ngrok, Cloudflared). Par ex. `https://<id>.ngrok-free.app`.
2) Configurez l’URL de webhook dans votre interface Wave vers `https://<id>.ngrok-free.app/api/webhooks/wave`.
3) Renseignez `WAVE_WEBHOOK_SECRET` (si votre intégration Wave fournit un header de signature) et redémarrez le backend.
4) Dans l’application (Paramètres → Abonnement), cliquez «Payer en ligne». Après paiement, la confirmation doit prolonger l’abonnement. Le front effectue un petit polling pendant ~1 minute; sinon cliquez «Actualiser».

Notes sécurité:
- Le code de vérification de signature est un «placeholder» HMAC SHA-256 basé sur `WAVE_WEBHOOK_SECRET`. Adaptez-le aux en-têtes et au schéma exacts fournis par Wave pour votre compte (nom du header, base string, etc.).
- Idempotence gérée par `providerTxId` et `invoiceId` (unicité). Montant/devise sont contrôlés; un écart produit un 400.

## Prochaines pistes

- Aperçu PowerPoint via conversion serveur (ex: LibreOffice headless → PDF).
- Zoom/plein écran pour les aperçus.
- Rôles/permissions si multi-utilisateurs.
