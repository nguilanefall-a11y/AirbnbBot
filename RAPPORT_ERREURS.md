# 🐛 RAPPORT D'ERREURS - SYNC WORKER HYBRIDE

## Date: 17 Décembre 2025

---

## ✅ CE QUI A ÉTÉ CRÉÉ

### 1. **sync_worker.ts** - Architecture Hybride
- **PHASE 1 (HARVESTING)**: Extraction des secrets via Playwright
  - Fonction `getAuthHeaders()`: Extrait CSRF token, API key, cookies
  - Support multi-méthodes: meta tags, window vars, cookies, network interception
  - Fallback API key si extraction échoue

- **PHASE 2 (POLLING API)**: Boucle infinie avec GraphQL
  - Fonction `fetchThreadsFromAPI()`: Appel MessagingThreadListQuery
  - Fonction `upsertConversation()`: Insert/Update en DB PostgreSQL
  - Fonction `processThreads()`: Traitement conversations non lues
  - Auto re-harvest si token expiré (401/403)

- **ORCHESTRATEUR**: `runSyncWorkerInfinite()`
  - Boucle `while(true)` avec interval 10s
  - Gestion erreurs et retry automatique
  - Logs détaillés pour monitoring

### 2. **Versions Alternatives Créées**
- `sync_worker_v2_api.ts`: API GraphQL pure (échec 401)
- `sync_worker_v3_hybrid.ts`: Playwright + scraping amélioré (0 conversations)
- `diagnostic-scraper.ts`: Tool de debug avec browser visible
- `quick-debug-csrf.ts`: Debug rapide CSRF extraction

---

## ❌ ERREURS RENCONTRÉES

### **ERREUR #1: CSRF Token Introuvable**

**Symptôme:**
```
❌ [HARVEST] Erreur extraction CSRF: Error: ❌ CSRF token introuvable
    at extractCsrfToken (/Users/alpha/Downloads/AirbnbBot 2/workers/sync_worker.ts:141:11)
```

**Contexte:**
- Navigation vers `/hosting/inbox` réussie
- 64 cookies chargés depuis `airbnb-session.json`
- Timeout après 5s d'attente
- Aucun CSRF token trouvé via:
  - Meta tag `<meta name="csrf-token">`
  - Window variables `window._csrf_token`
  - Cookies `csrf_token` ou `_csrf_token`

**Causes Possibles:**
1. **Session expirée**: Les cookies dans `airbnb-session.json` ne sont plus valides
2. **Redirection**: La page redirige vers login ou autre URL
3. **Structure DOM changée**: Airbnb a modifié la façon dont le CSRF est injecté
4. **Lazy loading**: Le CSRF token est chargé après 5s (délai insuffisant)
5. **Détection bot**: Airbnb détecte Playwright et bloque la requête

**Code Concerné:**
```typescript
// workers/sync_worker.ts:104-141
async function extractCsrfToken(page: Page): Promise<string> {
  // Méthode 1: Meta tag
  const csrfFromMeta = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : null;
  });

  // Méthode 2: Window variable
  const csrfFromWindow = await page.evaluate(() => {
    return (window as any)._csrf_token || (window as any).csrfToken || null;
  });

  // Méthode 3: Cookies
  const cookies = await page.context().cookies();
  const csrfCookie = cookies.find(c => c.name === 'csrf_token' || c.name === '_csrf_token');
  
  if (!csrfFromMeta && !csrfFromWindow && !csrfCookie) {
    throw new Error('❌ CSRF token introuvable');
  }
}
```

---

### **ERREUR #2: Navigation Timeout/Abort**

**Symptôme:**
```
page.goto: net::ERR_ABORTED at https://www.airbnb.com/hosting/inbox
page.goto: Timeout 30000ms exceeded.
```

**Contexte:**
- Tentative de navigation vers `/hosting/inbox`
- Erreur survient avant chargement complet de la page
- Tests avec `waitUntil: 'domcontentloaded'` et `'networkidle'`

**Causes Possibles:**
1. **Cookies invalides**: Airbnb rejette la requête car session expirée
2. **Captcha**: Airbnb affiche un captcha qui bloque le chargement
3. **Rate limiting**: Trop de requêtes, Airbnb bloque temporairement
4. **Redirection infinie**: La page redirige en boucle vers login
5. **Réseau**: Problème de connexion internet ou proxy

**Code Concerné:**
```typescript
// workers/sync_worker.ts:229-234
await page.goto(INBOX_URL, { 
  waitUntil: 'domcontentloaded',
  timeout: 30000 
});
await page.waitForTimeout(5000);
```

---

### **ERREUR #3: API GraphQL 401 Unauthorized (V2)**

**Symptôme:**
```
❌ [API] Erreur HTTP 401: Unauthorized
🔑 [API] Token expiré (401/403) - Re-harvest nécessaire
```

**Contexte:**
- Version `sync_worker_v2_api.ts` (API pure sans Playwright)
- Headers construits depuis `airbnb-session.json`
- Requête POST vers `https://www.airbnb.com/api/v3/MessagingThreadListQuery`

**Causes Possibles:**
1. **Cookies insuffisants**: L'API nécessite une vraie session Playwright
2. **CSRF manquant**: Le token CSRF dans `airbnb-session.json` est expiré
3. **API Key invalide**: La clé `d306zoyjsyarp7ifhu67rjxn52tv0t20` n'est plus valide
4. **Headers manquants**: Il manque des headers obligatoires (User-Agent, Referer, etc.)

**Code Concerné:**
```typescript
// workers/sync_worker_v2_api.ts:95-154
const response = await fetch('https://www.airbnb.com/api/v3/MessagingThreadListQuery', {
  method: 'POST',
  headers: {
    'x-airbnb-api-key': AIRBNB_API_KEY,
    'x-csrf-token': csrfToken,
    'Cookie': cookieHeader,
    // ...
  }
});
// Résultat: 401 Unauthorized
```

---

### **ERREUR #4: Scraping Retourne 0 Conversations (V3)**

**Symptôme:**
```
🔍 [SYNC] Test sélecteur: a[href*="/hosting/inbox/folder/"]
   → 0 éléments trouvés
📊 [SYNC] Total: 0 conversations uniques
⚠️  [SYNC] Aucune conversation trouvée
```

**Contexte:**
- Version `sync_worker_v3_hybrid.ts` (Playwright + scraping DOM)
- Tous les sélecteurs CSS retournent 0 éléments
- Même le parsing HTML brut ne trouve aucun ID de conversation

**Causes Possibles:**
1. **Redirection**: La page redirige vers une URL différente (ex: login)
2. **Structure DOM changée**: Airbnb a complètement refait la structure
3. **Lazy loading**: Les conversations ne sont pas encore chargées après scroll
4. **Session expirée**: La page affiche une erreur ou login au lieu de l'inbox

**Sélecteurs Testés (tous 0):**
- `a[href*="/hosting/inbox/folder/"]`
- `a[href*="/hosting/messages/"]`
- `[data-testid="thread-item"]`
- `[role="listitem"] a[href*="/hosting/"]`
- `div[data-plugin-in-point-id*="MESSAGING"] a`

---

## 🔍 DIAGNOSTIC NÉCESSAIRE

### Actions à Réaliser:

1. **Vérifier la session Airbnb:**
   - Ouvrir un navigateur manuel
   - Charger les cookies depuis `airbnb-session.json`
   - Vérifier si l'accès à `/hosting/inbox` fonctionne
   - **Si ça ne marche pas**: Refaire une session (se reconnecter)

2. **Capturer le HTML réel:**
   - Utiliser `diagnostic-scraper.ts` en mode visible (`headless: false`)
   - Prendre un screenshot de la page chargée
   - Sauvegarder le HTML complet
   - Analyser l'URL finale (redirection?)

3. **Extraire les vrais patterns:**
   - Chercher les patterns dans le HTML capturé:
     - CSRF token: `grep -i "csrf" debug-html.html`
     - API key: `grep -i "api.*key" debug-html.html`
     - Thread IDs: `grep -o "/hosting/inbox/[^\"]*" debug-html.html`

4. **Tester avec une session fraîche:**
   - Se connecter manuellement à Airbnb dans Chrome
   - Utiliser l'extension "Cookie Editor" pour exporter les cookies
   - Remplacer `airbnb-session.json` avec les nouveaux cookies
   - Re-tester le worker

---

## 📋 COMMANDES POUR ENVOYER À L'IA

### Commande 1: Test Session Manuelle
```bash
cd "/Users/alpha/Downloads/AirbnbBot 2"

# Ouvrir browser avec session
npx playwright open --load-storage=airbnb-session.json https://www.airbnb.com/hosting/inbox
```

### Commande 2: Diagnostic Complet
```bash
cd "/Users/alpha/Downloads/AirbnbBot 2"

# Lancer diagnostic avec browser visible
npx tsx diagnostic-scraper.ts

# Analyser HTML capturé
ls -lh inbox-html-capture.html
grep -i "csrf" inbox-html-capture.html | head -10
grep -o "/hosting/inbox/folder/[^\"]*" inbox-html-capture.html | head -10
```

### Commande 3: Test Worker Actuel
```bash
cd "/Users/alpha/Downloads/AirbnbBot 2"

# Lancer sync worker et capturer logs
npx tsx workers/sync_worker.ts 2>&1 | tee sync-worker-logs.txt

# Après 30s, analyser les logs
cat sync-worker-logs.txt
```

### Commande 4: Vérifier Cookies Expirés
```bash
cd "/Users/alpha/Downloads/AirbnbBot 2"

# Check expiration des cookies
node -e "
const cookies = require('./airbnb-session.json').cookies;
const now = Date.now() / 1000;
cookies.forEach(c => {
  if (c.expires && c.expires < now) {
    console.log(\`❌ EXPIRÉ: \${c.name} (expired \${new Date(c.expires * 1000).toISOString()})\`);
  } else if (c.expires) {
    console.log(\`✅ VALIDE: \${c.name} (expire \${new Date(c.expires * 1000).toISOString()})\`);
  } else {
    console.log(\`⏳ SESSION: \${c.name} (pas d'expiration)\`);
  }
});
"
```

---

## 🎯 PROCHAINES ÉTAPES RECOMMANDÉES

### Option A: Rafraîchir la Session (RECOMMANDÉ)
1. Se connecter manuellement à Airbnb
2. Exporter les cookies frais
3. Remplacer `airbnb-session.json`
4. Re-tester le worker

### Option B: Méthode Alternative (API Interne)
1. Analyser les requêtes réseau dans DevTools
2. Identifier l'endpoint GraphQL exact utilisé par la vraie interface
3. Reproduire les headers exacts
4. Tester avec curl/Postman d'abord

### Option C: Scraping Playwright Pur (FALLBACK)
1. Abandonner l'API GraphQL
2. Utiliser Playwright pour cliquer réellement sur les conversations
3. Extraire les données depuis le DOM après chaque clic
4. Plus lent mais plus fiable

---

## 📊 RÉSUMÉ DES FICHIERS CRÉÉS

```
workers/
  sync_worker.ts              ✅ Version hybride principale (avec erreurs)
  sync_worker_old_backup.ts   💾 Ancienne version backup
  sync_worker_v2_api.ts       ❌ API pure (401)
  sync_worker_v3_hybrid.ts    ❌ Scraping amélioré (0 conversations)

diagnostic-scraper.ts         🔧 Tool de debug (timeout)
quick-debug-csrf.ts          🔧 Debug CSRF (abort)

RAPPORT_ERREURS.md           📄 Ce fichier
```

---

## 💬 MESSAGE POUR L'IA

**Contexte:**
J'ai créé un sync worker hybride pour Airbnb avec 2 phases:
1. HARVESTING (Playwright): Extraire CSRF token + API key
2. POLLING (Axios): Boucle infinie avec GraphQL API

**Problèmes:**
- ❌ CSRF token introuvable après navigation
- ❌ Navigation timeout/abort vers `/hosting/inbox`
- ❌ Possible session expirée (`airbnb-session.json`)

**Actions faites:**
- Créé `sync_worker.ts` avec architecture complète
- Testé 3 méthodes d'extraction CSRF (meta, window, cookies)
- Essayé multiples versions (API pure, scraping, hybride)

**Besoin:**
1. Comment diagnostiquer si la session est expirée?
2. Comment extraire le CSRF token si la structure a changé?
3. Dois-je rafraîchir `airbnb-session.json` ou y a-t-il une autre solution?

**Fichiers disponibles:**
- `workers/sync_worker.ts` (code principal)
- `airbnb-session.json` (64 cookies, possiblement expirés)
- `.env` (credentials Airbnb)

Que recommandes-tu comme prochaine étape?
