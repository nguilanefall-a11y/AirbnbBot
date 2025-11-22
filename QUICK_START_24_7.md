# 🚀 Démarrage Rapide - Système Automatique 24/7

## ⚡ Démarrage en 3 étapes

### 1️⃣ Connecter la session Airbnb (une seule fois)

```bash
cd /Users/nguilane./Downloads/airbnb-cohost
python3 scripts/reconnect_airbnb.py
```

➜ Ouvre le navigateur, connecte-toi manuellement, ferme quand c'est fait.

### 2️⃣ Configurer le webhook IA (dans .env)

```bash
# Éditer .env
nano .env

# Ajouter :
AI_WEBHOOK_URL=https://ton-api-ia.com/webhook
```

**Important** : Ton IA doit appeler ce webhook quand elle génère une réponse :
- **URL de callback** : `http://localhost:8000/api/ai/webhook-simple`
- **Payload** : `{"conversation_id": "...", "message": "...", "sender": "..."}`

### 3️⃣ Lancer le système automatique

```bash
# Option 1 : Script automatique
./start_auto_24_7.sh

# Option 2 : Manuel
python3 src/main.py syncsend
```

**C'est tout !** Le système va :
- ✅ Détecter automatiquement les nouveaux messages
- ✅ Appeler l'IA pour générer une réponse
- ✅ Envoyer la réponse automatiquement via Playwright
- ✅ Tourner 24/7 en continu

## 📋 Vérification

### Vérifier que ça tourne

```bash
# Voir les logs en temps réel
tail -f logs/app.log

# Ou regarder la sortie du terminal
# Tu verras les cycles SYNC toutes les 45 secondes
```

### Vérifier les nouveaux messages

```bash
python3 scripts/check_new_messages.py
```

### Vérifier la queue d'envoi

```bash
python3 -c "
from src.db.db import get_db_session
from sqlalchemy import text
db = get_db_session()
result = db.execute(text('SELECT COUNT(*) FROM queue_outbox WHERE status=\"pending\"'))
print(f'Jobs en attente: {result.fetchone()[0]}')
db.close()
"
```

## 🔧 Dépannage

### CAPTCHA détecté

```bash
# Reconnecter
python3 scripts/reconnect_airbnb.py

# Redémarrer
python3 src/main.py syncsend
```

### L'API ne répond pas

```bash
# Lancer l'API dans un terminal séparé
python3 src/main.py api
```

### Messages non détectés

1. Vérifier que la session est valide : `ls -la session/`
2. Vérifier les logs : `tail -f logs/app.log`
3. Vérifier que SYNC tourne (tu dois voir des cycles toutes les 45s)

## 🎯 Résultat

Une fois lancé, le système répond **automatiquement** à chaque nouveau message :
1. Nouveau message Airbnb reçu
2. Détection automatique (SYNC worker)
3. Appel automatique de l'IA
4. Réponse automatique envoyée via Playwright
5. **Aucune intervention humaine nécessaire** ✅

## 📞 Test

1. Envoie un message depuis un compte Airbnb vers ton compte co-host
2. Attends 1-2 minutes
3. Vérifie sur Airbnb que la réponse est arrivée automatiquement

**C'est magique ! ✨**

