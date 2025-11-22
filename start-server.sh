#!/bin/bash

# Script pour démarrer le serveur proprement

cd "$(dirname "$0")"

# Arrêter les processus existants
echo "🛑 Arrêt des serveurs existants..."
pkill -f "tsx.*index" 2>/dev/null
sleep 2

# Vérifier que le port est libre
if lsof -ti:5000 > /dev/null 2>&1; then
    echo "⚠️  Le port 5000 est encore occupé, tentative de libération..."
    lsof -ti:5000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Démarrer le serveur
echo "🚀 Démarrage du serveur..."
npm run dev

