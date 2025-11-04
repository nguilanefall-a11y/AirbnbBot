#!/bin/bash

# Script pour synchroniser le code depuis Replit vers Cursor

echo "🔄 Synchronisation Replit → Cursor"
echo ""

# Sauvegarder le code actuel
echo "📦 Sauvegarde du code actuel..."
git add .
git commit -m "Backup avant sync depuis Replit" 2>/dev/null || echo "Pas de changements à sauvegarder"

echo ""
echo "📋 Choisissez une méthode :"
echo ""
echo "1. Via GitHub (si Replit est déjà sur GitHub)"
echo "2. Via URL Git de Replit"
echo "3. Fusion manuelle (je vous guide)"
echo ""

read -p "Votre choix (1/2/3): " CHOICE

case $CHOICE in
  1)
    echo ""
    read -p "URL GitHub du dépôt Replit (ex: https://github.com/user/repo.git): " GITHUB_URL
    if [ -z "$GITHUB_URL" ]; then
      echo "❌ URL requise"
      exit 1
    fi
    
    echo ""
    echo "🔄 Récupération depuis GitHub..."
    git remote add replit-source "$GITHUB_URL" 2>/dev/null || git remote set-url replit-source "$GITHUB_URL"
    git fetch replit-source
    
    echo ""
    echo "📋 Différences trouvées :"
    git diff main replit-source/main --stat
    
    echo ""
    read -p "Voulez-vous fusionner? (o/n): " MERGE
    if [ "$MERGE" = "o" ] || [ "$MERGE" = "O" ]; then
      git merge replit-source/main --allow-unrelated-histories -m "Merge depuis Replit"
      echo "✅ Fusion terminée!"
    fi
    ;;
    
  2)
    echo ""
    read -p "URL Git de Replit (si disponible): " REPLIT_GIT_URL
    if [ -z "$REPLIT_GIT_URL" ]; then
      echo "❌ URL requise"
      exit 1
    fi
    
    echo ""
    echo "🔄 Récupération depuis Replit..."
    git remote add replit-source "$REPLIT_GIT_URL" 2>/dev/null || git remote set-url replit-source "$REPLIT_GIT_URL"
    git fetch replit-source
    
    echo ""
    echo "📋 Différences trouvées :"
    git diff main replit-source/main --stat
    
    echo ""
    read -p "Voulez-vous fusionner? (o/n): " MERGE
    if [ "$MERGE" = "o" ] || [ "$MERGE" = "O" ]; then
      git merge replit-source/main --allow-unrelated-histories -m "Merge depuis Replit"
      echo "✅ Fusion terminée!"
    fi
    ;;
    
  3)
    echo ""
    echo "📋 Étapes manuelles :"
    echo ""
    echo "1. Sur Replit :"
    echo "   - Ouvrez le terminal"
    echo "   - Exécutez: git remote -v"
    echo "   - Si Git est configuré, notez l'URL"
    echo "   - Sinon, créez un dépôt Git:"
    echo "     git init"
    echo "     git add ."
    echo "     git commit -m 'Export Replit'"
    echo ""
    echo "2. Sur Replit, téléchargez en ZIP :"
    echo "   - Menu (3 points) > Download as zip"
    echo ""
    echo "3. Dans Cursor :"
    echo "   - Extrayez le ZIP"
    echo "   - Comparez les fichiers"
    echo "   - Copiez les fichiers modifiés"
    echo ""
    ;;
    
  *)
    echo "❌ Choix invalide"
    exit 1
    ;;
esac

echo ""
echo "✅ Script terminé!"
