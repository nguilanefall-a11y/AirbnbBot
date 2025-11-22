#!/usr/bin/env python3
"""
Script pour récupérer le dernier message d'Aziz depuis Airbnb et répondre immédiatement
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.playwright.browser_manager import BrowserManager
from src.playwright.scraping_actions import fetch_threads_and_messages, fetch_messages_for_thread_via_graphql
from src.playwright.send_actions import send_message
from src.playwright.captcha_detector import CaptchaDetected
from src.config import settings
from src.services.ai_responder import generate_response_for_message
from src.services.message_queue import MessageQueue
from src.db.db import get_db_session
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fetch_and_reply_aziz():
    """Récupère le dernier message d'Aziz depuis Airbnb et répond"""
    print("=" * 60)
    print("💬 Réponse immédiate à Aziz")
    print("=" * 60)
    print()
    
    original_headless = settings.AIRBNB_HEADLESS
    settings.AIRBNB_HEADLESS = False
    
    try:
        with BrowserManager() as manager:
            page = manager.new_page()
            
            print("📡 Récupération de tous les threads...")
            all_threads = fetch_threads_and_messages()
            
            if not all_threads:
                print("⚠️  Aucun thread trouvé")
                return 1
            
            # Trouver le thread d'Aziz
            aziz_thread_data = None
            for thread_data in all_threads:
                guest_name = thread_data.get("guest_name", "")
                if "aziz" in guest_name.lower():
                    aziz_thread_data = thread_data
                    print(f"✅ Thread d'Aziz trouvé: {guest_name}")
                    break
            
            if not aziz_thread_data:
                print("❌ Thread d'Aziz non trouvé")
                return 1
            
            thread_id = aziz_thread_data.get("airbnb_thread_id")
            guest_name = aziz_thread_data.get("guest_name")
            
            print(f"\n📨 Récupération des messages détaillés pour le thread d'Aziz...")
            print(f"   Thread ID: {thread_id}")
            
            # Récupérer tous les messages du thread
            all_messages = fetch_messages_for_thread_via_graphql(page, thread_id)
            
            if not all_messages:
                print("⚠️  Aucun message trouvé pour ce thread")
                return 1
            
            print(f"✅ {len(all_messages)} message(s) récupéré(s)")
            
            # Trouver le dernier message inbound (d'Aziz)
            aziz_message = None
            for msg in reversed(all_messages):
                if msg.get("direction") == "inbound":
                    aziz_message = msg.get("content", "")
                    print(f"\n📨 Dernier message d'Aziz trouvé:")
                    print(f"   {aziz_message}")
                    break
            
            if not aziz_message:
                print("⚠️  Aucun message inbound d'Aziz trouvé dans ce thread")
                print("\nMessages disponibles:")
                for i, msg in enumerate(reversed(all_messages)):
                    print(f"   {i+1}. {msg.get('direction', 'unknown')} - {msg.get('sender_name', 'Unknown')}: {msg.get('content', '')[:100]}...")
                return 1
            
            # Récupérer les infos de contexte depuis la base
            db = get_db_session()
            conversation_id = None
            property_id = None
            try:
                result = db.execute(
                    text("""
                        SELECT c.id, c.property_id 
                        FROM conversations c
                        WHERE c.external_id = :external_id AND c.source = 'airbnb-cohost'
                    """),
                    {"external_id": thread_id}
                )
                row = result.fetchone()
                if row:
                    conversation_id = row[0]
                    property_id = row[1]
            finally:
                db.close()
            
            # Générer la réponse IA
            print("\n🤖 Génération de la réponse IA avec contexte complet...")
            print(f"   Contexte: property_id={property_id}, conversation_id={conversation_id}, thread_id={thread_id}")
            
            ai_response = generate_response_for_message(
                message_content=aziz_message,
                thread_id=thread_id,
                guest_name=guest_name,
                property_id=property_id,
                conversation_id=conversation_id,
            )
            
            if not ai_response:
                print("❌ Impossible de générer une réponse IA")
                print("   Vérifie que AI_WEBHOOK_URL est configuré dans .env")
                print("   Ou que le projet principal (AirbnbBot 3) est lancé sur http://localhost:5000")
                return 1
            
            print(f"\n✅ Réponse IA générée:")
            print(f"   {ai_response}")
            
            # Envoyer la réponse immédiatement
            print(f"\n📤 Envoi de la réponse à Aziz...")
            success, error = send_message(thread_id, ai_response)
            
            if success:
                print("\n✅✅✅ RÉPONSE ENVOYÉE AVEC SUCCÈS ! ✅✅✅")
                print(f"   Aziz devrait recevoir la réponse maintenant.")
                print(f"   Vérifie sur Airbnb que la réponse apparaît bien.")
                return 0
            else:
                print(f"\n❌ Erreur lors de l'envoi: {error}")
                if "CAPTCHA" in error:
                    print("   ➜ CAPTCHA détecté. Reconnexion requise:")
                    print("   python3 scripts/reconnect_airbnb.py")
                else:
                    # Ajouter à la queue d'envoi
                    print("   ➜ Ajout à la queue d'envoi...")
                    MessageQueue.enqueue_send(
                        thread_id=thread_id,
                        message=ai_response,
                        metadata={
                            "auto_reply": True,
                            "guest_name": guest_name,
                            "conversation_id": conversation_id,
                            "property_id": property_id,
                        }
                    )
                    print("   ✅ Réponse ajoutée à la queue - elle sera envoyée automatiquement par le worker")
                return 1
                
    except CaptchaDetected as captcha_error:
        print(f"\n🚨 CAPTCHA détecté: {captcha_error}")
        print("   Reconnexion requise: python3 scripts/reconnect_airbnb.py")
        return 1
    except KeyboardInterrupt:
        print("\n🛑 Interrompu")
        return 1
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        settings.AIRBNB_HEADLESS = original_headless


if __name__ == "__main__":
    sys.exit(fetch_and_reply_aziz())


