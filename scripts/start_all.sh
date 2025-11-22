#!/bin/bash
# Script pour lancer tous les services

echo "🚀 Démarrage du bot Airbnb Co-Host"
echo ""

# Vérifier que la session existe
if [ ! -f "session" ]; then
    echo "⚠️  Session Playwright non trouvée"
    echo "   Lance d'abord: python3 scripts/run_headless_first.py"
    echo ""
    echo "   Le navigateur va s'ouvrir. Connecte-toi manuellement."
    echo ""
    read -p "Appuie sur Enter pour lancer la connexion..."
    python3 scripts/run_headless_first.py
fi

echo ""
echo "📦 Démarrage des services..."
echo ""

# Vérifier si PM2 est installé
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 trouvé - Lancement via PM2..."
    pm2 start pm2.json
    pm2 logs
else
    echo "⚠️  PM2 non installé - Lancement manuel requis"
    echo ""
    echo "Ouvre 3 terminaux et lance:"
    echo "  Terminal 1: cd $(pwd) && python3 src/main.py api"
    echo "  Terminal 2: cd $(pwd) && python3 src/main.py sync"
    echo "  Terminal 3: cd $(pwd) && python3 src/main.py send"
    echo ""
    echo "Ou installe PM2: npm install -g pm2"
fi


