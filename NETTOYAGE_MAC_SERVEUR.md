# 🧹 Guide de Nettoyage et Migration vers Mac Serveur

## 📋 Contexte

Sur **ce Mac** (Mac principal), on a créé des **fondations solides** :
- ✅ Base de données Neon propre avec `queue_outbox`
- ✅ Workers TypeScript optimisés (Gemini AI recommendations)
- ✅ `.env` complet et correct
- ✅ Session Airbnb valide (64 cookies)
- ✅ Connexion DB testée et fonctionnelle

Sur **l'autre Mac serveur**, il y a l'ancien code avec erreurs qui font crasher les workers.

## 🎯 Objectif

Nettoyer le Mac serveur et y transférer les fondations propres.

---

## 📦 ÉTAPE 1 : Préparation sur ce Mac

### 1.1 Pousser le code propre sur GitHub

```bash
cd "/Users/alpha/Downloads/AirbnbBot 2"

# Ajouter tous les fichiers modifiés
git add .

# Commit avec message clair
git commit -m "feat: Workers TypeScript optimisés + Neon DB + .env complet"

# Pousser sur GitHub
git push origin main
```

### 1.2 Sauvegarder les fichiers sensibles

Copie ces 2 fichiers dans un endroit sûr (USB, AirDrop, etc.) :

```bash
# Sur ce Mac
cd "/Users/alpha/Downloads/AirbnbBot 2"

# Copier vers Desktop pour transfer facile
cp .env ~/Desktop/airbnb-env-backup.txt
cp airbnb-session.json ~/Desktop/airbnb-session-backup.json

echo "✅ Fichiers copiés sur le Desktop"
```

---

## 🧹 ÉTAPE 2 : Nettoyage du Mac Serveur

### 2.1 Arrêter tous les processus

```bash
# Sur le Mac serveur
cd ~/AirbnbBot  # ou le chemin du projet

# Arrêter PM2 si actif
pm2 delete all
pm2 kill

# Tuer tous les processus Node/Python qui tournent
pkill -f "python.*worker"
pkill -f "node.*worker"
pkill -f "playwright"
```

### 2.2 Supprimer l'ancien code (BACKUP D'ABORD)

```bash
# Sur le Mac serveur

# 1. Sauvegarder l'ancien dossier (au cas où)
mv ~/AirbnbBot ~/AirbnbBot_OLD_BACKUP

# 2. Créer un dossier propre
mkdir -p ~/AirbnbBot
```

---

## 📥 ÉTAPE 3 : Installation propre sur Mac Serveur

### 3.1 Cloner le repo GitHub à jour

```bash
# Sur le Mac serveur
cd ~
git clone https://github.com/nguilanefall-a11y/AirbnbBot.git
cd AirbnbBot

echo "✅ Code propre cloné"
```

### 3.2 Installer les dépendances

```bash
# Sur le Mac serveur, dans ~/AirbnbBot

# Installer Node modules
npm install

# Installer postgres pour Neon
npm install postgres

# Installer Playwright et Chromium
npx playwright install chromium

echo "✅ Dépendances installées"
```

### 3.3 Transférer les fichiers sensibles

**Option A : AirDrop / USB**
- Copie `airbnb-env-backup.txt` et `airbnb-session-backup.json` depuis le Mac principal
- Place-les dans `~/AirbnbBot/`

**Option B : Copie manuelle**

Crée `.env` sur le Mac serveur :

```bash
# Sur le Mac serveur
cd ~/AirbnbBot
nano .env
```

Colle ce contenu :

```bash
# ===== DATABASE =====
DATABASE_URL=postgresql://neondb_owner:npg_cK0re4qWCnaE@ep-icy-wind-aga6qe59-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require

# ===== GEMINI AI =====
GEMINI_API_KEY=AIzaSyCNNOe-Z4i1sz-UvhC3aqZ1noN2X4DHPa0

# ===== AIRBNB CREDENTIALS =====
AIRBNB_API_KEY=d306zoyjsyarp7ifhu67rjxn52tv0t20
AIRBNB_EMAIL=yolo.laviecbien@gmail.com
AIRBNB_PASSWORD=Boss4922

# ===== WORKERS INTERVALS (optimisés Gemini) =====
POLLING_INTERVAL_SEC=10
AI_INTERVAL_SEC=15
SEND_INTERVAL_SEC=5

# ===== PLAYWRIGHT CONFIG =====
AIRBNB_HEADLESS=true
PLAYWRIGHT_TIMEOUT=60000

# ===== ENVIRONMENT =====
NODE_ENV=production
```

Sauvegarde : `Ctrl+O`, `Enter`, `Ctrl+X`

Puis copie `airbnb-session.json` (ou recopie le contenu manuellement).

---

## 🗄️ ÉTAPE 4 : Tester la connexion DB

```bash
# Sur le Mac serveur
cd ~/AirbnbBot

# Tester la connexion Neon
npx tsx test-neon-connection.ts

# Tu dois voir : ✅ Connexion Neon réussie!
```

Si erreur, vérifie que l'URL dans `.env` est correcte.

---

## 🚀 ÉTAPE 5 : Lancer les Workers

### 5.1 Installer PM2 (si pas déjà fait)

```bash
# Sur le Mac serveur
sudo npm install -g pm2
```

### 5.2 Lancer les 3 workers

```bash
# Sur le Mac serveur
cd ~/AirbnbBot

# Lancer avec PM2
pm2 start pm2-workers.json

# Vérifier le statut
pm2 status
```

Tu dois voir :

```
┌─────┬────────────────┬─────────┬─────────┬──────────┐
│ id  │ name           │ status  │ restart │ uptime   │
├─────┼────────────────┼─────────┼─────────┼──────────┤
│ 0   │ airbnb-sync    │ online  │ 0       │ 2s       │
│ 1   │ airbnb-ai      │ online  │ 0       │ 2s       │
│ 2   │ airbnb-send    │ online  │ 0       │ 2s       │
└─────┴────────────────┴─────────┴─────────┴──────────┘
```

### 5.3 Voir les logs

```bash
# Tous les logs en temps réel
pm2 logs

# Ou logs d'un worker spécifique
pm2 logs airbnb-sync
pm2 logs airbnb-ai
pm2 logs airbnb-send
```

---

## ✅ ÉTAPE 6 : Vérifications

### 6.1 Vérifier que les workers tournent

```bash
# Sur le Mac serveur
pm2 status

# Tous doivent être "online"
# Si "errored", check les logs : pm2 logs
```

### 6.2 Vérifier la base de données

```bash
# Sur le Mac serveur
cd ~/AirbnbBot

# Créer un script de test rapide
npx tsx -e "
import 'dotenv/config';
import postgres from 'postgres';
const client = postgres(process.env.DATABASE_URL);
const result = await client\`SELECT COUNT(*) FROM queue_outbox\`;
console.log('Messages en queue:', result[0].count);
await client.end();
"
```

### 6.3 Vérifier les logs workers

```bash
pm2 logs --lines 50
```

Tu dois voir :
- `sync_worker` : "🔄 Badge Polling démarré..."
- `ai_worker` : "🤖 AI Worker démarré..."
- `send_worker` : "📤 Send Worker démarré..."

---

## 🔧 ÉTAPE 7 : Configuration PM2 Auto-start

Pour que les workers redémarrent automatiquement au reboot du Mac :

```bash
# Sur le Mac serveur

# Sauvegarder la config PM2
pm2 save

# Générer le script de démarrage
pm2 startup

# Suivre les instructions affichées (copier-coller la commande sudo)
```

---

## 📊 Commandes PM2 utiles

```bash
# Voir les logs
pm2 logs

# Voir le statut
pm2 status

# Redémarrer un worker
pm2 restart airbnb-sync

# Redémarrer tous les workers
pm2 restart all

# Arrêter tous les workers
pm2 stop all

# Supprimer tous les workers
pm2 delete all

# Voir les métriques (CPU, RAM)
pm2 monit
```

---

## 🧹 ÉTAPE 8 : Nettoyer l'ancien backup (optionnel)

Une fois que tout fonctionne bien pendant 24h :

```bash
# Sur le Mac serveur
rm -rf ~/AirbnbBot_OLD_BACKUP
```

---

## 🎯 Résumé des Fondations Propres

### ✅ Ce qui a été créé sur ce Mac

1. **Base de données Neon** (EU Central)
   - URL : `ep-icy-wind-aga6qe59-pooler.c-2.eu-central-1.aws.neon.tech`
   - Table `queue_outbox` créée avec bon schéma (VARCHAR, pas INTEGER)
   - Connexion testée ✅

2. **Workers TypeScript optimisés (Gemini AI)**
   - `sync_worker.ts` : Badge Polling (10s) - Pas de GraphQL instable
   - `ai_worker.ts` : Gemini réponses immédiates (15s fallback)
   - `send_worker.ts` : GraphQL API direct (5s) - Pas de Playwright

3. **Configuration `.env` complète**
   - DATABASE_URL (Neon)
   - GEMINI_API_KEY
   - AIRBNB_API_KEY, EMAIL, PASSWORD
   - Intervals optimisés (10s/15s/5s)

4. **Session Airbnb valide**
   - 64 cookies dans `airbnb-session.json`
   - Testée fonctionnelle

5. **PM2 Configuration**
   - 3 workers configurés
   - Auto-restart infini
   - Logs séparés

### 🚫 Ce qui a été éliminé

- ❌ GraphQL instable (5 structures changeantes)
- ❌ Playwright pour envoyer (15s par message)
- ❌ Fermeture/ouverture browser (CPU 80%)
- ❌ AI polling DB toutes les 15s
- ❌ Ancien code Python avec erreurs

---

## 🆘 Troubleshooting

### Erreur : "Cannot find module 'postgres'"

```bash
npm install postgres
```

### Erreur : "ECONNREFUSED" sur DB

Vérifie que l'URL dans `.env` est exacte (pas d'espace, pas de retour ligne)

### Worker crashe immédiatement

```bash
pm2 logs airbnb-sync --lines 100
# Regarde l'erreur exacte et corrige
```

### "Queue_outbox doesn't exist"

```bash
npx tsx run-queue-migration.ts
```

### Browser Playwright ne s'ouvre pas

```bash
npx playwright install chromium
```

---

## 📞 Support

Si problème, check dans l'ordre :
1. `pm2 logs` - Erreurs dans les logs ?
2. `.env` - Variables correctes ?
3. `airbnb-session.json` - Fichier présent ?
4. `npx tsx test-neon-connection.ts` - DB OK ?

---

**Date de création** : 16 Décembre 2025  
**Mac source** : Mac principal (Downloads/AirbnbBot 2)  
**Mac cible** : Mac serveur 24/7
