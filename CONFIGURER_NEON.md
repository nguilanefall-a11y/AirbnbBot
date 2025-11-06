# 🔧 Configuration de Neon Database

## Problème actuel
Votre `DATABASE_URL` est vide dans le fichier `.env`, donc l'application utilise le stockage en mémoire (`MemStorage`) qui **perd toutes les données** à chaque redémarrage du serveur.

## ✅ Solution : Configurer Neon

### Étape 1 : Obtenir votre Connection String Neon

1. **Allez sur** https://console.neon.tech
2. **Connectez-vous** avec votre compte
3. **Sélectionnez votre projet** (ou créez-en un nouveau)
4. **Allez dans "Connection Details"** (ou "Connection String")
5. **Copiez la connection string** qui ressemble à :
   ```
   postgresql://username:password@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Étape 2 : Ajouter la connection string dans .env

Ouvrez votre fichier `.env` et ajoutez/modifiez la ligne `DATABASE_URL` :

```env
# Google Gemini API Key
GEMINI_API_KEY=AIzaSyCNNOe-Z4i1sz-UvhC3aqZ1noN2X4DHPa0

# Database URL (PostgreSQL) - Neon
DATABASE_URL=postgresql://username:password@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

PLAYWRIGHT_ENABLED=1
```

⚠️ **Important** : Remplacez `postgresql://username:password@ep-xxxx-xxxx...` par votre vraie connection string de Neon.

### Étape 3 : Créer les tables dans la base de données

Après avoir ajouté le `DATABASE_URL`, exécutez cette commande pour créer les tables :

```bash
npm run db:push
```

Cette commande va créer toutes les tables nécessaires (users, properties, conversations, messages) dans votre base de données Neon.

### Étape 4 : Redémarrer le serveur

```bash
npm run dev
```

Vous devriez voir :
- ✅ `Database connection initialized` au lieu de `DATABASE_URL not configured`
- ✅ Vos données seront maintenant **persistantes** !

## 🔍 Vérification

Pour vérifier que tout fonctionne :

1. **Créez un compte** dans l'application
2. **Redémarrez le serveur**
3. **Reconnectez-vous** : votre compte devrait toujours exister ! ✅

## ❌ Si vous n'avez pas encore de projet Neon

1. Allez sur https://neon.tech
2. Créez un compte gratuit
3. Créez un nouveau projet
4. Obtenez votre connection string
5. Suivez les étapes ci-dessus

## 🆘 Problèmes courants

### "Database not initialized"
- Vérifiez que `DATABASE_URL` est bien rempli dans `.env`
- Vérifiez qu'il n'y a pas d'espaces avant/après la connection string
- Redémarrez le serveur après modification du `.env`

### "Failed to initialize database"
- Vérifiez que votre connection string est correcte
- Vérifiez que votre projet Neon est actif
- Vérifiez votre connexion internet

### "relation does not exist"
- Exécutez `npm run db:push` pour créer les tables

