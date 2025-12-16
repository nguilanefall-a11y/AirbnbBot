#!/bin/bash

# 🚀 Script de transfert complet vers Mac Serveur
# Ce script copie TOUT le dossier propre vers l'autre Mac

echo "🚀 Transfert vers Mac Serveur"
echo "=============================="
echo ""

# CONFIGURE CES VARIABLES SELON TON MAC SERVEUR
MAC_SERVEUR_IP="192.168.1.XXX"  # Remplace par l'IP du Mac serveur
MAC_SERVEUR_USER="alpha"         # Remplace par le nom d'utilisateur
MAC_SERVEUR_PATH="~/"            # Destination sur le Mac serveur

echo "⚠️  AVANT DE CONTINUER:"
echo "1. Configure MAC_SERVEUR_IP dans ce script (ligne 9)"
echo "2. Assure-toi que le Mac serveur est allumé"
echo "3. Assure-toi d'avoir SSH activé sur le Mac serveur"
echo ""
read -p "Appuie sur ENTER pour continuer (Ctrl+C pour annuler)..."

# Vérifier que l'IP est configurée
if [[ "$MAC_SERVEUR_IP" == "192.168.1.XXX" ]]; then
    echo "❌ ERREUR: Configure d'abord MAC_SERVEUR_IP dans le script!"
    echo ""
    echo "Pour trouver l'IP du Mac serveur:"
    echo "  Sur le Mac serveur, lance: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
    exit 1
fi

echo ""
echo "📦 Étape 1/4: Suppression de l'ancien dossier sur Mac serveur..."
echo "Commande: ssh $MAC_SERVEUR_USER@$MAC_SERVEUR_IP"
echo ""

# Demander confirmation
read -p "⚠️  Cela va SUPPRIMER ~/AirbnbBot sur le Mac serveur. Continuer? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
    echo "❌ Annulé"
    exit 1
fi

# Supprimer l'ancien dossier (avec backup)
ssh "$MAC_SERVEUR_USER@$MAC_SERVEUR_IP" << 'ENDSSH'
    if [ -d ~/AirbnbBot ]; then
        echo "📦 Backup de l'ancien dossier..."
        mv ~/AirbnbBot ~/AirbnbBot_BACKUP_$(date +%Y%m%d_%H%M%S)
    fi
    echo "✅ Ancien dossier supprimé/backupé"
ENDSSH

echo ""
echo "📤 Étape 2/4: Copie du dossier complet vers Mac serveur..."
echo "Cela peut prendre quelques minutes..."
echo ""

# Copier tout le dossier
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude '.local' \
    --exclude 'logs' \
    "$HOME/Downloads/AirbnbBot 2/" \
    "$MAC_SERVEUR_USER@$MAC_SERVEUR_IP:~/AirbnbBot/"

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la copie"
    exit 1
fi

echo ""
echo "📦 Étape 3/4: Installation des dépendances sur Mac serveur..."
echo ""

# Installer les dépendances
ssh "$MAC_SERVEUR_USER@$MAC_SERVEUR_IP" << 'ENDSSH'
    cd ~/AirbnbBot
    
    echo "📦 npm install..."
    npm install
    
    echo "📦 npm install postgres..."
    npm install postgres
    
    echo "🎭 npx playwright install chromium..."
    npx playwright install chromium
    
    echo "✅ Dépendances installées"
ENDSSH

echo ""
echo "🧪 Étape 4/4: Test de connexion DB..."
echo ""

# Tester la connexion
ssh "$MAC_SERVEUR_USER@$MAC_SERVEUR_IP" << 'ENDSSH'
    cd ~/AirbnbBot
    npx tsx test-neon-connection.ts
ENDSSH

if [ $? -ne 0 ]; then
    echo "⚠️  Erreur de connexion DB - vérifie le .env"
    echo ""
    echo "Pour corriger:"
    echo "  ssh $MAC_SERVEUR_USER@$MAC_SERVEUR_IP"
    echo "  cd ~/AirbnbBot"
    echo "  nano .env"
fi

echo ""
echo "✅ TRANSFERT TERMINÉ!"
echo ""
echo "📋 Prochaines étapes sur le Mac serveur:"
echo ""
echo "1. Connecte-toi: ssh $MAC_SERVEUR_USER@$MAC_SERVEUR_IP"
echo "2. Va dans le dossier: cd ~/AirbnbBot"
echo "3. Installe PM2: sudo npm install -g pm2"
echo "4. Lance les workers: pm2 start pm2-workers.json"
echo "5. Vérifie les logs: pm2 logs"
echo ""
echo "🎯 Commandes utiles:"
echo "  pm2 status          - Voir l'état des workers"
echo "  pm2 logs            - Voir les logs en temps réel"
echo "  pm2 restart all     - Redémarrer tous les workers"
echo "  pm2 stop all        - Arrêter tous les workers"
echo ""
