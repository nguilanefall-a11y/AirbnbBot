# 🔗 Liens de l'Application

## 📡 API Co-Host Bot

### URL principale
```
http://localhost:8000
```

### Endpoints disponibles

#### Health Check
```
GET http://localhost:8000/health
```

#### Documentation API (Swagger UI)
```
http://localhost:8000/docs
```

#### Documentation API Alternative (ReDoc)
```
http://localhost:8000/redoc
```

---

## 📋 Endpoints API

### Messages
- `GET /messages/threads` - Liste tous les threads
- `GET /messages/threads/{thread_id}/messages` - Messages d'un thread
- `GET /messages/new` - Nouveaux messages entrants
- `POST /messages/send` - Envoyer un message (ajoute à la queue)
- `POST /messages/ai-reply` - Réponse IA (ajoute à la queue)

### Listings
- `GET /listings` - Liste tous les listings

### AI Webhook
- `POST /api/ai/webhook` - Webhook pour recevoir des réponses IA
- `POST /api/ai/webhook-simple` - Webhook simple pour IA
- `POST /api/messages/auto-respond` - Auto-réponse aux messages

---

## 🔧 Configuration

L'API écoute sur:
- **Host**: `0.0.0.0` (toutes les interfaces)
- **Port**: `8000`

Pour modifier la configuration, édite `.env`:
```bash
API_HOST=0.0.0.0
API_PORT=8000
```

---

## 🚀 Lancer l'API

```bash
# Méthode 1: Via main.py
python3 src/main.py api

# Méthode 2: Directement avec uvicorn
uvicorn src.api.main:app --host 0.0.0.0 --port 8000

# Méthode 3: En arrière-plan
./start_background.sh
```

---

## ✅ Test rapide

```bash
# Test santé
curl http://localhost:8000/health

# Test avec réponse JSON
curl http://localhost:8000/health | jq
```

---

## 📝 Notes

- L'API est accessible localement sur `http://localhost:8000`
- Pour accéder depuis d'autres machines sur le réseau local, utilise l'IP de ta machine au lieu de `localhost`
- La documentation interactive est disponible sur `/docs`

