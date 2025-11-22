#!/usr/bin/env python3
"""
Script pour se reconnecter et répondre immédiatement à Aziz
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

def reconnect_and_reply():
    """Reconnecte et répond à Aziz"""
    print("=" * 60)
    print("🔐 Reconnexion et réponse à Aziz")
    print("=" * 60)
    print()
    
    # Forcer le mode visible
    settings.AIRBNB_HEADLESS = False
    
    try:
        with BrowserManager() as manager:
            page = manager.new_page()
            
            print("🌐 Ouverture de la page de login Airbnb...")
            page.goto("https://www.airbnb.com/login", wait_until="domcontentloaded", timeout=60000)
            
            print()
            print("=" * 60)
            print("📋 CONNEXION:")
            print("=" * 60)
            print("Connecte-toi manuellement dans le navigateur qui vient de s'ouvrir.")
            print("Le script va détecter automatiquement ta connexion.")
            print("=" * 60)
            print()
            
            # Attendre la connexion
            max_wait = 60 * 3  # 3 minutes
            check_interval = 3
            waited = 0
            
            while waited < max_wait:
                try:
                    page.goto("https://www.airbnb.com/hosting/messages", wait_until="domcontentloaded", timeout=10000)
                    current_url = page.url
                    
                    if "/login" not in current_url and "/signup" not in current_url:
                        print("✅ Connexion détectée !")
                        manager.save_session()
                        print("✅ Session sauvegardée")
                        break
                    
                    print(f"⏳ En attente de connexion... ({waited}s)", end='\r')
                    time.sleep(check_interval)
                    waited += check_interval
                except:
                    time.sleep(check_interval)
                    waited += check_interval
            
            if waited >= max_wait:
                print("\n⚠️  Timeout. Vérifie que tu es bien connecté.")
                return 1
            
            # Maintenant récupérer les messages
            print("\n📡 Récupération des messages...")
            scraped_data = fetch_threads_and_messages()
            
            if not scraped_data:
                print("⚠️  Aucun message trouvé")
                return 1
            
            # Chercher le message d'Aziz
            aziz_message = None
            aziz_thread_id = None
            
            for thread_data in scraped_data:
                guest_name = thread_data.get("guest_name", "").lower()
                if "aziz" in guest_name:
                    messages = thread_data.get("messages", [])
                    for msg in messages:
                        if msg.get("direction") == "inbound":
                            aziz_message = msg.get("content", "")
                            aziz_thread_id = thread_data.get("airbnb_thread_id")
                            break
                    if aziz_message:
                        break
            
            if not aziz_message or not aziz_thread_id:
                print("❌ Message d'Aziz non trouvé dans les conversations récupérées")
                print("   Conversations trouvées:")
                for thread_data in scraped_data:
                    print(f"   - {thread_data.get('guest_name')}")
                return 1
            
            print(f"\n✅ Message d'Aziz trouvé:")
            print(f"   {aziz_message[:100]}...")
            print(f"   Thread ID: {aziz_thread_id}")
            
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
                
                if prop_row:
                    property_id, property_name = prop_row
                    # Pour l'IA, on a besoin du contexte property
                    # Mais generate_response_for_message peut fonctionner sans
                    ai_response = generate_response_for_message(
                        aziz_message,
                        thread_id=aziz_thread_id,
                        guest_name="Aziz",
                        listing_name=property_name if prop_row else None
                    )
                else:
                    ai_response = generate_response_for_message(
                        aziz_message,
                        thread_id=aziz_thread_id,
                        guest_name="Aziz"
                    )
                
                if not ai_response:
                    print("❌ Impossible de générer une réponse IA")
                    return 1
                
                print(f"✅ Réponse IA générée:")
                print(f"   {ai_response[:100]}...")
                
                # Envoyer la réponse
                print(f"\n📤 Envoi de la réponse à Aziz...")
                success, error = send_message(aziz_thread_id, ai_response)
                
                if success:
                    print("✅ Réponse envoyée avec succès !")
                    return 0
                else:
                    print(f"❌ Erreur lors de l'envoi: {error}")
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
    sys.exit(reconnect_and_reply())


