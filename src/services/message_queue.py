"""
Service de queue pour gérer l'envoi et la réception des messages
"""
import json
import logging
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
from src.config import settings
from src.db.repository import (
    create_outbox_item, get_pending_outbox_items, update_outbox_status,
    get_failed_outbox_items
)
from src.db.models import Outbox
from src.db.db import get_db

logger = logging.getLogger(__name__)


class MessageQueue:
    """Queue de messages basée sur PostgreSQL (pas besoin de Redis)"""
    
    @staticmethod
    def enqueue_send(thread_id: str, message: str, metadata: Optional[Dict] = None) -> str:
        """Ajoute un message à la queue d'envoi"""
        from src.db.db import get_db_session
        db = get_db_session()
        try:
            payload = {
                "thread_id": thread_id,
                "message": message,
                "metadata": metadata or {},
                "created_at": datetime.utcnow().isoformat(),
            }
            item = create_outbox_item(db, thread_id, payload, status="pending")
            logger.info(f"📥 Message ajouté à la queue: {item.id}")
            return item.id
        finally:
            db.close()
    
    @staticmethod
    def dequeue_send(limit: int = 10) -> List[Dict[str, Any]]:
        """Récupère les messages pending de la queue"""
        from src.db.db import get_db_session
        db = get_db_session()
        try:
            items = get_pending_outbox_items(db, limit=limit)
            results = []
            
            for item in items:
                try:
                    payload = json.loads(item.payload_json)
                    results.append({
                        "id": item.id,
                        "thread_id": item.thread_id,
                        "message": payload["message"],
                        "metadata": payload.get("metadata", {}),
                        "retry_count": item.retry_count,
                    })
                except Exception as e:
                    logger.error(f"❌ Erreur parsing payload {item.id}: {e}")
                    update_outbox_status(db, item.id, "failed", error_message=str(e))
            
            return results
        finally:
            db.close()
    
    @staticmethod
    def mark_sent(outbox_id: str):
        """Marque un message comme envoyé"""
        from src.db.db import get_db_session
        db = get_db_session()
        try:
            update_outbox_status(db, outbox_id, "sent")
            logger.info(f"✅ Message {outbox_id} marqué comme envoyé")
        finally:
            db.close()
    
    @staticmethod
    def mark_failed(outbox_id: str, error_message: str):
        """Marque un message comme échoué"""
        from src.db.db import get_db_session
        db = get_db_session()
        try:
            update_outbox_status(db, outbox_id, "failed", error_message=error_message)
            logger.warning(f"❌ Message {outbox_id} marqué comme échoué: {error_message}")
        finally:
            db.close()
    
    @staticmethod
    def get_retryable_failed(max_retry: int = 5) -> List[Dict[str, Any]]:
        """Récupère les messages failed qui peuvent être retentés"""
        from src.db.db import get_db_session
        db = get_db_session()
        try:
            items = get_failed_outbox_items(db, max_retry=max_retry)
            results = []
            
            for item in items:
                try:
                    payload = json.loads(item.payload_json)
                    results.append({
                        "id": item.id,
                        "thread_id": item.thread_id,
                        "message": payload["message"],
                        "metadata": payload.get("metadata", {}),
                        "retry_count": item.retry_count,
                    })
                except Exception as e:
                    logger.error(f"❌ Erreur parsing payload {item.id}: {e}")
            
            return results
        finally:
            db.close()
    
    @staticmethod
    def requeue_failed(outbox_id: str):
        """Remet un message failed dans la queue (pour retry)"""
        from src.db.db import get_db_session
        from sqlalchemy.orm import Session
        db = get_db_session()
        try:
            item = db.query(Outbox).filter(Outbox.id == outbox_id).first()
            if item and item.retry_count < settings.MAX_RETRY_SEND:
                update_outbox_status(db, outbox_id, "pending")
                logger.info(f"🔄 Message {outbox_id} remis en queue pour retry")
                return True
            return False
        finally:
            db.close()


# Fonctions utilitaires pour compatibilité
def enqueue_send(thread_id: str, message: str, metadata: Optional[Dict] = None) -> str:
    """Wrapper pour enqueue_send"""
    return MessageQueue.enqueue_send(thread_id, message, metadata)


def lock_job(outbox_id: str):
    """Context manager pour verrouiller un job (éviter double traitement)"""
    # Simple implementation - peut être amélioré avec un lock DB
    class JobLock:
        def __init__(self, job_id: str):
            self.job_id = job_id
        
        def __enter__(self):
            with get_db() as db:
                update_outbox_status(db, self.job_id, "processing")
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            pass
    
    return JobLock(outbox_id)

