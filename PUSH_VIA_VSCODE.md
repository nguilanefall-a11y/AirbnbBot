# 🚀 Pousser le Code via VS Code

## ✅ GitHub Connecté à VS Code

VS Code a une interface Git intégrée qui permet de pousser le code facilement !

## 📋 Méthode 1 : Via l'Interface VS Code (Recommandé)

### Étape 1 : Ouvrir le Panneau Git

1. **Ouvre VS Code** avec le projet
2. **Clique sur** l'icône Git dans la sidebar gauche (ou `Cmd + Shift + G`)
3. Tu verras le panneau "Source Control"

### Étape 2 : Vérifier les Changements

Dans le panneau Source Control, tu devrais voir :
- ✅ Tous les fichiers sont commités
- 📤 "Sync Changes" ou "Publish Branch" apparaît en haut

### Étape 3 : Pousser vers GitHub

1. **Clique sur** "Sync Changes" (ou l'icône 🔄 en haut à droite)
   - OU si tu vois "Publish Branch", clique dessus

2. **VS Code va demander** :
   - Si tu veux publier la branche
   - Où publier (choisis GitHub)
   - Quelle branche (choisis `main`)

3. **VS Code va t'authentifier** via GitHub :
   - Si tu es déjà connecté à GitHub dans VS Code, ça se fera automatiquement
   - Sinon, VS Code va t'ouvrir le navigateur pour t'authentifier

4. **Une fois authentifié**, VS Code poussera automatiquement le code !

---

## 📋 Méthode 2 : Via la Command Palette

1. **Ouvre** la Command Palette : `Cmd + Shift + P`
2. **Tape** : `Git: Push`
3. **Sélectionne** : `Git: Push`
4. **VS Code va pousser** le code vers GitHub

---

## 📋 Méthode 3 : Via le Terminal Intégré

1. **Ouvre le terminal** dans VS Code : `` Ctrl + ` ``
2. **Lance** :
   ```bash
   git push -u origin main
   ```
3. **VS Code va demander** l'authentification si nécessaire

---

## ✅ Vérification

Une fois le code poussé, tu verras dans VS Code :
- ✅ "Sync Changes" devient "↑↓ 0"
- ✅ Un message de confirmation

**Vérifie aussi sur GitHub** :
```
https://github.com/nguilanefall-a11y/AirbnbBot
```

Tu devrais voir tous tes fichiers !

---

## 🔐 Authentification GitHub dans VS Code

Si VS Code te demande de t'authentifier :

1. **VS Code va ouvrir** une page GitHub dans ton navigateur
2. **Connecte-toi** à GitHub
3. **Autorise** VS Code à accéder à tes dépôts
4. **Retourne dans VS Code** - l'authentification est terminée !

---

## 💡 Astuce : Synchronisation Automatique

Après le premier push, tu peux configurer VS Code pour synchroniser automatiquement :

1. **Va dans** : Settings (`Cmd + ,`)
2. **Cherche** : `git.autofetch`
3. **Coche** : "Git: Autofetch"

VS Code synchronisera automatiquement avec GitHub !

---

## 🆘 Problèmes Courants

### "Authentication failed"
- Reconnecte-toi à GitHub dans VS Code
- Command Palette > `GitHub: Sign in`

### "Repository not found"
- Vérifie que le remote est correct : `git remote -v`
- Vérifie que tu as accès au dépôt GitHub

### "Permission denied"
- Vérifie que tu es bien connecté à GitHub dans VS Code
- Ré-authentifie-toi si nécessaire

---

✅ **Le code sera poussé vers GitHub via VS Code !**


