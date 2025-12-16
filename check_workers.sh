#!/bin/bash
# Script pour vérifier l'état des workers

cd "$(dirname "$0")"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 État des Workers Airbnb Co-Host${NC}"
echo ""

# Fonction pour vérifier un worker
check_worker() {
    local name=$1
    local pid_file="logs/${name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}✅ ${name}: ACTIF (PID: $pid)${NC}"
            
            # Afficher les dernières lignes du log
            if [ -f "logs/${name}.log" ]; then
                echo "   Dernières activités:"
                tail -n 3 "logs/${name}.log" | sed 's/^/   │ /'
            fi
        else
            echo -e "${RED}❌ ${name}: INACTIF (PID obsolète: $pid)${NC}"
        fi
    else
        # Vérifier si un processus tourne quand même
        if pgrep -f "python.*${name}" > /dev/null; then
            echo -e "${GREEN}✅ ${name}: ACTIF (sans fichier PID)${NC}"
        else
            echo -e "${RED}❌ ${name}: INACTIF${NC}"
        fi
    fi
    echo ""
}

# Vérifier la session Airbnb
if [ -f "session/storage_state.json" ]; then
    echo -e "${GREEN}✅ Session Airbnb: ACTIVE${NC}"
else
    echo -e "${RED}❌ Session Airbnb: MANQUANTE${NC}"
    echo "   Lancez: python3 scripts/reconnect_airbnb.py"
fi
echo ""

# Vérifier chaque worker
check_worker "sync_worker"
check_worker "send_worker"

# Vérifier la base de données
echo -e "${BLUE}📊 Base de données:${NC}"
if python3 -c "from src.db.db import get_db_session; db = get_db_session(); print('✅ Connexion OK'); db.close()" 2>/dev/null; then
    echo -e "${GREEN}✅ Connexion base de données: OK${NC}"
else
    echo -e "${RED}❌ Connexion base de données: ERREUR${NC}"
fi
echo ""

# Vérifier l'API
echo -e "${BLUE}📊 API:${NC}"
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API (port 5000): ACTIVE${NC}"
elif curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API (port 8080): ACTIVE${NC}"
else
    echo -e "${RED}❌ API: INACTIVE${NC}"
fi
echo ""
