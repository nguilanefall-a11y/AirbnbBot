"""
Version corrigée de scraping_actions avec interception de requêtes GraphQL
"""
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
from playwright.sync_api import Page
from src.playwright.selectors import HOSTING_MESSAGES_URL
from src.playwright.captcha_detector import handle_captcha, check_for_login_redirect
from src.playwright.human_interactions import HumanInteraction
from src.config import settings

logger = logging.getLogger(__name__)


def fetch_threads_via_graphql(page: Page) -> List[Dict[str, Any]]:
    """
    Récupère les threads via interception des requêtes GraphQL
    """
    threads_data = []
    captured_data = {"data": None}
    
    def handle_response(response):
        """Intercepte les réponses GraphQL"""
        try:
            url = response.url
            if "ViaductInboxData" in url or ("inbox" in url.lower() and "graphql" in url.lower()):
                try:
                    json_data = response.json()
                    captured_data["data"] = json_data
                    logger.info("✅ Données GraphQL capturées")
                except:
                    pass
        except:
            pass
    
    # Écouter les réponses
    page.on("response", handle_response)
    
    try:
        # Attendre que la page charge
        page.wait_for_load_state("networkidle", timeout=30000)
        HumanInteraction.random_delay(2000, 3000)
        
        # Si pas de données capturées, essayer de les récupérer depuis le DOM
        if not captured_data["data"]:
            logger.warning("⚠️ Aucune réponse GraphQL interceptée, tentative extraction DOM")
            # Fallback: extraction depuis le DOM si nécessaire
            return []
        
        data = captured_data["data"]
        
        # Parser les données GraphQL
        threads_edges = []
        try:
            node = data.get("data", {}).get("node", {})
            inbox = node.get("messagingInbox", {})
            threads_edges = inbox.get("threads", {}).get("edges", [])
        except Exception as e:
            logger.error(f"❌ Erreur parsing GraphQL: {e}")
            return []
        
        threads = []
        for edge in threads_edges:
            thread = edge.get("node", {})
            thread_id_raw = thread.get("id", "")
            thread_id = thread_id_raw.replace("MessageThread:", "") if thread_id_raw else ""
            
            # Extraire le nom du guest
            inbox_title = thread.get("inboxTitle", {})
            guest_name = "Voyageur"
            if inbox_title and "components" in inbox_title:
                components = inbox_title.get("components", [])
                if components:
                    guest_name = components[0].get("text", "Voyageur")
            
            # Extraire le dernier message
            last_message = ""
            messages_edges = thread.get("messages", {}).get("edges", [])
            if messages_edges:
                last_msg_node = messages_edges[0].get("node", {})
                content_preview = last_msg_node.get("contentPreview", {})
                last_message = content_preview.get("content", "")
            
            # Extraire la date du dernier message
            last_message_at = None
            if thread.get("mostRecentInboxActivityAtMsFromROS"):
                timestamp_ms = thread.get("mostRecentInboxActivityAtMsFromROS")
                last_message_at = datetime.fromtimestamp(timestamp_ms / 1000)
            
            threads.append({
                "airbnb_thread_id": thread_id,
                "guest_name": guest_name,
                "last_message": last_message,
                "last_message_at": last_message_at,
                "unread_count": thread.get("unreadCount", 0),
            })
        
        logger.info(f"✅ {len(threads)} thread(s) récupéré(s) via GraphQL")
        return threads
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la récupération GraphQL: {e}")
        import traceback
        logger.debug(traceback.format_exc())
        return []
    finally:
        # Nettoyer l'écouteur
        page.remove_listener("response", handle_response)


