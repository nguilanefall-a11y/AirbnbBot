"""
Routes de santé (health check)
"""
from fastapi import APIRouter
from datetime import datetime
from src.db.repository import get_worker_heartbeats
from src.db.db import get_db_session

router = APIRouter()


@router.get("/health")
def health_check():
    """Health check simple"""
    return {"ok": True, "timestamp": datetime.utcnow().isoformat()}


@router.get("/health/detailed")
def detailed_health_check():
    """Health check détaillé avec statut des workers"""
    try:
        db = get_db_session()
        try:
            heartbeats = get_worker_heartbeats(db)
            
            workers_status = {}
            for hb in heartbeats:
                workers_status[hb.worker_name] = {
                    "status": hb.status,
                    "last_heartbeat": hb.last_heartbeat.isoformat(),
                    "metadata": hb.worker_metadata,
                }
            
            return {
                "ok": True,
                "timestamp": datetime.utcnow().isoformat(),
                "workers": workers_status,
            }
        finally:
            db.close()
    except Exception as e:
        return {
            "ok": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }

