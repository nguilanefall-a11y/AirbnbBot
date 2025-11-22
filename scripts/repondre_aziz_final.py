#!/usr/bin/env python3
"""
Script FINAL pour répondre à Aziz - TOUT en une seule session navigateur
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.playwright.browser_manager import BrowserManager
from src.playwright.scraping_actions import fetch_threads_and_messages
from src.playwright.send_actions import send_message
from src.config import settings

settings.AIRBNB_HEADLESS = False

print("=" * 60)
print("💬 RÉPONSE À AZIZ - VERSION CORRIGÉE")
print("=" * 60)
print()

# 1. Récupérer tous les threads pour trouver Aziz
print("1️⃣  Récupération des messages Airbnb...")
all_threads = fetch_threads_and_messages()

if not all_threads:
    print("❌ Aucun thread trouvé")
    sys.exit(1)

print(f"✅ {len(all_threads)} conversation(s) trouvée(s)")

# 2. Trouver Aziz
print("\n2️⃣  Recherche d'Aziz...")
aziz_thread = None
for thread in all_threads:
    guest_name = thread.get("guest_name", "")
    if "aziz" in guest_name.lower():
        aziz_thread = thread
        print(f"✅ Aziz trouvé: {guest_name}")
        break

if not aziz_thread:
    print("❌ Aziz non trouvé")
    print("\nConversations disponibles:")
    for thread in all_threads:
        print(f"   - {thread.get('guest_name')}")
    sys.exit(1)

thread_id = aziz_thread.get("airbnb_thread_id")
guest_name = aziz_thread.get("guest_name")
messages = aziz_thread.get("messages", [])

# 3. Trouver le dernier message inbound
print("\n3️⃣  Lecture du dernier message d'Aziz...")
dernier_message = None
for msg in reversed(messages):
    if msg.get("direction") == "inbound":
        dernier_message = msg.get("content", "")
        break

if not dernier_message and messages:
    dernier_message = messages[-1].get("content", "")

if not dernier_message:
    print("❌ Aucun message trouvé")
    sys.exit(1)

print(f"📨 Message d'Aziz: {dernier_message}")

# 4. Générer une réponse
print("\n4️⃣  Génération de la réponse...")
ai_response = f"Bonjour {guest_name.split(',')[0]} ! Je vais bien, merci de demander. Comment puis-je vous aider aujourd'hui ?"
print(f"✅ Réponse: {ai_response}")

# 5. Envoyer avec la fonction send_message (qui est testée et fonctionnelle)
print("\n5️⃣  Envoi de la réponse à Aziz...")
print(f"   Thread ID: {thread_id}")
success, error = send_message(thread_id, ai_response)

if success:
    print("\n✅✅✅ RÉPONSE ENVOYÉE AVEC SUCCÈS ! ✅✅✅")
    print("   Vérifie sur Airbnb que la réponse est bien dans la conversation avec Aziz.")
    sys.exit(0)
else:
    print(f"\n❌ Erreur lors de l'envoi: {error}")
    if "CAPTCHA" in error:
        print("   ➜ Reconnexion requise: python3 scripts/reconnect_airbnb.py")
    sys.exit(1)

