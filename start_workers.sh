#!/bin/bash
# Script pour lancer tous les workers en arrière-plan

cd "$(dirname "$0")"

# Couleurs pour les logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Démarrage des workers Airbnb Co-Host${NC}"
echo ""

# Vérifier que la session existe
if [ ! -f "session/storage_state.json" ]; then
    echo -e "${RED}❌ ERREUR: Pas de session Airbnb trouvée !${NC}"
    echo "Vous devez d'abord vous connecter à Airbnb."
    echo ""
    echo "Lancez:"
    echo "  python3 scripts/reconnect_airbnb.py"
    exit 1
fi

# Créer le dossier logs
mkdir -p logs

# Fonction pour démarrer un worker
start_worker() {
    local name=$1
    local command=$2
    local log_file="logs/${name}.log"
    
    # Vérifier si le worker est déjà lancé
    if pgrep -f "python.*${name}" > /dev/null; then
        echo -e "${BLUE}⚠️  Worker ${name} déjà actif${NC}"
        return
    fi
    
    echo -e "${GREEN}✓ Démarrage ${name}...${NC}"
    nohup $command > "$log_file" 2>&1 &
    echo $! > "logs/${name}.pid"
    sleep 2
}

# Démarrer les workers avec le Python explicite
PYTHON_PATH="/Library/Developer/CommandLineTools/usr/bin/python3"
start_worker "sync_worker" "$PYTHON_PATH src/main.py sync"
start_worker "send_worker" "$PYTHON_PATH src/main.py send"

echo ""
echo -e "${GREEN}✅ Workers démarrés !${NC}"
echo ""
echo "Logs disponibles dans:"
echo "  - logs/sync_worker.log (récupération messages)"
echo "  - logs/send_worker.log (envoi réponses)"
echo ""
echo "Pour voir les logs en temps réel:"
echo "  tail -f logs/sync_worker.log"
echo "  tail -f logs/send_worker.log"
echo ""
echo "Pour arrêter les workers:"
echo "  ./stop_workers.sh"
