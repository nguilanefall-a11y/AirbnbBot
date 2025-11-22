"""
Repository pour les opérations CRUD sur la base de données
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from datetime import datetime
from typing import List, Optional, Dict, Any
import json
import logging

from src.db.models import Listing, Thread, Message, Outbox, WorkerHeartbeat
from src.db.db import get_db_session

logger = logging.getLogger(__name__)


# ============ LISTINGS ============

def create_or_update_listing(
    db: Session,
    airbnb_listing_id: str,
    name: str,
    status: str = "active"
) -> Listing:
    """Crée ou met à jour un listing"""
    listing = db.query(Listing).filter(
        Listing.airbnb_listing_id == airbnb_listing_id
    ).first()
    
    if listing:
        listing.name = name
        listing.status = status
        listing.updated_at = datetime.utcnow()
    else:
        listing = Listing(
            airbnb_listing_id=airbnb_listing_id,
            name=name,
            status=status
        )
        db.add(listing)
    
    db.commit()
    db.refresh(listing)
    return listing


def get_listing_by_airbnb_id(db: Session, airbnb_listing_id: str) -> Optional[Listing]:
    """Récupère un listing par son ID Airbnb"""
    return db.query(Listing).filter(
        Listing.airbnb_listing_id == airbnb_listing_id
    ).first()


def get_all_active_listings(db: Session) -> List[Listing]:
    """Récupère tous les listings actifs"""
    return db.query(Listing).filter(Listing.status == "active").all()


# ============ THREADS ============

def create_or_update_thread(
    db: Session,
    airbnb_thread_id: str,
    listing_id: str,
    guest_name: Optional[str] = None,
    guest_email: Optional[str] = None,
    last_message_at: Optional[datetime] = None,
    metadata: Optional[Dict] = None
) -> Thread:
    """Crée ou met à jour un thread"""
    thread = db.query(Thread).filter(
        Thread.airbnb_thread_id == airbnb_thread_id
    ).first()
    
    if thread:
        if guest_name:
            thread.guest_name = guest_name
        if guest_email:
            thread.guest_email = guest_email
        if last_message_at:
            thread.last_message_at = last_message_at
        if metadata:
            thread.thread_metadata = metadata
        thread.last_scraped_at = datetime.utcnow()
        thread.updated_at = datetime.utcnow()
    else:
        thread = Thread(
            airbnb_thread_id=airbnb_thread_id,
            listing_id=listing_id,
            guest_name=guest_name,
            guest_email=guest_email,
            last_message_at=last_message_at,
            thread_metadata=metadata or {}
        )
        db.add(thread)
    
    db.commit()
    db.refresh(thread)
    return thread


def get_thread_by_airbnb_id(db: Session, airbnb_thread_id: str) -> Optional[Thread]:
    """Récupère un thread par son ID Airbnb"""
    return db.query(Thread).filter(
        Thread.airbnb_thread_id == airbnb_thread_id
    ).first()


def get_threads_by_listing(db: Session, listing_id: str) -> List[Thread]:
    """Récupère tous les threads d'un listing"""
    return db.query(Thread).filter(Thread.listing_id == listing_id).all()


def get_all_threads(db: Session, limit: Optional[int] = None) -> List[Thread]:
    """Récupère tous les threads"""
    query = db.query(Thread).order_by(desc(Thread.last_message_at))
    if limit:
        query = query.limit(limit)
    return query.all()


# ============ MESSAGES ============

def create_message_if_not_exists(
    db: Session,
    thread_id: str,
    direction: str,
    content: str,
    sent_at: datetime,
    airbnb_message_id: Optional[str] = None,
    sender_name: Optional[str] = None,
    metadata: Optional[Dict] = None
) -> Optional[Message]:
    """Crée un message s'il n'existe pas déjà (basé sur airbnb_message_id)"""
    if airbnb_message_id:
        existing = db.query(Message).filter(
            Message.airbnb_message_id == airbnb_message_id
        ).first()
        if existing:
            return None  # Message déjà existant
    
    message = Message(
        thread_id=thread_id,
        direction=direction,
        content=content,
        sent_at=sent_at,
        airbnb_message_id=airbnb_message_id,
        sender_name=sender_name,
        message_metadata=metadata or {}
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_messages_by_thread(
    db: Session,
    thread_id: str,
    limit: Optional[int] = None
) -> List[Message]:
    """Récupère tous les messages d'un thread"""
    query = db.query(Message).filter(
        Message.thread_id == thread_id
    ).order_by(Message.sent_at)
    
    if limit:
        query = query.limit(limit)
    
    return query.all()


def get_new_inbound_messages(
    db: Session,
    since: Optional[datetime] = None
) -> List[Message]:
    """Récupère les nouveaux messages entrants depuis une date"""
    query = db.query(Message).filter(
        Message.direction == "inbound"
    )
    
    if since:
        query = query.filter(Message.sent_at >= since)
    
    return query.order_by(desc(Message.sent_at)).all()


# ============ OUTBOX (Queue) ============

def create_outbox_item(
    db: Session,
    thread_id: str,
    payload: Dict[str, Any],
    status: str = "pending"
) -> Outbox:
    """Crée un item dans la queue outbox"""
    item = Outbox(
        thread_id=thread_id,
        payload_json=json.dumps(payload),
        status=status
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_pending_outbox_items(db: Session, limit: int = 10) -> List[Outbox]:
    """Récupère les items pending de la queue"""
    return db.query(Outbox).filter(
        Outbox.status == "pending"
    ).order_by(Outbox.created_at).limit(limit).all()


def update_outbox_status(
    db: Session,
    outbox_id: str,
    status: str,
    error_message: Optional[str] = None
) -> Optional[Outbox]:
    """Met à jour le statut d'un item outbox"""
    item = db.query(Outbox).filter(Outbox.id == outbox_id).first()
    if not item:
        return None
    
    item.status = status
    item.updated_at = datetime.utcnow()
    
    if status == "sent":
        item.processed_at = datetime.utcnow()
    elif status == "failed":
        item.retry_count += 1
        if error_message:
            item.error_message = error_message
    
    db.commit()
    db.refresh(item)
    return item


def get_failed_outbox_items(db: Session, max_retry: int = 5) -> List[Outbox]:
    """Récupère les items failed qui peuvent être retentés"""
    return db.query(Outbox).filter(
        and_(
            Outbox.status == "failed",
            Outbox.retry_count < max_retry
        )
    ).order_by(Outbox.created_at).all()


# ============ WORKER HEARTBEAT ============

def update_worker_heartbeat(
    db: Session,
    worker_name: str,
    status: str = "running",
    metadata: Optional[Dict] = None
) -> WorkerHeartbeat:
    """Met à jour le heartbeat d'un worker"""
    heartbeat = db.query(WorkerHeartbeat).filter(
        WorkerHeartbeat.worker_name == worker_name
    ).first()
    
    if heartbeat:
        heartbeat.last_heartbeat = datetime.utcnow()
        heartbeat.status = status
        if metadata:
            heartbeat.worker_metadata = metadata
    else:
        heartbeat = WorkerHeartbeat(
            worker_name=worker_name,
            status=status,
            worker_metadata=metadata or {}
        )
        db.add(heartbeat)
    
    db.commit()
    db.refresh(heartbeat)
    return heartbeat


def get_worker_heartbeats(db: Session) -> List[WorkerHeartbeat]:
    """Récupère tous les heartbeats des workers"""
    return db.query(WorkerHeartbeat).all()

