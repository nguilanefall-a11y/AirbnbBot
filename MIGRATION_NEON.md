# 🚀 Migration vers Neon Database

## Étape 1 : Créer un compte Neon

1. Allez sur **https://neon.tech**
2. Cliquez sur **"Sign Up"** (gratuit)
3. Connectez-vous avec GitHub, Google, ou email
4. Créez un nouveau projet

## Étape 2 : Créer une base de données

1. Dans votre projet Neon, vous verrez automatiquement une base de données
2. Cliquez sur **"Connection Details"** ou **"Connection String"**
3. Copiez la **Connection String** qui ressemble à :
   ```
   postgresql://username:password@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

## Étape 3 : Mettre à jour .env

Remplacez `DATABASE_URL` dans votre `.env` par la connection string Neon.

## Étape 4 : Créer les tables

Exécutez :
```bash
npm run db:push
```

## Étape 5 : Tester

Redémarrez le serveur et vérifiez que la connexion fonctionne.

