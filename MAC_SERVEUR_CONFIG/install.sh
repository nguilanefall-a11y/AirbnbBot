#!/bin/bash

# 🚀 Script d'installation automatique pour Mac Serveur
# Ce script configure TOUT automatiquement

set -e  # Arrêter si erreur

echo "🚀 Installation AirbnbBot sur Mac Serveur"
echo "=========================================="
echo ""

# Vérifier qu'on est dans le bon dossier
if [ ! -f "package.json" ]; then
    echo "❌ ERREUR: Lance ce script depuis le dossier AirbnbBot"
    echo "   cd ~/AirbnbBot && bash MAC_SERVEUR_CONFIG/install.sh"
    exit 1
fi

echo "📦 Étape 1/7: Configuration des fichiers..."

# Copier .env
if [ -f "MAC_SERVEUR_CONFIG/env-production.txt" ]; then
    cp MAC_SERVEUR_CONFIG/env-production.txt .env
    echo "  ✅ .env créé"
else
    echo "  ❌ env-production.txt manquant"
    exit 1
fi

# Copier session
if [ -f "MAC_SERVEUR_CONFIG/airbnb-session.json" ]; then
    cp MAC_SERVEUR_CONFIG/airbnb-session.json airbnb-session.json
    echo "  ✅ airbnb-session.json créé"
else
    echo "  ❌ airbnb-session.json manquant"
    exit 1
fi

echo ""
echo "📦 Étape 2/7: Installation npm..."
npm install

echo ""
echo "📦 Étape 3/7: Installation postgres..."
npm install postgres

echo ""
echo "🎭 Étape 4/7: Installation Playwright..."
npx playwright install chromium

echo ""
echo "🧪 Étape 5/7: Test connexion DB..."
npx tsx test-neon-connection.ts

if [ $? -ne 0 ]; then
    echo "❌ Erreur connexion DB - vérifie .env"
    exit 1
fi

echo ""
echo "⚙️  Étape 6/7: Installation PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "  → Installation PM2 globalement..."
    sudo npm install -g pm2
else
    echo "  ✅ PM2 déjà installé"
fi

echo ""
echo "🚀 Étape 7/7: Lancement des workers..."
pm2 start pm2-workers.json

echo ""
echo "✅ INSTALLATION TERMINÉE!"
echo ""
echo "📊 Statut des workers:"
pm2 status

echo ""
echo "📋 Commandes utiles:"
echo "  pm2 logs          - Voir les logs"
echo "  pm2 status        - Voir le statut"
echo "  pm2 restart all   - Redémarrer"
echo "  pm2 stop all      - Arrêter"
echo ""
echo "🎯 Pour auto-restart au boot:"
echo "  pm2 save"
echo "  pm2 startup"
echo ""
