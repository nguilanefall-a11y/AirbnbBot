#!/bin/bash
# Script pour arrêter tous les workers

cd "$(dirname "$0")"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}🛑 Arrêt des workers Airbnb Co-Host${NC}"
echo ""

# Fonction pour arrêter un worker
stop_worker() {
    local name=$1
    local pid_file="logs/${name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Arrêt ${name} (PID: $pid)${NC}"
            kill $pid
            sleep 1
            # Force kill si toujours actif
            if ps -p $pid > /dev/null 2>&1; then
                kill -9 $pid
            fi
        fi
        rm "$pid_file"
    fi
    
    # Nettoyer les processus orphelins
    pkill -f "python.*${name}"
}

# Arrêter les workers
stop_worker "sync_worker"
stop_worker "send_worker"

echo ""
echo -e "${GREEN}✅ Workers arrêtés${NC}"
