#!/bin/bash
# Script de déploiement rapide pour Mac Serveur
# Exécuter: bash deploy-mac-serveur.sh

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement Workers TypeScript sur Mac Serveur"
echo "=================================================="

# 1. Mise à jour du repository
echo ""
echo "📥 Étape 1/5: Récupération des dernières modifications..."
git pull origin main

# 2. Installation des dépendances
echo ""
echo "📦 Étape 2/5: Installation des dépendances npm..."
npm install

# 3. Installation de Playwright
echo ""
echo "🎭 Étape 3/5: Installation de Playwright Chromium..."
npx playwright install chromium

# 4. Vérification des fichiers sensibles
echo ""
echo "🔐 Étape 4/5: Vérification des fichiers sensibles..."

if [ ! -f "airbnb-session.json" ]; then
    echo "❌ ERREUR: airbnb-session.json manquant!"
    echo "   → Transférer depuis le Mac principal"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "❌ ERREUR: .env manquant!"
    echo "   → Transférer depuis le Mac principal"
    exit 1
fi

# Vérifier que DATABASE_URL existe
if ! grep -q "DATABASE_URL=" .env; then
    echo "❌ ERREUR: DATABASE_URL manquant dans .env"
    exit 1
fi

# Vérifier que GEMINI_API_KEY existe
if ! grep -q "GEMINI_API_KEY=" .env; then
    echo "❌ ERREUR: GEMINI_API_KEY manquant dans .env"
    exit 1
fi

echo "✅ Fichiers sensibles présents"

# 5. Création de la table queue_outbox
echo ""
echo "🗄️  Étape 5/5: Création de la table queue_outbox..."

# Charger DATABASE_URL depuis .env
export $(grep -v '^#' .env | xargs)

# Vérifier si psql est installé
if command -v psql &> /dev/null; then
    echo "   Exécution de la migration SQL..."
    psql "$DATABASE_URL" < migrations/create_queue_outbox.sql
    echo "✅ Table queue_outbox créée"
else
    echo "⚠️  psql non installé - Exécuter manuellement:"
    echo "   Copier le contenu de migrations/create_queue_outbox.sql"
    echo "   dans Supabase SQL Editor"
fi

# 6. Installation de PM2
echo ""
echo "🔧 Installation de PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "   Installation de PM2 globalement..."
    npm install -g pm2
else
    echo "   PM2 déjà installé ✅"
fi

# 7. Vérifier et corriger le chemin dans pm2-workers.json
echo ""
echo "📝 Vérification du chemin dans pm2-workers.json..."
CURRENT_DIR=$(pwd)
echo "   Chemin actuel: $CURRENT_DIR"

# Backup pm2-workers.json
cp pm2-workers.json pm2-workers.json.bak

# Remplacer le chemin
sed -i '' "s|\"cwd\": \".*\"|\"cwd\": \"$CURRENT_DIR\"|g" pm2-workers.json

echo "✅ Chemin corrigé dans pm2-workers.json"

# 8. Lancement des workers
echo ""
echo "🚀 Lancement des 3 workers..."
pm2 start pm2-workers.json

# 9. Affichage du statut
echo ""
echo "📊 Statut des workers:"
pm2 status

echo ""
echo "=================================================="
echo "✅ Déploiement terminé avec succès!"
echo ""
echo "📝 Commandes utiles:"
echo "   pm2 logs           # Voir les logs en temps réel"
echo "   pm2 status         # Vérifier le statut"
echo "   pm2 restart all    # Redémarrer tous les workers"
echo "   pm2 stop all       # Arrêter tous les workers"
echo ""
echo "🔍 Vérification rapide:"
echo "   pm2 logs --lines 20"
echo ""
