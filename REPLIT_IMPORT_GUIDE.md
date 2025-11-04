# Guide d'import vers Replit

## Méthode 1 : Via Git (Recommandé)

### Sur votre machine locale :
1. ✅ Les changements sont déjà committés
2. ✅ Poussez vers Git :
   ```bash
   git push gitsafe-backup main
   ```

### Sur Replit :
1. Ouvrez votre projet Replit
2. Dans le terminal Replit, exécutez :
   ```bash
   git pull gitsafe-backup main
   ```
3. Installez les nouvelles dépendances :
   ```bash
   npm install
   ```
4. Ajoutez les variables d'environnement dans Replit :
   - Allez dans "Secrets" (icône de cadenas dans la barre latérale)
   - Ajoutez :
     - `GEMINI_API_KEY` = votre clé Gemini
     - `DATABASE_URL` = votre URL de base de données (si vous en avez une)
     - `SESSION_SECRET` = une chaîne aléatoire pour les sessions
5. Redémarrez le serveur Replit

## Méthode 2 : Upload manuel des fichiers

Si Git ne fonctionne pas, vous pouvez copier les fichiers suivants manuellement :

### Fichiers nouveaux à ajouter :
- `server/airbnb-scraper.ts` - Import Airbnb
- `server/db-storage.ts` - Stockage base de données
- `start.sh` - Script de démarrage

### Fichiers modifiés à mettre à jour :
- `client/src/pages/AdminHost.tsx` - Interface d'import Airbnb
- `client/src/components/ChatInterface.tsx` - Interface de test améliorée
- `server/routes.ts` - Route d'import Airbnb
- `server/storage.ts` - Support base de données
- `server/db.ts` - Base de données optionnelle
- `server/index.ts` - Support dotenv
- `server/auth.ts` - Messages d'erreur améliorés
- `client/src/lib/websocket.ts` - Correction WebSocket
- `client/src/lib/queryClient.ts` - Gestion d'erreurs améliorée
- `client/src/pages/Subscribe.tsx` - Stripe optionnel
- `package.json` - Ajout de dotenv

### Variables d'environnement à ajouter sur Replit :
Dans "Secrets", ajoutez :
- `GEMINI_API_KEY` = AIzaSyCNNOe-Z4i1sz-UvhC3aqZ1noN2X4DHPa0
- `DATABASE_URL` = (optionnel, pour la persistance)

## Méthode 3 : Via Replit Git

1. Sur Replit, ouvrez le terminal
2. Configurez Git si nécessaire :
   ```bash
   git config user.name "Votre Nom"
   git config user.email "votre@email.com"
   ```
3. Pull les changements :
   ```bash
   git pull gitsafe-backup main
   ```

## Après l'import

1. **Installez les dépendances** :
   ```bash
   npm install
   ```

2. **Configurez les variables d'environnement** dans Replit Secrets

3. **Redémarrez le serveur** Replit

4. **Testez l'import Airbnb** :
   - Allez sur `/host`
   - Cliquez sur "Importer"
   - Collez un lien Airbnb

## Notes importantes

- ⚠️ Ne commitez JAMAIS le fichier `.env` (il contient vos clés API)
- ✅ Le fichier `.gitignore` est configuré pour ignorer `.env`
- ✅ Tous les changements sont maintenant dans Git

