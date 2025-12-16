# 🚀 GUIDE DE DÉPLOIEMENT DES WORKERS TYPESCRIPT

## Architecture Adaptée du Système Python

Ce système reprend l'architecture à **3 workers indépendants** de ton ancien système Python, mais adapté au stack TypeScript actuel avec l'API GraphQL Airbnb découverte.

### Différences clés avec le système Python:

| Aspect | Ancien Python | Nouveau TypeScript |
|--------|---------------|-------------------|
| **Scraping** | Playwright DOM | Playwright + GraphQL API |
| **Envoi** | Playwright + Boutons | GraphQL API directe (CreateBulkMessagesMutation) |
| **IA** | Gemini API | Gemini API (identique) |
| **Session** | storage_state.json | airbnb-session.json |
| **Database** | PostgreSQL Supabase | PostgreSQL Supabase (même instance) |
| **Lancement** | PM2 + Python | PM2 + TypeScript (tsx) |

---

## 📋 PRÉREQUIS

### 1. Créer la table queue_outbox

```bash
# Exécuter la migration SQL
psql $DATABASE_URL < migrations/create_queue_outbox.sql

# OU si psql non installé:
# Copier le contenu de migrations/create_queue_outbox.sql
# et l'exécuter dans Supabase SQL Editor
```

### 2. Vérifier les fichiers essentiels

```bash
# Vérifier que ces fichiers existent:
ls -la airbnb-session.json  # Session Airbnb avec cookies
ls -la .env                 # DATABASE_URL + GEMINI_API_KEY

# Vérifier le contenu de .env
cat .env | grep -E "(DATABASE_URL|GEMINI_API_KEY)"
```

### 3. Installer les dépendances

```bash
npm install
npx playwright install chromium
```

---

## 🟢 LANCEMENT DES WORKERS

### Option A: Lancer tous les workers avec PM2 (Recommandé)

```bash
# Installer PM2 si pas déjà fait
npm install -g pm2

# Lancer les 3 workers
pm2 start pm2-workers.json

# Vérifier le statut
pm2 status

# Voir les logs en temps réel
pm2 logs

# Logs spécifiques par worker
pm2 logs airbnb-sync   # Scraping
pm2 logs airbnb-ai     # IA
pm2 logs airbnb-send   # Envoi

# Arrêter tous les workers
pm2 stop all

# Redémarrer tous les workers
pm2 restart all

# Supprimer tous les workers
pm2 delete all
```

### Option B: Lancer workers individuellement (Test)

```bash
# Test sync_worker (scraping)
npx tsx workers/sync_worker.ts

# Test ai_worker (génération IA)
npx tsx workers/ai_worker.ts

# Test send_worker (envoi API)
npx tsx workers/send_worker.ts
```

---

## 🔧 CONFIGURATION

### Variables d'environnement (.env)

```bash
# PostgreSQL (requis)
DATABASE_URL=postgresql://user:pass@aws.supabase.com/postgres

# Gemini AI (requis)
GEMINI_API_KEY=votre_cle_api_gemini

# Intervalles des workers (optionnel)
SCRAPE_INTERVAL_SEC=45      # Scraping toutes les 45s
AI_INTERVAL_SEC=15          # IA toutes les 15s
SEND_INTERVAL_SEC=20        # Envoi toutes les 20s

# Playwright (optionnel)
AIRBNB_HEADLESS=true        # Force headless (pas d'UI)
```

### Chemin PM2 (Important pour Mac serveur)

Éditer `pm2-workers.json` ligne 5:

```json
"cwd": "/Users/VOTRE_USER/Downloads/AirbnbBot 2"
```

Remplacer par le chemin absolu de ton projet sur le Mac serveur.

---

## 📊 FLUX COMPLET DES WORKERS

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SYNC WORKER (sync_worker.ts - toutes les 45s)          │
│    → Scraping Playwright + GraphQL API                     │
│    → Détection captcha automatique                         │
│    → INSERT conversations + messages                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. AI WORKER (ai_worker.ts - toutes les 15s)              │
│    → SELECT messages WHERE replied_at IS NULL              │
│    → Appel Gemini API avec contexte                        │
│    → INSERT INTO queue_outbox (status='pending')           │
│    → UPDATE messages SET replied_at = NOW()                │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SEND WORKER (send_worker.ts - toutes les 20s)          │
│    → DB check: COUNT(pending)                              │
│    → Si > 0: Envoi via GraphQL API                         │
│    → CreateBulkMessagesMutation (pas de navigateur!)       │
│    → UPDATE queue_outbox SET status='sent'                 │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ AVANTAGES DU NOUVEAU SYSTÈME

### 1. Pas de navigateur pour l'envoi ✅
L'ancien système Python utilisait Playwright pour envoyer → **lent et détectable**

Le nouveau système utilise l'API GraphQL directement → **rapide, fiable, invisible**

### 2. Scraping hybride GraphQL + DOM ✅
- **Première tentative**: GraphQL API (5 structures supportées)
- **Fallback**: DOM scraping si GraphQL échoue
- **Résilience**: Détection captcha automatique avec pause

### 3. Optimisation DB check ✅
Le `send_worker` fait un `COUNT(*)` **AVANT** de charger les cookies et de faire des requêtes.

Si `pending_count = 0`, il skip le cycle → **économise des ressources**

### 4. Pattern Resilience Infinie ✅
Tous les workers appliquent le même pattern que ton système Python:

```typescript
while (true) {
  try {
    // Logique du worker
  } catch (error) {
    console.error('Erreur:', error);
    // Pas de exit(), juste retry
  } finally {
    // Cleanup
    await sleep(interval);
  }
}
```

Les workers **ne s'arrêtent JAMAIS**, même en cas d'erreur.

---

## 🚨 DÉPANNAGE

### Problème: Worker crash au démarrage

```bash
# Vérifier les logs
pm2 logs airbnb-sync --lines 50

# Erreur commune: Module not found
# Solution: Installer les dépendances
npm install
npm install @google/genai axios playwright drizzle-orm
```

### Problème: Table queue_outbox n'existe pas

```bash
# Solution: Exécuter la migration
psql $DATABASE_URL < migrations/create_queue_outbox.sql
```

### Problème: Gemini API quota exceeded

```bash
# Solution: Augmenter le délai dans ai_worker.ts ligne 140
# await new Promise(resolve => setTimeout(resolve, 5000)); // 5s au lieu de 2s
```

### Problème: Session Airbnb expirée

```bash
# Régénérer la session (sur Mac avec UI)
npx tsx analyze_airbnb_secrets.ts

# Transférer airbnb-session.json sur Mac serveur
scp airbnb-session.json user@mac-serveur:~/AirbnbBot/
```

### Problème: Chromium s'ouvre en mode graphique

```bash
# Vérifier config dans workers/sync_worker.ts ligne 64
headless: true  # Doit être à true

# Ou forcer via .env
echo "AIRBNB_HEADLESS=true" >> .env
```

---

## 📈 MONITORING

### Commandes PM2 utiles

```bash
# Statut global
pm2 status

# Monitoring CPU/Memory en temps réel
pm2 monit

# Redémarrer un worker spécifique
pm2 restart airbnb-sync

# Voir les logs des 100 dernières lignes
pm2 logs --lines 100

# Sauvegarder la config PM2
pm2 save

# Lancer PM2 au démarrage du Mac
pm2 startup
```

### Queries SQL de monitoring

```sql
-- Nombre de messages en attente d'envoi
SELECT COUNT(*) FROM queue_outbox WHERE status = 'pending';

-- Messages échoués
SELECT * FROM queue_outbox WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;

-- Messages non répondus
SELECT COUNT(*) FROM messages WHERE is_from_guest = true AND replied_at IS NULL;

-- Dernières conversations synchronisées
SELECT guest_name, last_message_at FROM conversations ORDER BY last_message_at DESC LIMIT 10;
```

---

## 🎯 CHECKLIST DE DÉPLOIEMENT

### Sur Mac Serveur:

- [ ] Repository cloné depuis GitHub
- [ ] `npm install` terminé
- [ ] Playwright Chromium installé (`npx playwright install chromium`)
- [ ] Fichiers sensibles transférés (`airbnb-session.json`, `.env`)
- [ ] Table `queue_outbox` créée (`migrations/create_queue_outbox.sql`)
- [ ] PM2 installé globalement (`npm install -g pm2`)
- [ ] Chemin `cwd` corrigé dans `pm2-workers.json`
- [ ] Variables `.env` vérifiées (`DATABASE_URL`, `GEMINI_API_KEY`)
- [ ] Workers lancés (`pm2 start pm2-workers.json`)
- [ ] Logs vérifiés (`pm2 logs`)
- [ ] PM2 configuré pour démarrage automatique (`pm2 startup`, `pm2 save`)

### Test de validation:

```bash
# 1. Vérifier que les 3 workers tournent
pm2 status
# Doit afficher: airbnb-sync, airbnb-ai, airbnb-send (status: online)

# 2. Vérifier les logs (pas d'erreur)
pm2 logs --lines 20

# 3. Vérifier la DB (nouvelles conversations)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM conversations;"

# 4. Vérifier la queue
psql $DATABASE_URL -c "SELECT COUNT(*) FROM queue_outbox WHERE status = 'pending';"
```

---

## 📞 COMMANDES RAPIDES

```bash
# Lancer le système complet
pm2 start pm2-workers.json

# Arrêter tout
pm2 stop all

# Redémarrer tout
pm2 restart all

# Supprimer tout
pm2 delete all

# Logs en temps réel
pm2 logs --raw

# Monitoring CPU/RAM
pm2 monit
```

---

**🎉 Système prêt pour production 24/7 !**
