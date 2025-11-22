# 🔄 Synchronisation avec GitHub

## ✅ Étape 1 : Dépôt Git initialisé

Le dépôt Git a été initialisé et le commit initial a été créé.

## 📋 Étape 2 : Créer un dépôt sur GitHub

1. Va sur [GitHub.com](https://github.com)
2. Clique sur **"New repository"** (ou **"+"** > **"New repository"**)
3. Donne un nom au dépôt (ex: `airbnb-cohost-bot`)
4. **Ne coche PAS** "Initialize with README" (on a déjà un commit)
5. Clique sur **"Create repository"**

## 🔗 Étape 3 : Connecter le dépôt local à GitHub

Une fois le dépôt créé sur GitHub, GitHub te donnera des commandes. Utilise celles-ci :

```bash
cd /Users/nguilane./Downloads/airbnb-cohost

# Remplace USERNAME et REPO_NAME par tes valeurs
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Ou si tu utilises SSH :
# git remote add origin git@github.com:USERNAME/REPO_NAME.git

# Pousser le code vers GitHub
git branch -M main
git push -u origin main
```

## 🚀 Commandes rapides

### Si tu as déjà créé le dépôt GitHub :

```bash
cd /Users/nguilane./Downloads/airbnb-cohost

# Ajouter le remote (remplace par ton URL GitHub)
git remote add origin https://github.com/TON_USERNAME/TON_REPO.git

# Pousser vers GitHub
git push -u origin main
```

### Pour les prochaines modifications :

```bash
# Ajouter les changements
git add .

# Créer un commit
git commit -m "Description des changements"

# Pousser vers GitHub
git push
```

## 📝 Notes importantes

- Le fichier `.env` est dans `.gitignore` (ne sera pas poussé sur GitHub - c'est normal pour la sécurité)
- Les fichiers de session Playwright sont aussi ignorés
- Les logs sont ignorés

## 🔐 Sécurité

⚠️ **IMPORTANT** : Vérifie que `.env` est bien dans `.gitignore` avant de pousser !

```bash
# Vérifier que .env est ignoré
git check-ignore .env
```

Si ça retourne `.env`, c'est bon ✅

## 🆘 Aide

Si tu as besoin d'aide pour créer le dépôt GitHub ou connecter le remote, dis-moi et je t'aide !

