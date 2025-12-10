# 🔧 URL Base de Données Corrigée pour Render

## ❌ URL Actuelle (INCORRECTE)
```
postgresql://postgres:dj@%8x*daR7EPC?@db.pjsuscnntgxghagodvzk.supabase.co:5432/postgres
```

**Problème :** Le mot de passe contient des caractères spéciaux non encodés (`@`, `%`, `*`, `?`), ce qui casse le parsing de l'URL.

---

## ✅ URL Corrigée (Connexion Directe)

**À copier-coller dans Render → Environment Variables → DATABASE_URL :**

```
postgresql://postgres:dj%40%258x%2AdaR7EPC%3F@db.pjsuscnntgxghagodvzk.supabase.co:5432/postgres
```

**Encodage du mot de passe :**
- `dj@%8x*daR7EPC?` → `dj%40%258x%2AdaR7EPC%3F`
- `@` → `%40`
- `%` → `%25`
- `*` → `%2A`
- `?` → `%3F`

---

## ✅ URL Pooler (RECOMMANDÉ - Plus Stable)

**Pour une meilleure stabilité, utilisez le pooler Supabase :**

```
postgresql://postgres.pjsuscnntgxghagodvzk:dj%40%258x%2AdaR7EPC%3F@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Avantages du pooler :**
- ✅ Meilleure gestion des connexions
- ✅ Plus stable pour les applications
- ✅ Moins de problèmes de timeout
- ✅ Optimisé pour les requêtes fréquentes

---

## 📋 Instructions pour Render

1. **Allez sur** https://dashboard.render.com
2. **Sélectionnez votre service** (AirbnbBot)
3. **Cliquez sur "Environment"** dans le menu de gauche
4. **Trouvez la variable `DATABASE_URL`**
5. **Remplacez la valeur** par l'une des URLs ci-dessus (pooler recommandé)
6. **Sauvegardez**
7. **Render redéploiera automatiquement**

---

## 🔍 Vérification

Après le redéploiement, vérifiez les logs Render. Vous devriez voir :

```
🔌 Attempting to connect to Supabase database at aws-1-eu-north-1.pooler.supabase.com...
✅ Database connection successful (Supabase)
```

**OU** (si connexion directe) :

```
🔌 Attempting to connect to Supabase database at db.pjsuscnntgxghagodvzk.supabase.co...
✅ Database connection successful (Supabase)
```

---

## ⚠️ Si l'Erreur Persiste

1. **Vérifiez que Supabase n'est pas en pause** :
   - https://app.supabase.com → Projet → Statut

2. **Vérifiez la région** :
   - Si votre projet est dans une autre région, ajustez l'hostname
   - Exemple : `aws-0-eu-west-1` au lieu de `aws-1-eu-north-1`

3. **Testez la connexion depuis votre machine** :
   ```bash
   psql "postgresql://postgres.pjsuscnntgxghagodvzk:dj%40%258x%2AdaR7EPC%3F@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

---

## 📝 Variables d'Environnement Complètes Render

Assurez-vous d'avoir toutes ces variables :

```
DATABASE_URL=postgresql://postgres.pjsuscnntgxghagodvzk:dj%40%258x%2AdaR7EPC%3F@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
BASE_URL=https://airbnbbot-z18h.onrender.com
GEMINI_API_KEY=AIzaSyBu9H5_y-bX-GTR112cBjxbwYC385Mzh84
NODE_ENV=production
PORT=10000
```

