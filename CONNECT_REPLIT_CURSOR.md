# 🔗 Connecter Replit à Cursor (via Git)

## Méthode 1 : Via GitHub (Recommandé - Le plus simple)

### Étape 1 : Créer un dépôt GitHub

1. Allez sur https://github.com/new
2. Créez un nouveau dépôt (par exemple : `airbnb-bot`)
3. **Ne cochez PAS** "Initialize with README" (vous avez déjà du code)
4. Cliquez sur "Create repository"

### Étape 2 : Connecter votre projet local (Cursor) à GitHub

Dans Cursor (terminal) :

```bash
# Si vous n'avez pas encore de remote GitHub
git remote add origin https://github.com/VOTRE_USERNAME/airbnb-bot.git

# Ou si vous préférez SSH (après avoir ajouté votre clé SSH sur GitHub)
git remote add origin git@github.com:VOTRE_USERNAME/airbnb-bot.git

# Pousser votre code vers GitHub
git push -u origin main
```

### Étape 3 : Connecter Replit au même dépôt GitHub

1. **Sur Replit** :
   - Ouvrez votre projet Replit
   - Cliquez sur les **3 points** (menu) en haut à droite
   - Sélectionnez **"GitHub"** ou **"Connect to Git"**
   - Connectez-vous avec votre compte GitHub
   - Sélectionnez le dépôt `airbnb-bot`
   - Cliquez sur **"Import"**

2. **OU via Terminal Replit** :
   ```bash
   git remote add origin https://github.com/VOTRE_USERNAME/airbnb-bot.git
   git pull origin main
   ```

### Étape 4 : Synchronisation bidirectionnelle

**Depuis Cursor (après modification)** :
```bash
git add .
git commit -m "Vos modifications"
git push origin main
```

**Sur Replit (pour récupérer les changements)** :
```bash
git pull origin main
```

**Depuis Replit (après modification)** :
```bash
git add .
git commit -m "Modifications sur Replit"
git push origin main
```

**Dans Cursor (pour récupérer)** :
```bash
git pull origin main
```

---

## Méthode 2 : Via GitLab

Même principe que GitHub, mais avec GitLab :
- Créez un projet sur https://gitlab.com
- Utilisez l'URL GitLab au lieu de GitHub

---

## Méthode 3 : Replit Git (Replit Pro)

Si vous avez Replit Pro :

1. **Sur Replit** :
   - Ouvrez votre projet
   - Allez dans **"Version Control"** (dans la barre latérale)
   - Créez un nouveau dépôt Git
   - Notez l'URL du dépôt Replit

2. **Dans Cursor** :
   ```bash
   git remote add replit https://replit.com/@VOTRE_USERNAME/VOTRE_REPL.git
   git push replit main
   ```

---

## 🔑 Configuration SSH (Optionnel)

Si vous voulez utiliser SSH au lieu de HTTPS :

### Sur GitHub/GitLab :
1. Allez dans **Settings** > **SSH Keys**
2. Cliquez sur **"New SSH Key"**
3. Collez votre clé publique :
   ```bash
   cat ~/.ssh/id_ed25519_airbnb.pub
   ```
4. Copiez et collez dans GitHub/GitLab

### Puis utilisez l'URL SSH :
```bash
git remote set-url origin git@github.com:VOTRE_USERNAME/airbnb-bot.git
```

---

## ✅ Vérification

Pour vérifier que tout est connecté :

```bash
# Voir tous les remotes
git remote -v

# Voir les branches
git branch -a
```

---

## 🚀 Workflow recommandé

1. **Travaillez dans Cursor** (meilleur IDE)
2. **Testez sur Replit** (environnement en ligne)
3. **Synchronisez via Git** (push/pull)

---

## ⚠️ Important

- ✅ **Toujours** faire `git pull` avant de travailler pour avoir la dernière version
- ✅ **Toujours** faire `git push` après vos modifications
- ⚠️ Ne committez **JAMAIS** le fichier `.env` (il contient vos clés secrètes)
- ✅ Utilisez les **Secrets** sur Replit pour les variables d'environnement
