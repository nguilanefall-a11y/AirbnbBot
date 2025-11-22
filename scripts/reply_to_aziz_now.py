#!/usr/bin/env python3
"""
Script pour répondre immédiatement à Aziz
Récupère le dernier message d'Aziz et génère une réponse IA avec toutes les infos
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.playwright.browser_manager import BrowserManager
from src.playwright.scraping_actions import fetch_threads_and_messages
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


def reply_to_aziz_now():
    """Récupère le dernier message d'Aziz et répond"""
    print("=" * 60)
    print("💬 Réponse immédiate à Aziz")
    print("=" * 60)
    print()
    
    # Forcer le mode visible (pour gérer CAPTCHA si nécessaire)
    original_headless = settings.AIRBNB_HEADLESS
    settings.AIRBNB_HEADLESS = False
    
    try:
        print("📡 Récupération des messages d'Aziz...")
        
        # Récupérer tous les threads
        scraped_data = fetch_threads_and_messages()
        
        if not scraped_data:
            print("⚠️  Aucun thread trouvé")
            return 1
        
        # Chercher le thread d'Aziz
        aziz_thread = None
        aziz_messages = []
        
        print(f"\n🔍 Recherche du thread d'Aziz parmi {len(scraped_data)} conversation(s)...")
        
        for thread_data in scraped_data:
            guest_name = thread_data.get("guest_name", "")
            print(f"   Vérification: {guest_name}")
            
            if "aziz" in guest_name.lower():
                aziz_thread = thread_data
                aziz_messages = thread_data.get("messages", [])
                print(f"✅ Thread d'Aziz trouvé !")
                print(f"   Voyageur: {guest_name}")
                print(f"   Thread ID: {aziz_thread.get('airbnb_thread_id')}")
                break
        
        if not aziz_thread:
            print("\n❌ Thread d'Aziz non trouvé")
            print("\nConversations disponibles:")
            for thread_data in scraped_data:
                print(f"   - {thread_data.get('guest_name')} (Thread: {thread_data.get('airbnb_thread_id')[:30]}...)")
            return 1
        
        thread_id = aziz_thread.get("airbnb_thread_id")
        guest_name = aziz_thread.get("guest_name")
        
        # Trouver le dernier message inbound (d'Aziz vers nous)
        aziz_message = None
        print(f"\n📨 Recherche du dernier message d'Aziz parmi {len(aziz_messages)} message(s)...")
        
        # Chercher dans les messages scrapés (peut inclure outbound et inbound)
        for msg in reversed(aziz_messages):
            content = msg.get("content", "")
            direction = msg.get("direction", "")
            sender_name = msg.get("sender_name", "")
            
            # Si c'est un message inbound OU si le sender n'est pas nous
            if direction == "inbound" or (not direction and "aziz" in sender_name.lower()):
                aziz_message = content
                print(f"✅ Message trouvé dans les messages scrapés: {aziz_message[:100]}...")
                break
        
        # Si pas trouvé, chercher dans la base de données
        if not aziz_message:
            print("\n⚠️  Aucun message inbound trouvé dans les messages récents, recherche dans la base...")
            db = get_db_session()
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
                    
                    # Récupérer le dernier message inbound de la conversation
                    result = db.execute(
                        text("""
                            SELECT content, direction, sender_name
                            FROM messages 
                            WHERE conversation_id = :conversation_id 
                            AND (direction = 'inbound' OR is_bot = false)
                            ORDER BY created_at DESC 
                            LIMIT 1
                        """),
                        {"conversation_id": conversation_id}
                    )
                    msg_row = result.fetchone()
                    if msg_row:
                        aziz_message = msg_row[0]
                        print(f"✅ Dernier message d'Aziz trouvé dans la base: {aziz_message[:100]}...")
                    else:
                        # Si aucun message dans la base, utiliser le dernier message scrapé (même outbound)
                        # Cela signifie qu'on doit répondre à la dernière interaction
                        if aziz_messages:
                            last_msg = aziz_messages[-1]
                            aziz_message = last_msg.get("content", "")
                            if aziz_message:
                                print(f"⚠️  Utilisation du dernier message disponible: {aziz_message[:100]}...")
            finally:
                db.close()
        
        if not aziz_message:
            print("❌ Aucun message d'Aziz trouvé")
            print("\nMessages disponibles dans le thread:")
            for i, msg in enumerate(aziz_messages):
                print(f"   {i+1}. {msg.get('direction', 'unknown')} - {msg.get('content', '')[:80]}...")
            return 1
        
        print(f"\n📨 Message d'Aziz:")
        print(f"   {aziz_message}")
        
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
        
        # Générer la réponse IA avec toutes les infos disponibles
        print("\n🤖 Génération de la réponse IA avec contexte complet...")
        print(f"   Contexte: property_id={property_id}, conversation_id={conversation_id}, thread_id={thread_id}")
        
        try:
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
                    # Ajouter à la queue d'envoi si l'envoi direct échoue
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
        except Exception as e:
            print(f"❌ Erreur: {e}")
            import traceback
            traceback.print_exc()
            return 1
                
    except CaptchaDetected as captcha_error:
        print(f"\n🚨 CAPTCHA détecté lors de la récupération: {captcha_error}")
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
    sys.exit(reply_to_aziz_now())

