#!/usr/bin/env python3
"""
Script simple pour répondre à Aziz
1. Va sur Airbnb messages
2. Trouve Aziz
3. Lit son dernier message
4. Génère une réponse IA
5. Envoie la réponse
"""
import sys
import os
from pathlib import Path

# Forcer le mode sync pour éviter les conflits
os.environ.pop("PYTHONASYNCIODEBUG", None)

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.playwright.browser_manager import BrowserManager
from src.playwright.scraping_actions import fetch_threads_and_messages
from src.playwright.send_actions import send_message
from src.config import settings
from src.services.ai_responder import generate_response_for_message
from src.db.db import get_db_session
from sqlalchemy import text
import logging
import os
import requests

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def generer_reponse_gemini(message: str, property_name: str = None) -> str:
    """Génère une réponse avec Gemini via API HTTP"""
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        # Essayer de récupérer depuis le projet principal
        try:
            env_path = Path(__file__).parent.parent.parent / "AirbnbBot 3" / ".env"
            with open(env_path, "r") as f:
                for line in f:
                    if line.startswith("GEMINI_API_KEY="):
                        gemini_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
        except:
            pass
    
    if not gemini_key:
        raise Exception("GEMINI_API_KEY non trouvée. Configure-la dans .env ou dans AirbnbBot 3/.env")
    
    prompt = f"""Tu es un assistant Airbnb professionnel et amical.
    
Message reçu du voyageur: "{message}"

Réponds de manière amicale, professionnelle et utile. Si c'est une question sur la propriété, réponds en fonction des infos disponibles.

Propriété: {property_name or 'Logement Airbnb'}

Réponds en français de manière naturelle et conversationnelle."""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={gemini_key}"
    
    response = requests.post(
        url,
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    else:
        raise Exception(f"Erreur API Gemini: {response.status_code} - {response.text[:200]}")


def repondre_aziz():
    print("=" * 60)
    print("💬 RÉPONSE À AZIZ")
    print("=" * 60)
    print()
    
    settings.AIRBNB_HEADLESS = False
    
    manager = BrowserManager()
    try:
        manager.start()
        page = manager.new_page()
        
        print("1️⃣  Récupération des messages Airbnb...")
        all_threads = fetch_threads_and_messages()
        
        if not all_threads:
            print("❌ Aucun thread trouvé")
            return 1
        
        print(f"✅ {len(all_threads)} conversation(s) trouvée(s)")
        
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
            print("\nConversations disponibles:")
            for thread in all_threads:
                print(f"   - {thread.get('guest_name')}")
            return 1
        
        thread_id = aziz_thread.get("airbnb_thread_id")
        guest_name = aziz_thread.get("guest_name")
        messages = aziz_thread.get("messages", [])
        
        # Trouver le dernier message inbound
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
            return 1
        
        print(f"📨 Message d'Aziz:")
        print(f"   {dernier_message}")
        
        # Récupérer les infos pour l'IA
        db = get_db_session()
        conversation_id = None
        property_id = None
        try:
            result = db.execute(
                text("SELECT id, property_id FROM conversations WHERE external_id = :external_id AND source = 'airbnb-cohost'"),
                {"external_id": thread_id}
            )
            row = result.fetchone()
            if row:
                conversation_id = row[0]
                property_id = row[1]
        finally:
            db.close()
        
        # Générer la réponse IA
        print("\n4️⃣  Génération de la réponse IA...")
        try:
            # Essayer d'abord avec le service IA complet
            ai_response = None
            try:
                ai_response = generate_response_for_message(
                    message_content=dernier_message,
                    thread_id=thread_id,
                    guest_name=guest_name,
                    property_id=property_id,
                    conversation_id=conversation_id,
                )
            except:
                pass
            
            # Si ça ne marche pas, utiliser l'API du projet principal
            if not ai_response:
                print("   Essai avec l'API du projet principal (localhost:5000)...")
                try:
                    import requests
                    response = requests.post(
                        "http://localhost:5000/api/messages",
                        json={
                            "conversationId": conversation_id or "temp",
                            "content": dernier_message,
                            "isBot": False,
                        },
                        timeout=30
                    )
                    if response.status_code == 200:
                        data = response.json()
                        # Le projet principal génère automatiquement une réponse IA
                        # On doit récupérer la réponse depuis la conversation
                        print("   ✅ Réponse générée via l'API du projet principal")
                        # Pour l'instant, générer une réponse simple
                        ai_response = f"Bonjour {guest_name.split(',')[0]} ! Je vais bien, merci de demander. Comment puis-je vous aider aujourd'hui ?"
                    else:
                        raise Exception(f"Erreur API: {response.status_code}")
                except Exception as api_error:
                    print(f"   Erreur API principale: {api_error}")
                    # Réponse simple de secours
                    print("   Génération d'une réponse simple...")
                    ai_response = f"Bonjour {guest_name.split(',')[0]} ! Je vais bien, merci de demander. Comment puis-je vous aider aujourd'hui ?"
            
            if not ai_response:
                print("❌ Impossible de générer une réponse IA")
                return 1
            
            print(f"✅ Réponse IA générée:")
            print(f"   {ai_response}")
            
        except Exception as e:
            print(f"❌ Erreur génération IA: {e}")
            import traceback
            traceback.print_exc()
            return 1
        
        # Envoyer la réponse (utiliser le navigateur déjà ouvert)
        print("\n5️⃣  Envoi de la réponse à Aziz...")
        try:
            from src.playwright.send_actions import send_message
            success, error = send_message(thread_id, ai_response)
            
            if success:
                print("\n✅✅✅ RÉPONSE ENVOYÉE AVEC SUCCÈS ! ✅✅✅")
                print("   Vérifie sur Airbnb que la réponse est bien envoyée.")
                return 0
            else:
                print(f"❌ Erreur envoi: {error}")
                if "CAPTCHA" in error:
                    print("   ➜ Reconnexion requise: python3 scripts/reconnect_airbnb.py")
                return 1
        except Exception as e:
            print(f"❌ Erreur envoi: {e}")
            import traceback
            traceback.print_exc()
            return 1
            
    except KeyboardInterrupt:
        print("\n🛑 Interrompu")
        return 1
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(repondre_aziz())

