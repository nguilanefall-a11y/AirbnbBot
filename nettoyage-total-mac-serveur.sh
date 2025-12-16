#!/bin/bash

# 🧹 Script de nettoyage COMPLET du Mac Serveur
# Supprime TOUT l'ancien code et les processus qui tournent

echo "🧹 NETTOYAGE COMPLET DU MAC SERVEUR"
echo "====================================="
echo ""
echo "⚠️  CE SCRIPT VA:"
echo "  1. Arrêter TOUS les workers (PM2, Python, Node)"
echo "  2. Supprimer TOUS les anciens dossiers AirbnbBot"
echo "  3. Nettoyer les node_modules et caches"
echo "  4. Tuer tous les processus Playwright/Chromium"
echo "  5. Supprimer les logs anciens"
echo ""
read -p "Es-tu SÛR de vouloir continuer? (tape 'OUI' en majuscules): " confirm

if [[ "$confirm" != "OUI" ]]; then
    echo "❌ Annulé par sécurité"
    exit 1
fi

echo ""
echo "🔴 Étape 1/6: Arrêt de TOUS les processus..."

# Arrêter PM2
if command -v pm2 &> /dev/null; then
    echo "  → Arrêt de PM2..."
    pm2 delete all 2>/dev/null
    pm2 kill 2>/dev/null
fi

# Tuer tous les workers Python
echo "  → Arrêt workers Python..."
pkill -f "python.*worker" 2>/dev/null
pkill -f "python.*airbnb" 2>/dev/null
pkill -f "run_all_workers" 2>/dev/null

# Tuer tous les workers Node/TypeScript
echo "  → Arrêt workers Node..."
pkill -f "node.*worker" 2>/dev/null
pkill -f "tsx.*worker" 2>/dev/null
pkill -f "airbnb.*worker" 2>/dev/null

# Tuer Playwright/Chromium
echo "  → Arrêt Playwright/Chromium..."
pkill -f "playwright" 2>/dev/null
pkill -f "chromium" 2>/dev/null
pkill -f "chrome" 2>/dev/null

echo "✅ Tous les processus arrêtés"

echo ""
echo "🗑️  Étape 2/6: Suppression des anciens dossiers..."

# Compter les dossiers AirbnbBot
count=$(find ~ -maxdepth 1 -name "*AirbnbBot*" -o -name "*airbnb*" 2>/dev/null | wc -l)
echo "  → Trouvé $count dossier(s) AirbnbBot"

# Backup PUIS supprimer
if [ -d ~/AirbnbBot ]; then
    backup_name="AirbnbBot_DELETED_$(date +%Y%m%d_%H%M%S)"
    echo "  → Backup: ~/$backup_name"
    mv ~/AirbnbBot ~/"$backup_name"
fi

# Supprimer tous les autres dossiers AirbnbBot
find ~ -maxdepth 1 -name "*AirbnbBot*" -type d ! -name "*DELETED*" -exec rm -rf {} + 2>/dev/null
find ~ -maxdepth 1 -name "*airbnb-bot*" -type d -exec rm -rf {} + 2>/dev/null

echo "✅ Dossiers supprimés/backupés"

echo ""
echo "🧼 Étape 3/6: Nettoyage des caches Node/npm..."

# Nettoyer cache npm
if command -v npm &> /dev/null; then
    echo "  → Nettoyage cache npm..."
    npm cache clean --force 2>/dev/null
fi

# Supprimer .npm ancien
if [ -d ~/.npm ]; then
    echo "  → Suppression ~/.npm ancien..."
    rm -rf ~/.npm/_logs/* 2>/dev/null
fi

echo "✅ Caches nettoyés"

echo ""
echo "🎭 Étape 4/6: Nettoyage Playwright..."

# Supprimer les anciens browsers Playwright
if [ -d ~/Library/Caches/ms-playwright ]; then
    echo "  → Suppression anciens browsers Playwright..."
    rm -rf ~/Library/Caches/ms-playwright 2>/dev/null
fi

echo "✅ Playwright nettoyé"

echo ""
echo "📝 Étape 5/6: Nettoyage des logs..."

# Supprimer anciens logs PM2
if [ -d ~/.pm2/logs ]; then
    echo "  → Suppression logs PM2..."
    rm -rf ~/.pm2/logs/* 2>/dev/null
fi

# Supprimer logs Python
find ~ -maxdepth 2 -name "*.log" -mtime +1 -delete 2>/dev/null

echo "✅ Logs nettoyés"

echo ""
echo "🔍 Étape 6/6: Vérification finale..."

# Vérifier qu'aucun processus ne tourne
echo "  → Processus restants:"
running=$(ps aux | grep -i airbnb | grep -v grep | wc -l)
if [ $running -eq 0 ]; then
    echo "    ✅ Aucun processus Airbnb actif"
else
    echo "    ⚠️  $running processus encore actifs"
    ps aux | grep -i airbnb | grep -v grep
fi

# Vérifier l'espace disque libéré
echo ""
echo "💾 Espace disque disponible:"
df -h ~ | tail -1 | awk '{print "    " $4 " disponible sur " $2}'

echo ""
echo "✅ NETTOYAGE TERMINÉ!"
echo ""
echo "📋 Résumé:"
echo "  ✅ Tous les processus arrêtés"
echo "  ✅ Anciens dossiers backupés dans ~/*DELETED*"
echo "  ✅ Caches nettoyés"
echo "  ✅ Logs supprimés"
echo ""
echo "🚀 Prochaines étapes:"
echo ""
echo "1. Clone le code propre depuis GitHub:"
echo "   git clone https://github.com/nguilanefall-a11y/AirbnbBot.git"
echo "   cd AirbnbBot"
echo ""
echo "2. Installe les dépendances:"
echo "   npm install"
echo "   npm install postgres"
echo "   npx playwright install chromium"
echo ""
echo "3. Copie .env et airbnb-session.json (depuis Desktop)"
echo ""
echo "4. Lance les workers:"
echo "   sudo npm install -g pm2"
echo "   pm2 start pm2-workers.json"
echo ""
echo "🗑️  Pour supprimer les backups (dans 24h si tout marche):"
echo "   rm -rf ~/*DELETED*"
echo ""
