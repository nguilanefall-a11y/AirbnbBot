#!/bin/bash
# Status Check Script for Airbnb Co-Host Bot
# This script checks the health and status of all services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Airbnb Co-Host Bot - Status Check${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect deployment method
if command_exists docker && docker ps | grep -q airbnb_bot; then
    DEPLOYMENT="docker"
    echo -e "${GREEN}Deployment Method: Docker${NC}"
elif command_exists pm2 && pm2 list | grep -q airbnb-bot; then
    DEPLOYMENT="pm2"
    echo -e "${GREEN}Deployment Method: PM2${NC}"
else
    DEPLOYMENT="unknown"
    echo -e "${YELLOW}Deployment Method: Unknown or Manual${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. API Health Check
echo -e "${YELLOW}1. API Health Check${NC}"
if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API is responding"
    echo ""
    echo "Simple Health:"
    curl -s http://localhost:8000/health | python3 -m json.tool || echo "Could not parse JSON"
    echo ""
    echo "Detailed Health:"
    curl -s http://localhost:8000/health/detailed | python3 -m json.tool || echo "Could not get detailed health"
else
    echo -e "${RED}✗${NC} API is NOT responding at http://localhost:8000"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

# 2. Services Status
echo -e "${YELLOW}2. Services Status${NC}"
case $DEPLOYMENT in
    docker)
        echo ""
        docker-compose ps
        ;;
    pm2)
        echo ""
        pm2 list
        ;;
    *)
        echo -e "${YELLOW}Cannot detect service status (manual deployment)${NC}"
        ;;
esac

echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

# 3. Database Check
echo -e "${YELLOW}3. Database Check${NC}"
if [ "$DEPLOYMENT" = "docker" ]; then
    echo ""
    echo "Conversations count:"
    docker-compose exec -T db psql -U postgres -d airbnb_bot -c "SELECT COUNT(*) FROM conversations;" 2>/dev/null || echo "Could not query database"
    echo ""
    echo "Messages count:"
    docker-compose exec -T db psql -U postgres -d airbnb_bot -c "SELECT COUNT(*) FROM messages;" 2>/dev/null || echo "Could not query database"
    echo ""
    echo "Worker heartbeats:"
    docker-compose exec -T db psql -U postgres -d airbnb_bot -c "SELECT worker_name, status, last_heartbeat FROM worker_heartbeats ORDER BY last_heartbeat DESC;" 2>/dev/null || echo "Could not query database"
else
    echo -e "${YELLOW}Database check only available for Docker deployment${NC}"
    echo "You can check manually with: psql -d airbnb_bot"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

# 4. Session Check
echo -e "${YELLOW}4. Airbnb Session Check${NC}"
if [ -d "session" ] && [ "$(ls -A session)" ]; then
    echo -e "${GREEN}✓${NC} Session folder exists and is not empty"
    ls -lh session/
else
    echo -e "${RED}✗${NC} Session folder is empty or missing"
    echo "You need to connect to Airbnb first:"
    echo "  python3 scripts/run_headless_first.py"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

# 5. Recent Logs
echo -e "${YELLOW}5. Recent Logs (last 10 lines)${NC}"
echo ""

if [ "$DEPLOYMENT" = "docker" ]; then
    echo "Sync Worker:"
    docker-compose logs --tail=10 sync_worker 2>/dev/null || echo "No logs available"
    echo ""
    echo "Send Worker:"
    docker-compose logs --tail=10 send_worker 2>/dev/null || echo "No logs available"
elif [ "$DEPLOYMENT" = "pm2" ]; then
    echo "Sync Worker:"
    pm2 logs airbnb-bot-sync --lines 10 --nostream 2>/dev/null || echo "No logs available"
    echo ""
    echo "Send Worker:"
    pm2 logs airbnb-bot-send --lines 10 --nostream 2>/dev/null || echo "No logs available"
else
    if [ -f "logs/sync-out.log" ]; then
        echo "Sync Worker:"
        tail -10 logs/sync-out.log
    fi
    echo ""
    if [ -f "logs/send-out.log" ]; then
        echo "Send Worker:"
        tail -10 logs/send-out.log
    fi
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo ""

# 6. Quick Actions
echo -e "${YELLOW}Quick Actions:${NC}"
echo ""
if [ "$DEPLOYMENT" = "docker" ]; then
    echo "View live logs:       docker-compose logs -f"
    echo "Restart services:     docker-compose restart"
    echo "Stop services:        docker-compose down"
elif [ "$DEPLOYMENT" = "pm2" ]; then
    echo "View live logs:       pm2 logs"
    echo "Restart services:     pm2 restart all"
    echo "Stop services:        pm2 stop all"
fi
echo "Force sync now:       python3 scripts/force_sync_now.py"
echo "Reconnect Airbnb:     python3 scripts/reconnect_airbnb.py"
echo ""
