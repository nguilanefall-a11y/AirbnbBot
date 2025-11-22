"""
Worker de synchronisation : récupère les messages Airbnb en continu
- Gestion robuste des erreurs
- Arrêt propre en cas de CAPTCHA
- Logs détaillés
"""
import sys
import time
import logging
import traceback
from datetime import datetime
from src.config import settings
from src.playwright.scraping_actions import fetch_threads_and_messages
from src.playwright.captcha_detector import CaptchaDetected
from src.db.repository import (
    create_or_update_listing, get_listing_by_airbnb_id,
    create_or_update_thread, create_message_if_not_exists,
    get_thread_by_airbnb_id, update_worker_heartbeat,
    get_db_session
)
from src.services.message_queue import MessageQueue
from src.services.ai_responder import generate_response_for_message
from src.services.notifier import notify_admin, notify_captcha_detected, notify_session_expired
from src.db.db import get_db_session

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(settings.LOG_FILE),
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)


def process_scraped_data(scraped_data: list):
    """
    Traite les données scrapées et les stocke en DB
    
    Args:
        scraped_data: Liste des threads scrapés depuis Airbnb
        
    Returns:
        Nombre de nouveaux messages traités
    """
    new_messages_count = 0
    
    db = get_db_session()
    try:
        for thread_data in scraped_data:
            try:
                # Extraire les infos du thread
                airbnb_thread_id = thread_data.get("airbnb_thread_id")
                guest_name = thread_data.get("guest_name", "Voyageur")
                last_message_at = thread_data.get("last_message_at")
                messages = thread_data.get("messages", [])
                
                if not airbnb_thread_id:
                    continue
                
                # Créer ou mettre à jour le listing (on assume un listing par défaut pour l'instant)
                # TODO: Extraire le listing_id depuis les métadonnées du thread
                default_listing_id = "default_listing"
                listing = get_listing_by_airbnb_id(db, default_listing_id)
                if not listing:
                    listing = create_or_update_listing(
                        db, default_listing_id, "Default Listing"
                    )
                
                # Utiliser la structure existante (conversations au lieu de threads)
                from sqlalchemy import text
                
                # Récupérer ou créer la propriété
                prop_result = db.execute(text("SELECT id FROM properties LIMIT 1"))
                prop_row = prop_result.fetchone()
                if not prop_row:
                    logger.error("❌ Aucune propriété trouvée dans la base")
                    continue
                property_id = prop_row[0]
                
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
                            SET guest_name = :guest_name, last_message_at = COALESCE(:last_message_at, last_message_at)
                            WHERE id = :conversation_id
                        """),
                        {
                            "guest_name": guest_name,
                            "last_message_at": last_message_at,
                            "conversation_id": conversation_id,
                        }
                    )
                else:
                    # Créer une nouvelle conversation (pas de ON CONFLICT car pas d'index unique)
                    try:
                        result = db.execute(
                            text("""
                                INSERT INTO conversations (property_id, guest_name, external_id, source, last_message_at)
                                VALUES (:property_id, :guest_name, :external_id, 'airbnb-cohost', COALESCE(:last_message_at, NOW()))
                                RETURNING id
                            """),
                            {
                                "property_id": property_id,
                                "guest_name": guest_name,
                                "external_id": airbnb_thread_id,
                                "last_message_at": last_message_at,
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
                for msg_data in messages:
                    # Seulement les messages inbound (voyageurs)
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
                    
                    # Créer le message dans la structure existante
                    db.execute(
                        text("""
                            INSERT INTO messages (
                                conversation_id, content, is_bot, direction, 
                                sender_name, external_id, created_at, metadata
                            )
                            VALUES (
                                :conversation_id, :content, false, 'inbound',
                                :sender_name, :external_id, COALESCE(:sent_at, NOW()), '{}'::jsonb
                            )
                        """),
                        {
                            "conversation_id": conversation_id,
                            "content": content,
                            "sender_name": guest_name,
                            "external_id": external_id,
                            "sent_at": msg_data.get("sent_at"),
                        }
                    )
                    
                    new_messages_count += 1
                    logger.info(f"✅ Nouveau message détecté de {guest_name}: {content[:50]}...")
                    
                    # Générer la réponse IA avec TOUTES les infos disponibles
                    try:
                        if settings.AI_WEBHOOK_URL:
                            logger.info(f"🤖 Génération réponse IA pour {guest_name} avec contexte complet...")
                            logger.debug(f"   Message: {content[:100]}...")
                            logger.debug(f"   Contexte: property_id={property_id}, conversation_id={conversation_id}, thread_id={airbnb_thread_id}")
                            
                            ai_response = generate_response_for_message(
                                message_content=content,
                                thread_id=airbnb_thread_id,
                                guest_name=guest_name,
                                listing_name=listing.name if listing else None,
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
                        # Continuer même si l'IA échoue
                
                db.commit()
                
            except Exception as e:
                logger.error(f"❌ Erreur traitement thread {thread_data.get('airbnb_thread_id')}: {e}")
                db.rollback()
                continue
    finally:
        db.close()
    
    return new_messages_count


def run_sync_worker():
    """
    Boucle principale du worker de synchronisation
    
    Comportement:
    - Tourne en continu
    - Scrape les messages toutes les SCRAPE_INTERVAL_SEC secondes
    - Gère les erreurs proprement
    - S'arrête proprement en cas de CAPTCHA
    """
    logger.info("=" * 60)
    logger.info("🚀 Démarrage du worker de synchronisation")
    logger.info("=" * 60)
    logger.info(f"   Intervalle: {settings.SCRAPE_INTERVAL_SEC}s")
    logger.info(f"   Mode headless: {settings.AIRBNB_HEADLESS}")
    logger.info("=" * 60)
    
    consecutive_errors = 0
    max_consecutive_errors = 5
    last_successful_sync = None
    
    while True:
        try:
            # Mettre à jour le heartbeat
            db = get_db_session()
            try:
                update_worker_heartbeat(db, "sync_worker", status="running", metadata={
                    "last_successful_sync": last_successful_sync.isoformat() if last_successful_sync else None,
                    "consecutive_errors": consecutive_errors,
                })
            finally:
                db.close()
            
            # Scraper les messages
            logger.info("🔄 Début de la synchronisation...")
            scraped_data = fetch_threads_and_messages()
            
            if scraped_data:
                # Traiter les données
                new_messages = process_scraped_data(scraped_data)
                last_successful_sync = datetime.utcnow()
                logger.info(f"✅ Synchronisation terminée: {len(scraped_data)} thread(s), {new_messages} nouveau(x) message(s)")
                consecutive_errors = 0
            else:
                logger.warning("⚠️ Aucune donnée récupérée (peut-être normal si aucun message)")
                consecutive_errors = 0  # Pas d'erreur si pas de données
            
            # Attendre avant la prochaine synchronisation
            logger.info(f"⏳ Prochaine synchronisation dans {settings.SCRAPE_INTERVAL_SEC}s...")
            time.sleep(settings.SCRAPE_INTERVAL_SEC)
            
        except CaptchaDetected as captcha_error:
            # CAPTCHA détecté - arrêt propre
            logger.error("=" * 60)
            logger.error("🚨 CAPTCHA DÉTECTÉ - ARRÊT PROPRE DU WORKER")
            logger.error("=" * 60)
            logger.error(f"   Erreur: {captcha_error}")
            logger.error("   Action requise: Reconnexion manuelle")
            logger.error("   Script: python3 scripts/reconnect_airbnb.py")
            logger.error("=" * 60)
            
            # Mettre à jour le heartbeat
            db = get_db_session()
            try:
                update_worker_heartbeat(db, "sync_worker", status="stopped", metadata={
                    "reason": "captcha_detected",
                    "last_error": str(captcha_error),
                })
            finally:
                db.close()
            
            # Notifier l'admin
            notify_captcha_detected()
            
            # Arrêter le worker proprement
            logger.info("🛑 Arrêt du worker")
            break
            
        except KeyboardInterrupt:
            logger.info("🛑 Arrêt du worker demandé (Ctrl+C)")
            break
            
        except Exception as e:
            consecutive_errors += 1
            error_msg = str(e)
            logger.error(f"❌ Erreur dans le worker de synchronisation (tentative {consecutive_errors}): {error_msg}")
            logger.debug(f"   Traceback: {traceback.format_exc()}")
            
            # Vérifier le type d'erreur
            if "session" in error_msg.lower() or "login" in error_msg.lower():
                logger.error("   ➜ Session expirée détectée")
                notify_session_expired()
            elif "timeout" in error_msg.lower():
                logger.warning("   ➜ Timeout détecté (peut-être temporaire)")
            
            # Notifier après plusieurs erreurs consécutives
            if consecutive_errors >= max_consecutive_errors:
                logger.error(f"🚨 {consecutive_errors} erreurs consécutives - notification admin")
                notify_admin(
                    f"🚨 Worker sync en erreur ({consecutive_errors} fois): {error_msg}",
                    level="error",
                    metadata={
                        "worker": "sync_worker",
                        "consecutive_errors": consecutive_errors,
                        "last_error": error_msg,
                    }
                )
            
            # Attendre plus longtemps en cas d'erreur (backoff exponentiel)
            backoff_delay = min(settings.RETRY_DELAY_SEC * consecutive_errors, 600)  # Max 10 minutes
            logger.info(f"⏳ Attente {backoff_delay}s avant de réessayer...")
            time.sleep(backoff_delay)


if __name__ == "__main__":
    try:
        run_sync_worker()
    except Exception as e:
        logger.critical(f"💥 Erreur fatale dans le worker: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
