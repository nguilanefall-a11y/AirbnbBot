#!/bin/bash
# SETUP POUR MAC SERVEUR
# Installation complète du bot Airbnb en Python

echo "=== CLONAGE DU PROJET ==="
git clone https://github.com/nguilanefall-a11y/AirbnbBot.git
cd AirbnbBot

echo ""
echo "=== CRÉATION ENVIRONNEMENT VIRTUEL PYTHON ==="
python3 -m venv venv
source venv/bin/activate

echo ""
echo "=== INSTALLATION DES DÉPENDANCES PYTHON ==="
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "=== INSTALLATION PLAYWRIGHT CHROMIUM ==="
playwright install chromium

echo ""
echo "=== CONFIGURATION REQUISE ==="
echo "⚠️  AVANT DE LANCER LE BOT, VOUS DEVEZ :"
echo "1. Copier le fichier .env depuis l'autre Mac"
echo "2. Copier le dossier session/ depuis l'autre Mac"
echo ""
echo "Commandes pour transférer depuis l'autre Mac :"
echo "  scp /Users/nguilane./Downloads/airbnb-cohost/.env user@serveur-ip:~/AirbnbBot/"
echo "  scp -r /Users/nguilane./Downloads/airbnb-cohost/session user@serveur-ip:~/AirbnbBot/"
echo ""
echo "=== LANCEMENT DU BOT ==="
echo "Une fois .env et session/ copiés, lancez :"
echo "  source venv/bin/activate"
echo "  python3 src/main.py all"
echo ""
echo "✅ Installation terminée !"
