#!/bin/bash

# Script pour synchroniser avec un token GitHub (pour dépôts privés)

echo "🔐 Synchronisation avec token GitHub"
echo ""

read -p "Votre token GitHub d'accès personnel: " GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Token requis"
  exit 1
fi

# Configurer le remote avec le token
GITHUB_USER="nguilanefall-a11y"
GITHUB_REPO="AirbnbBot"

echo ""
echo "🔄 Récupération du code depuis GitHub..."
git remote set-url replit-source "https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git"

# Fetch
git fetch replit-source

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Connexion réussie !"
  echo ""
  echo "📋 Différences trouvées :"
  git diff main replit-source/main --stat
  
  echo ""
  read -p "Voulez-vous fusionner le code depuis Replit? (o/n): " MERGE
  
  if [ "$MERGE" = "o" ] || [ "$MERGE" = "O" ]; then
    echo ""
    echo "🔄 Fusion en cours..."
    git merge replit-source/main --allow-unrelated-histories -m "Merge depuis Replit GitHub"
    
    if [ $? -eq 0 ]; then
      echo ""
      echo "✅ Fusion réussie !"
      echo ""
      echo "📋 Prochaines étapes :"
      echo "1. Vérifiez les fichiers fusionnés"
      echo "2. Installez les dépendances : npm install"
      echo "3. Testez l'application"
    else
      echo ""
      echo "⚠️  Conflits de fusion détectés. Résolvez-les manuellement."
      git status
    fi
  fi
else
  echo ""
  echo "❌ Erreur lors de la récupération. Vérifiez votre token."
fi

# Supprimer le token de l'URL pour la sécurité
git remote set-url replit-source "https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git"

echo ""
echo "✅ Terminé !"
