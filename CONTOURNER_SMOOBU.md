# Contourner Smoobu avec Playwright + API Smoobu

## 🎯 Stratégie

**Récupérer les messages via Playwright** (contourne Smoobu) + **Envoyer via API Smoobu** (légal, nécessite compte Smoobu)

### Pourquoi cette approche ?

1. **Économie** : Pas besoin de payer Smoobu pour la synchronisation des messages
2. **Légalité** : Utiliser l'API Smoobu pour l'envoi reste légal vis-à-vis d'Airbnb
3. **Flexibilité** : Contrôle total sur la réception des messages

---

## 📋 Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Récupération des Messages                  │
│                  (Playwright)                          │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 1. Scraper Airbnb directement                    │  │
│  │ 2. Contourne Smoobu (pas de synchronisation)     │  │
│  │ 3. Récupère conversations + messages             │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Traitement & Réponse IA                   │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 1. Générer réponse avec Gemini                  │  │
│  │ 2. Sauvegarder dans DB                          │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Envoi des Réponses                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Option 1: API Smoobu (légal, nécessite compte) │  │
│  │ Option 2: Playwright (contourne tout)          │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

### 1. Cookies Airbnb du Co-Hôte

Vous devez récupérer les cookies de session du compte co-hôte Airbnb.

**Méthode 1 : Via le navigateur (recommandé)**
1. Connectez-vous à Airbnb avec le compte co-hôte
2. Ouvrez les DevTools (F12)
3. Allez dans l'onglet "Network"
4. Rechargez la page
5. Cliquez sur une requête vers `airbnb.com`
6. Copiez la valeur du header `Cookie`
7. Ajoutez-la dans `.env` :

```bash
AIRBNB_COHOST_COOKIES="airbnb_session=xxx; airbnb_cookie=yyy; ..."
```

**Méthode 2 : Via une extension**
- Utilisez une extension comme "Cookie Editor" pour exporter les cookies

### 2. API Key Smoobu (optionnel, pour l'envoi)

Si vous voulez utiliser l'API Smoobu pour l'envoi (légal) :

```bash
# Dans .env
SMOOBU_API_KEY=your_api_key_here
```

**Note** : Vous avez besoin d'un compte Smoobu pour obtenir une API key, mais vous n'utilisez que l'API d'envoi, pas leur synchronisation.

### 3. Activer Playwright

```bash
PLAYWRIGHT_ENABLED=1
```

---

## 🚀 Utilisation

### Option A : Synchronisation Manuelle

```typescript
import { syncAirbnbMessagesViaPlaywright } from "./server/airbnb-sync-playwright";

// Synchroniser une fois
await syncAirbnbMessagesViaPlaywright({
  userId: "user-id",
  cookiesHeader: process.env.AIRBNB_COHOST_COOKIES,
  useSmoobuForSending: true, // Utiliser API Smoobu pour l'envoi
});
```

### Option B : Synchronisation Automatique

```typescript
import { startAirbnbSync } from "./server/airbnb-sync-playwright";

// Démarrer la synchronisation automatique (toutes les 15 minutes)
const stopSync = await startAirbnbSync("user-id", 15);

// Arrêter la synchronisation
stopSync();
```

### Option C : Via Route API

Ajoutez une route dans `server/routes.ts` :

```typescript
app.post("/api/sync/airbnb", isAuthenticated, async (req: any, res) => {
  try {
    const { syncAirbnbMessagesViaPlaywright } = await import("./airbnb-sync-playwright");
    
    const result = await syncAirbnbMessagesViaPlaywright({
      userId: req.user.id,
      cookiesHeader: process.env.AIRBNB_COHOST_COOKIES,
      useSmoobuForSending: true,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message });
  }
});
```

---

## ⚠️ Avertissements

### 1. **Cookies Expirés**
Les cookies Airbnb expirent régulièrement. Vous devrez les renouveler :
- Tous les 7-30 jours (selon l'activité)
- Si vous recevez des erreurs d'authentification

### 2. **Détection par Airbnb**
- Utilisez des délais réalistes entre les requêtes
- Ne synchronisez pas trop fréquemment (max 1x toutes les 15 minutes)
- Utilisez un navigateur headless avec des paramètres réalistes

### 3. **Sélecteurs Fragiles**
Les sélecteurs CSS d'Airbnb peuvent changer. Vous devrez peut-être les adapter dans `airbnb-messaging-playwright.ts`.

### 4. **API Smoobu pour l'Envoi**
- Nécessite un compte Smoobu (même si vous ne l'utilisez pas pour la réception)
- L'API d'envoi est légale vis-à-vis d'Airbnb
- Alternative : utiliser Playwright pour l'envoi aussi (mais plus risqué)

---

## 📊 Avantages vs Inconvénients

### ✅ Avantages
- **Économie** : Pas besoin de payer Smoobu pour la synchronisation
- **Contrôle** : Contrôle total sur la réception des messages
- **Flexibilité** : Peut adapter le scraping selon vos besoins
- **Légalité partielle** : Utiliser l'API Smoobu pour l'envoi reste légal

### ❌ Inconvénients
- **Maintenance** : Les sélecteurs CSS peuvent changer
- **Fragilité** : Plus fragile qu'une API officielle
- **Cookies** : Nécessite de renouveler les cookies régulièrement
- **Risque** : Scraping peut violer les ToS Airbnb (mais moins risqué que l'envoi)

---

## 🔄 Flux Complet

1. **Cron Job** (toutes les 15 minutes)
   - Appelle `syncAirbnbMessagesViaPlaywright()`
   - Récupère les conversations via Playwright
   - Récupère les messages de chaque conversation

2. **Traitement**
   - Vérifie si le message existe déjà (évite les doublons)
   - Génère une réponse avec l'IA
   - Sauvegarde dans la DB

3. **Envoi**
   - **Option 1** : Via API Smoobu (si configuré) → Légal
   - **Option 2** : Via Playwright → Contourne tout mais plus risqué

---

## 🛠️ Dépannage

### Erreur : "Cookies expirés"
- Renouvelez les cookies dans `.env`
- Vérifiez que le compte co-hôte est toujours actif

### Erreur : "Sélecteur non trouvé"
- Airbnb a peut-être changé son interface
- Vérifiez les sélecteurs dans `airbnb-messaging-playwright.ts`
- Testez manuellement dans le navigateur

### Erreur : "Rate limit"
- Réduisez la fréquence de synchronisation
- Ajoutez des délais entre les requêtes

---

## 📝 Résumé

**Stratégie finale :**
- ✅ **Récupération** : Playwright (contourne Smoobu)
- ✅ **Envoi** : API Smoobu (légal, nécessite compte) OU Playwright (contourne tout)

**Code créé :**
- `server/airbnb-messaging-playwright.ts` - Scraping des messages
- `server/airbnb-sync-playwright.ts` - Synchronisation complète
- `server/message-router.ts` - Routeur hybride (déjà existant)

**Configuration nécessaire :**
- `AIRBNB_COHOST_COOKIES` dans `.env`
- `SMOOBU_API_KEY` (optionnel, pour l'envoi)
- `PLAYWRIGHT_ENABLED=1`

🎉 **Vous pouvez maintenant contourner Smoobu pour la réception tout en restant légal pour l'envoi !**



