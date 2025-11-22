#!/bin/bash

# Script pour fusionner le ZIP de Replit avec le code local

echo "📦 Fusion du ZIP Replit avec le code local"
echo ""

# Chercher le ZIP dans Downloads
ZIP_FILE=$(ls -t ~/Downloads/*.zip 2>/dev/null | head -1)

if [ -z "$ZIP_FILE" ]; then
  echo "❌ Aucun fichier ZIP trouvé dans ~/Downloads"
  echo ""
  read -p "Chemin complet vers le fichier ZIP: " ZIP_FILE
fi

if [ ! -f "$ZIP_FILE" ]; then
  echo "❌ Fichier ZIP introuvable: $ZIP_FILE"
  exit 1
fi

echo "✅ ZIP trouvé: $ZIP_FILE"
echo ""

# Créer un dossier temporaire
TEMP_DIR=$(mktemp -d)
echo "📂 Extraction dans: $TEMP_DIR"

# Extraire le ZIP
unzip -q "$ZIP_FILE" -d "$TEMP_DIR" || {
  echo "❌ Erreur lors de l'extraction"
  rm -rf "$TEMP_DIR"
  exit 1
}

# Trouver le dossier extrait
EXTRACTED_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d | tail -1)

if [ -z "$EXTRACTED_DIR" ] || [ "$EXTRACTED_DIR" = "$TEMP_DIR" ]; then
  EXTRACTED_DIR="$TEMP_DIR"
fi

echo "✅ Extraction réussie"
echo ""

# Sauvegarder le code actuel
echo "💾 Sauvegarde du code actuel..."
cd "$(dirname "$0")"
git add -A 2>/dev/null
git commit -m "Backup avant merge Replit ZIP" 2>/dev/null || echo "Pas de changements à sauvegarder"

# Comparer les fichiers
echo ""
echo "📊 Analyse des différences..."
echo ""

# Compter les fichiers
LOCAL_FILES=$(find . -type f -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./dist/*" | wc -l | tr -d ' ')
REPLIT_FILES=$(find "$EXTRACTED_DIR" -type f -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' ')

echo "Fichiers locaux: $LOCAL_FILES"
echo "Fichiers Replit: $REPLIT_FILES"
echo ""

# Demander confirmation
read -p "Voulez-vous voir les fichiers différents avant de fusionner? (o/n): " PREVIEW

if [ "$PREVIEW" = "o" ] || [ "$PREVIEW" = "O" ]; then
  echo ""
  echo "📋 Fichiers dans Replit qui diffèrent ou sont nouveaux:"
  
  # Comparer les fichiers principaux
  for file in "$EXTRACTED_DIR"/*; do
    if [ -f "$file" ]; then
      filename=$(basename "$file")
      if [ -f "./$filename" ]; then
        if ! diff -q "$file" "./$filename" >/dev/null 2>&1; then
          echo "  📝 Modifié: $filename"
        fi
      else
        echo "  ✨ Nouveau: $filename"
      fi
    fi
  done
  
  echo ""
fi

read -p "Comment voulez-vous procéder? (remplacer/fusionner/annuler): " ACTION

case $ACTION in
  remplacer)
    echo ""
    echo "⚠️  ATTENTION: Vous allez remplacer votre code actuel par celui de Replit"
    read -p "Confirmer? (o/n): " CONFIRM
    if [ "$CONFIRM" = "o" ] || [ "$CONFIRM" = "O" ]; then
      # Sauvegarder dans un backup
      BACKUP_DIR="../AirbnbBot-3-backup-$(date +%Y%m%d-%H%M%S)"
      cp -r . "$BACKUP_DIR"
      echo "✅ Backup créé: $BACKUP_DIR"
      
      # Copier les fichiers (sauf .git, node_modules, etc.)
      rsync -av --progress \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='.env' \
        --exclude='*.zip' \
        "$EXTRACTED_DIR/" ./
      
      echo ""
      echo "✅ Remplacement terminé!"
    fi
    ;;
    
  fusionner)
    echo ""
    echo "🔄 Fusion intelligente..."
    
    # Copier seulement les fichiers qui n'existent pas localement
    find "$EXTRACTED_DIR" -type f \
      -not -path "*/node_modules/*" \
      -not -path "*/dist/*" \
      -not -path "*/.git/*" \
      -not -name ".env" \
      -not -name "*.zip" | while read file; do
      
      rel_path="${file#$EXTRACTED_DIR/}"
      if [ ! -f "./$rel_path" ]; then
        mkdir -p "$(dirname "./$rel_path")"
        cp "$file" "./$rel_path"
        echo "  ✨ Ajouté: $rel_path"
      else
        # Comparer et proposer
        if ! diff -q "$file" "./$rel_path" >/dev/null 2>&1; then
          echo "  ⚠️  Conflit: $rel_path (conservé local, vérifiez manuellement)"
        fi
      fi
    done
    
    echo ""
    echo "✅ Fusion terminée!"
    echo "⚠️  Vérifiez les fichiers en conflit manuellement"
    ;;
    
  annuler)
    echo ""
    echo "❌ Annulé"
    rm -rf "$TEMP_DIR"
    exit 0
    ;;
    
  *)
    echo "❌ Action invalide"
    rm -rf "$TEMP_DIR"
    exit 1
    ;;
esac

# Nettoyer
rm -rf "$TEMP_DIR"

echo ""
echo "📋 Prochaines étapes:"
echo "1. Vérifiez les fichiers: git status"
echo "2. Installez les dépendances: npm install"
echo "3. Testez l'application"
echo ""
