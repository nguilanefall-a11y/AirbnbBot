# 🚀 Ouvrir le Projet dans VS Code

## 📋 Méthode 1 : Depuis VS Code (Recommandé)

1. **Ouvre VS Code**
2. **Clique sur** `File` > `Open Folder...` (ou `Cmd + O` sur Mac)
3. **Navigue vers** le dossier du projet :
   ```
   /Users/nguilane./Downloads/airbnb-cohost
   ```
4. **Clique sur** `Open`

✅ **C'est fait !** Le projet est maintenant ouvert dans VS Code.

---

## 📋 Méthode 2 : Depuis le Terminal

```bash
cd /Users/nguilane./Downloads/airbnb-cohost
code .
```

Cela ouvrira automatiquement VS Code avec le projet chargé.

---

## 📋 Méthode 3 : Depuis Finder (Mac)

1. **Ouvre Finder**
2. **Navigue vers** : `/Users/nguilane./Downloads/airbnb-cohost`
3. **Clic droit** sur le dossier `airbnb-cohost`
4. **Choisis** `Services` > `New Terminal at Folder` (si disponible)
   OU
   **Fais glisser** le dossier sur l'icône VS Code dans le Dock

---

## ✅ Configurations VS Code incluses

Le projet inclut des configurations VS Code dans `.vscode/` :

### 1. **settings.json**
- Configuration Python (interpréteur, formatage)
- Exclusions de fichiers (logs, session, cache)
- Support du fichier `.env`

### 2. **launch.json**
- Configuration de débogage pour l'API
- Configuration pour les workers SYNC + SEND
- Configuration pour exécuter le fichier actuel

### 3. **extensions.json**
- Recommandations d'extensions VS Code :
  - Python (ms-python.python)
  - Pylance (ms-python.vscode-pylance)
  - Black Formatter (ms-python.black-formatter)
  - Flake8 (ms-python.flake8)
  - Playwright (ms-playwright.playwright)
  - GitLens (eamodio.gitlens)

---

## 🔧 Installer les Extensions Recommandées

1. **Ouvre VS Code** avec le projet
2. **VS Code affichera une notification** pour installer les extensions recommandées
   OU
   **Clique sur** `View` > `Command Palette` (ou `Cmd + Shift + P`)
3. **Tape** : `Extensions: Show Recommended Extensions`
4. **Installe** les extensions suggérées

---

## 🚀 Lancer le Projet depuis VS Code

### Option 1 : Via le Terminal intégré

1. **Ouvre le terminal** : `Terminal` > `New Terminal` (ou `` Ctrl + ` ``)
2. **Lance les commandes** :
   ```bash
   # API
   python3 src/main.py api
   
   # Workers
   python3 src/main.py syncsend
   ```

### Option 2 : Via les Configurations de Débogage

1. **Ouvre** le panneau `Run and Debug` : `View` > `Run and Debug` (ou `Cmd + Shift + D`)
2. **Sélectionne** une configuration :
   - `Python: API` - Lance l'API
   - `Python: SYNC + SEND Workers` - Lance les workers
3. **Clique sur** le bouton ▶️ (Play) ou appuie sur `F5`

---

## 📁 Structure du Projet dans VS Code

Le projet s'organise comme suit :

```
airbnb-cohost/
├── .vscode/              # Configurations VS Code
├── src/                  # Code source principal
│   ├── api/             # API FastAPI
│   ├── db/              # Base de données
│   ├── playwright/      # Actions Playwright
│   ├── services/        # Services métier
│   └── workers/         # Workers
├── scripts/             # Scripts utilitaires
├── logs/                # Fichiers de logs
├── .env                 # Variables d'environnement (non versionné)
├── requirements.txt     # Dépendances Python
└── README.md           # Documentation
```

---

## ✅ Vérifications après Ouverture

1. **Vérifie l'interpréteur Python** :
   - Clique sur `Python X.X.X` en bas à droite de VS Code
   - Sélectionne `python3` ou un environnement virtuel

2. **Vérifie que `.env` existe** :
   - Le fichier `.env` doit être présent (copie depuis `.env.example` si besoin)

3. **Installe les dépendances** (si pas déjà fait) :
   ```bash
   pip install -r requirements.txt
   ```

---

## 🎯 Astuces VS Code

### Raccourcis Utiles

- `` Ctrl + ` `` : Ouvrir/fermer le terminal
- `Cmd + Shift + P` : Command Palette
- `Cmd + P` : Rechercher un fichier
- `Cmd + Shift + F` : Rechercher dans tous les fichiers
- `F5` : Lancer le débogueur
- `Cmd + B` : Afficher/masquer la sidebar

### Débogage

- Place un **breakpoint** en cliquant à gauche du numéro de ligne
- Lance le débogueur (`F5`)
- Utilise les contrôles de débogage pour avancer pas à pas

---

## 📝 Notes

- Les fichiers `.env` et `logs/` sont ignorés par Git (normal)
- VS Code peut suggérer des extensions - installe-les pour une meilleure expérience
- Le terminal intégré utilise le répertoire du projet par défaut

---

✅ **Le projet est maintenant prêt pour VS Code !**


