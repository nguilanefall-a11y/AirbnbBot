# 🔐 Pousser le Code avec un Token GitHub

## ✅ Dépôt GitHub connecté !

Le dépôt local est maintenant connecté à :
```
https://github.com/nguilanefall-a11y/AirbnbBot
```

## 🔑 Étape 1 : Créer un Token d'Accès GitHub

1. **Va sur** : [https://github.com/settings/tokens](https://github.com/settings/tokens)

2. **Clique sur** : `Generate new token` > `Generate new token (classic)`

3. **Configure le token** :
   - **Note** : Donne un nom (ex: `airbnb-bot`)
   - **Expiration** : Choisis une durée (ex: 90 jours ou No expiration)
   - **Permissions** : Coche **`repo`** (accès complet aux dépôts)
     - Cela inclut automatiquement toutes les permissions repo

4. **Clique sur** : `Generate token` (en bas)

5. **⚠️ IMPORTANT** : **COPIE LE TOKEN IMMÉDIATEMENT**
   - Il ressemble à : `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Tu ne pourras plus le voir après !

## 📤 Étape 2 : Pousser le Code

Ouvre un terminal et lance :

```bash
cd /Users/nguilane./Downloads/airbnb-cohost
git push -u origin main
```

Quand Git te demande :
- **Username** : `nguilanefall-a11y`
- **Password** : Colle ton token (PAS ton mot de passe GitHub)

✅ **Le code sera poussé vers GitHub !**

---

## 🔐 Alternative : Configurer SSH (Plus sécurisé)

Si tu préfères utiliser SSH au lieu de HTTPS :

1. **Génère une clé SSH** (si tu n'en as pas) :
   ```bash
   ssh-keygen -t ed25519 -C "ton_email@example.com"
   ```

2. **Ajoute la clé à GitHub** :
   - Copie le contenu de `~/.ssh/id_ed25519.pub`
   - Va sur [https://github.com/settings/keys](https://github.com/settings/keys)
   - Clique "New SSH key"
   - Colle la clé

3. **Change le remote en SSH** :
   ```bash
   cd /Users/nguilane./Downloads/airbnb-cohost
   git remote set-url origin git@github.com:nguilanefall-a11y/AirbnbBot.git
   git push -u origin main
   ```

---

## ✅ Vérification

Une fois le code poussé, va sur :
```
https://github.com/nguilanefall-a11y/AirbnbBot
```

Tu devrais voir tous les fichiers du projet ! 🎉

---

## 💡 Pour les prochaines fois

Si tu utilises un token, Git peut te le demander à chaque fois. Pour éviter ça :

1. **Configure Git Credential Helper** :
   ```bash
   git config --global credential.helper osxkeychain
   ```

2. **Ou utilise SSH** (plus pratique à long terme)

