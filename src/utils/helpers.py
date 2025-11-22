"""
Fonctions utilitaires
"""
import re
from typing import Optional


def extract_airbnb_listing_id(url_or_id: str) -> Optional[str]:
    """Extrait l'ID d'une annonce Airbnb depuis une URL ou un ID"""
    if not url_or_id:
        return None
    
    # Si c'est déjà un ID numérique
    if url_or_id.isdigit():
        return url_or_id
    
    # Si c'est une URL
    match = re.search(r'/rooms/(\d+)', url_or_id)
    if match:
        return match.group(1)
    
    return None


def extract_airbnb_thread_id(url_or_id: str) -> Optional[str]:
    """Extrait l'ID d'un thread Airbnb depuis une URL ou un ID"""
    if not url_or_id:
        return None
    
    # Si c'est déjà un ID numérique
    if url_or_id.isdigit():
        return url_or_id
    
    # Si c'est une URL
    match = re.search(r'/messages/(\d+)', url_or_id)
    if match:
        return match.group(1)
    
    return None


def normalize_text(text: str) -> str:
    """Normalise un texte pour la comparaison"""
    if not text:
        return ""
    return text.lower().strip()
