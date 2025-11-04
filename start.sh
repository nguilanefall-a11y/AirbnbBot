#!/bin/bash

# Script de démarrage automatique du serveur
echo "🚀 Démarrage automatique du serveur..."
cd "$(dirname "$0")"

# Vérifier si les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Démarrer le serveur en mode watch
echo "▶️  Lancement du serveur sur http://localhost:5000"
npm run dev:watch

