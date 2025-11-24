# Guide de Configuration Co-Hôte Airbnb

## 🎯 Nouveau Système

**Plus besoin d'envoyer des liens !** Le système récupère maintenant directement les messages depuis votre compte co-hôte Airbnb.

---

## ✅ Avantages

1. **Légal** : Utilise votre compte co-hôte (accès légitime)
2. **Automatique** : Plus besoin de partager des liens avec les voyageurs
3. **Direct** : Les messages arrivent directement depuis Airbnb
4. **Simple** : Configuration en quelques clics

---

## 🔧 Configuration

### Étape 1 : Accéder aux Paramètres

1. Connectez-vous à votre application
2. Allez dans **Paramètres** (icône ⚙️)
3. Trouvez la section **"Compte Co-Hôte Airbnb"**

### Étape 2 : Récupérer les Cookies (Recommandé)

**Option A : Via les DevTools (Recommandé)**

1. Connectez-vous à Airbnb avec votre compte co-hôte
2. Ouvrez les **DevTools** (F12 ou Cmd+Option+I)
3. Allez dans l'onglet **Network**
4. Rechargez la page (F5)
5. Cliquez sur une requête vers `airbnb.com`
6. Dans l'onglet **Headers**, trouvez la section **Request Headers**
7. Copiez la valeur du header **Cookie**
8. Collez-la dans le champ "Cookies de session" dans les paramètres

**Option B : Via Email/Password**

1. Entrez l'email de votre compte co-hôte
2. Lors de la synchronisation, entrez le mot de passe (non stocké)

### Étape 3 : Sauvegarder

1. Cliquez sur **"Sauvegarder"**
2. Vous verrez un message de confirmation ✅

### Étape 4 : Synchroniser

1. Cliquez sur **"Synchroniser maintenant"**
2. Le système va :
   - Se connecter à votre compte co-hôte
   - Récupérer toutes les annonces accessibles
   - Récupérer les messages de chaque annonce
   - Générer des réponses IA
   - Envoyer les réponses automatiquement

---

## 📊 Résultats de Synchronisation

Après chaque synchronisation, vous verrez :
- **Annonces trouvées** : Nombre d'annonces accessibles
- **Conversations trouvées** : Nombre de conversations avec des messages
- **Messages traités** : Nombre de messages analysés
- **Réponses envoyées** : Nombre de réponses IA envoyées

---

## ⚙️ Synchronisation Automatique

Pour automatiser la synchronisation, vous pouvez :

### Option 1 : Cron Job (Recommandé)

Créez un cron job qui appelle l'API toutes les 15 minutes :

```bash
*/15 * * * * curl -X POST http://localhost:5000/api/sync/cohost \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

### Option 2 : Via Code

```typescript
import { startCoHostSync } from "./server/cohost-sync-service";

const stopSync = await startCoHostSync(
  userId,
  { cookies: user.airbnbCohostCookies },
  15 // Toutes les 15 minutes
);
```

---

## 🔄 Migration depuis l'Ancien Système

### Avant (avec liens)
- Les voyageurs devaient cliquer sur un lien
- Accès via `/guest/:accessKey`
- Messages via le site web

### Maintenant (sans liens)
- Les messages arrivent directement depuis Airbnb
- Plus besoin de partager des liens
- Réponses automatiques via le compte co-hôte

**Action requise :** Aucune ! Le système fonctionne automatiquement une fois configuré.

---

## ⚠️ Bonnes Pratiques

### 1. Renouvellement des Cookies
- Les cookies expirent tous les 7-30 jours
- Renouvelez-les si vous recevez des erreurs d'authentification
- Utilisez des cookies récents

### 2. Fréquence de Synchronisation
- **Recommandé** : Toutes les 15-30 minutes
- **Maximum** : Toutes les 5 minutes
- **Éviter** : Synchronisation en continu

### 3. Sécurité
- Les cookies sont stockés dans la base de données
- Le mot de passe n'est jamais stocké (utilisé uniquement pour la connexion)
- Utilisez un compte co-hôte dédié si possible

---

## 🛠️ Dépannage

### Erreur : "Configuration co-hôte requise"
- Vérifiez que vous avez bien sauvegardé les cookies ou l'email
- Allez dans Paramètres → Compte Co-Hôte Airbnb

### Erreur : "Cookies expirés"
- Renouvelez les cookies depuis les DevTools
- Sauvegardez-les à nouveau dans les paramètres

### Erreur : "Aucune annonce trouvée"
- Vérifiez que le compte co-hôte a bien accès aux annonces
- Connectez-vous manuellement sur Airbnb et vérifiez `https://www.airbnb.com/hosting/listings`

### Messages non envoyés
- Vérifiez les logs pour les erreurs spécifiques
- Testez l'envoi manuellement sur Airbnb
- Vérifiez que le compte co-hôte a les permissions d'envoi

---

## 📝 Résumé

**Configuration minimale :**
1. Récupérer les cookies du compte co-hôte
2. Les coller dans les paramètres
3. Cliquer sur "Sauvegarder"
4. Cliquer sur "Synchroniser maintenant"

**Résultat :**
- ✅ Messages récupérés automatiquement
- ✅ Réponses IA générées
- ✅ Réponses envoyées via le compte co-hôte
- ✅ Plus besoin de liens !

🎉 **Votre système est maintenant configuré et prêt à fonctionner !**



