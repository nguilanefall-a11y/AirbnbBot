#!/bin/bash

# Script pour configurer la connexion GitHub pour Replit

echo "🔗 Configuration GitHub pour Replit"
echo ""

# Demander le nom d'utilisateur GitHub
read -p "Votre nom d'utilisateur GitHub: " GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ Nom d'utilisateur requis"
    exit 1
fi

# Demander le nom du dépôt
read -p "Nom du dépôt (par défaut: airbnb-bot): " REPO_NAME
REPO_NAME=${REPO_NAME:-airbnb-bot}

echo ""
echo "📋 Étapes à suivre :"
echo ""
echo "1. Créez un nouveau dépôt sur GitHub :"
echo "   👉 https://github.com/new"
echo "   Nom du dépôt: $REPO_NAME"
echo "   ✅ Ne cochez PAS 'Initialize with README'"
echo "   Cliquez sur 'Create repository'"
echo ""
read -p "Appuyez sur Entrée quand le dépôt est créé..."

# Vérifier si origin existe déjà
if git remote get-url origin &>/dev/null; then
    echo "⚠️  Remote 'origin' existe déjà"
    read -p "Voulez-vous le remplacer? (o/n): " REPLACE
    if [ "$REPLACE" = "o" ] || [ "$REPLACE" = "O" ]; then
        git remote remove origin
    else
        echo "❌ Annulé"
        exit 1
    fi
fi

# Ajouter le remote
echo ""
echo "🔗 Configuration du remote GitHub..."
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

# Vérifier la connexion
echo "✅ Remote configuré: $(git remote get-url origin)"
echo ""

# Proposer de pousser
read -p "Voulez-vous pousser le code maintenant? (o/n): " PUSH

if [ "$PUSH" = "o" ] || [ "$PUSH" = "O" ]; then
    echo ""
    echo "📤 Push du code vers GitHub..."
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Code poussé avec succès!"
        echo ""
        echo "📋 Prochaines étapes :"
        echo "1. Sur Replit, ouvrez votre projet"
        echo "2. Cliquez sur les 3 points (menu) > 'GitHub' ou 'Connect to Git'"
        echo "3. Connectez-vous avec GitHub"
        echo "4. Sélectionnez le dépôt: $REPO_NAME"
        echo "5. Cliquez sur 'Import'"
        echo ""
        echo "Ou dans le terminal Replit:"
        echo "  git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
        echo "  git pull origin main"
    else
        echo ""
        echo "⚠️  Erreur lors du push. Vérifiez:"
        echo "   - Que le dépôt existe sur GitHub"
        echo "   - Que vous avez les droits d'écriture"
        echo "   - Que votre clé SSH ou token est configuré"
    fi
else
    echo ""
    echo "📋 Pour pousser plus tard:"
    echo "  git push -u origin main"
fi

echo ""
echo "✅ Configuration terminée!"
