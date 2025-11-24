# Guide de Test - Synchronisation Co-Hôte

## ✅ Configuration Actuelle

Votre email co-hôte est configuré : **nguilane.fall@gmail.com**

## 🧪 Tester la Synchronisation

### Option 1 : Via l'Interface (Recommandé)

1. **Allez dans les Paramètres** (`/settings`)
2. **Trouvez la section "Compte Co-Hôte Airbnb"**
3. **Entrez votre mot de passe Airbnb** (si vous utilisez l'email, pas les cookies)
4. **Cliquez sur "Synchroniser maintenant"**

### Option 2 : Via l'API (Pour debug)

```bash
# Récupérer votre session cookie depuis le navigateur
# Puis appeler l'API :
curl -X POST http://localhost:5000/api/sync/cohost \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"password": "VOTRE_MOT_DE_PASSE_AIRBNB"}'
```

## 📋 Ce qui va se passer

1. **Connexion** : Le système va se connecter à Airbnb avec votre compte co-hôte
2. **Récupération des annonces** : Il va lister toutes les annonces accessibles
3. **Récupération des messages** : Pour chaque annonce, il va récupérer les messages
4. **Génération des réponses** : L'IA va générer des réponses pour chaque message
5. **Envoi** : Les réponses seront envoyées via votre compte co-hôte

## ⚠️ Prérequis

1. ✅ **Email configuré** : `nguilane.fall@gmail.com` ✅
2. ⚠️ **Mot de passe** : Vous devrez l'entrer lors de la synchronisation (non stocké)
3. ⚠️ **Playwright activé** : `PLAYWRIGHT_ENABLED=1` dans `.env`
4. ⚠️ **Compte co-hôte actif** : Votre compte doit avoir accès aux annonces

## 🔍 Vérifications

### Vérifier que Playwright est activé

```bash
grep PLAYWRIGHT_ENABLED .env
```

Doit afficher : `PLAYWRIGHT_ENABLED=1`

### Vérifier les logs du serveur

Quand vous cliquez sur "Synchroniser", regardez les logs du serveur. Vous devriez voir :
```
🔐 Connexion au compte co-hôte...
✅ Connecté au compte co-hôte
📋 Récupération des annonces...
✅ X annonce(s) trouvée(s)
```

## 🐛 Dépannage

### Erreur : "Playwright disabled"
- Ajoutez `PLAYWRIGHT_ENABLED=1` dans `.env`
- Redémarrez le serveur

### Erreur : "Email/password ou cookies requis"
- Vérifiez que l'email est bien sauvegardé dans les paramètres
- Si vous utilisez l'email, entrez le mot de passe lors de la synchronisation

### Erreur : "Échec de la connexion"
- Vérifiez que votre compte Airbnb est actif
- Vérifiez que le mot de passe est correct
- Essayez d'utiliser les cookies à la place (plus stable)

### Aucune annonce trouvée
- Vérifiez que votre compte co-hôte a bien accès aux annonces
- Connectez-vous manuellement sur Airbnb et vérifiez `https://www.airbnb.com/hosting/listings`

## 📊 Résultats Attendus

Après la synchronisation, vous devriez voir :
- **Annonces trouvées** : Nombre d'annonces accessibles
- **Conversations trouvées** : Nombre de conversations avec des messages
- **Messages traités** : Nombre de messages analysés
- **Réponses envoyées** : Nombre de réponses IA envoyées

## 🎯 Prochaines Étapes

Une fois que la synchronisation fonctionne :
1. Configurez la synchronisation automatique (toutes les 15 minutes)
2. Vérifiez que les réponses IA sont bien envoyées
3. Surveillez les conversations dans `/chat`



