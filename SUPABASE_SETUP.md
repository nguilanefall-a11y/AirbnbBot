# Configuration Supabase

## Étapes pour configurer Supabase

### 1. Récupérer les credentials Supabase

Si tu as déjà un projet Supabase (depuis "AirbnbBot 3"), utilise les mêmes credentials.

Sinon, crée un nouveau projet sur [supabase.com](https://supabase.com)

### 2. Récupérer l'URL de connexion

Dans ton projet Supabase :
- Va dans **Settings** → **Database**
- Copie la **Connection string** (URI)
- Format : `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`

⚠️ **Important** : Si ton mot de passe contient des caractères spéciaux, encode-les en URL :
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- etc.

### 3. Configurer le `.env`

Ouvre `/Users/nguilane./Downloads/airbnb-cohost/.env` et ajoute :

```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[TON_MOT_DE_PASSE_ENCODE]@db.[TON_PROJECT_REF].supabase.co:5432/postgres

# Exemple :
# DATABASE_URL=postgresql://postgres:MonP@ss%40word@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### 4. Lancer la migration

```bash
cd /Users/nguilane./Downloads/airbnb-cohost
python3 scripts/migrate.py
```

Cela créera toutes les tables dans Supabase.

### 5. Vérifier dans Supabase

Va dans **Table Editor** de ton projet Supabase, tu devrais voir :
- `listings`
- `threads`
- `messages`
- `queue_outbox`
- `worker_heartbeats`

## Avantages de Supabase

✅ **Hébergé** : Pas besoin de gérer un serveur  
✅ **Gratuit** : 500 MB de stockage, 2 GB de bande passante  
✅ **Backup automatique** : Sauvegardes quotidiennes  
✅ **Interface web** : Gestion facile via le dashboard  
✅ **API REST** : Disponible si besoin plus tard  
✅ **Temps réel** : Possibilité d'ajouter des subscriptions temps réel  

## Alternative : Docker Compose (pour développement local)

Si tu préfères développer localement :

1. Installe Docker Desktop : https://www.docker.com/products/docker-desktop
2. Lance :
   ```bash
   docker-compose up --build
   ```
3. PostgreSQL sera disponible sur `localhost:5432`

Mais pour la production, **Supabase reste recommandé**.


