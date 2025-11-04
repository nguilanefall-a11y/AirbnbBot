# Fichiers à transférer vers Replit

## 📁 Nouveaux fichiers à créer sur Replit :

### server/airbnb-scraper.ts
- Copiez tout le contenu de ce fichier

### server/db-storage.ts  
- Copiez tout le contenu de ce fichier

### start.sh
- Copiez tout le contenu de ce fichier

## 📝 Fichiers existants à MODIFIER sur Replit :

### server/routes.ts
- Ajoutez l'import : `import { analyzeAirbnbListing } from "./airbnb-scraper";`
- Ajoutez la route POST `/api/properties/import-airbnb` (voir lignes 89-155)

### server/storage.ts
- Remplacez la dernière ligne `export const storage = new MemStorage();` 
- Par le code de sélection automatique (lignes 339-361)

### server/db.ts
- Remplacez tout le contenu par la version qui rend la DB optionnelle (lignes 1-24)

### server/index.ts
- Ajoutez le chargement dotenv au début (lignes 1-4)

### package.json
- Ajoutez `"dotenv": "^16.4.5"` dans dependencies
- Ajoutez `"dev:watch": "NODE_ENV=development tsx watch server/index.ts"` dans scripts
- Ajoutez `"auto": "npm run dev:watch"` dans scripts

### client/src/pages/AdminHost.tsx
- Ajoutez l'import Dialog
- Ajoutez les états pour l'import (lignes 26-28)
- Ajoutez la mutation importAirbnbMutation (lignes 65-130)
- Ajoutez le bouton Importer dans la sidebar (lignes 216-269)

### client/src/components/ChatInterface.tsx
- Remplacez le return complet (lignes 71-156) pour améliorer l'interface

### client/src/lib/websocket.ts
- Modifiez la fonction connect() pour ajouter le fallback (lignes 16-19)

### client/src/lib/queryClient.ts
- Améliorez throwIfResNotOk pour mieux extraire les erreurs (lignes 3-17)

### client/src/pages/Subscribe.tsx
- Rendez Stripe optionnel (lignes 11-14, 148-161)

### server/auth.ts
- Améliorez les messages d'erreur (lignes 145-153)

## 🔑 Variables d'environnement sur Replit :

Dans Replit > Secrets (icône cadenas), ajoutez :
- GEMINI_API_KEY = AIzaSyCNNOe-Z4i1sz-UvhC3aqZ1noN2X4DHPa0
- DATABASE_URL = (optionnel, si vous avez une base de données)
- SESSION_SECRET = (générez une chaîne aléatoire)

## 📦 Après l'upload :

1. Dans Replit Terminal :
   ```bash
   npm install
   ```

2. Redémarrez le serveur Replit

