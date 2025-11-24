# 🚀 Démarrage Rapide - Co-Hôte Airbnb

## ✅ Étape 1 : Configuration (FAIT)

Votre email co-hôte est configuré : **nguilane.fall@gmail.com** ✅

## 🧪 Étape 2 : Tester la Synchronisation

### Dans l'Interface Web :

1. **Allez dans `/settings`** (Paramètres)
2. **Trouvez la section "Compte Co-Hôte Airbnb"**
3. **Vous verrez** :
   - ✅ Configuration active (badge vert)
   - Un champ pour le **mot de passe Airbnb** (si vous utilisez l'email)
   - Un bouton **"Synchroniser maintenant"**

4. **Entrez votre mot de passe Airbnb** dans le champ
5. **Cliquez sur "Synchroniser maintenant"**

### Ce qui va se passer :

1. 🔐 **Connexion** : Le système se connecte à Airbnb avec votre compte
2. 📋 **Récupération** : Il liste toutes vos annonces accessibles
3. 📨 **Messages** : Il récupère les messages de chaque annonce
4. 🤖 **IA** : Il génère des réponses automatiques
5. ✉️ **Envoi** : Il envoie les réponses via votre compte co-hôte

### Résultats :

Après la synchronisation, vous verrez :
- Nombre d'annonces trouvées
- Nombre de conversations trouvées
- Nombre de messages traités
- Nombre de réponses envoyées

## ⚙️ Vérifications Avant de Tester

### 1. Playwright activé ?

```bash
grep PLAYWRIGHT_ENABLED .env
```

Si rien n'apparaît, ajoutez :
```bash
echo "PLAYWRIGHT_ENABLED=1" >> .env
```

### 2. Serveur en cours d'exécution ?

Le serveur doit être lancé :
```bash
npm run dev
```

Vous devriez voir : `serving on port 5000`

## 🎯 Test Maintenant

1. Ouvrez `http://localhost:5000/settings`
2. Allez dans "Compte Co-Hôte Airbnb"
3. Entrez votre mot de passe
4. Cliquez sur "Synchroniser maintenant"
5. Attendez les résultats (peut prendre 30-60 secondes)

## 📊 Où Voir les Résultats

- **Dans l'interface** : Les résultats s'affichent directement après la synchronisation
- **Dans `/chat`** : Vous verrez les conversations créées
- **Dans les logs serveur** : Messages détaillés de ce qui se passe

## ⚠️ Si ça ne fonctionne pas

1. **Vérifiez les logs du serveur** pour voir l'erreur exacte
2. **Vérifiez que Playwright est installé** : `npm list playwright`
3. **Vérifiez votre mot de passe Airbnb**
4. **Essayez avec les cookies** à la place (plus stable)

## 💡 Astuce : Utiliser les Cookies (Plus Stable)

Au lieu de l'email/password, vous pouvez utiliser les cookies :

1. Connectez-vous à Airbnb avec votre compte co-hôte
2. Ouvrez les DevTools (F12)
3. Network → Rechargez → Cliquez sur une requête
4. Copiez le header `Cookie`
5. Collez-le dans le champ "Cookies de session" dans les paramètres
6. Sauvegardez

Avec les cookies, vous n'aurez plus besoin d'entrer le mot de passe à chaque fois !

---

**Prêt à tester ?** Allez dans `/settings` et cliquez sur "Synchroniser maintenant" ! 🚀



