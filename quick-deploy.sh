#!/bin/bash
# Quick Deploy Script for Airbnb Co-Host Bot (Local Machine)
# This script helps you deploy the bot step by step

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="/Users/nguilane./Downloads/airbnb-cohost"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Airbnb Co-Host Bot - Quick Deploy${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"
echo ""

command_exists python3 && print_status 0 "Python3 installed" || print_status 1 "Python3 NOT installed"
command_exists node && print_status 0 "Node.js installed" || print_status 1 "Node.js NOT installed"
command_exists docker && print_status 0 "Docker installed" || print_status 1 "Docker NOT installed (optional)"
command_exists pm2 && print_status 0 "PM2 installed" || print_status 1 "PM2 NOT installed (optional)"

echo ""

# Step 2: Choose deployment method
echo -e "${YELLOW}Step 2: Choose deployment method${NC}"
echo ""
echo "1) Docker (Recommended - includes PostgreSQL)"
echo "2) PM2 (Production - requires PostgreSQL setup)"
echo "3) Manual (Development)"
echo ""
read -p "Choose option (1-3): " deploy_choice

echo ""

case $deploy_choice in
    1)
        # Docker deployment
        echo -e "${YELLOW}Step 3: Docker Deployment${NC}"
        echo ""
        
        # Check if .env exists
        if [ ! -f "$PROJECT_DIR/.env" ]; then
            echo -e "${YELLOW}Creating .env file from template...${NC}"
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
            echo -e "${GREEN}✓${NC} .env file created"
            echo -e "${RED}⚠${NC}  Please edit .env file with your settings:"
            echo "   - AI_WEBHOOK_URL"
            echo "   - AI_API_KEY"
            echo "   - API_SECRET_KEY"
            echo ""
            read -p "Press Enter when .env is configured..."
        fi
        
        # Check if session exists
        if [ ! -d "$PROJECT_DIR/session" ] || [ -z "$(ls -A $PROJECT_DIR/session)" ]; then
            echo -e "${RED}⚠${NC}  Session folder is empty. You need to connect to Airbnb first!"
            echo ""
            echo "Run the following command to connect:"
            echo "  python3 scripts/run_headless_first.py"
            echo ""
            read -p "Press Enter after connecting to Airbnb..."
        fi
        
        echo -e "${YELLOW}Starting Docker containers...${NC}"
        cd "$PROJECT_DIR"
        docker-compose up -d --build
        
        echo ""
        echo -e "${GREEN}✓${NC} Docker containers started!"
        echo ""
        echo "Check status: docker-compose ps"
        echo "View logs: docker-compose logs -f"
        echo "Stop: docker-compose down"
        ;;
        
    2)
        # PM2 deployment
        echo -e "${YELLOW}Step 3: PM2 Deployment${NC}"
        echo ""
        
        # Install dependencies
        echo -e "${YELLOW}Installing Python dependencies...${NC}"
        cd "$PROJECT_DIR"
        pip3 install -r requirements.txt
        playwright install chromium
        echo -e "${GREEN}✓${NC} Dependencies installed"
        echo ""
        
        # Check if .env exists
        if [ ! -f "$PROJECT_DIR/.env" ]; then
            echo -e "${YELLOW}Creating .env file from template...${NC}"
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
            echo -e "${GREEN}✓${NC} .env file created"
            echo -e "${RED}⚠${NC}  Please edit .env file with your settings:"
            echo "   - DATABASE_URL (PostgreSQL connection string)"
            echo "   - AI_WEBHOOK_URL"
            echo "   - AI_API_KEY"
            echo "   - API_SECRET_KEY"
            echo ""
            read -p "Press Enter when .env is configured..."
        fi
        
        # Run migrations
        echo -e "${YELLOW}Running database migrations...${NC}"
        python3 scripts/migrate.py
        echo -e "${GREEN}✓${NC} Database initialized"
        echo ""
        
        # Check if session exists
        if [ ! -d "$PROJECT_DIR/session" ] || [ -z "$(ls -A $PROJECT_DIR/session)" ]; then
            echo -e "${RED}⚠${NC}  Session folder is empty. You need to connect to Airbnb first!"
            echo ""
            echo "Run: python3 scripts/run_headless_first.py"
            echo ""
            read -p "Press Enter after connecting to Airbnb..."
        fi
        
        # Start with PM2
        echo -e "${YELLOW}Starting services with PM2...${NC}"
        pm2 start pm2-local.json
        
        echo ""
        echo -e "${GREEN}✓${NC} PM2 services started!"
        echo ""
        echo "Check status: pm2 status"
        echo "View logs: pm2 logs"
        echo "Stop: pm2 stop all"
        ;;
        
    3)
        # Manual deployment
        echo -e "${YELLOW}Step 3: Manual Deployment${NC}"
        echo ""
        
        # Install dependencies
        echo -e "${YELLOW}Installing Python dependencies...${NC}"
        cd "$PROJECT_DIR"
        pip3 install -r requirements.txt
        playwright install chromium
        echo -e "${GREEN}✓${NC} Dependencies installed"
        echo ""
        
        # Check if .env exists
        if [ ! -f "$PROJECT_DIR/.env" ]; then
            echo -e "${YELLOW}Creating .env file from template...${NC}"
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
            echo -e "${GREEN}✓${NC} .env file created"
            echo -e "${RED}⚠${NC}  Please edit .env file and configure DATABASE_URL"
            echo ""
            read -p "Press Enter when .env is configured..."
        fi
        
        # Run migrations
        echo -e "${YELLOW}Running database migrations...${NC}"
        python3 scripts/migrate.py
        echo -e "${GREEN}✓${NC} Database initialized"
        echo ""
        
        # Check if session exists
        if [ ! -d "$PROJECT_DIR/session" ] || [ -z "$(ls -A $PROJECT_DIR/session)" ]; then
            echo -e "${RED}⚠${NC}  Session folder is empty. You need to connect to Airbnb first!"
            echo ""
            echo "Run: python3 scripts/run_headless_first.py"
            echo ""
            read -p "Press Enter after connecting to Airbnb..."
        fi
        
        echo -e "${GREEN}✓${NC} Setup complete!"
        echo ""
        echo "To start the services manually, open 3 terminals:"
        echo ""
        echo "Terminal 1 (API):"
        echo "  cd $PROJECT_DIR"
        echo "  python3 -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload"
        echo ""
        echo "Terminal 2 (Sync Worker):"
        echo "  cd $PROJECT_DIR"
        echo "  python3 -m src.workers.sync_worker"
        echo ""
        echo "Terminal 3 (Send Worker):"
        echo "  cd $PROJECT_DIR"
        echo "  python3 -m src.workers.send_worker"
        ;;
        
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Test the API:"
echo "  curl http://localhost:8000/health"
echo ""
echo "View detailed status:"
echo "  curl http://localhost:8000/health/detailed | python3 -m json.tool"
echo ""
echo "Check logs:"
echo "  tail -f logs/sync-out.log"
echo "  tail -f logs/send-out.log"
echo ""
echo "For full documentation, see: LOCAL_DEPLOYMENT_GUIDE.md"
echo ""
