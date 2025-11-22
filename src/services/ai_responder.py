"""
Service pour appeler l'IA avec toutes les informations disponibles
- Propriété (description, équipements, règles, etc.)
- Historique des messages
- Réservations
- Préférences du guest
- Contexte complet pour une réponse pertinente
"""
import logging
import requests
from typing import Optional, Dict, Any, List
from datetime import datetime
from src.config import settings
from src.db.db import get_db_session
from sqlalchemy import text

logger = logging.getLogger(__name__)


def get_property_details(property_id: str) -> Dict[str, Any]:
    """
    Récupère tous les détails d'une propriété depuis la base
    
    Returns:
        Dict avec toutes les infos de la propriété
    """
    db = get_db_session()
    try:
        # Récupérer uniquement les colonnes qui existent réellement
        result = db.execute(
            text("""
                SELECT id, name, description, address
                FROM properties 
                WHERE id = :property_id
            """),
            {"property_id": property_id}
        )
        row = result.fetchone()
        
        if row:
            property_dict = {
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "address": row[3] if len(row) > 3 else None,
            }
            return property_dict
    except Exception as e:
        logger.error(f"❌ Erreur récupération propriété: {e}")
    finally:
        db.close()
    
    return {}


def get_conversation_history(conversation_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Récupère l'historique des messages d'une conversation
    
    Returns:
        Liste des messages précédents (les plus récents en premier)
    """
    db = get_db_session()
    try:
        result = db.execute(
            text("""
                SELECT content, is_bot, direction, sender_name, created_at
                FROM messages 
                WHERE conversation_id = :conversation_id
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"conversation_id": conversation_id, "limit": limit}
        )
        rows = result.fetchall()
        db.close()
        
        messages = []
        for row in reversed(rows):  # Remettre dans l'ordre chronologique
            messages.append({
                "content": row[0],
                "is_bot": row[1],
                "direction": row[2],
                "sender_name": row[3],
                "created_at": row[4].isoformat() if isinstance(row[4], datetime) else str(row[4]),
            })
        
        return messages
    except Exception as e:
        logger.error(f"❌ Erreur récupération historique: {e}")
    finally:
        db.close()
    
    return []


def get_guest_reservations(guest_name: str, property_id: str) -> List[Dict[str, Any]]:
    """
    Récupère les réservations d'un guest pour une propriété
    
    Returns:
        Liste des réservations
    """
    db = get_db_session()
    try:
        # Chercher les réservations via les conversations
        result = db.execute(
            text("""
                SELECT id, guest_name, external_id, created_at, last_message_at
                FROM conversations 
                WHERE guest_name = :guest_name 
                AND property_id = :property_id
                AND source = 'airbnb-cohost'
                ORDER BY last_message_at DESC
            """),
            {"guest_name": guest_name, "property_id": property_id}
        )
        rows = result.fetchall()
        db.close()
        
        reservations = []
        for row in rows:
            reservations.append({
                "id": row[0],
                "guest_name": row[1],
                "external_id": row[2],
                "created_at": row[3].isoformat() if isinstance(row[3], datetime) else str(row[3]),
                "last_message_at": row[4].isoformat() if isinstance(row[4], datetime) else str(row[4]),
            })
        
        return reservations
    except Exception as e:
        logger.error(f"❌ Erreur récupération réservations: {e}")
    finally:
        db.close()
    
    return []


def get_property_context(property_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Récupère le contexte complet d'une propriété (ou la première si non spécifiée)
    
    Returns:
        Dict avec toutes les infos contextuelles
    """
    db = get_db_session()
    try:
        if property_id:
            query = "SELECT id FROM properties WHERE id = :property_id LIMIT 1"
            params = {"property_id": property_id}
        else:
            query = "SELECT id FROM properties LIMIT 1"
            params = {}
        
        result = db.execute(text(query), params)
        row = result.fetchone()
        
        if not row:
            db.close()
            return {}
        
        actual_property_id = row[0]
        db.close()
        
        # Récupérer tous les détails
        property_details = get_property_details(actual_property_id)
        
        # Récupérer les statistiques (nombre de réservations, etc.)
        db = get_db_session()
        try:
            stats_result = db.execute(
                text("""
                    SELECT COUNT(DISTINCT conversations.id) as total_conversations,
                           COUNT(DISTINCT messages.id) as total_messages
                    FROM properties
                    LEFT JOIN conversations ON conversations.property_id = properties.id
                    LEFT JOIN messages ON messages.conversation_id = conversations.id
                    WHERE properties.id = :property_id
                """),
                {"property_id": actual_property_id}
            )
            stats_row = stats_result.fetchone()
            db.close()
            
            property_details["statistics"] = {
                "total_conversations": stats_row[0] if stats_row else 0,
                "total_messages": stats_row[1] if stats_row else 0,
            }
        except:
            db.close()
        
        return property_details
    except Exception as e:
        logger.error(f"❌ Erreur récupération contexte propriété: {e}")
    finally:
        try:
            db.close()
        except:
            pass
    
    return {}


def build_comprehensive_context(
    message_content: str,
    thread_id: Optional[str] = None,
    guest_name: Optional[str] = None,
    property_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Construit un contexte complet avec toutes les informations disponibles
    
    Returns:
        Dict avec toutes les infos pour l'IA
    """
    context = {
        "current_message": message_content,
        "thread_id": thread_id,
        "guest_name": guest_name,
        "timestamp": datetime.utcnow().isoformat(),
    }
    
    # Récupérer le contexte de la propriété
    property_context = get_property_context(property_id)
    if property_context:
        context["property"] = property_context
        context["listing_name"] = property_context.get("name", "Logement")
        context["property_id"] = property_context.get("id")
    
    # Récupérer l'historique de la conversation
    if conversation_id:
        history = get_conversation_history(conversation_id, limit=20)
        context["conversation_history"] = history
        context["previous_exchanges_count"] = len(history)
    
    # Récupérer les réservations du guest si on a les infos
    if guest_name and context.get("property_id"):
        reservations = get_guest_reservations(guest_name, context["property_id"])
        context["guest_reservations"] = reservations
        context["is_returning_guest"] = len(reservations) > 1
    
    # Ajouter des infos générales utiles pour l'IA
    context["system_prompt"] = """
    Tu es un assistant IA professionnel pour la gestion de locations Airbnb.
    Tu as accès à toutes les informations sur la propriété, l'historique des conversations,
    et les réservations précédentes du voyageur.
    
    Sois :
    - Amical et professionnel
    - Précis et utile
    - Réactif aux besoins du voyageur
    - Informé sur tous les détails de la propriété
    - Capable de répondre aux questions sur les équipements, règles, check-in/out, etc.
    
    Utilise toutes les informations disponibles dans le contexte pour donner la meilleure réponse possible.
    """
    
    return context


def call_ai_api(message: str, context: Optional[Dict[str, Any]] = None) -> Optional[str]:
    """
    Appelle l'API IA avec un contexte complet
    
    Args:
        message: Le message reçu du voyageur
        context: Contexte complet avec toutes les infos disponibles
    
    Returns:
        La réponse générée par l'IA, ou None en cas d'erreur
    """
    if not settings.AI_WEBHOOK_URL and not settings.AI_API_KEY:
        logger.warning("⚠️ Aucune configuration IA trouvée")
        return None
    
    try:
        # Préparer le payload avec toutes les infos
        payload = {
            "message": message,
            "context": context or {},
            "system_prompt": context.get("system_prompt") if context else None,
        }
        
        headers = {
            "Content-Type": "application/json",
        }
        
        if settings.AI_API_KEY:
            headers["Authorization"] = f"Bearer {settings.AI_API_KEY}"
        
        # Appel à l'API IA (utiliser l'API du projet principal si disponible)
        ai_url = settings.AI_WEBHOOK_URL
        if not ai_url:
            # Par défaut, utiliser l'API locale du projet principal
            ai_url = "http://localhost:5000/api/ai/respond"
            logger.info(f"⚠️ AI_WEBHOOK_URL non configuré, utilisation de l'API locale: {ai_url}")
        
        # Appel à l'API IA
        response = requests.post(
            ai_url,
            json=payload,
            headers=headers,
            timeout=60,  # Plus de temps pour les réponses avec contexte complet
        )
        
        if response.status_code == 200:
            data = response.json()
            ai_response = data.get("response") or data.get("message") or data.get("text") or data.get("content")
            
            if ai_response:
                logger.info(f"✅ Réponse IA générée avec contexte complet: {ai_response[:100]}...")
                logger.debug(f"   Contexte envoyé: property={bool(context.get('property'))}, history={len(context.get('conversation_history', []))}")
                return ai_response
            else:
                logger.warning("⚠️ Réponse IA vide")
                return None
        else:
            logger.error(f"❌ Erreur API IA: {response.status_code} - {response.text[:200]}")
            return None
            
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Erreur lors de l'appel à l'IA: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ Erreur inattendue lors de l'appel à l'IA: {e}")
        import traceback
        logger.debug(traceback.format_exc())
        return None


def generate_response_for_message(
    message_content: str,
    thread_id: Optional[str] = None,
    guest_name: Optional[str] = None,
    listing_name: Optional[str] = None,
    property_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
) -> Optional[str]:
    """
    Génère une réponse IA avec TOUTES les informations disponibles
    
    Args:
        message_content: Le contenu du message reçu
        thread_id: ID du thread Airbnb
        guest_name: Nom du voyageur
        listing_name: Nom du logement
        property_id: ID de la propriété dans la base
        conversation_id: ID de la conversation dans la base
    
    Returns:
        La réponse générée avec toutes les infos, ou None en cas d'erreur
    """
    # Construire le contexte complet avec toutes les infos disponibles
    context = build_comprehensive_context(
        message_content=message_content,
        thread_id=thread_id,
        guest_name=guest_name,
        property_id=property_id,
        conversation_id=conversation_id,
    )
    
    # Si on n'a pas de conversation_id mais qu'on a un thread_id, essayer de le trouver
    if not conversation_id and thread_id:
        db = get_db_session()
        try:
            result = db.execute(
                text("SELECT id, property_id FROM conversations WHERE external_id = :external_id AND source = 'airbnb-cohost'"),
                {"external_id": thread_id}
            )
            row = result.fetchone()
            if row:
                conversation_id = row[0]
                if not property_id:
                    property_id = row[1]
                # Mettre à jour le contexte avec ces infos
                context = build_comprehensive_context(
                    message_content=message_content,
                    thread_id=thread_id,
                    guest_name=guest_name,
                    property_id=property_id,
                    conversation_id=conversation_id,
                )
        except Exception as e:
            logger.debug(f"Erreur récupération conversation_id: {e}")
        finally:
            db.close()
    
    # Appeler l'IA avec le contexte complet
    return call_ai_api(message_content, context)
