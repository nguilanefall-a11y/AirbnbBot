# Système Automatique 24/7 - Documentation

## 🎯 Objectif

Système complètement automatisé qui répond automatiquement aux nouveaux messages Airbnb sans intervention humaine.

## 🔄 Flux Automatique

```
1. Nouveau message Airbnb
   ↓
2. Worker SYNC détecte le message
   ↓
3. Message enregistré en DB
   ↓
4. Worker SYNC appelle l'IA via AI_WEBHOOK_URL
   ↓
5. IA génère une réponse et appelle /api/ai/webhook-simple
   ↓
6. Webhook ajoute automatiquement la réponse dans queue_outbox
   ↓
7. Worker SEND récupère le job de la queue
   ↓
8. Worker SEND envoie la réponse via Playwright
   ↓
9. ✅ Message envoyé automatiquement
```

## 📋 Configuration Requise

### Variables d'environnement (.env)

```bash
# Webhook IA (OBLIGATOIRE pour le système auto)
AI_WEBHOOK_URL=https://ton-api-ia.com/webhook

# Session Playwright
PLAYWRIGHT_SESSION_DIR=./session
AIRBNB_HEADLESS=true

# Intervalles (en secondes)
SCRAPE_INTERVAL_SEC=45  # Intervalle entre chaque cycle SYNC
SEND_WORKER_INTERVAL_SEC=15  # Intervalle entre chaque vérification de la queue

# API
API_HOST=0.0.0.0
API_PORT=8000
```

## 🚀 Lancement du Système Automatique

### Option 1 : Workers Async (Recommandé)

```bash
# Lancer les workers SYNC + SEND en parallèle
python3 src/main.py syncsend
```

### Option 2 : API + Workers séparés

```bash
# Terminal 1 - API (pour recevoir les réponses IA)
python3 src/main.py api

# Terminal 2 - Workers SYNC + SEND
python3 src/main.py syncsend
```

### Option 3 : PM2 (Production)

```bash
pm2 start pm2.json
```

## 📡 Webhook IA

### Endpoint pour recevoir les réponses de l'IA

**URL**: `http://localhost:8000/api/ai/webhook-simple`

**Méthode**: `POST`

**Payload**:
```json
{
  "conversation_id": "TWVzc2FnZVRocmVhZDoxMjM0NTY3",
  "message": "Bonjour ! Merci pour votre message...",
  "sender": "Guest Name"
}
```

**Réponse**:
```json
{
  "success": true,
  "outbox_id": "uuid-du-job",
  "message": "Réponse IA ajoutée à la queue d'envoi",
  "thread_id": "TWVzc2FnZVRocmVhZDoxMjM0NTY3"
}
```

### Format de callback attendu par l'IA

Quand le worker SYNC appelle `AI_WEBHOOK_URL`, il envoie :

```json
{
  "conversation_id": "thread_id_airbnb",
  "sender": "Nom du guest",
  "message": "Contenu du message reçu",
  "property_id": "id_propriete_si_disponible",
  "callback_url": "http://localhost:8000/api/ai/webhook-simple"
}
```

L'IA doit :
1. Générer une réponse
2. Appeler `callback_url` avec la réponse générée

## 🔍 Fonctionnement Détaillé

### Worker SYNC (24/7)

- **Fréquence**: Toutes les 45 secondes (configurable)
- **Actions**:
  1. Charge la page inbox Airbnb
  2. Récupère toutes les conversations
  3. Pour chaque conversation :
     - Récupère les messages
     - Détecte les nouveaux messages inbound
     - Enregistre en DB
     - Appelle l'IA pour générer une réponse
  4. Continue en boucle infinie

### Worker SEND (24/7)

- **Fréquence**: Toutes les 15 secondes (vérifie la queue)
- **Actions**:
  1. Récupère un job `pending` de `queue_outbox`
  2. Marque le job en `processing`
  3. Va sur la conversation Airbnb
  4. Envoie le message via Playwright
  5. Vérifie que le message est bien envoyé
  6. Marque le job en `sent`
  7. Continue en boucle infinie

### Gestion des CAPTCHA

Si un CAPTCHA est détecté :
- Le worker s'arrête **proprement**
- Un log est affiché
- Aucun spam d'erreurs
- **Action requise**: Relancer `python3 scripts/reconnect_airbnb.py` puis redémarrer les workers

## ✅ Vérification du Système

### Vérifier que les workers tournent

```bash
# Voir les logs en temps réel
tail -f logs/app.log

# Vérifier les nouveaux messages
python3 scripts/check_new_messages.py

# Vérifier la queue d'envoi
python3 -c "
from src.services.message_queue import MessageQueue
pending = MessageQueue.dequeue_send(limit=10)
print(f'Jobs en attente: {len(pending)}')
"
```

### Tester manuellement le webhook IA

```bash
curl -X POST http://localhost:8000/api/ai/webhook-simple \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "TWVzc2FnZVRocmVhZDoxMjM0NTY3",
    "message": "Test réponse automatique",
    "sender": "Test Guest"
  }'
```

## 🛠️ Dépannage

### Les messages ne sont pas détectés

1. Vérifier que le worker SYNC tourne
2. Vérifier les logs pour voir les cycles SYNC
3. Vérifier que la session Playwright est valide

### Les réponses IA ne sont pas envoyées

1. Vérifier que l'API tourne (`python3 src/main.py api`)
2. Vérifier que l'IA appelle bien le webhook `/api/ai/webhook-simple`
3. Vérifier la table `queue_outbox` pour voir si les jobs sont créés
4. Vérifier que le worker SEND tourne

### CAPTCHA détecté

```bash
# Reconnecter manuellement
python3 scripts/reconnect_airbnb.py

# Redémarrer les workers
python3 src/main.py syncsend
```

## 📊 Monitoring

### Logs en temps réel

```bash
# Logs de l'API
tail -f logs/api.log

# Logs des workers
tail -f logs/worker.log

# Tous les logs
tail -f logs/*.log
```

### Vérifier l'état de la queue

```sql
-- Voir les jobs en attente
SELECT COUNT(*) FROM queue_outbox WHERE status = 'pending';

-- Voir les jobs en cours
SELECT COUNT(*) FROM queue_outbox WHERE status = 'processing';

-- Voir les jobs envoyés aujourd'hui
SELECT COUNT(*) FROM queue_outbox 
WHERE status = 'sent' 
AND DATE(processed_at) = CURRENT_DATE;
```

## 🎯 Résultat Final

Une fois tout configuré :
- ✅ Les nouveaux messages Airbnb sont détectés automatiquement
- ✅ L'IA génère une réponse automatiquement
- ✅ La réponse est envoyée automatiquement via Playwright
- ✅ **Aucune intervention humaine nécessaire**
- ✅ Le système tourne 24/7 en continu


