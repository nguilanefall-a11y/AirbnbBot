"""
Routes pour les messages
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from src.db.repository import (
    get_messages_by_thread, get_thread_by_airbnb_id,
    get_all_threads, get_new_inbound_messages
)
from src.services.message_queue import MessageQueue
from src.db.db import get_db_session

router = APIRouter()


class MessageResponse(BaseModel):
    id: str
    thread_id: str
    direction: str
    content: str
    sent_at: datetime
    sender_name: Optional[str] = None
    created_at: datetime


class ThreadResponse(BaseModel):
    id: str
    airbnb_thread_id: str
    guest_name: Optional[str]
    last_message_at: Optional[datetime]
    status: str
    created_at: datetime


class SendMessageRequest(BaseModel):
    thread_id: str  # airbnb_thread_id
    message: str
    metadata: Optional[dict] = None


@router.get("/threads", response_model=List[ThreadResponse])
def get_threads(limit: Optional[int] = 100):
    """Récupère tous les threads"""
    try:
        db = get_db_session()
        try:
            threads = get_all_threads(db, limit=limit)
            return [
                ThreadResponse(
                    id=t.id,
                    airbnb_thread_id=t.airbnb_thread_id,
                    guest_name=t.guest_name,
                    last_message_at=t.last_message_at,
                    status=t.status,
                    created_at=t.created_at,
                )
                for t in threads
            ]
        finally:
            db.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/threads/{thread_id}/messages", response_model=List[MessageResponse])
def get_thread_messages(thread_id: str, limit: Optional[int] = 100):
    """Récupère les messages d'un thread"""
    try:
        db = get_db_session()
        try:
            # Chercher le thread par airbnb_thread_id
            thread = get_thread_by_airbnb_id(db, thread_id)
            if not thread:
                raise HTTPException(status_code=404, detail="Thread non trouvé")
            
            messages = get_messages_by_thread(db, thread.id, limit=limit)
            return [
                MessageResponse(
                    id=m.id,
                    thread_id=m.thread_id,
                    direction=m.direction,
                    content=m.content,
                    sent_at=m.sent_at,
                    sender_name=m.sender_name,
                    created_at=m.created_at,
                )
                for m in messages
            ]
        finally:
            db.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/new", response_model=List[MessageResponse])
def get_new_messages(since: Optional[datetime] = None):
    """Récupère les nouveaux messages entrants"""
    try:
        db = get_db_session()
        try:
            messages = get_new_inbound_messages(db, since=since)
            return [
                MessageResponse(
                    id=m.id,
                    thread_id=m.thread_id,
                    direction=m.direction,
                    content=m.content,
                    sent_at=m.sent_at,
                    sender_name=m.sender_name,
                    created_at=m.created_at,
                )
                for m in messages
            ]
        finally:
            db.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send")
def send_message(request: SendMessageRequest):
    """Envoie un message (ajoute à la queue)"""
    try:
        outbox_id = MessageQueue.enqueue_send(
            thread_id=request.thread_id,
            message=request.message,
            metadata=request.metadata,
        )
        return {
            "success": True,
            "outbox_id": outbox_id,
            "message": "Message ajouté à la queue d'envoi",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-reply")
def ai_reply(request: SendMessageRequest):
    """
    Endpoint pour que l'IA envoie une réponse
    (utilisé par le service IA externe)
    """
    try:
        outbox_id = MessageQueue.enqueue_send(
            thread_id=request.thread_id,
            message=request.message,
            metadata={**(request.metadata or {}), "ai_reply": True},
        )
        return {
            "success": True,
            "outbox_id": outbox_id,
            "message": "Réponse IA ajoutée à la queue",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

