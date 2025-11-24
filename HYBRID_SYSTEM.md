# Système Hybride Playwright + Smoobu

## 🎯 Concept

Combiner **Smoobu (API officielle)** et **Playwright (automation)** pour créer un système robuste avec fallback automatique.

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Message Router                        │
│              (server/message-router.ts)                  │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────┐
│   Smoobu      │              │  Playwright   │
│  (Priorité 1) │              │  (Fallback)   │
│               │              │               │
│ ✅ Légal      │              │ ⚠️ Risqué     │
│ ✅ Stable     │              │ ✅ Gratuit     │
│ ✅ API offic. │              │ ✅ Flexible   │
└───────────────┘              └───────────────┘
```

---

## 🔄 Flux de Routage

### 1. **Réception d'un Message**

```
Message reçu
    │
    ▼
Vérifier Smoobu configuré ?
    │
    ├─ OUI → Essayer Smoobu
    │         │
    │         ├─ Succès → ✅ Envoyer via Smoobu
    │         │
    │         └─ Échec → Basculer vers Playwright
    │
    └─ NON → Essayer Playwright directement
              │
              ├─ Succès → ✅ Envoyer via Playwright
              │
              └─ Échec → ❌ Marquer pour révision manuelle
```

### 2. **Envoi d'un Message**

Le système essaie automatiquement dans cet ordre :
1. **Smoobu** (si configuré et actif)
2. **Playwright** (si Smoobu échoue ou non configuré)
3. **Stockage local** (si tout échoue - pour révision manuelle)

---

## ✅ Avantages de l'Approche Hybride

### 1. **Redondance**
- Si Smoobu est en panne → Playwright prend le relais
- Pas de perte de messages
- Continuité de service

### 2. **Économie**
- Utiliser Smoobu pour les messages (légal)
- Utiliser Playwright pour le scraping de données (moins risqué)
- Réduire les coûts si Smoobu n'est pas toujours nécessaire

### 3. **Flexibilité**
- Playwright peut faire des choses que Smoobu ne peut pas
- Ex: Récupérer des infos supplémentaires depuis Airbnb
- Ex: Automatiser des actions complexes

### 4. **Sécurité**
- Smoobu reste la méthode principale (légale)
- Playwright uniquement en fallback (moins d'utilisation = moins de risque)

---

## ⚠️ Risques et Limitations

### Playwright
- ❌ **Violation des ToS Airbnb** si utilisé pour les messages
- ❌ Risque de bannissement du compte
- ❌ Fragile (Airbnb change souvent son interface)
- ✅ **Moins risqué** si utilisé uniquement pour le scraping de données

### Recommandation
- **Utiliser Smoobu en priorité** (99% du temps)
- **Playwright uniquement en fallback** (1% du temps)
- **Playwright pour le scraping** (acceptable, moins risqué)

---

## 🔧 Implémentation

### Code Existant

✅ **Déjà implémenté :**
- `server/message-router.ts` - Routeur hybride
- `server/smoobu-client.ts` - Client API Smoobu
- `server/smoobu-service.ts` - Service webhook (utilise maintenant le routeur)
- `server/airbnb-playwright.ts` - Scraping Playwright

### À Développer (Optionnel)

⚠️ **Si vous voulez vraiment utiliser Playwright pour les messages :**

1. **Créer `server/airbnb-messaging-playwright.ts`**
   ```typescript
   // Automatiser l'envoi de messages via Playwright
   // Nécessite :
   // - Cookies de session du co-hôte
   // - Navigation vers la conversation
   // - Envoi du message
   // - Vérification de l'envoi
   ```

2. **Stocker les cookies du co-hôte**
   - Dans la DB (chiffrés)
   - Ou dans un fichier sécurisé

3. **Gérer la rotation des cookies**
   - Renouveler automatiquement
   - Détecter les sessions expirées

---

## 📋 Configuration

### Variables d'Environnement

```bash
# Smoobu (recommandé)
SMOOBU_API_KEY=your_key_here

# Playwright (fallback)
PLAYWRIGHT_ENABLED=1  # Activer Playwright

# Stratégie de routage
MESSAGE_ROUTING_STRATEGY=hybrid  # hybrid | smoobu-only | playwright-only
```

### Paramètres dans l'App

Dans `/settings`, vous pouvez configurer :
- ✅ **Smoobu API Key** (priorité 1)
- ✅ **Auto-reply activé/désactivé**
- ⚠️ **Playwright fallback** (optionnel, à activer avec précaution)

---

## 🎯 Cas d'Usage Recommandés

### ✅ **Utiliser Smoobu pour :**
- Envoi de messages (légal, stable)
- Réception de messages (webhooks)
- Synchronisation des réservations
- Gestion des co-hôtes

### ✅ **Utiliser Playwright pour :**
- Scraping de données de propriétés (moins risqué)
- Import initial de propriétés
- Récupération d'informations non disponibles via API
- **Fallback uniquement** si Smoobu est indisponible

### ❌ **Ne PAS utiliser Playwright pour :**
- Messages réguliers (violation ToS)
- Actions automatisées fréquentes (détectable)
- Opérations critiques (fragile)

---

## 🔍 Monitoring

Le système enregistre :
- Quelle méthode a été utilisée (`smoobu` ou `playwright`)
- Taux de succès/échec pour chaque méthode
- Raisons d'échec
- Temps de réponse

### Logs Exemple

```
✅ Message envoyé via Smoobu (bookingId: 12345)
⚠️ Smoobu a échoué, basculement vers Playwright: API timeout
✅ Message envoyé via Playwright (fallback)
```

---

## 🚀 Prochaines Étapes

1. ✅ **Routeur hybride créé** (`server/message-router.ts`)
2. ✅ **Intégration dans `smoobu-service.ts`**
3. ⚠️ **Implémenter Playwright messaging** (optionnel, si vraiment nécessaire)
4. 📊 **Ajouter monitoring/dashboards**
5. 🔔 **Alertes si Smoobu échoue trop souvent**

---

## 💡 Recommandation Finale

**Stratégie recommandée :**
- **Smoobu = 99%** (méthode principale, légale, stable)
- **Playwright = 1%** (fallback uniquement, scraping de données)

**Ne développez pas Playwright messaging** sauf si :
- Smoobu est vraiment indisponible trop souvent
- Vous acceptez les risques (bannissement possible)
- Vous avez un plan B (compte de secours)

**Mieux vaut :**
- Investir dans un plan Smoobu fiable
- Avoir un monitoring pour détecter les pannes
- Avoir un système d'alertes pour intervention manuelle si nécessaire

---

## 📝 Résumé

✅ **Oui, vous pouvez mélanger Playwright et Smoobu !**

**Avantages :**
- Redondance et continuité de service
- Flexibilité et économie
- Meilleure résilience

**Recommandation :**
- Smoobu en priorité (légal, stable)
- Playwright en fallback uniquement
- Playwright pour le scraping (moins risqué)

Le code est déjà prêt dans `server/message-router.ts` ! 🎉



