#!/usr/bin/env python3
"""
Script SIMPLE pour répondre à Aziz
1. Va sur Airbnb
2. Trouve Aziz
3. Lit son message
4. Génère une réponse
5. Envoie la réponse
TOUT en gardant le navigateur ouvert
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.playwright.browser_manager import BrowserManager
from src.playwright.scraping_actions import fetch_threads_and_messages
from src.playwright.send_actions import send_message
from src.config import settings

settings.AIRBNB_HEADLESS = False

print("=" * 60)
print("💬 RÉPONSE À AZIZ")
print("=" * 60)
print()

print("1️⃣  Récupération des messages...")
all_threads = fetch_threads_and_messages()

if not all_threads:
    print("❌ Aucun thread trouvé")
    sys.exit(1)

print(f"✅ {len(all_threads)} conversation(s)")

# Trouver Aziz
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
    sys.exit(1)

thread_id = aziz_thread.get("airbnb_thread_id")
guest_name = aziz_thread.get("guest_name")
messages = aziz_thread.get("messages", [])

# Trouver le dernier message inbound
print("\n3️⃣  Message d'Aziz...")
dernier_message = None
for msg in reversed(messages):
    if msg.get("direction") == "inbound":
        dernier_message = msg.get("content", "")
        break

if not dernier_message and messages:
    dernier_message = messages[-1].get("content", "")

if not dernier_message:
    print("❌ Aucun message")
    sys.exit(1)

print(f"📨 {dernier_message}")

# Générer une réponse simple
print("\n4️⃣  Génération de la réponse...")
ai_response = f"Bonjour {guest_name.split(',')[0]} ! Je vais bien, merci de demander. Comment puis-je vous aider aujourd'hui ?"
print(f"✅ {ai_response}")

# Envoyer la réponse
print("\n5️⃣  Envoi à Aziz...")
try:
    success, error = send_message(thread_id, ai_response)
    if success:
        print("\n✅✅✅ RÉPONSE ENVOYÉE ! ✅✅✅")
        sys.exit(0)
    else:
        print(f"❌ Erreur: {error}")
        sys.exit(1)
except Exception as e:
    print(f"❌ Erreur: {e}")
    sys.exit(1)


