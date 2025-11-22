# Airbnb Co-Host Bot 🤖

Système d'automatisation robuste et stable pour gérer les messages Airbnb via un compte co-hôte. Le bot utilise Playwright avec des interactions humaines pour un comportement naturel et respectueux des bonnes pratiques.

## 🎯 Objectif

Ce système permet d'automatiser la gestion des messages Airbnb pour un compte co-hôte de manière **légitime** et **robuste**, sans contourner les protections d'Airbnb. L'objectif est d'obtenir un système stable, naturel et fiable.

## ✨ Fonctionnalités

- ✅ **Scraping continu** : Récupération automatique des messages Airbnb toutes les 45 secondes
- ✅ **Multi-annonces** : Gère plusieurs annonces sur un seul compte co-hôte
- ✅ **Base de données PostgreSQL** : Stockage complet de l'historique (Supabase)
- ✅ **Réponses IA automatiques** : Génération et envoi automatique des réponses
- ✅ **Queue système** : Gestion des envois avec retry automatique
- ✅ **Interactions humaines** : Délais aléatoires, scroll naturel, frappe humaine
- ✅ **Gestion CAPTCHA propre** : Arrêt propre en cas de CAPTCHA avec alertes
- ✅ **Monitoring** : Health checks, heartbeats, logs détaillés
- ✅ **API REST** : Interface pour consulter les messages et gérer les listings

## 🏗️ Architecture

```
airbnb-cohost/
├── src/
│   ├── api/              # API FastAPI
│   │   ├── routes/       # Endpoints (health, messages, listings)
│   │   └── main.py
│   ├── db/               # Base de données
│   │   ├── models.py     # Modèles SQLAlchemy
│   │   ├── repository.py # CRUD
│   │   └── db.py         # Connexion
│   ├── playwright/       # Scraping & envoi
│   │   ├── browser_manager.py    # Gestion navigateur robuste
│   │   ├── human_interactions.py # Interactions humaines
│   │   ├── captcha_detector.py   # Détection CAPTCHA propre
│   │   ├── scraping_actions.py   # Récupération messages
│   │   ├── send_actions.py       # Envoi messages
│   │   ├── selectors.py          # Sélecteurs centralisés
│   │   └── utils.py              # Utilitaires
│   ├── services/         # Services métier
│   │   ├── message_queue.py   # Queue PostgreSQL
│   │   ├── ai_responder.py    # Intégration IA
│   │   └── notifier.py        # Notifications
│   ├── workers/          # Workers
│   │   ├── sync_worker.py     # Scraping continu (robuste)
│   │   └── send_worker.py     # Envoi continu (robuste)
│   ├── config.py         # Configuration centralisée
│   └── main.py           # Point d'entrée principal
├── scripts/
│   ├── run_headless_first.py    # Connexion manuelle initiale
│   ├── reconnect_airbnb.py      # Reconnexion automatique
│   ├── reply_to_aziz.py         # Répondre à Aziz (exemple)
│   ├── force_sync_now.py        # Synchronisation forcée
│   ├── selector_tester.py       # Test sélecteurs
│   └── migrate.py               # Migration DB
├── logs/                 # Logs
├── session/              # Session Playwright (cookies)
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## 📋 Prérequis

- Python 3.11+
- PostgreSQL 15+ (ou Supabase)
- Playwright (navigateurs installés automatiquement)
- Compte Airbnb co-hôte avec accès aux annonces

## 🚀 Installation

### 1. Cloner et installer

```bash
cd /Users/nguilane./Downloads/airbnb-cohost
pip install -r requirements.txt
playwright install chromium
```

### 2. Configuration

```bash
cp env.example .env
# Éditer .env avec tes configurations
```

Variables importantes dans `.env` :
- `DATABASE_URL` : URL de connexion PostgreSQL/Supabase
- `AI_WEBHOOK_URL` : URL de ton API IA (optionnel)
- `PLAYWRIGHT_SESSION_PATH` : Chemin pour sauvegarder la session (défaut: `./session`)

### 3. Initialiser la base de données

```bash
python3 scripts/migrate.py
```

### 4. Première connexion manuelle (OBLIGATOIRE)

**⚠️ IMPORTANT** : Tu dois te connecter manuellement une première fois pour sauvegarder la session.

```bash
python3 scripts/run_headless_first.py
```

Ce script :
- Ouvre un navigateur **visible** (pas headless)
- Tu te connectes à Airbnb (co-hôte) dans le navigateur
- Tu complètes le MFA/captcha si nécessaire
- La session est sauvegardée automatiquement dans `./session`
- Une fois connecté, appuie sur Enter dans le terminal

**Alternative avec credentials** :
```bash
python3 scripts/run_headless_first.py --email "ton@email.com" --password "tonmotdepasse"
```

Le script essaiera de se connecter automatiquement, mais tu pourras compléter manuellement si nécessaire.

## 🏃 Lancer l'application

### Option 1 : PM2 (recommandé pour production)

```bash
# Installer PM2 si nécessaire
npm install -g pm2

# Lancer tous les services
pm2 start pm2.json

# Voir les logs
pm2 logs

# Voir le statut
pm2 status
```

### Option 2 : Docker Compose

```bash
docker-compose up --build
```

Cela lance :
- PostgreSQL (port 5432)
- API FastAPI (port 8000)
- Worker de synchronisation
- Worker d'envoi

### Option 3 : Manuellement (3 terminaux)

```bash
# Terminal 1 : API
python3 -m src.main api

# Terminal 2 : Worker sync (scraping)
python3 -m src.main sync

# Terminal 3 : Worker send (envoi)
python3 -m src.main send
```

**Note** : Utilise `python3 -m src.main` (pas `python3 src/main.py`) pour éviter les problèmes d'import.

## 📡 API Endpoints

### Health Check

```bash
# Simple
curl http://localhost:8000/health
# -> {"ok": true, "timestamp": "..."}

# Détaillé (avec statut des workers)
curl http://localhost:8000/health/detailed
# -> Statut détaillé avec heartbeats des workers
```

### Messages

```bash
# Récupérer tous les threads
GET /messages/threads

# Récupérer les messages d'un thread
GET /messages/threads/{thread_id}/messages

# Récupérer les nouveaux messages
GET /messages/new?since=2024-01-01T00:00:00

# Envoyer un message (ajoute à la queue)
POST /messages/send
{
  "thread_id": "123456789",
  "message": "Bonjour !"
}

# Réponse IA (utilisé par ton service IA)
POST /messages/ai-reply
{
  "thread_id": "123456789",
  "message": "Réponse générée par l'IA"
}
```

### Listings

```bash
# Récupérer tous les listings
GET /listings

# Créer un listing
POST /listings
{
  "airbnb_listing_id": "12345678",
  "name": "Mon Appartement"
}
```

## 🔄 Fonctionnement

### 1. Worker de Synchronisation (`sync_worker`)

**Comportement** :
- Tourne en boucle infinie
- Toutes les 45 secondes (configurable) :
  1. Scrape les threads et messages depuis Airbnb via GraphQL
  2. Stocke en base de données (table `conversations` et `messages`)
  3. Pour chaque nouveau message inbound :
     - Appelle l'IA pour générer une réponse
     - Ajoute la réponse à la queue d'envoi (`queue_outbox`)

**Gestion d'erreurs** :
- **CAPTCHA détecté** : Arrêt propre, alerte admin, logs détaillés
- **Session expirée** : Notification, tentative de reconnexion
- **Erreurs temporaires** : Retry avec backoff exponentiel
- **Plusieurs erreurs** : Notification admin après 5 erreurs consécutives

### 2. Worker d'Envoi (`send_worker`)

**Comportement** :
- Tourne en boucle infinie
- Toutes les 15 secondes (configurable) :
  1. Récupère les messages pending de la queue (`queue_outbox`)
  2. Envoie chaque message via Playwright avec interactions humaines
  3. Marque comme `sent` ou `failed`
  4. Retry automatique pour les messages failed (max 5 tentatives)

**Interactions humaines** :
- Délais aléatoires entre chaque action (1-3 secondes)
- Scroll naturel vers les éléments
- Frappe humaine (50-150ms par caractère avec pauses occasionnelles)
- Mouvements de souris naturels
- Clics avec délais avant/après

### 3. Gestion CAPTCHA

**Comportement** :
- Si un CAPTCHA est détecté :
  1. **Détection automatique** via mots-clés et sélecteurs
  2. **Screenshot** sauvegardé dans `./logs/` pour debugging
  3. **Alerte admin** (webhook, Slack, etc.)
  4. **Arrêt propre** du worker (pas de crash)
  5. **Heartbeat mis à jour** avec statut "stopped"
  6. **Logs détaillés** de l'événement

**Aucun bypass automatique** : Le worker s'arrête proprement et attend une reconnexion manuelle.

### 4. Interactions Humaines

**Module `human_interactions.py`** :
- `random_delay()` : Délais aléatoires (distribution gamma pour plus de naturalité)
- `human_type_delay()` : Délai entre caractères avec pauses occasionnelles
- `scroll_naturally()` : Scroll progressif vers les éléments
- `move_mouse_naturally()` : Mouvements de souris aléatoires
- `click_with_delay()` : Clics avec délais avant/après
- `type_with_human_rhythm()` : Frappe humaine avec pauses

**Configuration** :
```bash
MIN_DELAY_MS=1000          # Délai minimum entre actions
MAX_DELAY_MS=3000          # Délai maximum
RANDOM_DELAY_ENABLED=true  # Activer les délais aléatoires
```

## 🛡️ Protection Anti-Détection

### Configuration du navigateur

- **User-Agent réaliste** : Rotation entre plusieurs user-agents
- **Viewport cohérent** : Rotation entre différentes tailles
- **Locale** : Français (Europe/Paris)
- **Extra headers** : Headers réalistes (Accept-Language, etc.)
- **Masquage webdriver** : Script JavaScript pour masquer `navigator.webdriver`

### Comportement naturel

- **Délais aléatoires** : Distribution gamma (plus long souvent)
- **Pauses occasionnelles** : Comme un humain qui réfléchit
- **Scroll progressif** : Pas de saut direct
- **Mouvements souris** : Petits mouvements aléatoires
- **Frappe humaine** : Vitesse variable avec pauses

### Gestion d'erreurs

- **Retry intelligent** : Backoff exponentiel
- **Arrêt propre** : Pas de crash, logs détaillés
- **Screenshots** : Sauvegarde automatique en cas d'erreur
- **Alertes** : Notification admin en cas de problème

## 🔧 Configuration Avancée

### Variables d'environnement

```bash
# Intervalles
SCRAPE_INTERVAL_SEC=45          # Fréquence de scraping
SEND_WORKER_INTERVAL_SEC=15     # Fréquence d'envoi

# Anti-ban / Interactions humaines
MIN_DELAY_MS=1000               # Délai minimum entre actions
MAX_DELAY_MS=3000               # Délai maximum
RANDOM_DELAY_ENABLED=true       # Activer les délais aléatoires

# Retry
MAX_RETRY_SEND=5                # Nombre max de tentatives
RETRY_DELAY_SEC=60              # Délai entre retries

# Playwright
AIRBNB_HEADLESS=true            # Mode headless (false pour debug)
PLAYWRIGHT_TIMEOUT=60000        # Timeout Playwright (ms)

# AI
AI_WEBHOOK_URL=https://your-ai-api.com/respond
AI_API_KEY=your-api-key

# Notifications
ADMIN_WEBHOOK_URL=https://your-webhook.com/notify
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK

# Logging
LOG_LEVEL=INFO                  # DEBUG, INFO, WARNING, ERROR
LOG_FILE=./logs/app.log
```

## 📊 Monitoring

### Health Checks

```bash
# Simple
curl http://localhost:8000/health

# Détaillé (avec statut des workers)
curl http://localhost:8000/health/detailed | python3 -m json.tool
```

Retourne le statut de tous les workers avec leur dernier heartbeat.

### Logs

Les logs sont écrits dans :
- `./logs/app.log` (logs généraux)
- `./logs/sync-out.log` (worker sync)
- `./logs/send-out.log` (worker send)
- `./logs/api-out.log` (API)

### Heartbeats

Les workers mettent à jour leur heartbeat dans la table `worker_heartbeats` toutes les 30 secondes.

### Screenshots

En cas d'erreur ou de CAPTCHA, des screenshots sont sauvegardés dans `./logs/` :
- `screenshot_error_scraping_*.png`
- `captcha_detected_*.png`

## 🐛 Troubleshooting

### Session expirée

**Symptôme** : "Session expirée - redirection vers login"

**Solution** :
```bash
python3 scripts/reconnect_airbnb.py
```

Le script ouvre un navigateur, tu te reconnectes manuellement, et il détecte automatiquement la connexion.

### CAPTCHA détecté

**Symptôme** : "CAPTCHA détecté - arrêt propre du worker"

**Solution** :
1. Le worker s'arrête automatiquement (normal)
2. Reconnecte-toi manuellement :
   ```bash
   python3 scripts/reconnect_airbnb.py
   ```
3. Le worker redémarrera automatiquement au prochain cycle

### Worker ne démarre pas

**Vérifier** :
1. La base de données est accessible (`DATABASE_URL`)
2. La session existe (`./session`)
3. Les logs dans `./logs/`
4. Les imports Playwright : `python3 -c "from playwright.sync_api import sync_playwright; print('OK')"`

### Messages vides après synchronisation

**Vérifier** :
1. Les logs du worker sync : `tail -50 logs/sync.log`
2. La base de données : `curl http://localhost:8000/messages/threads`
3. Les sélecteurs Playwright : `python3 scripts/selector_tester.py <thread_id>`

### Erreur "column messages.thread_id does not exist"

**Solution** : Le projet utilise la structure existante (`conversations` et `messages` avec `conversation_id`). Les workers ont été adaptés pour cette structure.

## 📝 Scripts Utilitaires

### Connexion initiale

```bash
# Mode manuel
python3 scripts/run_headless_first.py

# Avec credentials (connexion automatique tentée)
python3 scripts/run_headless_first.py --email "ton@email.com" --password "tonmotdepasse"
```

### Reconnexion automatique

```bash
# Détecte automatiquement la connexion
python3 scripts/reconnect_airbnb.py
```

### Synchronisation forcée

```bash
# Force une synchronisation immédiate
python3 scripts/force_sync_now.py
```

### Répondre à Aziz (exemple)

```bash
# Récupère le message d'Aziz et répond automatiquement
python3 scripts/reply_to_aziz.py
```

### Test des sélecteurs

```bash
# Teste les sélecteurs Playwright sur une conversation
python3 scripts/selector_tester.py <thread_id>
```

## 🔐 Sécurité

- **Ne commite JAMAIS** le fichier `./session` (contient les cookies)
- Change `API_SECRET_KEY` en production
- Restreins les CORS dans `src/api/main.py` pour la production
- Utilise HTTPS en production
- **Ne stocke JAMAIS** les credentials en clair dans le code

## 📁 Structure du Projet

### Modules principaux

- **`browser_manager.py`** : Gestion robuste du navigateur avec configuration anti-détection
- **`human_interactions.py`** : Interactions humaines (délais, scroll, frappe)
- **`captcha_detector.py`** : Détection et gestion propre du CAPTCHA
- **`scraping_actions.py`** : Récupération des messages via GraphQL
- **`send_actions.py`** : Envoi de messages avec interactions humaines
- **`sync_worker.py`** : Worker de synchronisation robuste
- **`send_worker.py`** : Worker d'envoi robuste

## 📝 Checklist Avant Production

- [ ] Session Airbnb sauvegardée et testée
- [ ] Base de données accessible et tables créées
- [ ] Variables d'environnement configurées
- [ ] API IA configurée (`AI_WEBHOOK_URL`)
- [ ] Monitoring configuré (health checks, logs)
- [ ] Notifications configurées (webhooks, Slack)
- [ ] Tests sur 1-10 conversations réelles
- [ ] Backup de la base de données configuré
- [ ] Logs rotation configurée
- [ ] Sécurité : `.session` dans `.gitignore`

## 🆘 Support

En cas de problème :
1. Vérifie les logs dans `./logs/`
2. Vérifie les health checks : `curl http://localhost:8000/health/detailed`
3. Teste les sélecteurs : `python3 scripts/selector_tester.py <thread_id>`
4. Vérifie la session : `ls -lh session`
5. Relance la connexion si session expirée : `python3 scripts/reconnect_airbnb.py`

## 📄 License

MIT

---

**Note** : Ce système est conçu pour fonctionner de manière légitime avec un compte co-hôte Airbnb. Aucune tentative de contournement des protections n'est effectuée. Si un CAPTCHA apparaît, le système s'arrête proprement et attend une action manuelle.
