"""
Endpoint pour recevoir les messages du worker SYNC et générer des réponses IA
via l'API principale sur localhost:5000
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging
import httpx

from src.db.db import get_db_session
from src.config import settings
from src.services.message_queue import MessageQueue
from sqlalchemy import text

router = APIRouter()
logger = logging.getLogger(__name__)


class AutoRespondRequest(BaseModel):
    """Payload reçu du worker SYNC"""
    conversation_id: str  # Airbnb thread ID
    message: str  # Message reçu du guest
    sender: Optional[str] = None
    property_id: Optional[str] = None
    callback_url: Optional[str] = None


async def call_main_api_for_response(conversation_id: str, message: str, property_id: Optional[str] = None):
    """
    Appelle l'API principale (localhost:5000) pour générer une réponse IA
    """
    try:
        # Chercher la conversation_id interne depuis l'external_id
        db = get_db_session()
        try:
            result = db.execute(
                text("SELECT id FROM conversations WHERE external_id = :external_id AND source = 'airbnb-cohost'"),
                {"external_id": conversation_id}
            )
            conv = result.fetchone()
            internal_conversation_id = conv[0] if conv else conversation_id
        finally:
            db.close()
        
        # Appeler l'API principale pour générer une réponse
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"http://localhost:{settings.API_PORT}/api/messages",
                json={
                    "conversationId": internal_conversation_id,
                    "content": message,
                    "isBot": False,  # Message utilisateur, l'API générera la réponse IA automatiquement
                },
            )
            
            if response.status_code == 201:
                data = response.json()
                bot_message = data.get("botMessage")
                if bot_message:
                    logger.info(f"✅ Réponse IA générée pour conversation {conversation_id}")
                    return bot_message
                else:
                    logger.warning(f"⚠️ Pas de réponse IA dans la réponse de l'API principale")
                    return None
            else:
                logger.error(f"❌ Erreur API principale: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'appel à l'API principale: {e}")
        import traceback
        traceback.print_exc()
        return None


def _get_or_create_thread(external_id: str, guest_name: Optional[str]):
    """Résout l'id interne du thread (threads.id) à partir de airbnb_thread_id.
    Crée un listing et un thread minimal si absent."""
    db = get_db_session()
    try:
        from sqlalchemy import text
        # Chercher thread existant
        row = db.execute(text("SELECT id FROM threads WHERE airbnb_thread_id=:ext"), {"ext": external_id}).fetchone()
        if row:
            return row[0]
        # Assurer un listing existe
        listing_row = db.execute(text("SELECT id FROM listings LIMIT 1")).fetchone()
        if not listing_row:
            db.execute(text("INSERT INTO listings (id, airbnb_listing_id, name, status, created_at, updated_at) VALUES (gen_random_uuid()::text, :airbnb_listing_id, :name, 'active', now(), now())"), {"airbnb_listing_id": f"auto_{external_id}", "name": "Auto Listing"})
            listing_row = db.execute(text("SELECT id FROM listings LIMIT 1")).fetchone()
        listing_id = listing_row[0]
        # Créer nouveau thread
        db.execute(text("INSERT INTO threads (id, airbnb_thread_id, listing_id, guest_name, status, created_at, updated_at) VALUES (gen_random_uuid()::text, :ext, :listing_id, :guest, 'open', now(), now())"), {"ext": external_id, "listing_id": listing_id, "guest": guest_name or 'Guest'})
        new_row = db.execute(text("SELECT id FROM threads WHERE airbnb_thread_id=:ext"), {"ext": external_id}).fetchone()
        db.commit()
        return new_row[0]
    except Exception as e:
        logger.error(f"❌ Impossible de créer/résoudre thread: {e}")
        db.rollback()
        return external_id  # fallback; pourra violer FK si absent
    finally:
        db.close()

@router.post("/auto-respond")
async def auto_respond(request: AutoRespondRequest):
    """
    Endpoint qui reçoit un message du worker SYNC, appelle l'API principale pour générer une réponse,
    et ajoute automatiquement la réponse dans la queue d'envoi
    """
    try:
        logger.info(f"📨 Message reçu pour auto-réponse: conversation {request.conversation_id}")
        
        # Appeler l'API principale pour générer une réponse IA
        bot_response = await call_main_api_for_response(
            conversation_id=request.conversation_id,
            message=request.message,
            property_id=request.property_id,
        )
        
        if not bot_response:
            # Générer une réponse de secours
            bot_response = f"Bonjour {request.sender or ''} ! Merci pour votre message. Je vous répondrai rapidement."
            logger.warning("⚠️ Utilisation d'une réponse de secours")
        
        # Résoudre thread interne (threads.id) pour la FK
        internal_thread_id = _get_or_create_thread(request.conversation_id, request.sender)

        # Ajouter la réponse dans la queue d'envoi avec id interne
        outbox_id = MessageQueue.enqueue_send(
            thread_id=internal_thread_id,
            message=bot_response,
            metadata={
                "ai_reply": True,
                "sender": request.sender,
                "auto_responded": True,
            },
        )
        
        logger.info(f"✅ Réponse IA ajoutée à la queue (outbox_id: {outbox_id})")
        
        # Si un callback_url est fourni, l'appeler aussi (pour compatibilité)
        if request.callback_url:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        request.callback_url,
                        json={
                            "conversation_id": request.conversation_id,
                            "message": bot_response,
                            "sender": request.sender,
                        },
                    )
            except Exception as e:
                logger.warning(f"⚠️ Erreur callback: {e}")
        
        return {
            "success": True,
            "outbox_id": outbox_id,
            "message": "Réponse IA générée et ajoutée à la queue",
            "reply": bot_response,
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur auto_respond: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


