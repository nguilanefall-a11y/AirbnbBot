# 🎯 PROMPT DE PURIFICATION - MAC SERVEUR

## CONTEXTE

Je dois NETTOYER et RECONSTRUIRE proprement le backend d'une application SaaS de conciergerie Airbnb sur ce Mac serveur.

L'ancien code est instable avec :
- ❌ Workers qui crashent en boucle
- ❌ Processus zombies (Python, Node, Playwright)
- ❌ GraphQL Airbnb instable (5 structures changeantes)
- ❌ Erreurs de base de données non gérées
- ❌ Sessions Airbnb expirées
- ❌ Logs pollués partout

**J'ai déjà préparé une BASE PROPRE sur un autre Mac** avec :
- ✅ Workers TypeScript optimisés (Gemini AI recommendations)
- ✅ Base Neon PostgreSQL testée
- ✅ Badge Polling (pas de GraphQL)
- ✅ Browser persistant (pas de fermeture/réouverture)
- ✅ AI trigger immédiat (pas de polling DB)
- ✅ GraphQL API direct pour send (pas de Playwright)
- ✅ Configuration `.env` complète
- ✅ Session Airbnb valide (64 cookies)

## OBJECTIF

**PURIFIER ce Mac serveur** en supprimant TOUT l'ancien code instable, puis installer la base propre depuis GitHub.

---

## ÉTAPE 1 : NETTOYAGE TOTAL (SCRIPT AUTOMATIQUE)

### 1.1 Télécharger le script de nettoyage

```bash
cd ~
curl -O https://raw.githubusercontent.com/nguilanefall-a11y/AirbnbBot/main/nettoyage-total-mac-serveur.sh
chmod +x nettoyage-total-mac-serveur.sh
```

### 1.2 Lancer le nettoyage

```bash
./nettoyage-total-mac-serveur.sh
```

**Tape `OUI` en majuscules pour confirmer.**

Le script va :
- ✅ Arrêter TOUS les processus (PM2, Python, Node, Playwright, Chromium)
- ✅ Backup puis supprimer tous les dossiers AirbnbBot
- ✅ Nettoyer les caches npm et Playwright
- ✅ Supprimer les anciens logs
- ✅ Libérer l'espace disque

---

## ÉTAPE 2 : INSTALLATION BASE PROPRE

### 2.1 Cloner le code propre depuis GitHub

```bash
cd ~
git clone https://github.com/nguilanefall-a11y/AirbnbBot.git
cd AirbnbBot
```

### 2.2 Installer les dépendances

```bash
# Installer les packages Node
npm install

# Installer postgres pour Neon DB
npm install postgres

# Installer Playwright et Chromium
npx playwright install chromium
```

### 2.3 Transférer les fichiers sensibles

**Ces fichiers sont sur le Desktop du Mac principal :**
- `airbnb-env-backup.txt` → renommer en `.env`
- `airbnb-session-backup.json` → renommer en `airbnb-session.json`

**Méthode 1 : AirDrop**
- Envoie les 2 fichiers depuis le Mac principal
- Place-les dans `~/AirbnbBot/`
- Renomme-les correctement

**Méthode 2 : Copie manuelle**

Créer `.env` :
```bash
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

Puis copie `airbnb-session.json` (contenu disponible sur Desktop Mac principal).

---

## ÉTAPE 3 : TESTS DE VALIDATION

### 3.1 Test connexion base de données

```bash
cd ~/AirbnbBot
npx tsx test-neon-connection.ts
```

**Attendu :** `✅ Connexion Neon réussie!`

**Si erreur :**
- Vérifie que `.env` est bien créé
- Vérifie que l'URL DATABASE_URL n'a pas d'espace ou de retour ligne

### 3.2 Test compilation TypeScript

```bash
npx tsc --noEmit
```

**Attendu :** Aucune erreur de compilation

---

## ÉTAPE 4 : LANCEMENT DES WORKERS

### 4.1 Installer PM2 globalement

```bash
sudo npm install -g pm2
```

### 4.2 Lancer les 3 workers

```bash
cd ~/AirbnbBot
pm2 start pm2-workers.json
```

### 4.3 Vérifier le statut

```bash
pm2 status
```

**Attendu :**
```
┌─────┬────────────────┬─────────┬─────────┬──────────┐
│ id  │ name           │ status  │ restart │ uptime   │
├─────┼────────────────┼─────────┼─────────┼──────────┤
│ 0   │ airbnb-sync    │ online  │ 0       │ 5s       │
│ 1   │ airbnb-ai      │ online  │ 0       │ 5s       │
│ 2   │ airbnb-send    │ online  │ 0       │ 5s       │
└─────┴────────────────┴─────────┴─────────┴──────────┘
```

Tous doivent être **online** avec 0 restart.

### 4.4 Voir les logs en temps réel

```bash
pm2 logs
```

**Attendu :**
- `airbnb-sync` : "🔄 Badge Polling démarré... Interval: 10s"
- `airbnb-ai` : "🤖 AI Worker démarré... Interval: 15s"
- `airbnb-send` : "📤 Send Worker démarré... Interval: 5s"

**Si erreurs :**
- Check logs spécifiques : `pm2 logs airbnb-sync`
- Vérifie `.env` et `airbnb-session.json`

---

## ÉTAPE 5 : CONFIGURATION AUTO-RESTART

Pour que les workers redémarrent automatiquement au reboot du Mac :

```bash
# Sauvegarder la config PM2
pm2 save

# Générer le script de démarrage
pm2 startup

# Copier-coller la commande sudo affichée
# (Elle ressemble à : sudo env PATH=... pm2 startup...)
```

---

## ÉTAPE 6 : MONITORING

### Voir les métriques (CPU, RAM)

```bash
pm2 monit
```

### Voir les logs des 50 dernières lignes

```bash
pm2 logs --lines 50
```

### Redémarrer un worker qui crashe

```bash
pm2 restart airbnb-sync
```

### Redémarrer tous les workers

```bash
pm2 restart all
```

### Arrêter tous les workers

```bash
pm2 stop all
```

### Supprimer tous les workers (pour debug)

```bash
pm2 delete all
```

---

## ARCHITECTURE DE LA BASE PROPRE

### 🎯 Optimisations Gemini AI implémentées

| Ancien système (instable) | Nouveau système (stable) |
|---------------------------|--------------------------|
| GraphQL inbox (5 structures changeantes) | **Badge Polling** visuel (stable) |
| Browser ferme/rouvre (80% CPU) | **Browser persistant** (reload only) |
| AI poll DB chaque 15s | **Trigger immédiat** depuis sync_worker |
| Playwright send (15s/message) | **GraphQL API direct** (2s/message) |
| Interval 45s/20s/15s | **Intervals optimisés** 10s/15s/5s |

### 📁 Structure des Workers

```
workers/
├── sync_worker.ts    # Badge Polling (10s) - Détecte nouveaux messages
├── ai_worker.ts      # Gemini AI (15s) - Génère réponses
└── send_worker.ts    # GraphQL API (5s) - Envoie messages
```

### 🔄 Flow de données

```
1. sync_worker détecte badge "unread"
   └─> Scrape les threads avec Badge Polling
       └─> Insert dans DB (conversations + messages)
           └─> Trigger immédiat : triggerAIWorker(conversationId)

2. ai_worker reçoit le trigger
   └─> Génère réponse Gemini avec contexte
       └─> Insert dans queue_outbox

3. send_worker poll la queue (5s)
   └─> Envoie via GraphQL API direct
       └─> Update status (sent/failed)
```

### 🗄️ Base de données Neon

- **Provider :** Neon PostgreSQL (EU Central)
- **Tables principales :**
  - `conversations` : Threads Airbnb
  - `messages` : Messages avec `replied_at`
  - `queue_outbox` : File d'attente d'envoi
  - `properties` : Propriétés avec contexte AI

---

## TROUBLESHOOTING

### ❌ "Cannot find module 'postgres'"

```bash
npm install postgres
```

### ❌ "ECONNREFUSED" sur DB

Vérifie `.env` :
- Pas d'espace dans DATABASE_URL
- Pas de retour ligne
- URL complète copiée

### ❌ Worker crashe immédiatement

```bash
pm2 logs airbnb-sync --lines 100
```

Causes fréquentes :
- `.env` manquant ou invalide
- `airbnb-session.json` manquant
- Chromium non installé : `npx playwright install chromium`

### ❌ "queue_outbox doesn't exist"

```bash
cd ~/AirbnbBot
npx tsx run-queue-migration.ts
```

### ❌ Session Airbnb expirée

Les cookies sont dans `airbnb-session.json`. Si expirés :
1. Sur le Mac principal, extraire nouvelle session
2. Copier vers Mac serveur
3. Redémarrer : `pm2 restart airbnb-sync`

---

## VALIDATION FINALE

### ✅ Checklist de réussite

- [ ] Script nettoyage exécuté sans erreur
- [ ] Dossier `~/AirbnbBot` cloné depuis GitHub
- [ ] `npm install` terminé sans erreur
- [ ] Playwright/Chromium installé
- [ ] `.env` présent avec DATABASE_URL Neon
- [ ] `airbnb-session.json` présent
- [ ] Test connexion DB : `✅ Connexion Neon réussie!`
- [ ] PM2 installé globalement
- [ ] `pm2 status` : 3 workers **online**
- [ ] `pm2 logs` : Pas d'erreurs, messages de démarrage OK
- [ ] `pm2 save` + `pm2 startup` configuré

### 📊 Métriques attendues

```bash
pm2 monit
```

- **CPU par worker :** < 5% en idle, 10-30% en scraping
- **RAM par worker :** 50-150 MB
- **Restarts :** 0 (si > 0, check logs)

---

## COMMANDES UTILES PM2

```bash
# Statut
pm2 status

# Logs temps réel
pm2 logs

# Logs d'un worker spécifique
pm2 logs airbnb-sync

# Métriques (CPU/RAM)
pm2 monit

# Redémarrer
pm2 restart all

# Arrêter
pm2 stop all

# Supprimer
pm2 delete all

# Sauvegarder config
pm2 save

# Auto-restart au boot
pm2 startup
```

---

## CE QUI A ÉTÉ FAIT (Base propre)

### ✅ Backend stabilisé
- Workers TypeScript avec gestion d'erreurs complète
- Retry + backoff sur tous les appels Airbnb
- Timeouts configurables
- Logs structurés

### ✅ Scraping résilient
- Badge Polling (pas de GraphQL fragile)
- Browser persistant (économie CPU)
- Mode dégradé : continue même si badge fail

### ✅ Architecture découplée
- sync_worker : Scraping indépendant
- ai_worker : IA séparée
- send_worker : Envoi isolé
- Aucun crash ne bloque les autres

### ✅ Base de données
- Neon PostgreSQL (serverless, auto-suspend gratuit)
- Migrations propres
- Index optimisés
- Table queue_outbox pour retry automatique

### ✅ Configuration
- `.env` centralisé
- Secrets séparés du code
- Intervals configurables
- Mode production/dev

---

## CE QUE TU DOIS FAIRE MANUELLEMENT

### 🔐 Secrets (déjà configurés dans `.env`)
- ✅ DATABASE_URL (Neon)
- ✅ GEMINI_API_KEY
- ✅ AIRBNB_API_KEY
- ✅ AIRBNB_EMAIL + PASSWORD

### 🍪 Session Airbnb
- ✅ `airbnb-session.json` (64 cookies valides)
- ⚠️ À renouveler si expirée (durée ~30 jours)

### 🖥️ Système
- ⚠️ Installer PM2 : `sudo npm install -g pm2`
- ⚠️ Configurer auto-restart : `pm2 startup`
- ⚠️ Activer "Empêcher la mise en veille" sur Mac serveur

---

## RISQUES TECHNIQUES RESTANTS

### 🟡 Risque MOYEN : Airbnb anti-bot
- **Cause :** CAPTCHA, rate limiting, changement DOM
- **Mitigation :** Badge Polling stable + retry automatique
- **Fallback :** Mode dégradé (dernières données connues)

### 🟡 Risque MOYEN : Session expirée
- **Cause :** Cookies Airbnb expirés (30 jours)
- **Mitigation :** Détection automatique + log erreur
- **Action :** Re-extraire session manuellement

### 🟢 Risque FAIBLE : Surcharge base
- **Cause :** Trop de requêtes simultanées
- **Mitigation :** Intervals configurés + connection pooling Neon

### 🟢 Risque FAIBLE : Crash worker isolé
- **Cause :** Bug imprévu dans un worker
- **Mitigation :** PM2 auto-restart + autres workers continuent

---

## PROCHAINES ÉTAPES (après validation)

### 1. Monitoring avancé
- Ajouter webhooks Slack/Discord pour alertes
- Dashboard PM2 Plus (optionnel)

### 2. Optimisations
- Ajuster intervals selon volume messages
- Tuning Gemini prompts

### 3. Features
- Brancher frontend (lecture/envoi messages)
- Sync calendriers iCal
- Système ménage automatique

---

## SUPPORT

**Si problème, check dans l'ordre :**

1. `pm2 logs` - Erreurs dans les logs ?
2. `pm2 status` - Workers online ?
3. `.env` - Variables correctes ?
4. `airbnb-session.json` - Fichier présent ?
5. `npx tsx test-neon-connection.ts` - DB OK ?

**Commandes de diagnostic :**

```bash
# Check processus en cours
ps aux | grep -i airbnb

# Check ports utilisés
lsof -i :5000
lsof -i :3000

# Check espace disque
df -h

# Check logs système
tail -f ~/AirbnbBot/logs/*.log
```

---

**Date de création :** 16 Décembre 2025  
**Base source :** Mac principal (Downloads/AirbnbBot 2)  
**Mac cible :** Mac serveur 24/7  
**Repo GitHub :** https://github.com/nguilanefall-a11y/AirbnbBot
