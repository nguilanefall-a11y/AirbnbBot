"""
Routes pour les listings (logements)
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from src.db.repository import (
    create_or_update_listing, get_listing_by_airbnb_id,
    get_all_active_listings, get_threads_by_listing
)
from src.db.db import get_db_session

router = APIRouter()


class ListingRequest(BaseModel):
    airbnb_listing_id: str
    name: str
    status: Optional[str] = "active"


class ListingResponse(BaseModel):
    id: str
    airbnb_listing_id: str
    name: str
    status: str
    created_at: str
    updated_at: str


@router.get("", response_model=List[ListingResponse])
def get_listings():
    """Récupère tous les listings actifs"""
    try:
        db = get_db_session()
        try:
            listings = get_all_active_listings(db)
            return [
                ListingResponse(
                    id=l.id,
                    airbnb_listing_id=l.airbnb_listing_id,
                    name=l.name,
                    status=l.status,
                    created_at=l.created_at.isoformat(),
                    updated_at=l.updated_at.isoformat(),
                )
                for l in listings
            ]
        finally:
            db.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ListingResponse)
def create_listing(request: ListingRequest):
    """Crée ou met à jour un listing"""
    try:
        db = get_db_session()
        try:
            listing = create_or_update_listing(
                db,
                airbnb_listing_id=request.airbnb_listing_id,
                name=request.name,
                status=request.status or "active",
            )
            return ListingResponse(
                id=listing.id,
                airbnb_listing_id=listing.airbnb_listing_id,
                name=listing.name,
                status=listing.status,
                created_at=listing.created_at.isoformat(),
                updated_at=listing.updated_at.isoformat(),
            )
        finally:
            db.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{airbnb_listing_id}", response_model=ListingResponse)
def get_listing(airbnb_listing_id: str):
    """Récupère un listing par son ID Airbnb"""
    try:
        db = get_db_session()
        try:
            listing = get_listing_by_airbnb_id(db, airbnb_listing_id)
            if not listing:
                raise HTTPException(status_code=404, detail="Listing non trouvé")
            
            return ListingResponse(
                id=listing.id,
                airbnb_listing_id=listing.airbnb_listing_id,
                name=listing.name,
                status=listing.status,
                created_at=listing.created_at.isoformat(),
                updated_at=listing.updated_at.isoformat(),
            )
        finally:
            db.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{airbnb_listing_id}/threads")
def get_listing_threads(airbnb_listing_id: str):
    """Récupère tous les threads d'un listing"""
    try:
        db = get_db_session()
        try:
            listing = get_listing_by_airbnb_id(db, airbnb_listing_id)
            if not listing:
                raise HTTPException(status_code=404, detail="Listing non trouvé")
            
            threads = get_threads_by_listing(db, listing.id)
            return {
                "listing_id": listing.id,
                "airbnb_listing_id": listing.airbnb_listing_id,
                "threads_count": len(threads),
                "threads": [
                    {
                        "id": t.id,
                        "airbnb_thread_id": t.airbnb_thread_id,
                        "guest_name": t.guest_name,
                        "last_message_at": t.last_message_at.isoformat() if t.last_message_at else None,
                        "status": t.status,
                    }
                    for t in threads
                ],
            }
        finally:
            db.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

