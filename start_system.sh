#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate

echo "🚀 Démarrage système Airbnb Automation"
echo ""

# Lancer l'API en arrière-plan
echo "📡 Lancement API (port 5000)..."
nohup python src/main.py api > logs/api.log 2>&1 &
echo $! > logs/api.pid
sleep 2

# Lancer les workers
echo "🔄 Lancement workers..."
nohup python run_all_workers.py > logs/all_workers.log 2>&1 &
echo $! > logs/all_workers.pid
sleep 3

echo ""
echo "✅ Système démarré !"
echo ""
echo "Logs disponibles:"
echo "  - tail -f logs/api.log"
echo "  - tail -f logs/all_workers.log"
echo ""
echo "Pour arrêter:"
echo "  ./stop_system.sh"
