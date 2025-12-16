# 🚀 Pousser le Projet sur GitHub

## 📋 Étape 1 : Créer un Dépôt sur GitHub

1. **Va sur [GitHub.com](https://github.com)**
2. **Connecte-toi** à ton compte
3. **Clique sur** le bouton **"+"** en haut à droite
4. **Sélectionne** **"New repository"**
5. **Donne un nom** au dépôt (ex: `airbnb-cohost-bot`)
6. **Choisis** Public ou Private
7. **⚠️ NE COCHE PAS** "Initialize with README" (on a déjà un commit)
8. **Clique sur** **"Create repository"**

## 🔗 Étape 2 : Copier l'URL du Dépôt

Après création, GitHub affichera l'URL du dépôt :
- **HTTPS** : `https://github.com/TON_USERNAME/TON_REPO.git`
- **SSH** : `git@github.com:TON_USERNAME/TON_REPO.git`

## 📤 Étape 3 : Connecter et Pousser le Code

### Option A : Via le Script Automatique

```bash
cd /Users/nguilane./Downloads/airbnb-cohost

# Avec l'URL du dépôt en argument
./PUSH_TO_GITHUB.sh https://github.com/TON_USERNAME/TON_REPO.git
```

### Option B : Manuellement (Recommandé)

```bash
cd /Users/nguilane./Downloads/airbnb-cohost

# 1. Ajouter le remote GitHub (remplace par ton URL)
git remote add origin https://github.com/TON_USERNAME/TON_REPO.git

# 2. Renommer la branche en main
git branch -M main

# 3. Pousser le code vers GitHub
git push -u origin main
```

## ✅ Vérification

Une fois le code poussé, va sur GitHub.com dans ton dépôt et tu devrais voir tous les fichiers du projet !

---

## 🔐 Authentification GitHub

### Si tu utilises HTTPS

GitHub peut demander une authentification :
- **Token d'accès personnel** (recommandé)
  1. Va sur GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
  2. Génère un nouveau token avec les permissions `repo`
  3. Utilise ce token comme mot de passe lors du push

- **GitHub CLI** (plus simple)
  ```bash
  gh auth login
  ```

### Si tu utilises SSH

Assure-toi d'avoir configuré une clé SSH sur GitHub :
- [Guide GitHub SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

---

## 📝 Commandes Rapides pour les Futures Modifications

```bash
# Ajouter les changements
git add .

# Créer un commit
git commit -m "Description des changements"

# Pousser vers GitHub
git push
```

---

## 🆘 Dépannage

### Erreur : "remote origin already exists"

```bash
# Vérifier le remote actuel
git remote -v

# Supprimer le remote (si nécessaire)
git remote remove origin

# Ajouter le nouveau remote
git remote add origin https://github.com/TON_USERNAME/TON_REPO.git
```

### Erreur : "repository not found"

- Vérifie que l'URL du dépôt est correcte
- Vérifie que tu as les permissions d'accès au dépôt
- Vérifie que tu es connecté à GitHub

### Erreur : "authentication failed"

- Vérifie ton nom d'utilisateur et mot de passe/token
- Utilise un token d'accès personnel au lieu du mot de passe
- Ou configure SSH pour GitHub

---

## ✅ Une Fois Poussé

Ton projet sera visible sur GitHub à l'URL :
```
https://github.com/TON_USERNAME/TON_REPO
```

Tu pourras :
- ✅ Voir tout le code
- ✅ Cloner le projet ailleurs
- ✅ Partager le projet
- ✅ Collaborer avec d'autres développeurs

---

**Besoin d'aide ?** Dis-moi si tu rencontres des problèmes !


