# 🔄 Instructions : Synchroniser Replit → Cursor

## ✅ Méthode la plus simple (5 minutes)

### Étape 1 : Sur Replit

1. **Téléchargez votre projet en ZIP** :
   - Cliquez sur les **3 points** (menu) en haut à droite
   - Sélectionnez **"Download as zip"**
   - Téléchargez le fichier

### Étape 2 : Dans Cursor

**Option A : Remplacer complètement (si Replit est vraiment plus avancé)**

```bash
# Sauvegarder l'ancien code (au cas où)
cd ..
mv "AirbnbBot 3" "AirbnbBot 3 - ancien"

# Extraire le ZIP de Replit
unzip ~/Downloads/votre-replit.zip
mv nom-du-dossier-extrait "AirbnbBot 3"

cd "AirbnbBot 3"
```

**Option B : Fusionner (garder les deux versions)**

1. Extrayez le ZIP de Replit dans un dossier temporaire
2. Comparez les fichiers manuellement
3. Copiez les fichiers modifiés depuis Replit vers Cursor

---

## 🔗 Méthode Git (pour synchronisation continue)

### Sur Replit - Vérifier Git :

```bash
git remote -v
git status
```

### Si Git n'est pas configuré sur Replit :

```bash
# Sur Replit terminal
git init
git add .
git commit -m "État actuel Replit"
```

### Connecter Replit à GitHub :

1. Créez un dépôt sur GitHub : https://github.com/new
2. Sur Replit :
   ```bash
   git remote add origin https://github.com/VOTRE_USERNAME/airbnb-bot.git
   git push -u origin main
   ```

### Dans Cursor - Récupérer :

```bash
# Dans ce dossier
./sync-from-replit.sh
```

---

## ⚡ Je peux le faire pour vous !

**Donnez-moi :**

1. **L'URL GitHub** de votre Replit (si vous avez déjà Git configuré)
   
   OU

2. **Le ZIP** téléchargé depuis Replit (je peux vous dire où le mettre et extraire)

   OU

3. **Accès SSH** à Replit (si disponible)

---

## 📋 Que préférez-vous ?

- A) Télécharger le ZIP et je vous guide pour l'intégrer
- B) Utiliser Git (si Replit a déjà Git)
- C) Autre méthode ?

Dites-moi et je fais le reste ! 🚀
