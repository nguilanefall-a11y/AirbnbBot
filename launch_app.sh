#!/bin/bash
# Script pour lancer l'application Airbnb Co-Host Bot avec interface web

set -e

echo "🚀 Lancement de l'application Airbnb Co-Host Bot"
echo ""

# Port par défaut
PORT=${API_PORT:-8080}

# Vérifier Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 n'est pas installé"
    exit 1
fi

# Vérifier .env
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env manquant, création depuis env.example..."
    cp env.example .env
fi

# Arrêter les processus existants sur le port
echo "🔍 Vérification du port $PORT..."
lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
sleep 1

# Lancer l'API
echo "▶️  Démarrage de l'API sur le port $PORT..."
export API_PORT=$PORT
python3 src/main.py api &
API_PID=$!

# Attendre que l'API démarre
sleep 3

# Vérifier que l'API répond
if curl -s http://localhost:$PORT/ > /dev/null 2>&1; then
    echo ""
    echo "✅ Application lancée avec succès!"
    echo ""
    echo "📡 API disponible sur: http://localhost:$PORT"
    echo "🏠 Page d'accueil: http://localhost:$PORT/"
    echo "🔗 Endpoint auto-respond: http://localhost:$PORT/api/messages/auto-respond"
    echo "💚 Health check: http://localhost:$PORT/health"
    echo ""
    echo "🌐 Ouvre ton navigateur à: http://localhost:$PORT"
    echo ""
    echo "Pour arrêter l'application: kill $API_PID"
    echo "Ou: lsof -ti:$PORT | xargs kill -9"
    echo ""
    
    # Ouvrir dans le navigateur par défaut
    if command -v open &> /dev/null; then
        echo "🌐 Ouverture du navigateur..."
        sleep 1
        open "http://localhost:$PORT"
    fi
    
    # Garder le script actif
    echo "Appuie sur Ctrl+C pour arrêter l'application"
    wait $API_PID
else
    echo ""
    echo "❌ Erreur: L'API n'a pas pu démarrer sur le port $PORT"
    echo "Vérification des logs..."
    tail -n 20 /tmp/airbnb_api_$PORT.log 2>/dev/null || echo "Pas de logs disponibles"
    kill $API_PID 2>/dev/null || true
    exit 1
fi
