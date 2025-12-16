#!/bin/bash
# Script pour pousser le projet sur GitHub

echo "🚀 Push vers GitHub"
echo "==================="
echo ""

cd "$(dirname "$0")"

# Vérifier que Git est initialisé
if [ ! -d .git ]; then
    echo "❌ Dépôt Git non initialisé"
    echo "   Lance d'abord: git init"
    exit 1
fi

# Vérifier si un remote existe
if git remote -v | grep -q origin; then
    echo "✅ Remote GitHub trouvé"
    git remote -v
    echo ""
    echo "📤 Poussage vers GitHub..."
    git branch -M main
    git push -u origin main
    echo ""
    echo "✅ Code poussé vers GitHub !"
else
    echo "⚠️  Aucun remote GitHub configuré"
    echo ""
    echo "📋 Pour connecter à GitHub, créé d'abord un dépôt sur GitHub.com"
    echo "   Puis lance ces commandes :"
    echo ""
    echo "   git remote add origin https://github.com/TON_USERNAME/TON_REPO.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    echo "   OU"
    echo ""
    echo "   Lance ce script avec l'URL du dépôt :"
    echo "   ./PUSH_TO_GITHUB.sh https://github.com/TON_USERNAME/TON_REPO.git"
    echo ""
    
    # Si une URL est fournie en argument
    if [ -n "$1" ]; then
        echo "🔗 Configuration du remote avec : $1"
        git remote add origin "$1"
        git branch -M main
        git push -u origin main
        echo ""
        echo "✅ Code poussé vers GitHub !"
    fi
fi


