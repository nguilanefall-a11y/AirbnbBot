# Configuration Co-Hôte Airbnb (Approche Légale)

## ✅ Pourquoi c'est Légal

**Utiliser Playwright avec le compte co-hôte est légal car :**
1. ✅ Le co-hôte a un **accès légitime** aux annonces des clients
2. ✅ C'est **son propre compte** Airbnb
3. ✅ Il a les **permissions nécessaires** pour gérer les messages
4. ✅ Pas de violation des ToS (accès autorisé)

---

## 🎯 Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Compte Co-Hôte Airbnb                          │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 1. Se connecte avec email/password ou cookies  │  │
│  │ 2. Accède aux annonces des clients             │  │
│  │ 3. Récupère les messages (accès légitime)      │  │
│  │ 4. Envoie les réponses (via son compte)        │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Votre Application                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 1. Génère réponses IA                          │  │
│  │ 2. Sauvegarde dans DB                          │  │
│  │ 3. Envoie via compte co-hôte                  │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Option 1 : Cookies (Recommandé)

**Avantages :**
- Plus rapide (pas besoin de se connecter à chaque fois)
- Plus stable
- Moins de risques de détection

**Configuration :**

1. **Récupérer les cookies du compte co-hôte :**
   - Connectez-vous à Airbnb avec le compte co-hôte
   - Ouvrez les DevTools (F12)
   - Allez dans l'onglet "Network"
   - Rechargez la page
   - Cliquez sur une requête vers `airbnb.com`
   - Copiez la valeur du header `Cookie`

2. **Ajouter dans `.env` :**
   ```bash
   AIRBNB_COHOST_COOKIES="airbnb_session=xxx; airbnb_cookie=yyy; ..."
   ```

### Option 2 : Email/Password

**Avantages :**
- Pas besoin de récupérer les cookies manuellement
- Se connecte automatiquement

**Inconvénients :**
- Plus lent (connexion à chaque fois)
- Peut être détecté comme automation

**Configuration :**

```bash
AIRBNB_COHOST_EMAIL=cohost@example.com
AIRBNB_COHOST_PASSWORD=your_password
```

### Activer Playwright

```bash
PLAYWRIGHT_ENABLED=1
```

---

## 🚀 Utilisation

### Via API (Recommandé)

**Synchronisation manuelle :**

```bash
POST /api/sync/cohost
Content-Type: application/json

{
  "cookies": "airbnb_session=xxx; ..."  // Optionnel si dans .env
}
```

**Réponse :**
```json
{
  "listingsFound": 5,
  "conversationsFound": 12,
  "messagesProcessed": 25,
  "repliesSent": 20,
  "errors": []
}
```

### Via Code

```typescript
import { syncAllCoHostListings, startCoHostSync } from "./server/cohost-sync-service";

// Synchronisation unique
const result = await syncAllCoHostListings(userId, {
  cookies: process.env.AIRBNB_COHOST_COOKIES,
  // ou
  email: process.env.AIRBNB_COHOST_EMAIL,
  password: process.env.AIRBNB_COHOST_PASSWORD,
});

// Synchronisation automatique (toutes les 15 minutes)
const stopSync = await startCoHostSync(
  userId,
  { cookies: process.env.AIRBNB_COHOST_COOKIES },
  15
);

// Arrêter la synchronisation
stopSync();
```

---

## 📋 Flux Complet

1. **Connexion**
   - Se connecte avec le compte co-hôte (cookies ou email/password)
   - Récupère la session

2. **Récupération des Annonces**
   - Accède à `https://www.airbnb.com/hosting/listings`
   - Scrape toutes les annonces accessibles
   - Pour chaque annonce, récupère les messages

3. **Traitement des Messages**
   - Vérifie si le message existe déjà (évite les doublons)
   - Génère une réponse avec l'IA
   - Sauvegarde dans la DB

4. **Envoi des Réponses**
   - Envoie la réponse via le compte co-hôte
   - Sauvegarde le message envoyé dans la DB

---

## ⚙️ Mapping Annonces → Propriétés

Pour que le système sache quelle propriété correspond à quelle annonce Airbnb :

### Option 1 : Via Smoobu Listing ID

Si vous avez déjà configuré `smoobuListingId` dans vos propriétés :
- Le système essaie de matcher via `smoobuListingId`
- Sinon, prend la première propriété de l'utilisateur

### Option 2 : Stocker l'ID Airbnb dans la Propriété

Ajoutez un champ `airbnbListingId` dans le schéma :

```typescript
// Dans shared/schema.ts
export const properties = pgTable("properties", {
  // ... autres champs
  airbnbListingId: text("airbnb_listing_id"), // Nouveau champ
});
```

Puis dans `cohost-sync-service.ts`, matcher via ce champ.

---

## 🔄 Synchronisation Automatique

### Via Cron Job

Créez un cron job qui appelle l'API toutes les 15 minutes :

```bash
# Dans votre serveur
*/15 * * * * curl -X POST http://localhost:5000/api/sync/cohost \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

### Via Code (Node.js)

```typescript
import { startCoHostSync } from "./server/cohost-sync-service";

// Démarrer au démarrage de l'application
const stopSync = await startCoHostSync(
  userId,
  { cookies: process.env.AIRBNB_COHOST_COOKIES },
  15 // Toutes les 15 minutes
);

// Arrêter proprement à l'arrêt de l'application
process.on("SIGTERM", () => {
  stopSync();
});
```

---

## ⚠️ Bonnes Pratiques

### 1. **Renouvellement des Cookies**
- Les cookies expirent régulièrement (7-30 jours)
- Renouvelez-les dans `.env` si vous recevez des erreurs d'authentification
- Utilisez des cookies récents

### 2. **Fréquence de Synchronisation**
- **Recommandé** : Toutes les 15-30 minutes
- **Maximum** : Toutes les 5 minutes (pour éviter la surcharge)
- **Éviter** : Synchronisation en continu

### 3. **Gestion des Erreurs**
- Le système continue même si une annonce échoue
- Les erreurs sont collectées dans `errors[]`
- Surveillez les logs pour détecter les problèmes

### 4. **Sélecteurs CSS**
- Airbnb peut changer son interface
- Les sélecteurs dans `airbnb-cohost-playwright.ts` peuvent nécessiter des mises à jour
- Testez régulièrement

---

## 🛠️ Dépannage

### Erreur : "Cookies expirés" ou "Non authentifié"
- Renouvelez les cookies dans `.env`
- Vérifiez que le compte co-hôte est toujours actif
- Testez la connexion manuellement sur Airbnb

### Erreur : "Sélecteur non trouvé"
- Airbnb a peut-être changé son interface
- Vérifiez les sélecteurs dans `airbnb-cohost-playwright.ts`
- Testez manuellement dans le navigateur

### Erreur : "Aucune annonce trouvée"
- Vérifiez que le compte co-hôte a bien accès aux annonces
- Connectez-vous manuellement et vérifiez `https://www.airbnb.com/hosting/listings`
- Vérifiez que les permissions co-hôte sont correctes

### Messages non envoyés
- Vérifiez les logs pour les erreurs spécifiques
- Testez l'envoi manuellement sur Airbnb
- Vérifiez que le compte co-hôte a les permissions d'envoi

---

## 📊 Monitoring

### Logs à Surveiller

```
🔐 Connexion au compte co-hôte...
✅ Connecté au compte co-hôte
📋 Récupération des annonces...
✅ 5 annonce(s) trouvée(s)
📨 Traitement de l'annonce: Appartement Paris (12345)
✅ Message envoyé
```

### Métriques

- `listingsFound` : Nombre d'annonces trouvées
- `conversationsFound` : Nombre de conversations trouvées
- `messagesProcessed` : Nombre de messages traités
- `repliesSent` : Nombre de réponses envoyées
- `errors` : Liste des erreurs rencontrées

---

## ✅ Avantages de cette Approche

1. **Légalité** : Accès légitime via le compte co-hôte
2. **Pas de coût** : Pas besoin de payer Smoobu
3. **Contrôle total** : Contrôle sur la réception et l'envoi
4. **Flexibilité** : Peut adapter selon vos besoins
5. **Simplicité** : Pas besoin d'API externe

---

## 📝 Résumé

**Configuration minimale :**
```bash
AIRBNB_COHOST_COOKIES="airbnb_session=xxx; ..."
PLAYWRIGHT_ENABLED=1
```

**Utilisation :**
```bash
POST /api/sync/cohost
```

**Résultat :**
- ✅ Récupère les messages via le compte co-hôte (légal)
- ✅ Génère des réponses IA
- ✅ Envoie les réponses via le compte co-hôte (légal)

🎉 **Vous avez maintenant un système légal qui utilise le compte co-hôte pour gérer les messages !**



