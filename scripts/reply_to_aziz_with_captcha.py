#!/usr/bin/env python3
"""
Script pour répondre à Aziz en gérant le CAPTCHA si nécessaire
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.playwright.browser_manager import BrowserManager
from src.playwright.scraping_actions import fetch_threads_and_messages
from src.config import settings
from src.services.ai_responder import generate_response_for_message
from src.playwright.send_actions import send_message
from src.playwright.utils import check_for_captcha

def reply_to_aziz():
    """Récupère le message d'Aziz et répond"""
    print("=" * 60)
    print("💬 Réponse à Aziz")
    print("=" * 60)
    print()
    
    # Forcer le mode visible pour gérer le CAPTCHA
    settings.AIRBNB_HEADLESS = False
    
    try:
        with BrowserManager() as manager:
            page = manager.new_page()
            
            print("🌐 Navigation vers les messages Airbnb...")
            page.goto("https://www.airbnb.com/hosting/messages", wait_until="domcontentloaded", timeout=60000)
            
            # Vérifier le CAPTCHA
            if check_for_captcha(page):
                print()
                print("=" * 60)
                print("🚨 CAPTCHA détecté")
                print("=" * 60)
                print("Complète le CAPTCHA dans le navigateur qui vient de s'ouvrir.")
                print("Le script attendra que tu le complètes...")
                print("=" * 60)
                print()
                
                # Attendre que le CAPTCHA soit complété
                max_wait = 60 * 5  # 5 minutes
                waited = 0
                
                while waited < max_wait:
                    time.sleep(3)
                    page.reload(wait_until="domcontentloaded", timeout=10000)
                    
                    if not check_for_captcha(page):
                        print("✅ CAPTCHA complété !")
                        break
                    
                    print(f"⏳ En attente de complétion du CAPTCHA... ({waited}s)", end='\r')
                    waited += 3
                
                if waited >= max_wait:
                    print("\n⚠️  Timeout. Vérifie que le CAPTCHA est complété.")
                    return 1
            
            # Sauvegarder la session après CAPTCHA
            manager.save_session()
            
            # Maintenant récupérer les messages
            print("\n📡 Récupération des messages...")
            scraped_data = fetch_threads_and_messages()
            
            if not scraped_data:
                print("⚠️  Aucun message trouvé")
                return 1
            
            # Chercher le message d'Aziz
            aziz_message = None
            aziz_thread_id = None
            aziz_guest_name = None
            
            print(f"\n🔍 Recherche du message d'Aziz parmi {len(scraped_data)} conversation(s)...")
            
            for thread_data in scraped_data:
                guest_name = thread_data.get("guest_name", "")
                print(f"   Vérification: {guest_name}")
                
                if "aziz" in guest_name.lower():
                    messages = thread_data.get("messages", [])
                    # Chercher le dernier message inbound
                    for msg in reversed(messages):
                        if msg.get("direction") == "inbound":
                            aziz_message = msg.get("content", "")
                            aziz_thread_id = thread_data.get("airbnb_thread_id")
                            aziz_guest_name = guest_name
                            break
                    if aziz_message:
                        break
            
            if not aziz_message or not aziz_thread_id:
                print("\n❌ Message d'Aziz non trouvé")
                print("\nConversations trouvées:")
                for thread_data in scraped_data:
                    print(f"   - {thread_data.get('guest_name')} (Thread: {thread_data.get('airbnb_thread_id')})")
                    messages = thread_data.get("messages", [])
                    for msg in messages:
                        if msg.get("direction") == "inbound":
                            print(f"     Message: {msg.get('content', '')[:50]}...")
                return 1
            
            print(f"\n✅ Message d'Aziz trouvé !")
            print(f"   Voyageur: {aziz_guest_name}")
            print(f"   Thread ID: {aziz_thread_id}")
            print(f"   Message: {aziz_message}")
            
            # Générer la réponse IA
            print("\n🤖 Génération de la réponse IA...")
            try:
                # Récupérer une propriété pour le contexte
                from src.db.db import get_db_session
                from sqlalchemy import text
                db = get_db_session()
                result = db.execute(text("SELECT id, name FROM properties LIMIT 1"))
                prop_row = result.fetchone()
                db.close()
                
                property_name = prop_row[1] if prop_row else None
                
                ai_response = generate_response_for_message(
                    aziz_message,
                    thread_id=aziz_thread_id,
                    guest_name=aziz_guest_name,
                    listing_name=property_name
                )
                
                if not ai_response:
                    print("❌ Impossible de générer une réponse IA")
                    print("   Vérifie que AI_WEBHOOK_URL est configuré dans .env")
                    return 1
                
                print(f"✅ Réponse IA générée:")
                print(f"   {ai_response}")
                
                # Envoyer la réponse
                print(f"\n📤 Envoi de la réponse à Aziz...")
                success, error = send_message(aziz_thread_id, ai_response)
                
                if success:
                    print("\n✅✅✅ RÉPONSE ENVOYÉE AVEC SUCCÈS ! ✅✅✅")
                    print(f"   Aziz devrait recevoir la réponse maintenant.")
                    return 0
                else:
                    print(f"\n❌ Erreur lors de l'envoi: {error}")
                    print("   La réponse a été générée mais n'a pas pu être envoyée.")
                    return 1
                    
            except Exception as e:
                print(f"❌ Erreur: {e}")
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
    sys.exit(reply_to_aziz())


