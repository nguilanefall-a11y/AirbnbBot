"""
Service de notification (webhooks, alerts)
"""
import logging
import requests
from typing import Optional, Dict, Any
from src.config import settings

logger = logging.getLogger(__name__)


def notify_admin(message: str, level: str = "info", metadata: Optional[Dict] = None):
    """
    Envoie une notification à l'administrateur
    
    Args:
        message: Message à envoyer
        level: Niveau (info, warning, error)
        metadata: Métadonnées additionnelles
    """
    # Slack webhook
    if settings.SLACK_WEBHOOK_URL:
        try:
            payload = {
                "text": f"[{level.upper()}] {message}",
                "metadata": metadata or {},
            }
            requests.post(settings.SLACK_WEBHOOK_URL, json=payload, timeout=5)
        except Exception as e:
            logger.error(f"❌ Erreur notification Slack: {e}")
    
    # Admin webhook générique
    if settings.ADMIN_WEBHOOK_URL:
        try:
            payload = {
                "message": message,
                "level": level,
                "metadata": metadata or {},
            }
            requests.post(settings.ADMIN_WEBHOOK_URL, json=payload, timeout=5)
        except Exception as e:
            logger.error(f"❌ Erreur notification admin: {e}")
    
    # Log local
    if level == "error":
        logger.error(f"🚨 {message}")
    elif level == "warning":
        logger.warning(f"⚠️ {message}")
    else:
        logger.info(f"ℹ️ {message}")


def notify_captcha_detected():
    """Notifie qu'un CAPTCHA a été détecté"""
    notify_admin(
        "🚨 CAPTCHA détecté sur Airbnb - Action manuelle requise",
        level="error",
        metadata={"action": "captcha_detected"}
    )


def notify_session_expired():
    """Notifie que la session a expiré"""
    notify_admin(
        "🔐 Session Airbnb expirée - Reconnexion requise",
        level="warning",
        metadata={"action": "session_expired"}
    )


def notify_worker_error(worker_name: str, error: str):
    """Notifie une erreur de worker"""
    notify_admin(
        f"❌ Erreur worker {worker_name}: {error}",
        level="error",
        metadata={"worker": worker_name, "error": error}
    )


def notify_new_message(thread_id: str, guest_name: str, message_preview: str):
    """Notifie qu'un nouveau message a été reçu"""
    notify_admin(
        f"📨 Nouveau message de {guest_name}",
        level="info",
        metadata={
            "thread_id": thread_id,
            "guest_name": guest_name,
            "preview": message_preview[:100],
        }
    )



