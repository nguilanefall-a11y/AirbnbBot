"""
Endpoint webhook pour recevoir les réponses de l'IA
Quand l'IA génère une réponse, elle appelle cet endpoint qui ajoute automatiquement le message dans send_queue
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import logging
import json

from src.db.db import get_db_session
from src.services.message_queue import MessageQueue
from sqlalchemy import text

router = APIRouter()
logger = logging.getLogger(__name__)


class AIResponseRequest(BaseModel):
    """Payload reçu de l'IA"""
    conversation_id: str  # Airbnb thread ID
    message: str  # Message de réponse généré par l'IA
    sender: Optional[str] = None  # Nom du sender (guest)
    metadata: Optional[dict] = None


@router.post("/ai/webhook")
async def ai_webhook(request: AIResponseRequest, authorization: Optional[str] = Header(None)):
    """
    Webhook pour recevoir les réponses de l'IA
    
    Quand l'IA génère une réponse, elle appelle cet endpoint.
    Le message est automatiquement ajouté dans send_queue pour être envoyé par le worker SEND.
    """
    try:
        logger.info(f"📨 Réponse IA reçue pour conversation {request.conversation_id}")
        
        # Trouver la conversation en DB pour récupérer le thread_id (external_id)
        db = get_db_session()
        try:
            # Chercher la conversation par external_id (thread ID Airbnb)
            result = db.execute(
                text("SELECT id, external_id FROM conversations WHERE external_id = :external_id AND source = 'airbnb-cohost'"),
                {"external_id": request.conversation_id}
            )
            conv = result.fetchone()
            
            if not conv:
                # Créer la conversation si elle n'existe pas
                import uuid
                conv_id = str(uuid.uuid4())
                db.execute(
                    text("""
                    INSERT INTO conversations (id, external_id, source, guest_name, created_at, updated_at)
                    VALUES (:id, :external_id, 'airbnb-cohost', :guest_name, NOW(), NOW())
                    """),
                    {
                        "id": conv_id,
                        "external_id": request.conversation_id,
                        "guest_name": request.sender or "Guest"
                    }
                )
                db.commit()
                thread_id = request.conversation_id
            else:
                thread_id = conv[1]  # external_id (thread ID)
            
        finally:
            db.close()
        
        # Ajouter le message dans la queue d'envoi
        metadata = request.metadata or {}
        metadata["ai_reply"] = True
        metadata["sender"] = request.sender
        
        outbox_id = MessageQueue.enqueue_send(
            thread_id=thread_id,
            message=request.message,
            metadata=metadata,
        )
        
        logger.info(f"✅ Réponse IA ajoutée à la queue (outbox_id: {outbox_id})")
        
        return {
            "success": True,
            "outbox_id": outbox_id,
            "message": "Réponse IA ajoutée à la queue d'envoi",
            "thread_id": thread_id,
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur webhook IA: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/webhook-simple")
async def ai_webhook_simple(body: dict):
    """
    Version simplifiée du webhook (sans validation stricte)
    Accepte n'importe quel JSON avec conversation_id et message
    """
    try:
        conversation_id = body.get("conversation_id") or body.get("conversationId") or body.get("thread_id")
        message = body.get("message") or body.get("content") or body.get("reply")
        
        if not conversation_id or not message:
            raise HTTPException(status_code=400, detail="conversation_id et message requis")
        
        # Créer la requête et appeler le webhook principal
        request = AIResponseRequest(
            conversation_id=str(conversation_id),
            message=str(message),
            sender=body.get("sender"),
            metadata=body.get("metadata"),
        )
        
        return await ai_webhook(request)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur webhook simple: {e}")
        raise HTTPException(status_code=500, detail=str(e))

