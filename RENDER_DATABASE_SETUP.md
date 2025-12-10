# 🔧 Configuration Base de Données sur Render

## ⚠️ Erreur "getaddrinfo ENOTFOUND"

Cette erreur indique que Render ne peut pas résoudre le nom DNS de Supabase. Voici comment la résoudre :

---

## ✅ Solution 1 : Vérifier la Variable DATABASE_URL sur Render

1. **Allez sur votre dashboard Render** : https://dashboard.render.com
2. **Sélectionnez votre service** (AirbnbBot)
3. **Allez dans "Environment"**
4. **Vérifiez que `DATABASE_URL` est définie**

### Format correct pour Supabase :

```
postgresql://postgres.pjsuscnntgxghagodvzk:[PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**OU** (connexion directe) :

```
postgresql://postgres.pjsuscnntgxghagodvzk:[PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:5432/postgres
```

### ⚠️ Important : Encodage du mot de passe

Si votre mot de passe contient des caractères spéciaux (comme `@`, `%`, `*`, `?`), vous devez les encoder en URL :

- `@` → `%40`
- `%` → `%25`
- `*` → `%2A`
- `?` → `%3F`
- `/` → `%2F`
- `:` → `%3A`

**Exemple :**
- Mot de passe : `dj@%8x*daR7EPC?`
- Encodé : `dj%40%258x%2AdaR7EPC%3F`

---

## ✅ Solution 2 : Vérifier que Supabase n'est pas en pause

1. **Allez sur** https://app.supabase.com
2. **Sélectionnez votre projet** (pjsuscnntgxghagodvzk)
3. **Vérifiez le statut** :
   - Si "Paused", cliquez sur "Resume"
   - Attendez quelques minutes que le projet redémarre

---

## ✅ Solution 3 : Utiliser l'URL Pooler (Recommandé)

L'URL pooler est plus stable pour les connexions depuis Render :

```
postgresql://postgres.pjsuscnntgxghagodvzk:[PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Port 6543** = Pooler (recommandé pour les applications)
**Port 5432** = Connexion directe

---

## ✅ Solution 4 : Vérifier la Région Supabase

Assurez-vous que la région dans l'URL correspond à votre projet :

- `aws-1-eu-north-1` (Stockholm)
- `aws-0-eu-west-1` (Irlande)
- `aws-0-us-east-1` (Virginie)
- etc.

**Où trouver la région :**
1. Supabase Dashboard → Settings → Database
2. Regardez "Connection string" → la région est dans l'hostname

---

## 📋 Checklist de Configuration Render

- [ ] `DATABASE_URL` est définie dans Environment Variables
- [ ] Le mot de passe est correctement encodé (caractères spéciaux)
- [ ] L'URL utilise le pooler (port 6543) ou la connexion directe (port 5432)
- [ ] La région dans l'URL correspond à votre projet Supabase
- [ ] Le projet Supabase n'est pas en pause
- [ ] `BASE_URL` est définie avec votre URL Render (ex: `https://airbnbbot-z18h.onrender.com`)

---

## 🔍 Test de Connexion

Pour tester la connexion depuis Render, ajoutez un endpoint de test :

```bash
curl https://votre-app.onrender.com/api/health
```

Cela devrait retourner :
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## 🚨 Si le Problème Persiste

1. **Vérifiez les logs Render** :
   - Dashboard → Service → Logs
   - Cherchez les messages d'erreur de connexion

2. **Testez la connexion depuis votre machine locale** :
   ```bash
   psql "postgresql://postgres.pjsuscnntgxghagodvzk:[PASSWORD]@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

3. **Contactez le support Supabase** si le projet est actif mais la connexion échoue

---

## 📝 Exemple de Configuration Complète Render

```
DATABASE_URL=postgresql://postgres.pjsuscnntgxghagodvzk:dj%40%258x%2AdaR7EPC%3F@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
BASE_URL=https://airbnbbot-z18h.onrender.com
GEMINI_API_KEY=AIzaSyBu9H5_y-bX-GTR112cBjxbwYC385Mzh84
NODE_ENV=production
PORT=10000
```

---

## ✅ Après Configuration

1. **Redéployez le service** sur Render (ou attendez le redéploiement automatique)
2. **Vérifiez les logs** pour confirmer la connexion
3. **Testez l'API** : `curl https://votre-app.onrender.com/api/health`

