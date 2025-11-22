"""
Modèles SQLAlchemy pour la base de données
"""
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, DateTime, ForeignKey, JSON, Index
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

Base = declarative_base()


def generate_id():
    return str(uuid.uuid4())


class Listing(Base):
    __tablename__ = "listings"
    
    id = Column(String, primary_key=True, default=generate_id)
    airbnb_listing_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    status = Column(String, default="active")  # active, inactive, archived
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    threads = relationship("Thread", back_populates="listing", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Listing(id={self.id}, airbnb_listing_id={self.airbnb_listing_id}, name={self.name})>"


class Thread(Base):
    __tablename__ = "threads"
    
    id = Column(String, primary_key=True, default=generate_id)
    airbnb_thread_id = Column(String, unique=True, nullable=False, index=True)
    listing_id = Column(String, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    guest_name = Column(String)
    guest_email = Column(String, nullable=True)
    last_message_at = Column(DateTime, nullable=True)
    last_scraped_at = Column(DateTime, default=func.now())
    status = Column(String, default="open")  # open, closed, archived
    thread_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    listing = relationship("Listing", back_populates="threads")
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")
    outbox_items = relationship("Outbox", back_populates="thread", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_thread_listing", "listing_id"),
        Index("idx_thread_airbnb_id", "airbnb_thread_id"),
    )
    
    def __repr__(self):
        return f"<Thread(id={self.id}, airbnb_thread_id={self.airbnb_thread_id}, guest={self.guest_name})>"


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=generate_id)
    thread_id = Column(String, ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True)
    direction = Column(String, nullable=False)  # inbound, outbound
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, nullable=False)
    airbnb_message_id = Column(String, unique=True, nullable=True, index=True)
    sender_name = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    message_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    thread = relationship("Thread", back_populates="messages")
    
    __table_args__ = (
        Index("idx_message_thread", "thread_id"),
        Index("idx_message_airbnb_id", "airbnb_message_id"),
        Index("idx_message_sent_at", "sent_at"),
    )
    
    def __repr__(self):
        return f"<Message(id={self.id}, direction={self.direction}, content={self.content[:50]}...)>"


class Outbox(Base):
    __tablename__ = "queue_outbox"
    
    id = Column(String, primary_key=True, default=generate_id)
    thread_id = Column(String, ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True)
    payload_json = Column(Text, nullable=False)
    status = Column(String, default="pending", index=True)  # pending, processing, sent, failed
    retry_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    thread = relationship("Thread", back_populates="outbox_items")
    
    __table_args__ = (
        Index("idx_outbox_status", "status"),
        Index("idx_outbox_thread", "thread_id"),
        Index("idx_outbox_created", "created_at"),
    )
    
    def __repr__(self):
        return f"<Outbox(id={self.id}, status={self.status}, retry_count={self.retry_count})>"


class WorkerHeartbeat(Base):
    __tablename__ = "worker_heartbeats"
    
    id = Column(String, primary_key=True, default=generate_id)
    worker_name = Column(String, nullable=False, index=True)  # sync_worker, send_worker
    last_heartbeat = Column(DateTime, default=func.now(), nullable=False)
    status = Column(String, default="running")  # running, stopped, error
    worker_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    __table_args__ = (
        Index("idx_heartbeat_worker", "worker_name"),
        Index("idx_heartbeat_time", "last_heartbeat"),
    )
    
    def __repr__(self):
        return f"<WorkerHeartbeat(worker_name={self.worker_name}, last_heartbeat={self.last_heartbeat})>"

