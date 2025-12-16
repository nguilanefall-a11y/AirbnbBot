#!/bin/bash
# 🔧 SCRIPT DE RÉPARATION IMMÉDIATE
# Résout le problème d'environnement Python et lance les workers

set -e

cd "$(dirname "$0")"

echo "🔧 RÉPARATION DU SYSTÈME AIRBNB AUTOMATION"
echo "=" | tr '=' '=' | head -c 80
echo ""

# 1. Nettoyer les processus orphelins
echo "🧹 Étape 1/5: Nettoyage des processus..."
pkill -9 chromium 2>/dev/null || true
pkill -9 python3 2>/dev/null || true
rm -f logs/*.pid 2>/dev/null || true
echo "   ✅ Processus nettoyés"
echo ""

# 2. Créer virtualenv si nécessaire
if [ ! -d "venv" ]; then
    echo "📦 Étape 2/5: Création virtualenv..."
    python3 -m venv venv
    echo "   ✅ Virtualenv créé"
else
    echo "📦 Étape 2/5: Virtualenv existant trouvé"
fi
echo ""

# 3. Activer et installer dépendances
echo "📥 Étape 3/5: Installation dépendances..."
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
python -m playwright install chromium
echo "   ✅ Dépendances installées"
echo ""

# 4. Vérifier que Playwright fonctionne
echo "🔍 Étape 4/5: Test Playwright..."
python -c "from playwright.sync_api import sync_playwright; print('   ✅ Playwright OK')"
echo ""

# 5. Créer script de lancement optimisé
echo "🚀 Étape 5/5: Création script de lancement..."
cat > start_system.sh << 'EOFSCRIPT'
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
EOFSCRIPT

chmod +x start_system.sh

# Créer script d'arrêt
cat > stop_system.sh << 'EOFSCRIPT'
#!/bin/bash
cd "$(dirname "$0")"

echo "🛑 Arrêt système Airbnb Automation"

if [ -f logs/api.pid ]; then
    kill $(cat logs/api.pid) 2>/dev/null || true
    rm logs/api.pid
    echo "   ✅ API arrêtée"
fi

if [ -f logs/all_workers.pid ]; then
    kill $(cat logs/all_workers.pid) 2>/dev/null || true
    rm logs/all_workers.pid
    echo "   ✅ Workers arrêtés"
fi

pkill -9 chromium 2>/dev/null || true
echo ""
echo "✅ Système arrêté"
EOFSCRIPT

chmod +x stop_system.sh

echo "   ✅ Scripts créés: start_system.sh, stop_system.sh"
echo ""

# Résumé
echo "=" | tr '=' '=' | head -c 80
echo ""
echo "✅ RÉPARATION TERMINÉE"
echo ""
echo "Pour démarrer le système:"
echo "  ./start_system.sh"
echo ""
echo "Pour tester un seul worker (mode visuel):"
echo "  source venv/bin/activate"
echo "  AIRBNB_HEADLESS=false python src/main.py sync"
echo ""
echo "Pour voir les logs en temps réel:"
echo "  tail -f logs/all_workers.log"
echo ""
