# 🔄 Guide pour FORCER l'Upload depuis le Mac Principal

## ❌ Problème Actuel

La synchronisation VS Code a téléchargé les paramètres du **Mac inutilisé** vers le **Mac principal** au lieu de l'inverse.

## ✅ Solution : Forcer l'Upload depuis ce Mac

### Étape 1 : Désactiver temporairement la Sync sur ce Mac

1. Ouvrir **VS Code** sur ce Mac
2. Cliquer sur l'icône **d'engrenage ⚙️** (en bas à gauche)
3. Cliquer sur **"Désactiver la synchronisation des paramètres"** / **"Turn off Settings Sync"**
4. **NE PAS** effacer les données du cloud

### Étape 2 : Vérifier les extensions actuelles (avant réactivation)

1. Appuyer sur **Cmd+Shift+X** pour ouvrir les Extensions
2. Noter les extensions importantes pour ton projet AirbnbBot :
   - **TypeScript and JavaScript Language Features**
   - **ESLint**
   - **Prettier**
   - **Playwright Test for VSCode**
   - **PostgreSQL** (si installé)
   - **GitHub Copilot** (si utilisé)

### Étape 3 : Nettoyer les extensions indésirables

```bash
# Lister toutes les extensions installées
code --list-extensions

# Désinstaller une extension spécifique (exemple)
code --uninstall-extension EXTENSION_ID
```

**OU directement dans VS Code :**

1. `Cmd+Shift+X`
2. Trouver les extensions non désirées
3. Cliquer sur l'icône **d'engrenage** à côté de l'extension
4. Sélectionner **"Désinstaller"**

### Étape 4 : Réactiver la Sync en MODE UPLOAD

1. Cliquer sur l'icône **d'engrenage ⚙️**
2. Sélectionner **"Activer la synchronisation des paramètres..."**
3. Se reconnecter avec le **même compte GitHub** : `nguilanefall-a11y`
4. **IMPORTANT** : Quand VS Code demande de résoudre les conflits :
   - Choisir **"Replace Remote"** (Remplacer le cloud)
   - OU **"Merge"** puis sélectionner manuellement **"Local"** pour chaque paramètre

### Étape 5 : Forcer l'Upload Immédiat

1. Appuyer sur **Cmd+Shift+P**
2. Taper : `Sync: Sync Now`
3. Confirmer
4. Attendre le message : **"Settings Sync: Uploaded"**

### Étape 6 : Vérifier que l'Upload est réussi

1. **Cmd+Shift+P**
2. Taper : `Sync: Show Synced Data`
3. Vérifier la **date du dernier sync** (doit être récente)
4. Vérifier la liste des extensions synchronisées

---

## 🖥️ Sur le Mac Serveur (après avoir fixé le Mac principal)

### Étape 1 : Désactiver la Sync sur le Mac Serveur

1. Ouvrir VS Code sur le Mac serveur
2. Désactiver la synchronisation : **"Turn off Settings Sync"**
3. **Effacer les données locales** (cette fois c'est OK)

### Étape 2 : Réactiver en MODE DOWNLOAD

1. Réactiver la synchronisation
2. Se connecter avec `nguilanefall-a11y`
3. Quand VS Code demande de résoudre les conflits :
   - Choisir **"Replace Local"** (Télécharger depuis le cloud)
4. Attendre que toutes les extensions du Mac principal soient installées

---

## 🚀 Solution Rapide Alternative : Script de Synchronisation Manuelle

Si la synchronisation VS Code continue à poser problème, voici un script pour copier uniquement les bonnes extensions :

### Sur le Mac Principal (celui-ci) :

```bash
# 1. Exporter la liste des extensions
code --list-extensions > ~/vscode-extensions-principal.txt

# 2. Afficher la liste
cat ~/vscode-extensions-principal.txt
```

### Sur le Mac Serveur :

```bash
# 1. Copier le fichier depuis le Mac principal (via AirDrop ou USB)
# Ou si les deux Macs sont sur le même réseau :
# scp user@mac-principal:~/vscode-extensions-principal.txt ~/

# 2. Installer toutes les extensions listées
cat ~/vscode-extensions-principal.txt | xargs -L 1 code --install-extension

# 3. Vérifier
code --list-extensions
```

---

## ✅ Checklist de Vérification Finale

Sur le **Mac Principal** (après avoir forcé l'upload) :

- [ ] Extensions correctes installées
- [ ] `Sync: Show Synced Data` affiche la bonne liste
- [ ] Date du dernier sync = maintenant

Sur le **Mac Serveur** (après avoir téléchargé) :

- [ ] Mêmes extensions que le Mac principal
- [ ] Paramètres TypeScript identiques
- [ ] Thème et configuration identiques

---

## 🔧 Commandes de Dépannage

### Réinitialiser complètement la Sync VS Code (si tout est cassé)

```bash
# Sur macOS
rm -rf ~/Library/Application\ Support/Code/User/sync
rm -rf ~/Library/Application\ Support/Code/User/globalStorage/storage.json

# Puis redémarrer VS Code et réactiver la sync
```

---

Veux-tu que j'exporte maintenant la liste de tes extensions actuelles pour que tu puisses les réinstaller proprement ?
