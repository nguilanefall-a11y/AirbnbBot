# 📋 Résumé Complet du Projet AirbnbBot

**Date:** 16 décembre 2025  
**Repo GitHub:** https://github.com/nguilanefall-a11y/AirbnbBot  
**Dernier commit:** 753cfbe

---

## ✅ CE QUI A ÉTÉ FAIT

### 1. **Extraction des Credentials Airbnb** ✅
- Utilisé Playwright pour intercepter les requêtes réseau
- Capturé 64 cookies de session dans `airbnb-session.json`
- Extrait l'API key: `d306zoyjsyarp7ifhu67rjxn52tv0t20`
- Session ID: `91c0413e-9524-44d4-b51f-5567fd6d2c5e`
- Fichier: `analyze_airbnb_secrets.ts` (fonctionnel)

### 2. **Système d'Envoi de Messages** ✅
Deux méthodes opérationnelles :

**Méthode A - API GraphQL** (`send_message_service.ts`)
- Endpoint: `POST https://www.airbnb.com/api/v3/CreateBulkMessagesMutation/ab236ebb9e7b55c20cf2a7a4ccfd585674e1beee8e8f1a20055e06aa0d988f92`
- Authentification: Cookies + x-airbnb-api-key
- Test réussi: Message envoyé à Carla (thread 2360697012)
- Réponse: HTTP 200, message ID 28734125612

**Méthode B - Playwright** (`send_message_playwright.ts`)
- Utilise Cmd+Enter pour envoyer (plus fiable que boutons)
- Sélecteur: `textarea, [contenteditable="true"], [role="textbox"]`
- Headless: false (pour debugging)

### 3. **Système de Polling de l'Inbox** ⚠️ PARTIEL
- Fichier: `inbox_polling_service.ts`
- Intégration PostgreSQL complète (table `threads`)
- Endpoint identifié: `GET https://www.airbnb.com/api/v3/ViaductInboxData/{hash}`
- **PROBLÈME:** API retourne ValidationError malgré HTTP 200
- **SOLUTION:** Besoin de créer version Playwright pour scraper le DOM

### 4. **Base de Données PostgreSQL** ✅
- Provider: Supabase (aws-1-eu-north-1.pooler.supabase.com)
- Version: PostgreSQL 17.6
- 32 tables créées (threads, messages, scraping_jobs, etc.)
- Connexion testée avec `test-db-connection.js`

### 5. **Repository GitHub** ✅
- Initialisé et poussé: https://github.com/nguilanefall-a11y/AirbnbBot
- `.gitignore` configuré (exclut airbnb-session.json, .env)
- 57 fichiers, 6059+ lignes de code
- Dernier commit: "docs: Add Mac server setup guide and extensions list"

### 6. **Configuration VS Code** ✅
5 extensions essentielles installées:
1. Playwright Test (ms-playwright.playwright)
2. ESLint (dbaeumer.vscode-eslint)
3. Prettier (esbenp.prettier-vscode)
4. Python (ms-python.python)
5. PostgreSQL Client (cweijan.vscode-postgresql-client2)

Fichiers créés:
- `extensions-airbnbbot.txt` (liste des extensions)
- `GUIDE_FIX_VSCODE_SYNC.md` (fix sync direction)

### 7. **Documentation Complète** ✅
- `SETUP_MAC_SERVEUR.md` - Guide de déploiement sur Mac serveur
- `ARCHITECTURE_STABILISEE.md` - Architecture système
- `AIRBNB_IMPORT_GUIDE.md` - Guide d'import de propriétés
- Multiples guides de diagnostic et fixes

---

## 🔧 CONFIGURATION ACTUELLE

### Fichiers Sensibles (NON dans Git)
```
airbnb-session.json  # 64 cookies Airbnb, session longue durée
.env                 # DATABASE_URL + GEMINI_API_KEY
```

### Compte de Test
- Email: yolo.laviecbien@gmail.com
- Password: Boss4922
- Thread ID test: 2360697012 (Carla)

### Structure Projet
```
/server           # Backend Express (port 5000)
/client           # Frontend React + Vite
/migrations       # Scripts SQL PostgreSQL
send_message_service.ts      # ✅ Envoi API GraphQL
send_message_playwright.ts   # ✅ Envoi Playwright
inbox_polling_service.ts     # ⚠️ Polling (API broken)
analyze_airbnb_secrets.ts    # ✅ Extraction credentials
capture_send_improved.ts     # ✅ Capture requêtes
```

---

## 🚀 CE QU'IL FAUT FAIRE ENSUITE

### Étape 1: Déployer sur le Mac Serveur

**Sur le Mac serveur, exécuter:**

```bash
# 1. Cloner le repository
cd ~
git clone https://github.com/nguilanefall-a11y/AirbnbBot.git
cd AirbnbBot

# 2. Installer les extensions VS Code
code --install-extension ms-playwright.playwright
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-python.python
code --install-extension cweijan.vscode-postgresql-client2

# 3. Installer les dépendances
npm install
npx playwright install chromium

# 4. Attendre la réception des fichiers sensibles
# (airbnb-session.json et .env seront transférés depuis Mac principal)
```

**Sur le Mac principal (celui-ci), transférer:**

```bash
# Option A: Via AirDrop
# Envoyer airbnb-session.json et .env via AirDrop

# Option B: Via SCP (si SSH configuré)
scp airbnb-session.json utilisateur@mac-serveur:~/AirbnbBot/
scp .env utilisateur@mac-serveur:~/AirbnbBot/

# Option C: Via clé USB
# Copier manuellement les 2 fichiers sur USB
```

### Étape 2: Tester le Système

**Sur le Mac serveur:**

```bash
cd ~/AirbnbBot

# Test 1: Vérifier la connexion DB
node test-db-connection.js

# Test 2: Tester l'envoi de message
npx tsx send_message_service.ts

# Test 3: Lancer le polling en mode test
POLLING_MODE=single npx tsx inbox_polling_service.ts
```

### Étape 3: Fixer le Polling de l'Inbox

**Créer `inbox_polling_playwright.ts`** (alternative au polling API):

```typescript
// Scraper le DOM au lieu d'utiliser l'API
import { chromium } from 'playwright';

async function pollInboxPlaywright() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: './airbnb-session.json'
  });
  const page = await context.newPage();
  
  await page.goto('https://www.airbnb.com/hosting/inbox');
  await page.waitForSelector('[data-testid="inbox-thread"]');
  
  const threads = await page.$$eval('[data-testid="inbox-thread"]', elements => {
    return elements.map(el => ({
      threadId: el.getAttribute('data-thread-id'),
      lastMessage: el.querySelector('.message-preview')?.textContent,
      unreadCount: el.querySelector('.unread-badge')?.textContent,
      guestName: el.querySelector('.guest-name')?.textContent
    }));
  });
  
  await browser.close();
  return threads;
}
```

### Étape 4: Créer le Bot Automatique Complet

**Créer `airbnb_auto_responder.ts`:**

```typescript
import { pollInboxPlaywright } from './inbox_polling_playwright';
import { sendMessage } from './send_message_service';
import { generateAIResponse } from './server/gemini';
import { db } from './server/db';

async function autoResponder() {
  console.log('🤖 Bot démarré - Surveillance inbox...');
  
  setInterval(async () => {
    try {
      // 1. Récupérer les messages
      const threads = await pollInboxPlaywright();
      
      // 2. Filtrer les nouveaux messages non répondus
      for (const thread of threads) {
        const lastProcessed = await db.query(
          'SELECT last_message_id FROM threads WHERE airbnb_thread_id = $1',
          [thread.threadId]
        );
        
        if (thread.unreadCount > 0 && isNewMessage(lastProcessed)) {
          // 3. Générer une réponse avec Gemini AI
          const aiResponse = await generateAIResponse(thread.lastMessage);
          
          // 4. Envoyer la réponse
          await sendMessage(thread.threadId, aiResponse);
          
          // 5. Mettre à jour la DB
          await db.query(
            'UPDATE threads SET last_message_id = $1, updated_at = NOW() WHERE airbnb_thread_id = $2',
            [thread.lastMessageId, thread.threadId]
          );
          
          console.log(`✅ Réponse envoyée à ${thread.guestName}`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur polling:', error);
    }
  }, 30000); // Toutes les 30 secondes
}

autoResponder();
```

### Étape 5: Lancer en Production (24/7)

**Sur le Mac serveur:**

```bash
# Option A: En arrière-plan avec PM2
npm install -g pm2
pm2 start airbnb_auto_responder.ts --name airbnb-bot --interpreter tsx
pm2 save
pm2 startup  # Démarrage automatique au boot

# Option B: Avec nohup
nohup npx tsx airbnb_auto_responder.ts > bot.log 2>&1 &

# Voir les logs en temps réel
tail -f bot.log

# Arrêter le bot
pm2 stop airbnb-bot  # Si PM2
# OU
pkill -f "tsx airbnb_auto_responder"  # Si nohup
```

---

## 📊 STATUT DES FONCTIONNALITÉS

| Fonctionnalité | Statut | Fichier | Notes |
|----------------|--------|---------|-------|
| Extraction credentials | ✅ COMPLET | `analyze_airbnb_secrets.ts` | Session longue durée |
| Envoi messages API | ✅ COMPLET | `send_message_service.ts` | GraphQL functional |
| Envoi messages Playwright | ✅ COMPLET | `send_message_playwright.ts` | Cmd+Enter reliable |
| Polling inbox API | ⚠️ PARTIEL | `inbox_polling_service.ts` | ValidationError |
| Polling inbox Playwright | ❌ À CRÉER | - | Alternative nécessaire |
| Réponse automatique AI | ❌ À CRÉER | - | Intégration Gemini |
| Bot complet 24/7 | ❌ À CRÉER | - | Combinaison de tout |
| Déploiement Mac serveur | ⏳ EN COURS | - | Transfert en attente |

---

## 🔑 INFORMATIONS CRITIQUES

### API Airbnb Découverte
```
API Key: d306zoyjsyarp7ifhu67rjxn52tv0t20
Base URL: https://www.airbnb.com/api/v3/

Mutations:
- CreateBulkMessagesMutation/{hash}  ✅ Functional
- ViaductInboxData/{hash}            ⚠️ ValidationError

Headers requis:
- x-airbnb-api-key: {api_key}
- x-csrf-without-token: 1
- Cookie: {64 cookies from session file}
```

### GraphQL Structure
```graphql
mutation CreateBulkMessages($input: CreateBulkMessagesInput!) {
  createBulkMessages(input: $input) {
    messages {
      id
      message
      createdAt
      canEdit
      canUnsend
    }
  }
}

Variables:
{
  "input": {
    "messages": [{
      "threadId": "2360697012",
      "message": "Votre message ici",
      "uniqueIdentifier": "uuid-v4-here"
    }]
  }
}
```

---

## 🎯 PRIORITÉS

1. **URGENT:** Transférer `airbnb-session.json` et `.env` au Mac serveur
2. **HIGH:** Créer `inbox_polling_playwright.ts` (alternative API)
3. **HIGH:** Créer `airbnb_auto_responder.ts` (bot complet)
4. **MEDIUM:** Tester le système end-to-end sur Mac serveur
5. **LOW:** Optimiser et monitorer en production

---

## 📞 COMMANDES UTILES

```bash
# Vérifier que le bot tourne
ps aux | grep tsx

# Voir l'utilisation des ports
lsof -i:5000

# Tuer un processus sur port 5000
lsof -ti:5000 | xargs kill -9

# Vérifier les logs
tail -f bot.log

# Redémarrer le bot (PM2)
pm2 restart airbnb-bot

# Voir le statut (PM2)
pm2 status
pm2 logs airbnb-bot
```

---

## 🚨 TROUBLESHOOTING

### Session Airbnb expirée
```bash
# Régénérer la session
npx tsx analyze_airbnb_secrets.ts
# → Se connecter manuellement dans le navigateur
# → Attendre 2 minutes pour capture des cookies
```

### Erreur de connexion DB
```bash
# Vérifier .env
cat .env | grep DATABASE_URL

# Tester la connexion
node test-db-connection.js
```

### Messages non envoyés
```bash
# Vérifier que les cookies sont valides
cat airbnb-session.json | grep auth_jitney

# Tester manuellement
npx tsx send_message_service.ts
```

---

## ✨ PROCHAINE SESSION

Quand tu ouvres VS Code sur le **Mac serveur**, donne-moi ce contexte:

```
Bonjour ! Je suis sur le Mac serveur. Le projet AirbnbBot a été cloné depuis GitHub.

Contexte:
- Repository: https://github.com/nguilanefall-a11y/AirbnbBot
- Branche: main (commit 753cfbe)
- npm install: [FAIT / PAS FAIT]
- Fichiers sensibles reçus: [OUI / NON]
- Extensions VS Code: [5/5 installées / À installer]

Objectif: Finaliser le déploiement et lancer le bot 24/7

État actuel:
- send_message_service.ts fonctionne ✅
- inbox_polling_service.ts a des erreurs API ⚠️
- Besoin de créer inbox_polling_playwright.ts et airbnb_auto_responder.ts

Que doit-on faire en premier ?
```

---

**📌 Ce document sera mis à jour au fur et à mesure de l'avancement du projet.**
