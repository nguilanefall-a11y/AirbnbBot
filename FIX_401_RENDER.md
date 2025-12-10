# 🔧 Fix Erreur 401 sur Render - Propriétés Non Visibles

## Problème
L'erreur `401 (Unauthorized)` apparaît lors de la création ou récupération de propriétés sur Render, alors que tout fonctionne en localhost.

## Causes Possibles

### 1. Cookie Non Envoyé (Cause la plus probable)
Le cookie de session n'est pas envoyé avec les requêtes depuis le navigateur vers Render.

**Vérification dans le navigateur :**
1. Ouvrez les DevTools (F12)
2. Allez dans l'onglet **Application** (Chrome) ou **Storage** (Firefox)
3. Cliquez sur **Cookies** → `https://airbnbbot-z18h.onrender.com`
4. Vérifiez qu'un cookie nommé `airbnb.session` existe
5. Si le cookie n'existe pas → problème de connexion/session

### 2. Configuration BASE_URL Manquante
Le cookie `secure: true` nécessite que `BASE_URL` soit défini et commence par `https://`.

**Sur Render :**
1. Allez dans **Environment** → **Environment Variables**
2. Vérifiez que `BASE_URL` est défini :
   ```
   BASE_URL=https://airbnbbot-z18h.onrender.com
   ```
3. **IMPORTANT** : L'URL doit commencer par `https://` (pas `http://`)

### 3. SESSION_SECRET Non Défini
Le secret de session doit être défini en production.

**Sur Render :**
1. Vérifiez que `SESSION_SECRET` est défini
2. Si non défini, générez-en un :
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Ajoutez-le dans Render → Environment Variables

### 4. Cookie Secure en HTTP
Si `BASE_URL` n'est pas défini ou n'est pas HTTPS, le cookie `secure: true` empêche l'envoi.

**Solution temporaire (pour tester) :**
1. Sur Render, ajoutez :
   ```
   COOKIE_SECURE=false
   ```
2. **ATTENTION** : Ceci désactive la sécurité HTTPS. À utiliser uniquement pour tester.

## Étapes de Diagnostic

### Étape 1 : Vérifier les Variables d'Environnement sur Render

Assurez-vous que ces variables sont définies :

```bash
BASE_URL=https://airbnbbot-z18h.onrender.com
SESSION_SECRET=<votre-secret-32-caractères>
DATABASE_URL=<votre-url-encodée>
```

### Étape 2 : Vérifier les Logs Render

1. Allez sur Render → **Logs**
2. Recherchez les messages suivants après une tentative de connexion :
   ```
   [SESSION] Cookie configuration:
     - secure: true
     - baseUrl: https://airbnbbot-z18h.onrender.com
     - isProduction: true
     - store: PostgreSQL
   ```
3. Recherchez les messages d'erreur :
   ```
   [SESSION] ⚠️  Unauthenticated request: POST /api/properties
     - Cookie: missing
     - Session ID: none
   ```

### Étape 3 : Tester la Connexion

1. Allez sur `https://airbnbbot-z18h.onrender.com`
2. Connectez-vous avec :
   - Email : `nguilane.fall@gmail.com`
   - Mot de passe : `Admin123!`
3. Ouvrez les DevTools → **Network**
4. Essayez de créer une propriété
5. Regardez la requête `POST /api/properties` :
   - **Request Headers** → Vérifiez que `Cookie: airbnb.session=...` est présent
   - **Response** → Si 401, regardez le message d'erreur

### Étape 4 : Vérifier le Cookie dans le Navigateur

1. DevTools → **Application** → **Cookies**
2. Vérifiez que `airbnb.session` existe
3. Vérifiez les propriétés :
   - **Secure** : doit être coché (si HTTPS)
   - **SameSite** : doit être `Lax`
   - **HttpOnly** : doit être coché
   - **Expires** : doit être dans le futur

## Solutions

### Solution 1 : Forcer la Réinitialisation de Session

1. Sur Render, ajoutez temporairement :
   ```
   COOKIE_SECURE=false
   ```
2. Redéployez
3. Testez la connexion
4. Si ça fonctionne, le problème vient de `secure: true`
5. Remettez `COOKIE_SECURE=true` et vérifiez que `BASE_URL` est bien `https://`

### Solution 2 : Vérifier le Domaine du Cookie

Si vous utilisez un domaine personnalisé, vérifiez que le cookie est envoyé au bon domaine.

### Solution 3 : Nettoyer les Sessions Expirées

Exécutez le script de nettoyage :
```bash
node cleanup-all-sessions.js
```

Puis reconnectez-vous.

## Test Automatique

Un script de test est disponible : `test-render-auth.js`

Pour l'utiliser :
```bash
RENDER_URL=https://airbnbbot-z18h.onrender.com node test-render-auth.js
```

Ce script teste :
1. La connexion
2. La récupération de l'utilisateur
3. La récupération des propriétés
4. La création d'une propriété

## Logs à Surveiller

Après le déploiement, surveillez ces logs sur Render :

```
✅ PostgreSQL session store initialized
[SESSION] Cookie configuration:
  - secure: true
  - baseUrl: https://airbnbbot-z18h.onrender.com
  - isProduction: true
  - store: PostgreSQL
[AUTH] Session created for user: <user-id> (<email>)
[SESSION] POST /api/properties
  - Authenticated: true
  - User ID: <user-id>
  - Cookie header: present
```

Si vous voyez `Cookie header: missing`, le cookie n'est pas envoyé par le navigateur.

## Contact

Si le problème persiste après avoir suivi ces étapes, partagez :
1. Les logs Render (dernières 50 lignes)
2. Les headers de la requête `POST /api/properties` (depuis DevTools)
3. Les cookies présents dans le navigateur (depuis DevTools → Application)

