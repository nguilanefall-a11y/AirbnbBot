#!/usr/bin/env python3
"""
Script pour forcer une synchronisation immédiate des messages Airbnb
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.playwright.scraping_actions import fetch_threads_and_messages
from src.db.db import get_db_session
from sqlalchemy import text
from src.services.ai_responder import generate_response_for_message
from src.services.message_queue import MessageQueue
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def force_sync():
    """Force une synchronisation immédiate"""
    logger.info("🚀 Démarrage synchronisation forcée...")
    
    try:
        # 1. Scraper les messages Airbnb
        logger.info("📡 Scraping des messages Airbnb...")
        scraped_data = fetch_threads_and_messages()
        logger.info(f"✅ {len(scraped_data)} thread(s) trouvé(s)")
        
        if not scraped_data:
            logger.warning("⚠️  Aucun thread trouvé")
            return
        
        # 2. Utiliser la structure existante de la base (conversations au lieu de threads)
        db = get_db_session()
        try:
            # Récupérer la première propriété pour lier les conversations
            result = db.execute(text("SELECT id FROM properties LIMIT 1"))
            property_row = result.fetchone()
            
            if not property_row:
                logger.error("❌ Aucune propriété trouvée dans la base")
                return
            
            property_id = property_row[0]
            logger.info(f"📋 Utilisation propriété: {property_id}")
            
            new_messages = 0
            
            for thread_data in scraped_data:
                airbnb_thread_id = thread_data.get("airbnb_thread_id")
                guest_name = thread_data.get("guest_name", "Voyageur")
                messages_data = thread_data.get("messages", [])
                
                if not airbnb_thread_id:
                    continue
                
                # Vérifier si la conversation existe déjà
                result = db.execute(
                    text("SELECT id FROM conversations WHERE external_id = :external_id AND source = 'airbnb-cohost'"),
                    {"external_id": airbnb_thread_id}
                )
                conversation_row = result.fetchone()
                
                if conversation_row:
                    # Mettre à jour la conversation existante
                    conversation_id = conversation_row[0]
                    db.execute(
                        text("""
                            UPDATE conversations 
                            SET guest_name = :guest_name, last_message_at = NOW()
                            WHERE id = :conversation_id
                        """),
                        {
                            "guest_name": guest_name,
                            "conversation_id": conversation_id,
                        }
                    )
                else:
                    # Créer une nouvelle conversation (pas de ON CONFLICT car pas d'index unique)
                    try:
                        result = db.execute(
                            text("""
                                INSERT INTO conversations (property_id, guest_name, external_id, source, last_message_at)
                                VALUES (:property_id, :guest_name, :external_id, 'airbnb-cohost', NOW())
                                RETURNING id
                            """),
                            {
                                "property_id": property_id,
                                "guest_name": guest_name,
                                "external_id": airbnb_thread_id,
                            }
                        )
                        conversation_row = result.fetchone()
                        if conversation_row:
                            conversation_id = conversation_row[0]
                        else:
                            logger.error(f"❌ Impossible de créer conversation {airbnb_thread_id}")
                            continue
                    except Exception as insert_error:
                        # Si l'insertion échoue, peut-être que la conversation existe déjà
                        # Réessayer de la récupérer
                        result = db.execute(
                            text("SELECT id FROM conversations WHERE external_id = :external_id AND source = 'airbnb-cohost'"),
                            {"external_id": airbnb_thread_id}
                        )
                        conversation_row = result.fetchone()
                        if conversation_row:
                            conversation_id = conversation_row[0]
                        else:
                            logger.error(f"❌ Erreur création conversation {airbnb_thread_id}: {insert_error}")
                            continue
                
                # Traiter les messages
                for msg_data in messages_data:
                    if msg_data.get("direction") != "inbound":
                        continue
                    
                    content = msg_data.get("content", "")
                    external_id = msg_data.get("airbnb_message_id")
                    
                    if not content:
                        continue
                    
                    # Vérifier si le message existe déjà
                    result = db.execute(
                        text("SELECT id FROM messages WHERE external_id = :external_id"),
                        {"external_id": external_id}
                    )
                    existing = result.fetchone()
                    
                    if existing:
                        continue  # Message déjà traité
                    
                    # Créer le message
                    db.execute(
                        text("""
                            INSERT INTO messages (conversation_id, content, is_bot, direction, sender_name, external_id, created_at, metadata)
                            VALUES (:conversation_id, :content, false, 'inbound', :sender_name, :external_id, NOW(), '{}'::jsonb)
                        """),
                        {
                            "conversation_id": conversation_id,
                            "content": content,
                            "sender_name": guest_name,
                            "external_id": external_id,
                        }
                    )
                    
                    new_messages += 1
                    
                    logger.info(f"✅ Nouveau message détecté de {guest_name}")
                    
                    # Générer une réponse IA avec TOUTES les infos disponibles
                    try:
                        from src.config import settings
                        if settings.AI_WEBHOOK_URL:
                            logger.info(f"🤖 Génération réponse IA pour {guest_name} avec contexte complet...")
                            logger.debug(f"   Message: {content[:100]}...")
                            logger.debug(f"   Contexte: property_id={property_id}, conversation_id={conversation_id}, thread_id={airbnb_thread_id}")
                            
                            # Utiliser toutes les informations disponibles
                            ai_response = generate_response_for_message(
                                message_content=content,
                                thread_id=airbnb_thread_id,
                                guest_name=guest_name,
                                property_id=property_id,
                                conversation_id=conversation_id,
                            )
                            
                            if ai_response:
                                # Ajouter à la queue d'envoi
                                MessageQueue.enqueue_send(
                                    thread_id=airbnb_thread_id,
                                    message=ai_response,
                                    metadata={
                                        "auto_reply": True,
                                        "original_message_id": external_id,
                                        "guest_name": guest_name,
                                        "conversation_id": conversation_id,
                                        "property_id": property_id,
                                    }
                                )
                                logger.info(f"✅ Réponse IA générée avec contexte complet pour {guest_name}")
                                logger.debug(f"   Réponse: {ai_response[:150]}...")
                            else:
                                logger.warning(f"⚠️ Réponse IA vide pour {guest_name}")
                    except Exception as ai_error:
                        logger.error(f"❌ Erreur génération réponse IA: {ai_error}")
                        import traceback
                        logger.debug(traceback.format_exc())
                
                db.commit()
            
            logger.info(f"✅ Synchronisation terminée: {new_messages} nouveau(x) message(s)")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Erreur synchronisation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    force_sync()

