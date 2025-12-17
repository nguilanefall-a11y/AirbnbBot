# 📦 CONFIGURATION MAC SERVEUR

## 🔐 Credentials Airbnb

### API Key
```
d306zoyjsyarp7ifhu67rjxn52tv0t20
```

### Login
```
Email: yolo.laviecbien@gmail.com
Password: Boss4922
```

### CSRF Token
```
6329616119c8779eb83148e53d8292dd
```

### Auth Token (frmfctr)
```
fe284061f280c3758f447b128856d206
```

---

## 🤖 Gemini AI

### API Key
```
AIzaSyCNNOe-Z4i1sz-UvhC3aqZ1noN2X4DHPa0
```

---

## 🗄️ Base de données Neon

### Connection URL
```
postgresql://neondb_owner:npg_cK0re4qWCnaE@ep-icy-wind-aga6qe59-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### Détails
- **Provider:** Neon PostgreSQL
- **Region:** EU Central 1
- **User:** neondb_owner
- **Database:** neondb
- **SSL:** Required

---

## ⚙️ Configuration Workers

### Intervals (optimisés Gemini)
```
POLLING_INTERVAL_SEC=10
AI_INTERVAL_SEC=15
SEND_INTERVAL_SEC=5
```

### Playwright
```
AIRBNB_HEADLESS=true
PLAYWRIGHT_TIMEOUT=60000
```

### Environment
```
NODE_ENV=production
```

---

## 📁 Fichiers nécessaires

### 1. `.env`
Fichier disponible : `env-production.txt`
À renommer en `.env` sur le Mac serveur

### 2. `airbnb-session.json`
Fichier disponible : `airbnb-session.json`
64 cookies de session Airbnb valides

---

## 🚀 Installation rapide sur Mac serveur

```bash
# 1. Clone le repo
git clone https://github.com/nguilanefall-a11y/AirbnbBot.git
cd AirbnbBot

# 2. Télécharge les configs
cd MAC_SERVEUR_CONFIG
cp env-production.txt ../.env
cp airbnb-session.json ../airbnb-session.json

# 3. Installe
npm install
npm install postgres
npx playwright install chromium

# 4. Test DB
npx tsx test-neon-connection.ts

# 5. Lance workers
sudo npm install -g pm2
pm2 start pm2-workers.json
pm2 logs
```

---

## 📊 Résumé des secrets

| Type | Valeur | Usage |
|------|--------|-------|
| **Airbnb API Key** | `d306zoyjsyarp7ifhu67rjxn52tv0t20` | GraphQL mutations |
| **CSRF Token** | `6329616119c8779eb83148e53d8292dd` | Protection CSRF |
| **Auth Token** | `fe284061f280c3758f447b128856d206` | Authentification |
| **Gemini Key** | `AIzaSyC...DHPa0` | IA réponses |
| **DB URL** | `postgresql://neondb_owner:npg_cK0re4qWCnaE@...` | Base Neon |

---

⚠️ **SÉCURITÉ** : Ces fichiers ne seront PAS poussés sur GitHub (dans .gitignore)
