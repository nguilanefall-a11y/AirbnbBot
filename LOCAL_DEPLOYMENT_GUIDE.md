# 🚀 Local Deployment Guide - Airbnb Co-Host Bot

This guide will help you deploy the Airbnb Co-Host Bot on your local machine (macOS).

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] Python 3.11+ installed (`python3 --version`)
- [ ] Node.js 18+ and npm installed (`node --version`)
- [ ] PostgreSQL 15+ installed OR Supabase account
- [ ] PM2 installed globally (`npm install -g pm2`)
- [ ] Git installed
- [ ] Active Airbnb co-host account

## 🎯 Deployment Options

Choose one of these deployment methods:

### **Option 1: Docker Deployment (Recommended - Easiest)**
✅ Best for: Quick setup, isolated environment, easy management
- Includes PostgreSQL database
- No need to install dependencies manually
- Easy to start/stop/restart

### **Option 2: PM2 Deployment (Production Ready)**
✅ Best for: Long-running production, better resource control, monitoring
- Requires manual PostgreSQL setup
- Better performance
- Advanced monitoring capabilities

### **Option 3: Manual Deployment (Development)**
✅ Best for: Development, debugging, testing
- Full control over each component
- Easy to debug
- Requires multiple terminal windows

---

## 🐳 Option 1: Docker Deployment (Recommended)

### Step 1: Install Docker

If you don't have Docker installed:

```bash
# macOS - Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker-compose --version
```

### Step 2: Configure Environment

```bash
# Navigate to project directory
cd /Users/nguilane./Downloads/airbnb-cohost

# Create .env file from example
cp .env.example .env

# Edit .env with your settings (use nano, vim, or VS Code)
nano .env
```

**Required settings in `.env`:**
```bash
# Database (Docker will use this)
DATABASE_URL=postgresql://postgres:postgres@db:5432/airbnb_bot

# AI Integration (update with your API)
AI_WEBHOOK_URL=https://your-ai-api.com/respond
AI_API_KEY=your-api-key-here

# Optional: Notifications
ADMIN_WEBHOOK_URL=https://your-webhook.com/notify
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK

# API Security (CHANGE THIS!)
API_SECRET_KEY=$(openssl rand -hex 32)
```

### Step 3: Initial Airbnb Connection

**⚠️ IMPORTANT**: You must connect to Airbnb manually first!

```bash
# Install Python dependencies locally (for initial connection)
pip3 install -r requirements.txt
playwright install chromium

# Run initial connection script
python3 scripts/run_headless_first.py

# OR with credentials
python3 scripts/run_headless_first.py --email "your@email.com" --password "yourpassword"
```

**What happens:**
1. A browser window opens
2. Log in to your Airbnb co-host account
3. Complete any 2FA/captcha
4. Press Enter in the terminal when done
5. Session is saved to `./session` folder

### Step 4: Deploy with Docker

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f sync_worker
docker-compose logs -f send_worker
```

### Step 5: Verify Deployment

```bash
# Check API health
curl http://localhost:8000/health

# Check detailed status
curl http://localhost:8000/health/detailed | python3 -m json.tool

# Check database
docker-compose exec db psql -U postgres -d airbnb_bot -c "SELECT COUNT(*) FROM conversations;"
```

### Docker Management Commands

```bash
# Stop all services
docker-compose down

# Restart all services
docker-compose restart

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart sync_worker

# Stop and remove everything (including data)
docker-compose down -v

# Update and redeploy
git pull
docker-compose up -d --build
```

---

## ⚡ Option 2: PM2 Deployment (Production)

### Step 1: Install Dependencies

```bash
cd /Users/nguilane./Downloads/airbnb-cohost

# Install Python dependencies
pip3 install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Install PM2 globally
npm install -g pm2
```

### Step 2: Setup PostgreSQL Database

**Option A: Use Supabase (Recommended)**

1. Go to https://supabase.com
2. Create a new project
3. Get your connection string
4. Update `.env`:
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
   ```

**Option B: Install PostgreSQL Locally**

```bash
# macOS - Install with Homebrew
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb airbnb_bot

# Update .env
DATABASE_URL=postgresql://postgres@localhost:5432/airbnb_bot
```

### Step 3: Configure Environment

```bash
# Create .env file
cp .env.example .env

# Edit with your settings
nano .env
```

**Required settings:**
```bash
DATABASE_URL=postgresql://... # Your PostgreSQL URL
AI_WEBHOOK_URL=https://your-ai-api.com/respond
AI_API_KEY=your-api-key-here
API_SECRET_KEY=$(openssl rand -hex 32)
```

### Step 4: Initialize Database

```bash
# Run migrations
python3 scripts/migrate.py
```

### Step 5: Initial Airbnb Connection

```bash
# Connect to Airbnb (manual login)
python3 scripts/run_headless_first.py
```

### Step 6: Deploy with PM2

```bash
# Start all services
pm2 start pm2.json

# Check status
pm2 status

# View logs
pm2 logs

# View specific service logs
pm2 logs airbnb-bot-api
pm2 logs airbnb-bot-sync
pm2 logs airbnb-bot-send
```

### Step 7: PM2 Auto-Start on Boot

```bash
# Save current PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions shown (usually requires sudo)
```

### PM2 Management Commands

```bash
# Stop all services
pm2 stop all

# Restart all services
pm2 restart all

# Stop specific service
pm2 stop airbnb-bot-sync

# Restart specific service
pm2 restart airbnb-bot-sync

# View logs
pm2 logs

# View status
pm2 status

# Monitor in real-time
pm2 monit

# Delete all services
pm2 delete all

# Reload after code changes
git pull
pm2 reload all
```

---

## 🛠️ Option 3: Manual Deployment (Development)

### Step 1: Setup (Same as PM2 Steps 1-5)

Follow PM2 steps 1-5 above.

### Step 2: Start Services Manually

**Terminal 1 - API:**
```bash
cd /Users/nguilane./Downloads/airbnb-cohost
python3 -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Sync Worker:**
```bash
cd /Users/nguilane./Downloads/airbnb-cohost
python3 -m src.workers.sync_worker
```

**Terminal 3 - Send Worker:**
```bash
cd /Users/nguilane./Downloads/airbnb-cohost
python3 -m src.workers.send_worker
```

---

## 🔍 Post-Deployment Verification

### 1. Check API Health

```bash
# Simple health check
curl http://localhost:8000/health

# Expected: {"ok": true, "timestamp": "..."}

# Detailed health check
curl http://localhost:8000/health/detailed | python3 -m json.tool
```

### 2. Check Workers Status

```bash
# For Docker
docker-compose logs sync_worker --tail=50
docker-compose logs send_worker --tail=50

# For PM2
pm2 logs airbnb-bot-sync --lines 50
pm2 logs airbnb-bot-send --lines 50

# For Manual
# Check terminal outputs
```

### 3. Test Message Sync

```bash
# Check conversations
curl http://localhost:8000/messages/threads | python3 -m json.tool

# Force a sync
python3 scripts/force_sync_now.py
```

### 4. Check Database

```bash
# For Docker
docker-compose exec db psql -U postgres -d airbnb_bot

# For local PostgreSQL
psql -d airbnb_bot

# Run queries:
SELECT COUNT(*) FROM conversations;
SELECT COUNT(*) FROM messages;
SELECT * FROM worker_heartbeats;
```

### 5. Check Session

```bash
# Verify session files exist
ls -lh session/

# Should see files like:
# - cookies.json
# - storage-state.json
```

---

## 🔧 Common Issues & Solutions

### Issue 1: Session Expired

**Symptom:** "Session expired - redirection vers login"

**Solution:**
```bash
python3 scripts/reconnect_airbnb.py
```

### Issue 2: CAPTCHA Detected

**Symptom:** "CAPTCHA détecté - arrêt propre du worker"

**Solution:**
```bash
# Workers stop automatically (normal)
# Reconnect manually
python3 scripts/reconnect_airbnb.py

# Restart workers (Docker)
docker-compose restart sync_worker send_worker

# Restart workers (PM2)
pm2 restart airbnb-bot-sync airbnb-bot-send
```

### Issue 3: Port Already in Use

**Symptom:** "Address already in use: 8000"

**Solution:**
```bash
# Find and kill process using port 8000
lsof -ti:8000 | xargs kill -9

# Or use a different port in .env
API_PORT=8001
```

### Issue 4: Database Connection Failed

**Symptom:** "Could not connect to database"

**Solution:**
```bash
# For Docker - restart database
docker-compose restart db

# For local PostgreSQL
brew services restart postgresql@15

# Check DATABASE_URL in .env is correct
```

### Issue 5: Playwright Browser Not Found

**Symptom:** "Browser executable not found"

**Solution:**
```bash
# Reinstall Playwright browsers
playwright install chromium
playwright install-deps chromium
```

---

## 📊 Monitoring & Maintenance

### View Logs

**Docker:**
```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f sync_worker

# Last 100 lines
docker-compose logs --tail=100 sync_worker
```

**PM2:**
```bash
# All logs
pm2 logs

# Specific service
pm2 logs airbnb-bot-sync

# Clear logs
pm2 flush
```

**Manual:**
```bash
# View log files
tail -f logs/app.log
tail -f logs/sync-out.log
tail -f logs/send-out.log
```

### Health Monitoring

```bash
# Create a monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
  echo "=== $(date) ==="
  curl -s http://localhost:8000/health/detailed | python3 -m json.tool
  echo ""
  sleep 30
done
EOF

chmod +x monitor.sh
./monitor.sh
```

### Database Backup

```bash
# For Docker
docker-compose exec db pg_dump -U postgres airbnb_bot > backup_$(date +%Y%m%d).sql

# For local PostgreSQL
pg_dump airbnb_bot > backup_$(date +%Y%m%d).sql

# Restore
psql airbnb_bot < backup_20241125.sql
```

### Update Deployment

```bash
# Pull latest changes
git pull

# For Docker
docker-compose down
docker-compose up -d --build

# For PM2
pm2 stop all
pip3 install -r requirements.txt
pm2 restart all
```

---

## 🔐 Security Checklist

- [ ] Changed `API_SECRET_KEY` in `.env`
- [ ] `.env` file is in `.gitignore`
- [ ] `session/` folder is in `.gitignore`
- [ ] Database has strong password (for production)
- [ ] API is not exposed to public internet (use firewall)
- [ ] Regular backups are configured
- [ ] Logs are rotated to prevent disk fill
- [ ] Monitoring/alerting is set up

---

## 📱 Access the Application

Once deployed, you can access:

- **API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs (FastAPI auto-generated)

---

## 🆘 Getting Help

If you encounter issues:

1. Check logs first:
   - Docker: `docker-compose logs -f`
   - PM2: `pm2 logs`
   - Manual: Check `logs/` directory

2. Verify health:
   ```bash
   curl http://localhost:8000/health/detailed | python3 -m json.tool
   ```

3. Test selectors:
   ```bash
   python3 scripts/selector_tester.py <thread_id>
   ```

4. Check session:
   ```bash
   ls -lh session/
   ```

5. Reconnect if needed:
   ```bash
   python3 scripts/reconnect_airbnb.py
   ```

---

## ✅ Deployment Checklist

Before going live:

- [ ] Environment variables configured (`.env`)
- [ ] Database created and migrated
- [ ] Airbnb session saved (`session/` folder exists)
- [ ] All services running (API + 2 workers)
- [ ] Health check returns OK
- [ ] Test conversation synced successfully
- [ ] Logs are being written
- [ ] AI webhook configured and responding
- [ ] Notifications configured (optional)
- [ ] Backup configured
- [ ] Monitoring set up

---

## 🎉 You're Ready!

Your Airbnb Co-Host Bot is now deployed and running on your local machine!

**Next Steps:**
1. Monitor logs for the first few hours
2. Test with 1-2 real conversations
3. Verify AI responses are working
4. Set up alerts/notifications
5. Document any custom configurations

