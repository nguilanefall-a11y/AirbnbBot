# 🔑 Configurer SSH pour GitHub (Dépôt privé)

## Étapes rapides (2 minutes)

### 1. Copier votre clé SSH publique

Votre clé SSH est déjà générée. Copiez-la ci-dessous :

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK/9+GpKrW08bMWM+r2ZvtALcLxUBOLQVY3Uvnl3Mkde airbnb-bot@replit
```

### 2. Ajouter la clé sur GitHub

1. Allez sur : https://github.com/settings/keys
2. Cliquez sur **"New SSH key"** (bouton vert)
3. **Title** : `Cursor MacBook` (ou ce que vous voulez)
4. **Key type** : `Authentication Key`
5. **Key** : Collez la clé ci-dessus (tout le texte)
6. Cliquez sur **"Add SSH key"**

### 3. Tester la connexion

Une fois la clé ajoutée, dites-moi et je teste la connexion !

---

## Alternative : Token d'accès personnel

Si vous préférez utiliser HTTPS avec un token :

1. Allez sur : https://github.com/settings/tokens
2. Cliquez sur **"Generate new token"** > **"Generate new token (classic)"**
3. Donnez-lui un nom : `Cursor Access`
4. Cochez **`repo`** (accès aux dépôts)
5. Cliquez sur **"Generate token"**
6. **COPIEZ LE TOKEN** (vous ne le verrez qu'une fois !)
7. Donnez-moi le token et je configure la connexion

---

## ⚡ Une fois la clé ajoutée

Dites-moi "c'est fait" et je vais :
1. Tester la connexion SSH
2. Récupérer le code depuis Replit
3. Le fusionner avec votre code local
4. Configurer la synchronisation bidirectionnelle

🚀 **Allez ajouter la clé sur GitHub et dites-moi quand c'est fait !**
