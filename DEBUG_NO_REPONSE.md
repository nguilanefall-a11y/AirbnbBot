# 🔍 Debug - Pourquoi le système ne répond pas

## Problèmes identifiés

### 1. ❌ AI_WEBHOOK_URL non configuré

**Problème** : `AI_WEBHOOK_URL` est configuré à `https://your-ai-api.com/respond` (placeholder)

**Impact** : Les nouveaux messages sont détectés MAIS l'IA n'est jamais appelée pour générer une réponse.

**Solution** :
```bash
# Éditer .env
nano .env

# Ajouter ou modifier :
AI_WEBHOOK_URL=http://localhost:5000/api/messages/respond
# OU l'URL de ton API IA réelle
```

### 2. ⚠️ Session Playwright

La session existe mais le code doit utiliser `session/storage_state.json` au lieu de `session`.

**Solution** : Corrigé dans `browser_manager.py`

### 3. 🔍 Vérifications à faire

1. **Les workers tournent-ils vraiment ?**
   ```bash
   ps aux | grep "src.main syncsend" | grep -v grep
   ```

2. **Y a-t-il de nouveaux messages détectés ?**
   ```bash
   python3 scripts/check_new_messages.py
   ```

3. **Y a-t-il des jobs dans la queue ?**
   ```bash
   python3 -c "
   from src.db.db import get_db_session
   from sqlalchemy import text
   db = get_db_session()
   result = db.execute(text(\"SELECT COUNT(*) FROM queue_outbox WHERE status='pending'\"))
   print(f'Jobs en attente: {result.fetchone()[0]}')
   db.close()
   "
   ```

4. **L'API webhook fonctionne-t-elle ?**
   ```bash
   curl -X POST http://localhost:8000/api/ai/webhook-simple \
     -H "Content-Type: application/json" \
     -d '{"conversation_id": "test123", "message": "test réponse", "sender": "Test"}'
   ```

## ✅ Solutions rapides

### Option 1 : Configuration de l'IA manquante

Si ton API IA tourne sur `localhost:5000`, configure :
```bash
echo "AI_WEBHOOK_URL=http://localhost:5000/api/messages/respond" >> .env
```

### Option 2 : Tester manuellement

```bash
# 1. Détecter les messages
python3 scripts/force_sync_now.py

# 2. Répondre manuellement à Aziz (pour tester)
python3 scripts/repondre_aziz_v2.py
```

### Option 3 : Vérifier les logs des workers

Les workers devraient afficher :
- `[SYNC/SEND HH:MM:SS] 📥 SYNC Cycle #X`
- `[SYNC/SEND HH:MM:SS] 🟢 Nouveau message`

Si tu ne vois pas ces logs, les workers ne tournent pas ou ne détectent pas les messages.

## 🎯 Checklist de diagnostic

- [ ] AI_WEBHOOK_URL configuré dans .env
- [ ] API tourne sur port 8000
- [ ] Workers syncsend tournent (vérifier avec ps)
- [ ] Session Playwright valide (session/storage_state.json existe)
- [ ] Nouveaux messages détectés (check_new_messages.py)
- [ ] Jobs dans queue_outbox (SELECT COUNT(*) FROM queue_outbox WHERE status='pending')


