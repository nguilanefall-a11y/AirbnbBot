# 🔧 Diagnostic du Serveur

## État Actuel

✅ **Le serveur démarre correctement**
✅ **Le serveur répond sur le port 5000**
✅ **L'API fonctionne** (testé avec `/api/user`)

## Tests Effectués

1. **Compilation TypeScript** : ✅ Aucune erreur
2. **Connexion Base de Données** : ✅ Initialisée
3. **Démarrage Serveur** : ✅ Serveur écoute sur port 5000
4. **Réponse HTTP** : ✅ Status 200 OK
5. **Réponse API** : ✅ JSON valide

## Pour Démarrer le Serveur

### Option 1 : Script automatique
```bash
./start-server.sh
```

### Option 2 : Commande npm
```bash
npm run dev
```

### Option 3 : Mode watch (redémarrage automatique)
```bash
npm run auto
```

## URL d'Accès

- **Frontend** : http://localhost:5000
- **API** : http://localhost:5000/api/*
- **WebSocket** : ws://localhost:5000/ws

## Si le Site n'est Pas Accessible

### 1. Vérifier que le serveur est en cours d'exécution
```bash
ps aux | grep "tsx.*index"
```

### 2. Vérifier que le port 5000 est libre
```bash
lsof -ti:5000
```

### 3. Arrêter tous les processus
```bash
pkill -f "tsx.*index"
pkill -f "node.*server"
```

### 4. Redémarrer le serveur
```bash
npm run dev
```

### 5. Vérifier les logs
```bash
# Les logs apparaissent dans la console
# Vérifier qu'il n'y a pas d'erreurs
```

## Corrections Appliquées

1. ✅ **Gestion d'erreurs améliorée** : Les erreurs ne font plus planter le serveur
2. ✅ **Vite errors non fatales** : Les erreurs Vite sont loggées mais ne tuent pas le serveur
3. ✅ **Script de démarrage** : Création d'un script `start-server.sh` pour faciliter le démarrage

## Problèmes Connus et Solutions

### Port déjà utilisé
**Symptôme** : `Error: listen EADDRINUSE: address already in use`

**Solution** :
```bash
pkill -f "tsx.*index"
# ou
lsof -ti:5000 | xargs kill -9
```

### Erreur de base de données
**Symptôme** : `Database not initialized`

**Solution** : Vérifier que `DATABASE_URL` est défini dans `.env`

### Erreur Vite
**Symptôme** : Erreurs de compilation Vite

**Solution** : Vérifier les logs, le serveur continuera à fonctionner même avec des erreurs Vite mineures

## Commandes Utiles

```bash
# Voir les processus en cours
ps aux | grep tsx

# Voir ce qui utilise le port 5000
lsof -ti:5000

# Tester la connexion
curl http://localhost:5000

# Tester l'API
curl http://localhost:5000/api/user
```

