# 🧪 Tests à Effectuer Après les Corrections

## ⚠️ IMPORTANT : Actions Manuelles Requises AVANT les Tests

### 1. Configurer SESSION_SECRET sur Render

**Générez un secret** (ou utilisez celui-ci) :
```
SESSION_SECRET=<générez-un-secret-aléatoire-de-64-caractères>
```

**Sur Render** :
1. Allez dans votre service → Environment
2. Ajoutez la variable `SESSION_SECRET`
3. Collez le secret généré
4. Sauvegardez

**⚠️ Si SESSION_SECRET n'est pas défini en production, le serveur ne démarrera pas !**

---

## 🧪 Tests de Base

### Test 1 : Connexion Simple
**Objectif** : Vérifier que la connexion fonctionne

1. Allez sur la page de connexion
2. Connectez-vous avec :
   - Email : `nguilane.fall@gmail.com`
   - Mot de passe : `Admin123!`
3. ✅ **Résultat attendu** : Redirection vers `/host` et vous restez connecté

**Logs à vérifier** :
```
[AUTH] Session created for user: <userId> (nguilane.fall@gmail.com)
✅ PostgreSQL session store initialized
```

---

### Test 2 : Persistance des Sessions
**Objectif** : Vérifier que les sessions survivent au redémarrage

1. Connectez-vous
2. Vérifiez que vous voyez vos propriétés
3. **Sur Render** : Redémarrez le service (ou attendez un redéploiement)
4. Rafraîchissez la page
5. ✅ **Résultat attendu** : Vous restez connecté, vos propriétés sont toujours là

**Logs à vérifier** :
```
[AUTH] Session deserialized for user: <userId>
```

---

### Test 3 : Multi-Device
**Objectif** : Vérifier que plusieurs sessions fonctionnent

1. Connectez-vous sur Chrome
2. Ouvrez un autre navigateur (Firefox/Safari) ou un appareil mobile
3. Connectez-vous avec le même compte
4. ✅ **Résultat attendu** : Les deux sessions fonctionnent indépendamment

---

### Test 4 : Déconnexion
**Objectif** : Vérifier que la déconnexion fonctionne correctement

1. Connectez-vous
2. Cliquez sur "Déconnexion"
3. Rafraîchissez la page
4. ✅ **Résultat attendu** : 
   - Redirection vers la page d'accueil
   - Cookie de session supprimé
   - Impossible d'accéder aux pages protégées

**Logs à vérifier** :
```
[AUTH] User logged out: <userId>
```

---

### Test 5 : Session Expirée
**Objectif** : Vérifier la gestion des sessions expirées

1. Connectez-vous
2. Modifiez temporairement `maxAge` dans `server/index.ts` à `60000` (1 minute)
3. Attendez 1 minute
4. Rafraîchissez la page
5. ✅ **Résultat attendu** : Redirection vers la page de connexion

**⚠️ Remettez `maxAge` à sa valeur normale après le test !**

---

### Test 6 : Compte Supprimé
**Objectif** : Vérifier que les sessions invalides sont nettoyées

1. Créez un compte test
2. Connectez-vous avec ce compte
3. Supprimez le compte de la base de données (via Supabase SQL Editor)
4. Rafraîchissez la page
5. ✅ **Résultat attendu** : 
   - Session nettoyée automatiquement
   - Redirection vers la page de connexion
   - Message d'erreur approprié

**Logs à vérifier** :
```
[AUTH] User not found during deserialization: <userId> - session will be invalidated
```

---

## 🔍 Tests de Validation de Données

### Test 7 : Validation de Cohérence
**Objectif** : Vérifier qu'il n'y a pas de données incohérentes

1. Exécutez le script :
   ```bash
   node validate-data-consistency.js
   ```
2. ✅ **Résultat attendu** : Aucun problème détecté (ou liste des problèmes à corriger)

---

### Test 8 : Nettoyage des Sessions
**Objectif** : Vérifier le nettoyage automatique

1. Connectez-vous plusieurs fois (créer plusieurs sessions)
2. Attendez que certaines sessions expirent
3. Vérifiez les logs :
   ```
   [SESSION] Cleaned up X expired session(s)
   ```
4. ✅ **Résultat attendu** : Les sessions expirées sont nettoyées automatiquement

---

## 🐛 Tests de Bugs Spécifiques

### Test 9 : Compte Dupliqué
**Objectif** : Vérifier qu'on ne peut pas créer deux comptes avec le même email

1. Essayez de créer un compte avec `nguilane.fall@gmail.com`
2. ✅ **Résultat attendu** : 
   - Erreur 409
   - Message : "Un compte existe déjà avec cet email"
   - Code : "DUPLICATE_EMAIL"

---

### Test 10 : Données Persistantes
**Objectif** : Vérifier que les données ne sont pas perdues

1. Créez une propriété
2. Redémarrez le serveur
3. ✅ **Résultat attendu** : La propriété est toujours là

---

### Test 11 : Erreurs de Connexion
**Objectif** : Vérifier la gestion des erreurs

1. Essayez de vous connecter avec un mauvais mot de passe
2. ✅ **Résultat attendu** : 
   - Erreur 401
   - Message clair : "Email ou mot de passe incorrect"
   - Logs d'erreur dans la console serveur

**Logs à vérifier** :
```
[AUTH] Login failed for email: <email>
```

---

## 📊 Monitoring

### Logs à Surveiller

**Succès** :
- `✅ PostgreSQL session store initialized`
- `[AUTH] Session created for user: <userId>`
- `[AUTH] Session deserialized for user: <userId>`

**Erreurs** :
- `❌ CRITICAL: SESSION_SECRET must be set in production!`
- `[AUTH] User not found during deserialization`
- `[AUTH] Login failed for email: <email>`

**Nettoyage** :
- `[SESSION] Cleaned up X expired session(s)`

---

## ✅ Checklist de Validation

- [ ] SESSION_SECRET configuré sur Render
- [ ] Serveur démarre sans erreur
- [ ] Connexion fonctionne
- [ ] Sessions persistent après redémarrage
- [ ] Déconnexion fonctionne
- [ ] Multi-device fonctionne
- [ ] Pas de comptes dupliqués
- [ ] Données persistantes
- [ ] Logs d'erreur visibles
- [ ] Nettoyage automatique des sessions

---

## 🚨 Si un Test Échoue

1. **Vérifiez les logs** sur Render ou en local
2. **Vérifiez SESSION_SECRET** est bien défini
3. **Vérifiez DATABASE_URL** est correct
4. **Exécutez** `validate-data-consistency.js` pour détecter les problèmes
5. **Consultez** `AUDIT_BUGS_FIXES.md` pour les détails des corrections

---

## 📝 Notes

- Les sessions sont maintenant stockées en PostgreSQL, donc elles persistent après redéploiement
- Le nettoyage automatique s'exécute toutes les heures par défaut
- Les logs sont maintenant structurés avec le préfixe `[AUTH]` et `[SESSION]`
- Les erreurs sont maintenant loggées avec des détails pour faciliter le debugging

