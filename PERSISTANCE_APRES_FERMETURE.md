# 🔄 Système Persistant - Fonctionne Après Fermeture de Cursor

## ✅ Solution Actuelle

Le système est maintenant lancé avec `nohup`, ce qui signifie qu'il continuera de fonctionner même après avoir fermé Cursor ou le terminal.

## 🚀 Lancement Persistant

### Option 1 : Script automatique (Recommandé)

```bash
cd /Users/nguilane./Downloads/airbnb-cohost
./start_background.sh
```

Ce script :
- Lance l'API en arrière-plan avec `nohup`
- Lance les workers SYNC + SEND en arrière-plan avec `nohup`
- Continue de fonctionner même après fermeture de Cursor

### Option 2 : Manuel avec nohup

```bash
cd /Users/nguilane./Downloads/airbnb-cohost
export PYTHONPATH=$(pwd):$PYTHONPATH

# API
nohup python3 src/main.py api > logs/api_background.log 2>&1 &

# Workers
nohup python3 -m src.main syncsend > logs/syncsend_background.log 2>&1 &
```

## 📊 Vérification

### Vérifier que ça tourne

```bash
ps aux | grep "src.main" | grep -v grep
```

Tu devrais voir :
- Un processus `src.main api`
- Un processus `src.main syncsend`

### Voir les logs en temps réel

```bash
# Logs API
tail -f logs/api_background.log

# Logs Workers
tail -f logs/syncsend_background.log
```

### Tester que l'API répond

```bash
curl http://localhost:8000/health
```

## 🛑 Arrêter le Système

```bash
# Arrêter tous les processus
pkill -f "src.main"

# Ou arrêter spécifiquement
pkill -f "src.main api"
pkill -f "src.main syncsend"
```

## ⚙️ Alternative : PM2 (Gestionnaire de Processus)

Pour une gestion encore plus robuste, tu peux utiliser PM2 :

```bash
# Installer PM2 (si pas déjà fait)
npm install -g pm2

# Lancer avec PM2
pm2 start pm2.json

# Voir les processus
pm2 status

# Voir les logs
pm2 logs

# Arrêter
pm2 stop all
```

## ✅ Garanties

Avec `nohup` ou `PM2`, le système :
- ✅ Continue de fonctionner après fermeture de Cursor
- ✅ Continue de fonctionner après fermeture du terminal
- ✅ Continue de fonctionner même après déconnexion SSH (si sur serveur)
- ✅ Survit aux redémarrages système (si configuré comme service système)

## 📝 Notes

- Les processus `nohup` sont indépendants de la session terminal
- Ils continuent de tourner tant que la machine est allumée
- Pour qu'ils démarrent automatiquement au boot, il faut les configurer comme service système (systemd sur Linux, launchd sur macOS)

