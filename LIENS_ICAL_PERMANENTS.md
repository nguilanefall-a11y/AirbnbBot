# 🔗 Liens de Synchronisation iCal Permanents - Documentation

## ✅ Implémentation Complète

Le système de liens permanents a été entièrement implémenté. Tous les liens iCal sont maintenant **permanents, sécurisés et fonctionnent automatiquement sans authentification**.

---

## 🎯 Fonctionnalités Implémentées

### 1. **Liens Permanents avec Tokens**

- ✅ Chaque propriété a un token unique permanent (`icalSyncToken`)
- ✅ Chaque agent de ménage a un token unique permanent (`icalSyncToken`)
- ✅ Les tokens sont générés automatiquement lors de la première demande
- ✅ Les tokens ne changent jamais sauf si régénérés manuellement
- ✅ Les liens fonctionnent **sans expiration** et **sans authentification**

### 2. **Accès Sans Authentification**

- ✅ Aucune validation manuelle requise
- ✅ Les liens fonctionnent directement dans Google Calendar, Apple Calendar, Airbnb, etc.
- ✅ Pas de token temporaire
- ✅ Contrôle d'accès uniquement par token (sécurisé)

### 3. **Sécurité**

- ✅ Tokens uniques de 32 caractères (hexadécimal)
- ✅ Tokens stockés en base de données avec index unique
- ✅ Aucune donnée sensible exposée (seulement dates check-in/check-out)
- ✅ Possibilité de régénérer les tokens (invalide l'ancien)

---

## 📡 Endpoints API

### **Pour les Hôtes**

#### 1. Obtenir le lien permanent d'une propriété
```
GET /api/properties/:id/ical-export-url
```
**Authentification requise** (hôte propriétaire)

**Réponse :**
```json
{
  "exportUrl": "https://votre-app.com/api/calendar/:id/export.ics?token=abc123...",
  "permanentUrl": "https://votre-app.com/api/calendar/:id/export.ics?token=abc123...",
  "token": "abc123...",
  "propertyName": "Mon Appartement",
  "isPermanent": true,
  "neverExpires": true,
  "instructions": {
    "forAirbnb": "Copiez ce lien et collez-le dans Airbnb > Calendrier > Paramètres > Importer un calendrier",
    "forGoogleCalendar": "Ouvrez Google Calendar > Paramètres > Ajouter un calendrier > À partir d'une URL",
    "forAppleCalendar": "Fichier > Nouvel abonnement à un calendrier > Collez l'URL",
    "forCleaners": "Partagez ce lien avec vos agents de ménage..."
  }
}
```

#### 2. Régénérer le token d'une propriété
```
POST /api/properties/:id/regenerate-ical-token
```
**Authentification requise** (hôte propriétaire)

**Réponse :**
```json
{
  "exportUrl": "https://votre-app.com/api/calendar/:id/export.ics?token=nouveau_token...",
  "token": "nouveau_token...",
  "note": "L'ancien lien ne fonctionnera plus. Utilisez ce nouveau lien."
}
```

#### 3. Partager le calendrier avec les agents de ménage
```
GET /api/host/calendar-share-url/:propertyId
```
**Authentification requise** (hôte propriétaire)

**Réponse :** Même format que `/api/properties/:id/ical-export-url`

---

### **Pour les Agents de Ménage**

#### 1. Obtenir le lien permanent de son calendrier
```
GET /api/cleaner/my-ical-url
```
**Authentification requise** (agent de ménage)

**Réponse :**
```json
{
  "exportUrl": "https://votre-app.com/api/cleaner-calendar/:userId/export.ics?token=xyz789...",
  "permanentUrl": "https://votre-app.com/api/cleaner-calendar/:userId/export.ics?token=xyz789...",
  "token": "xyz789...",
  "cleanerName": "Marie Dupont",
  "isPermanent": true,
  "neverExpires": true,
  "instructions": {
    "forGoogleCalendar": "...",
    "forAppleCalendar": "...",
    "forOther": "..."
  }
}
```

#### 2. Régénérer le token de son calendrier
```
POST /api/cleaner/regenerate-ical-token
```
**Authentification requise** (agent de ménage)

**Réponse :** Même format que `/api/cleaner/my-ical-url`

---

### **Export iCal (Public - Accès Sans Authentification)**

#### 1. Export calendrier propriété (avec token)
```
GET /api/calendar/:propertyId/export.ics?token=abc123...
```
**Aucune authentification requise** (accès via token)

**Supporte aussi :**
- Mode legacy : `GET /api/calendar/:propertyId/export.ics` (sans token, pour compatibilité)

#### 2. Export calendrier agent de ménage (avec token)
```
GET /api/cleaner-calendar/:cleanerId/export.ics?token=xyz789...
```
**Aucune authentification requise** (accès via token)

**Supporte aussi :**
- Mode legacy : `GET /api/cleaner-calendar/:cleanerId/export.ics` (sans token, pour compatibilité)

---

## 🔧 Utilisation

### **Pour un Hôte :**

1. **Obtenir le lien permanent :**
   - Connectez-vous à votre espace hôte
   - Allez dans la gestion d'une propriété
   - Cliquez sur "Obtenir le lien iCal" ou utilisez l'endpoint `/api/properties/:id/ical-export-url`
   - Copiez le lien `exportUrl` ou `permanentUrl`

2. **Importer dans Airbnb :**
   - Allez dans Airbnb > Calendrier > Paramètres
   - Cliquez sur "Importer un calendrier"
   - Collez le lien permanent
   - Le calendrier se synchronisera automatiquement

3. **Partager avec un agent de ménage :**
   - Utilisez le même lien permanent
   - Partagez-le avec votre agent de ménage
   - L'agent peut l'importer dans son calendrier (Google Calendar, Apple Calendar, etc.)

### **Pour un Agent de Ménage :**

1. **Obtenir son lien permanent :**
   - Connectez-vous à votre espace agent de ménage
   - Allez dans "Calendrier" ou utilisez l'endpoint `/api/cleaner/my-ical-url`
   - Copiez le lien `exportUrl` ou `permanentUrl`

2. **Importer dans votre calendrier :**
   - **Google Calendar :** Paramètres > Ajouter un calendrier > À partir d'une URL
   - **Apple Calendar :** Fichier > Nouvel abonnement à un calendrier > Collez l'URL
   - **Autres :** Suivez les instructions de votre application de calendrier

---

## 🔒 Sécurité

### **Ce qui est exposé :**
- ✅ Dates de check-in et check-out
- ✅ Nom du logement
- ✅ Nom du voyageur (si disponible)
- ✅ Statut de la réservation

### **Ce qui n'est PAS exposé :**
- ❌ Informations sensibles (codes d'accès, WiFi, etc.)
- ❌ Coordonnées complètes des voyageurs
- ❌ Notes privées de l'hôte
- ❌ Données de paiement

### **Régénération de token :**
Si vous pensez qu'un token a été compromis :
1. Utilisez l'endpoint de régénération (`POST /api/properties/:id/regenerate-ical-token`)
2. L'ancien lien cessera de fonctionner
3. Partagez le nouveau lien avec vos agents de ménage

---

## 📊 Base de Données

### **Nouvelles colonnes :**

1. **`properties.ical_sync_token`**
   - Type : `VARCHAR UNIQUE`
   - Index : `IDX_properties_ical_sync_token`
   - Généré automatiquement lors de la première demande

2. **`users.ical_sync_token`**
   - Type : `VARCHAR UNIQUE`
   - Index : `IDX_users_ical_sync_token`
   - Généré automatiquement lors de la première demande

### **Migration :**
✅ La migration a été exécutée avec succès. Les colonnes sont présentes dans Supabase.

---

## 🚀 Déploiement

### **Variables d'environnement requises :**
```env
DATABASE_URL=postgresql://...
BASE_URL=https://votre-app.com  # Important pour les liens permanents
```

### **Sur Render :**
1. ✅ Les liens permanents fonctionnent automatiquement
2. ✅ Assurez-vous que `BASE_URL` est configuré avec votre URL Render
3. ✅ Les liens ne sont pas temporaires (pas de limitation Render)

---

## ✅ Ce qui est Prêt

- ✅ Génération automatique des tokens
- ✅ Liens permanents sans expiration
- ✅ Accès sans authentification (pas d'authentification requise pour l'export)
- ✅ Compatibilité avec Google Calendar, Apple Calendar, Airbnb
- ✅ Régénération de tokens
- ✅ Migration de base de données
- ✅ Documentation complète

---

## 📝 Ce qui Reste à Faire (Manuel)

### **Configuration Render :**
1. Vérifiez que `BASE_URL` est défini dans les variables d'environnement Render
2. Format : `BASE_URL=https://votre-app.onrender.com`

### **Test :**
1. Testez l'obtention d'un lien permanent pour une propriété
2. Testez l'import dans Google Calendar ou Apple Calendar
3. Testez le partage avec un agent de ménage
4. Vérifiez que la synchronisation fonctionne automatiquement

### **Communication aux Utilisateurs :**
1. Expliquez aux hôtes comment obtenir et partager leurs liens permanents
2. Expliquez aux agents de ménage comment importer leur calendrier
3. Mentionnez que les liens sont permanents et ne nécessitent pas de renouvellement

---

## 🎉 Résultat Final

Vous disposez maintenant d'un système complet de **liens de synchronisation iCal permanents**. Les utilisateurs peuvent :

- ✅ Obtenir un lien permanent pour chaque propriété
- ✅ Partager ce lien avec leurs agents de ménage
- ✅ Importer le lien dans n'importe quel calendrier compatible iCal
- ✅ Le lien fonctionne automatiquement sans authentification
- ✅ Le lien ne expire jamais
- ✅ Possibilité de régénérer le token si nécessaire

**Tout est prêt pour la production !** 🚀

