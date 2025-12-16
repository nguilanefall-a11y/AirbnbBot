# 🚀 Guide de déploiement sur Mac Serveur

## Étape 1 : Installer les extensions VS Code

```bash
# Installer les 5 extensions essentielles
code --install-extension ms-playwright.playwright
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-python.python
code --install-extension cweijan.vscode-postgresql-client2

# Vérifier l'installation
code --list-extensions | grep -E "(playwright|eslint|prettier|python|postgresql)"
```

## Étape 2 : Cloner le repository GitHub

```bash
cd ~
git clone https://github.com/nguilanefall-a11y/AirbnbBot.git
cd AirbnbBot
```

## Étape 3 : Recevoir les fichiers sensibles depuis le Mac principal

Sur le Mac principal, il va envoyer :
- `airbnb-session.json` (64 cookies de session Airbnb)
- `.env` (DATABASE_URL Supabase + GEMINI_API_KEY)

Ces fichiers vont arriver dans ton dossier `~/` (home). Déplace-les dans le projet :

```bash
# Une fois les fichiers reçus, déplace-les
mv ~/airbnb-session.json ~/AirbnbBot/
mv ~/.env ~/AirbnbBot/

# Vérifier qu'ils sont bien là
ls -la ~/AirbnbBot/ | grep -E "(airbnb-session|\.env)"
```

## Étape 4 : Installer les dépendances Node.js

```bash
cd ~/AirbnbBot
npm install

# Installer Playwright Chromium
npx playwright install chromium
```

## Étape 5 : Tester l'envoi de message

```bash
# Test rapide pour vérifier que tout fonctionne
npx tsx send_message_service.ts
```

Si tu vois une réponse `200` et un message ID, c'est bon ! ✅

## Étape 6 : Lancer le bot en mode continu (24/7)

```bash
# Option A : En mode foreground (pour tester)
POLLING_MODE=continuous POLLING_INTERVAL=30 npx tsx inbox_polling_service.ts

# Option B : En arrière-plan avec logs
nohup npx tsx inbox_polling_service.ts > bot.log 2>&1 &

# Voir les logs en temps réel
tail -f bot.log

# Arrêter le bot
pkill -f "tsx inbox_polling_service"
```

## 🔧 Dépannage

### Erreur de connexion DB
```bash
# Vérifier que .env contient DATABASE_URL
cat .env | grep DATABASE_URL

# Tester la connexion
node test-db-connection.js
```

### Session Airbnb expirée
```bash
# Relancer l'extraction de session (avec navigateur visible)
npx tsx analyze_airbnb_secrets.ts
# → Se connecter manuellement dans le navigateur qui s'ouvre
# → Attendre 2 min que les cookies soient capturés
```

### Port 5000 déjà utilisé
```bash
# Libérer le port
lsof -ti:5000 | xargs kill -9
```

## 📊 Fichiers importants

- `send_message_service.ts` - Envoi de messages via API Airbnb
- `send_message_playwright.ts` - Envoi via automation navigateur
- `inbox_polling_service.ts` - Surveillance boîte de réception
- `airbnb-session.json` - Session Airbnb (SENSIBLE - pas dans Git)
- `.env` - Variables d'environnement (SENSIBLE - pas dans Git)

## ✅ Checklist finale

- [ ] Extensions VS Code installées (5)
- [ ] Repository cloné depuis GitHub
- [ ] Fichiers sensibles reçus et déplacés
- [ ] `npm install` terminé
- [ ] Playwright Chromium installé
- [ ] Test d'envoi de message réussi
- [ ] Bot lancé en mode continu

Une fois tout coché, le bot tourne 24/7 ! 🎉
