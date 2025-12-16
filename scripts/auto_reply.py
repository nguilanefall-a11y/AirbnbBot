#!/usr/bin/env python3
"""
Script automatique qui :
1. Récupère les nouveaux messages Airbnb
2. Génère une réponse IA pour chaque nouveau message
3. Envoie la réponse automatiquement
"""
import sys
import time
from pathlib import Path
from datetime import datetime, timedelta
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.playwright.scraping_actions import fetch_threads_and_messages
from src.playwright.send_actions import send_message
from src.services.ai_responder import generate_response_for_message
from src.db.db import get_db_session
from src.config import settings

settings.AIRBNB_HEADLESS = False

def check_and_reply():
    """Vérifie les nouveaux messages et répond automatiquement"""
    print("=" * 60)
    print("🤖 AUTO-RÉPONSE - Détection et réponse automatique")
    print("=" * 60)
    print()
    
    print("1️⃣  Récupération des messages Airbnb...")
    all_threads = fetch_threads_and_messages()
    
    if not all_threads:
        print("❌ Aucun thread trouvé")
        return
    
    print(f"✅ {len(all_threads)} conversation(s) trouvée(s)")
    
    # Vérifier les conversations avec de nouveaux messages inbound
    db = get_db_session()
    new_messages_found = False
    
    print("\n2️⃣  Vérification des nouveaux messages...")
    
    for thread in all_threads:
        thread_id = thread.get("airbnb_thread_id")
        guest_name = thread.get("guest_name", "Guest")
        messages = thread.get("messages", [])
        
        # Trouver le dernier message inbound
        dernier_inbound = None
        for msg in reversed(messages):
            if msg.get("direction") == "inbound":
                dernier_inbound = msg
                break
        
        if not dernier_inbound:
            continue
        
        message_content = dernier_inbound.get("content", "")
        message_timestamp = dernier_inbound.get("timestamp") or datetime.utcnow().isoformat()
        
        # Vérifier si on a déjà répondu à ce message
        try:
            # Chercher la conversation en DB
            conv_result = db.execute(
                text("SELECT id, property_id FROM conversations WHERE external_id = :external_id AND source = 'airbnb-cohost'"),
                {"external_id": thread_id}
            )
            conv = conv_result.fetchone()
            
            if conv:
                conversation_id = conv[0]
                property_id = conv[1]
                
                # Vérifier si on a déjà répondu après ce message
                reply_result = db.execute(
                    text("""
                    SELECT COUNT(*) FROM messages 
                    WHERE conversation_id = :cid 
                    AND direction = 'outbound' 
                    AND created_at > :msg_time
                    """),
                    {"cid": conversation_id, "msg_time": message_timestamp}
                )
                has_replied = reply_result.fetchone()[0] > 0
                
                if has_replied:
                    continue  # Déjà répondu
                
                # Nouveau message sans réponse
                print(f"\n📨 Nouveau message de {guest_name}:")
                print(f"   {message_content[:100]}...")
                
                # Générer la réponse IA
                print(f"\n3️⃣  Génération de la réponse IA...")
                try:
                    ai_response = generate_response_for_message(
                        message_content=message_content,
                        thread_id=thread_id,
                        guest_name=guest_name,
                        property_id=property_id,
                        conversation_id=conversation_id,
                    )
                    
                    if not ai_response:
                        print("   ⚠️  Impossible de générer une réponse IA, utilisation réponse par défaut")
                        ai_response = f"Bonjour {guest_name.split(',')[0]} ! Merci pour votre message. Je vous répondrai rapidement."
                    
                    print(f"   ✅ Réponse: {ai_response[:100]}...")
                    
                except Exception as e:
                    print(f"   ⚠️  Erreur génération IA: {e}")
                    ai_response = f"Bonjour {guest_name.split(',')[0]} ! Merci pour votre message. Je vous répondrai rapidement."
                
                # Envoyer la réponse
                print(f"\n4️⃣  Envoi de la réponse...")
                success, error = send_message(thread_id, ai_response)
                
                if success:
                    print(f"✅✅✅ RÉPONSE ENVOYÉE À {guest_name} ! ✅✅✅")
                    new_messages_found = True
                else:
                    print(f"❌ Erreur envoi: {error}")
                    if "CAPTCHA" in error:
                        print("   ➜ Reconnexion requise: python3 scripts/reconnect_airbnb.py")
                        return
                
        except Exception as e:
            print(f"⚠️  Erreur traitement conversation {thread_id}: {e}")
            continue
    
    if not new_messages_found:
        print("\n✅ Aucun nouveau message nécessitant une réponse")
    
    db.close()

if __name__ == "__main__":
    check_and_reply()


