#!/bin/bash
# Script de démarrage pour le système automatique 24/7

echo "🚀 Démarrage du système automatique 24/7"
echo "=========================================="
echo ""

# Vérifier que la session Playwright existe
if [ ! -d "./session" ] && [ ! -f "./session" ]; then
    echo "⚠️  Session Playwright non trouvée"
    echo "   Lance d'abord: python3 scripts/reconnect_airbnb.py"
    exit 1
fi

# Si session est un fichier, créer le répertoire et le déplacer
if [ -f "./session" ] && [ ! -d "./session" ]; then
    echo "📂 Conversion de la session (fichier → répertoire)..."
    # Sauvegarder le fichier session temporairement
    cp ./session ./session_backup.json
    rm ./session
    mkdir -p ./session
    mv ./session_backup.json ./session/storage_state.json
    echo "   ✅ Session convertie en répertoire"
fi

# Vérifier que l'API tourne (optionnel, on peut la lancer aussi)
echo "📡 Vérification de l'API..."
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ⚠️  API non disponible, démarrage de l'API en arrière-plan..."
    python3 src/main.py api > logs/api.log 2>&1 &
    API_PID=$!
    echo "   ✅ API démarrée (PID: $API_PID)"
    sleep 3
else
    echo "   ✅ API déjà disponible"
fi

# Démarrer les workers SYNC + SEND
echo ""
echo "👷 Démarrage des workers SYNC + SEND..."
echo "   Les workers tourneront en continu 24/7"
echo "   Arrêt avec Ctrl+C"
echo ""

# Définir PYTHONPATH pour les imports
export PYTHONPATH="$(pwd):$PYTHONPATH"
# Utiliser python -m pour éviter les problèmes d'import
python3 -m src.main syncsend 2>&1 | grep -v "supautils.disable_program"

