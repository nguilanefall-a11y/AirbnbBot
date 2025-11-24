# Configuration des Variables d'Environnement

## Variables Backend (`.env` à la racine)

Les variables suivantes doivent être dans le fichier `.env` à la racine du projet :

```bash
# Google Gemini API
GEMINI_API_KEY=your_key_here

# Supabase Database
SUPABASE_DB_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here

# Twilio (optionnel)
TWILIO_SID=your_sid
TWILIO_TOKEN=your_token
TWILIO_NUMBER=whatsapp:+14155238886

# Stripe (optionnel)
STRIPE_SECRET_KEY=your_stripe_secret_key

# Désactiver la vérification SSL en dev uniquement
NODE_TLS_REJECT_UNAUTHORIZED=0
```

## Variables Frontend (`.env.local` dans `client/`)

Créez un fichier `client/.env.local` avec :

```bash
# WebSocket URL pour le développement
VITE_WS_URL=ws://localhost:5000/ws

# Stripe Public Key (optionnel)
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

**Important** : Après avoir créé ou modifié `.env.local`, redémarrez le serveur de développement Vite.

## Vérification

1. Vérifiez que `.env` existe à la racine avec toutes les variables
2. Créez `client/.env.local` avec `VITE_WS_URL=ws://localhost:5000/ws`
3. Redémarrez le serveur : `npm run dev`

