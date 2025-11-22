#!/bin/bash
# Script de démarrage rapide

echo "🚀 Démarrage Airbnb Co-Host Bot"
echo ""

# Vérifier que .env existe
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env non trouvé"
    echo "   Copie env.example vers .env et configure-le"
    exit 1
fi

# Vérifier que la session existe
if [ ! -f session ]; then
    echo "⚠️  Session Playwright non trouvée"
    echo "   Lance: python scripts/run_headless_first.py"
    exit 1
fi

# Vérifier que la DB est initialisée
echo "📦 Vérification de la base de données..."
python scripts/migrate.py

echo ""
echo "✅ Tout est prêt!"
echo ""
echo "Pour lancer les services:"
echo "  - Docker: docker-compose up"
echo "  - PM2: pm2 start pm2.json"
echo "  - Manuel: python src/main.py <api|sync|send>"
echo ""


