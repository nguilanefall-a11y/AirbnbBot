# Guide de synchronisation VS Code pour le Mac serveur

## ✅ Étape 1 : Vérification sur le Mac principal (CE MAC)

1. Ouvrir VS Code
2. Cliquer sur l'icône **⚙️ Gérer** (engrenage en bas à gauche)
3. Vérifier que **"Paramètres de synchronisation"** est **ACTIVÉ**
4. Noter le compte connecté (GitHub ou Microsoft)

## 📥 Étape 2 : Activation sur le Mac serveur

### Sur le Mac serveur (inutilisé) :

1. **Ouvrir VS Code**

2. **Activer la synchronisation :**
   - Cliquer sur l'icône **⚙️ Gérer** (engrenage en bas à gauche)
   - Sélectionner **"Activer la Synchronisation des Paramètres..."**
   - Ou utiliser le raccourci : `Cmd+Shift+P` → taper "sync" → "Turn On Settings Sync..."

3. **Se connecter avec le MÊME compte :**
   - Choisir **GitHub** ou **Microsoft** (le même que sur le Mac principal)
   - Autoriser VS Code dans le navigateur
   - Revenir à VS Code

4. **Sélectionner les éléments à synchroniser :**
   - ✅ Paramètres (Settings)
   - ✅ Extensions (Extensions)
   - ✅ Raccourcis clavier (Keyboard Shortcuts)
   - ✅ Snippets
   - ✅ Interface utilisateur (UI State)
   - Cliquer sur **"Fusionner et télécharger"** ou **"Remplacer local"**

5. **Attendre la synchronisation :**
   - Les extensions vont s'installer automatiquement
   - Les paramètres seront appliqués
   - Une notification confirmera la fin de la synchronisation

## 🔧 Extensions importantes pour ce projet

Une fois synchronisé, vérifiez que ces extensions sont installées :

- **Python** (ms-python.python)
- **Pylance** (ms-python.vscode-pylance)
- **Black Formatter** (ms-python.black-formatter)
- **Flake8** (ms-python.flake8)
- **GitLens** (eamodio.gitlens)

## 🚀 Après la synchronisation

1. Ouvrir le dossier du projet :
   ```bash
   cd ~/AirbnbBot
   code .
   ```

2. Sélectionner l'interpréteur Python :
   - `Cmd+Shift+P` → "Python: Select Interpreter"
   - Choisir `./venv/bin/python`

3. Vérifier que tout fonctionne :
   - Ouvrir `src/main.py`
   - Aucune erreur ne devrait apparaître
   - L'auto-complétion devrait fonctionner

## ⚠️ Si la synchronisation échoue

En cas de problème, installez manuellement les extensions essentielles :

```bash
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension ms-python.black-formatter
```

---

**Note :** La synchronisation VS Code ne synchronise PAS les fichiers du projet, seulement les paramètres et extensions. Le code source est déjà sur GitHub et sera cloné via `git clone`.
