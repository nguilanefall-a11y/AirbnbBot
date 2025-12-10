# 🔧 Solution : Propriétés Visibles sur Localhost mais Pas sur Render

## 🔴 Problème

Vos propriétés sont visibles sur **localhost** mais **pas sur Render**.

## 🔍 Causes Possibles

### 1. Cookie `secure: true` mais URL non HTTPS
**Problème** : Si `BASE_URL` n'est pas défini ou ne commence pas par `https://`, le cookie `secure: true` empêche l'envoi du cookie.

**Solution** : Vérifier que `BASE_URL` est correctement configuré sur Render.

### 2. Session Non Persistante
**Problème** : Les sessions ne sont pas correctement stockées en PostgreSQL sur Render.

**Solution** : Vérifier que `DATABASE_URL` est correctement configuré.

### 3. Cookie Non Envoyé
**Problème** : Le cookie n'est pas envoyé avec les requêtes à cause d'un problème de domaine.

**Solution** : Vérifier la configuration du domaine du cookie.

---

## ✅ Solutions

### Solution 1 : Vérifier BASE_URL sur Render

**Sur Render → Environment Variables**, vérifiez que :

```
BASE_URL=https://airbnbbot-z18h.onrender.com
```

**⚠️ Important** : 
- Doit commencer par `https://`
- Doit correspondre exactement à votre URL Render
- Pas de slash à la fin

### Solution 2 : Vérifier SESSION_SECRET

**Sur Render → Environment Variables**, vérifiez que :

```
SESSION_SECRET=<votre-secret-de-64-caractères>
```

Si ce n'est pas défini, générez-en un :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Solution 3 : Vérifier DATABASE_URL

**Sur Render → Environment Variables**, vérifiez que :

```
DATABASE_URL=postgresql://postgres.pjsuscnntgxghagodvzk:dj%40%258x%2AdaR7EPC%3F@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**⚠️ Important** : Le mot de passe doit être encodé en URL.

---

## 🔧 Corrections Appliquées

1. ✅ **Configuration des cookies améliorée** : Détection automatique de HTTPS
2. ✅ **Logs de configuration** : Affiche la configuration des cookies au démarrage
3. ✅ **Gestion flexible** : `secure: false` si BASE_URL n'est pas HTTPS

---

## 🧪 Test Rapide

### 1. Vérifier la Connexion sur Render

1. Allez sur votre application Render
2. Connectez-vous avec :
   - Email : `nguilane.fall@gmail.com`
   - Mot de passe : `Admin123!`
3. Ouvrez la console du navigateur (F12)
4. Allez dans "Application" → "Cookies"
5. Vérifiez que le cookie `airbnb.session` existe

### 2. Vérifier les Logs Render

Sur Render → Logs, vous devriez voir :

```
[SESSION] Cookie configuration: secure=true, baseUrl=https://airbnbbot-z18h.onrender.com
✅ PostgreSQL session store initialized
[AUTH] Session created for user: d4cadb35-8d62-44d3-a80e-ca44b12e3187
[PROPERTIES] Fetching properties for user: d4cadb35-8d62-44d3-a80e-ca44b12e3187
[PROPERTIES] Found 5 properties for user d4cadb35-8d62-44d3-a80e-ca44b12e3187
```

### 3. Test de l'API Directement

Testez directement l'API sur Render :

```bash
# 1. Se connecter
curl -X POST https://airbnbbot-z18h.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nguilane.fall@gmail.com","password":"Admin123!"}' \
  -c cookies.txt

# 2. Récupérer les propriétés
curl https://airbnbbot-z18h.onrender.com/api/properties \
  -b cookies.txt
```

---

## 📋 Checklist Render

- [ ] `BASE_URL` est défini et commence par `https://`
- [ ] `SESSION_SECRET` est défini (64 caractères)
- [ ] `DATABASE_URL` est défini avec mot de passe encodé
- [ ] `GEMINI_API_KEY` est défini
- [ ] `NODE_ENV=production` (optionnel, mais recommandé)

---

## 🚨 Si Le Problème Persiste

### 1. Vérifier les Logs Render

Sur Render → Logs, cherchez :
- `[SESSION] Cookie configuration: ...`
- `[AUTH] Session created for user: ...`
- `[PROPERTIES] Fetching properties for user: ...`
- `[AUTH] Unauthenticated request to ...`

### 2. Vérifier le Cookie dans le Navigateur

1. Ouvrez la console (F12)
2. Allez dans "Application" → "Cookies"
3. Vérifiez :
   - Le cookie `airbnb.session` existe
   - Le domaine correspond à votre URL Render
   - Le cookie n'est pas expiré
   - Le cookie a `Secure` si l'URL est HTTPS

### 3. Tester la Connexion

1. Déconnectez-vous complètement
2. Videz le cache du navigateur
3. Reconnectez-vous
4. Vérifiez que vous voyez vos propriétés

---

## 💡 Solution Temporaire (Si Urgent)

Si vous devez absolument voir vos propriétés maintenant, vous pouvez temporairement désactiver `secure` pour les cookies :

**Dans `server/index.ts`**, changez :
```typescript
secure: isHttps,
```

En :
```typescript
secure: false, // Temporaire pour debug
```

**⚠️ Ne gardez pas cette configuration en production !** C'est juste pour tester.

---

## ✅ Après Correction

Une fois `BASE_URL` correctement configuré sur Render :

1. Redéployez l'application (automatique via GitHub)
2. Reconnectez-vous
3. Vous devriez voir vos 5 propriétés

Les logs vont maintenant afficher la configuration exacte des cookies pour faciliter le debugging.

