"""
Worker d'envoi : envoie les messages en queue via Playwright
- Interactions humaines pour un comportement naturel
- Gestion robuste des erreurs
- Arrêt propre en cas de CAPTCHA
"""
import sys
import time
import logging
import traceback
from datetime import datetime
from src.config import settings
from src.playwright.send_actions import send_message
from src.playwright.captcha_detector import CaptchaDetected
from src.db.repository import (
    get_pending_outbox_items, update_outbox_status,
    get_failed_outbox_items, update_worker_heartbeat,
    get_thread_by_airbnb_id
)
from src.services.message_queue import MessageQueue, lock_job
from src.services.notifier import notify_admin, notify_worker_error, notify_captcha_detected
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


def process_outbox_item(item_data: dict):
    """
    Traite un item de la queue outbox
    
    Args:
        item_data: Données de l'item outbox
        
    Returns:
        True si envoyé avec succès, False sinon
    """
    outbox_id = item_data["id"]
    thread_id = item_data["thread_id"]
    message = item_data["message"]
    retry_count = item_data.get("retry_count", 0)
    
    logger.info(f"📤 Envoi message {outbox_id} vers thread {thread_id} (retry: {retry_count})")
    
    # Vérifier que le thread existe (optionnel, juste pour validation)
    db = get_db_session()
    try:
        # Utiliser la structure existante (conversations)
        from sqlalchemy import text
        result = db.execute(
            text("SELECT id FROM conversations WHERE external_id = :external_id AND source = 'airbnb-cohost'"),
            {"external_id": thread_id}
        )
        conversation = result.fetchone()
        if not conversation:
            logger.warning(f"⚠️ Conversation {thread_id} non trouvée en DB (peut-être normal)")
    finally:
        db.close()
    
    # Envoyer le message via Playwright
    try:
        success, error = send_message(thread_id, message)
        
        if success:
            MessageQueue.mark_sent(outbox_id)
            logger.info(f"✅ Message {outbox_id} envoyé avec succès")
            return True
        else:
            # Marquer comme failed si on a atteint le max de retry
            if retry_count >= settings.MAX_RETRY_SEND:
                MessageQueue.mark_failed(outbox_id, f"Max retry atteint: {error}")
                logger.error(f"❌ Message {outbox_id} échoué définitivement après {retry_count} tentatives")
                notify_admin(
                    f"❌ Message {outbox_id} échoué définitivement: {error}",
                    level="error",
                    metadata={
                        "outbox_id": outbox_id,
                        "thread_id": thread_id,
                        "retry_count": retry_count,
                        "error": error,
                    }
                )
            else:
                MessageQueue.mark_failed(outbox_id, error)
                logger.warning(f"⚠️ Message {outbox_id} échoué (retry {retry_count + 1}/{settings.MAX_RETRY_SEND}): {error}")
            
            return False
            
    except CaptchaDetected as captcha_error:
        # CAPTCHA détecté - marquer comme failed et arrêter le worker
        MessageQueue.mark_failed(outbox_id, f"CAPTCHA détecté: {str(captcha_error)}")
        logger.error(f"🚨 CAPTCHA détecté lors de l'envoi - arrêt propre")
        raise  # Remonter pour arrêter le worker
        
    except Exception as e:
        error_msg = f"Erreur inattendue: {str(e)}"
        logger.error(f"❌ {error_msg}\n{traceback.format_exc()}")
        MessageQueue.mark_failed(outbox_id, error_msg)
        return False


def run_send_worker():
    """
    Boucle principale du worker d'envoi
    
    Comportement:
    - Tourne en continu
    - Lit la queue toutes les SEND_WORKER_INTERVAL_SEC secondes
    - Envoie avec interactions humaines
    - S'arrête proprement en cas de CAPTCHA
    """
    logger.info("=" * 60)
    logger.info("🚀 Démarrage du worker d'envoi")
    logger.info("=" * 60)
    logger.info(f"   Intervalle: {settings.SEND_WORKER_INTERVAL_SEC}s")
    logger.info(f"   Max retry: {settings.MAX_RETRY_SEND}")
    logger.info(f"   Mode headless: {settings.AIRBNB_HEADLESS}")
    logger.info("=" * 60)
    
    consecutive_errors = 0
    max_consecutive_errors = 5
    messages_sent_count = 0
    messages_failed_count = 0
    
    # Boucle de résilience infinie: toujours vivante, redémarre après crash
    while True:
        try:
            # Mettre à jour le heartbeat
            db = get_db_session()
            try:
                update_worker_heartbeat(db, "send_worker", status="running", metadata={
                    "messages_sent": messages_sent_count,
                    "messages_failed": messages_failed_count,
                    "consecutive_errors": consecutive_errors,
                })
            finally:
                db.close()
            
            # ✅ OPTIMISATION: Vérifier AVANT d'ouvrir le navigateur
            # Ne lance Playwright QUE s'il y a du travail à faire
            db = get_db_session()
            try:
                from sqlalchemy import text
                count_result = db.execute(
                    text("SELECT COUNT(*) FROM queue_outbox WHERE status IN ('pending', 'failed') AND retry_count < :max_retry"),
            # OPTIMISATION: Check DB before launching Playwright
            pending_items_check = MessageQueue.dequeue_send(limit=1)
            if not pending_items_check:
                print("💤 Rien à envoyer...")
                time.sleep(15)
                continue
                    {"max_retry": settings.MAX_RETRY_SEND}
                )
                pending_count = count_result.scalar()
            finally:
                db.close()
            
            if pending_count == 0:
                logger.info("💤 Aucun message à envoyer, attente...")
                time.sleep(settings.SEND_WORKER_INTERVAL_SEC)
                consecutive_errors = 0
                continue
            
            logger.info(f"📋 {pending_count} message(s) en attente - démarrage navigateur...")
            
            # Récupérer les messages pending
            pending_items = MessageQueue.dequeue_send(limit=10)
            
            if pending_items:
                logger.info(f"📋 {len(pending_items)} message(s) à envoyer")
                
                for item in pending_items:
                    try:
                        # Verrouiller le job pour éviter double traitement
                        with lock_job(item["id"]):
                            success = process_outbox_item(item)
                            
                            if success:
                                messages_sent_count += 1
                            else:
                                messages_failed_count += 1
                        
                        # Délai entre les messages (interactions humaines)
                        time.sleep(settings.SEND_WORKER_INTERVAL_SEC)
                        
                    except CaptchaDetected:
                        # CAPTCHA détecté - arrêter proprement
                        raise
                    except Exception as e:
                        logger.error(f"❌ Erreur traitement item {item.get('id')}: {e}")
                        messages_failed_count += 1
                        continue
                
                consecutive_errors = 0
            else:
                # Aucun message pending, vérifier les failed pour retry
                failed_items = MessageQueue.get_retryable_failed(max_retry=settings.MAX_RETRY_SEND)
                
                if failed_items:
                    logger.info(f"🔄 {len(failed_items)} message(s) failed à retenter")
                    for item in failed_items:
                        # Remettre en queue après délai
                        MessageQueue.requeue_failed(item["id"])
            
            # Launch Playwright only if work exists
            from src.playwright.browser_manager import BrowserManager
            bm = BrowserManager()
            context = bm.start()
            page = context.new_page()
            page.goto("https://airbnb.com")
            time.sleep(2)
            # Check for login redirect (cookie/session expired)
            final_url = page.url
            if "airbnb.com/login" in final_url:
                print("\033[91m🚨 COOKIES EXPIRÉS - REFAIRE L'AUTH\033[0m")
                time.sleep(10)
                bm.close()
                return
            # Visual debug: keep browser open 10s before closing on error
            try:
                # ...existing code for sending messages...
                for item in pending_items:
                    try:
                        with lock_job(item["id"]):
                            success = process_outbox_item(item)
                            if success:
                                messages_sent_count += 1
                            else:
                                messages_failed_count += 1
                        time.sleep(settings.SEND_WORKER_INTERVAL_SEC)
                    except CaptchaDetected:
                        time.sleep(10)
                        raise
                    except Exception as e:
                        logger.error(f"❌ Erreur traitement item {item.get('id')}: {e}")
                        time.sleep(10)
                        messages_failed_count += 1
                        continue
                consecutive_errors = 0
            finally:
                bm.close()
            # Attendre avant la prochaine itération
            time.sleep(settings.SEND_WORKER_INTERVAL_SEC)
            
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
                update_worker_heartbeat(db, "send_worker", status="stopped", metadata={
                    "reason": "captcha_detected",
                    "last_error": str(captcha_error),
                    "messages_sent": messages_sent_count,
                })
            finally:
                db.close()
            
            # Notifier l'admin
            notify_captcha_detected()
            
            # Arrêter le worker proprement
            logger.info("🛑 Arrêt du worker")
            # Au lieu d'arrêter définitivement, attendre et reprendre pour rester immortel
            time.sleep(60)
            continue
            
        except KeyboardInterrupt:
            logger.info("🛑 Arrêt du worker demandé (Ctrl+C)")
            break
            
        except Exception as e:
            consecutive_errors += 1
            error_msg = str(e)
            logger.error(f"❌ Erreur dans le worker d'envoi (tentative {consecutive_errors}): {error_msg}")
            logger.debug(f"   Traceback: {traceback.format_exc()}")
            
            notify_worker_error("send_worker", error_msg)
            
            if consecutive_errors >= max_consecutive_errors:
                logger.error(f"🚨 {consecutive_errors} erreurs consécutives - notification admin")
                notify_admin(
                    f"🚨 Worker send en erreur ({consecutive_errors} fois): {error_msg}",
                    level="error",
                    metadata={
                        "worker": "send_worker",
                        "consecutive_errors": consecutive_errors,
                        "last_error": error_msg,
                    }
                )
            
            # Attendre plus longtemps en cas d'erreur (backoff exponentiel)
            backoff_delay = min(settings.RETRY_DELAY_SEC * consecutive_errors, 600)  # Max 10 minutes
            logger.info(f"⏳ Attente {backoff_delay}s avant de réessayer...")
            time.sleep(backoff_delay)

        finally:
            # Gestionnaire de ressources: s'assurer de la fermeture du navigateur entre itérations
            try:
                from src.playwright.browser_manager import BrowserManager
                bm = BrowserManager()
                bm.close()
            except Exception:
                pass


if __name__ == "__main__":
    try:
        run_send_worker()
    except Exception as e:
        logger.critical(f"💥 Erreur fatale dans le worker: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
