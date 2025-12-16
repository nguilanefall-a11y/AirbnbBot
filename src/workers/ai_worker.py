"""
Worker IA : génère des réponses et alimente la file d'envoi
- Résilience infinie (ne meurt jamais)
- Nettoyage des ressources Playwright entre itérations
"""
import time
import logging
import traceback
from datetime import datetime
from src.config import settings
from src.db.db import get_db_session
from src.services.ai_responder import generate_response_for_message
from src.services.message_queue import MessageQueue
from sqlalchemy import text

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(settings.LOG_FILE),
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)


def run_ai_worker():
    """
    Boucle principale du worker IA:
    - Cherche les nouveaux messages des invités sans réponse envoyée
    - Génère une réponse IA
    - Alimente la file d'envoi (queue_outbox)
    """
    logger.info("=" * 60)
    logger.info("🚀 Démarrage du worker IA")
    logger.info("=" * 60)
    logger.info(f"   Intervalle: {settings.SEND_WORKER_INTERVAL_SEC}s")
    logger.info("=" * 60)

    while True:
        try:
            db = get_db_session()
            try:
                # Sélectionner les derniers messages des invités sans envoi planifié
                # Hypothèse: table messages avec colonne is_from_guest et conversation_id
                query = text(
                    """
                    SELECT m.id, m.conversation_id, m.body
                    FROM messages m
                    LEFT JOIN queue_outbox q ON q.thread_id = (
                        SELECT external_id FROM conversations c WHERE c.id = m.conversation_id
                    ) AND q.status IN ('pending','failed')
                    WHERE m.is_from_guest = TRUE
                      AND (m.created_at >= NOW() - INTERVAL '2 days')
                      AND q.id IS NULL
                    ORDER BY m.created_at DESC
                    LIMIT 20
                    """
                )
                rows = db.execute(query).fetchall()
            finally:
                db.close()

            if not rows:
                time.sleep(settings.SEND_WORKER_INTERVAL_SEC)
                continue

            for row in rows:
                msg_id, conv_id, body = row
                try:
                    ai_text = generate_response_for_message(body)
                    if not ai_text:
                        continue
                    # Récupérer l'external_id (airbnb_thread_id)
                    db = get_db_session()
                    try:
                        thread_row = db.execute(
                            text("SELECT external_id FROM conversations WHERE id=:cid"),
                            {"cid": conv_id}
                        ).fetchone()
                        if not thread_row:
                            continue
                        thread_external_id = thread_row[0]
                    finally:
                        db.close()

                    MessageQueue.enqueue_send(thread_external_id, ai_text)
                    logger.info(f"🧠 Réponse IA enqueued pour thread {thread_external_id}")
                    time.sleep(1)
                except Exception:
                    logger.error("❌ Erreur génération/enqueue IA")
                    logger.debug(traceback.format_exc())
                    continue

        except Exception as e:
            logger.error(f"❌ Erreur dans le worker IA: {e}")
            logger.debug(traceback.format_exc())
            time.sleep(60)
        finally:
            try:
                from src.playwright.browser_manager import BrowserManager
                bm = BrowserManager()
                bm.close()
            except Exception:
                pass


if __name__ == "__main__":
    run_ai_worker()
