#!/bin/bash
# Script pour lancer le système en arrière-plan (persistant même après fermeture de Cursor)

cd "$(dirname "$0")"

# Arrêter les anciens processus
pkill -f "src.main syncsend" 2>/dev/null
pkill -f "src.main api" 2>/dev/null
sleep 2

# Créer les dossiers de logs
mkdir -p logs

# Définir PYTHONPATH
export PYTHONPATH="$(pwd):$PYTHONPATH"

echo "🚀 Démarrage du système en arrière-plan..."
echo ""

# Lancer l'API en arrière-plan avec nohup
echo "1. Démarrage de l'API..."
nohup python3 src/main.py api > logs/api_background.log 2>&1 &
API_PID=$!
echo "   ✅ API démarrée (PID: $API_PID)"
sleep 3

# Vérifier que l'API répond
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✅ API fonctionne correctement"
else
    echo "   ⚠️  API ne répond pas encore, attente..."
    sleep 3
fi

# Lancer les workers SYNC + SEND en arrière-plan avec nohup
echo ""
echo "2. Démarrage des workers SYNC + SEND..."
nohup python3 -m src.main syncsend > logs/syncsend_background.log 2>&1 &
WORKER_PID=$!
echo "   ✅ Workers démarrés (PID: $WORKER_PID)"
sleep 3

echo ""
echo "✅ SYSTÈME LANCÉ EN ARRIÈRE-PLAN !"
echo ""
echo "📋 PIDs des processus:"
echo "   API: $API_PID"
echo "   Workers: $WORKER_PID"
echo ""
echo "📊 Pour vérifier que ça tourne:"
echo "   ps aux | grep 'src.main' | grep -v grep"
echo ""
echo "📝 Pour voir les logs:"
echo "   tail -f logs/api_background.log"
echo "   tail -f logs/syncsend_background.log"
echo ""
echo "🛑 Pour arrêter:"
echo "   pkill -f 'src.main'"
echo ""
echo "✅ Le système continuera de fonctionner même après fermeture de Cursor !"


