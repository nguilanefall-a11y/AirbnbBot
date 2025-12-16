"""
Actions Playwright pour scraper les messages Airbnb
Version optimisée avec fallback DOM et gestion des timeouts
"""
import json
import logging
import time
from datetime import datetime
from typing import List, Dict, Optional, Any
from playwright.sync_api import Page
from src.playwright.browser_manager import BrowserManager
from src.playwright.selectors import HOSTING_MESSAGES_URL, GRAPHQL_ENDPOINTS, GRAPHQL_QUERY_HASHES
from src.playwright.utils import (
    random_delay, wait_for_element_safe, take_screenshot_on_error
)
from src.playwright.captcha_detector import handle_captcha, check_for_login_redirect
from src.playwright.human_interactions import HumanInteraction
from src.config import settings
import os

logger = logging.getLogger(__name__)

# Créer dossier debug
DEBUG_DIR = "./debug_screenshots"
os.makedirs(DEBUG_DIR, exist_ok=True)


def fetch_messages_from_dom(page: Page, thread_id: str) -> List[Dict[str, Any]]:
    """
    Fallback: Récupère les messages depuis le DOM (si GraphQL échoue)
    
    Args:
        page: Page Playwright
        thread_id: ID du thread
        
    Returns:
        Liste des messages depuis le DOM
    """
    messages = []
    try:
        logger.info(f"📄 Extraction DOM pour thread {thread_id}")
        
        # Attendre que les messages soient visibles
        page.wait_for_selector('[data-testid="message-item"], .message, [class*="message"]', timeout=10000)
        
        # Extraire les messages depuis le DOM
        message_elements = page.locator('[data-testid="message-item"], .message, [class*="message"]').all()
        
        for element in message_elements:
            try:
                # Extraire le contenu
                content = element.text_content() or ""
                
                # Essayer de déterminer la direction (guest vs host)
                classes = element.get_attribute("class") or ""
                direction = "inbound" if "guest" in classes.lower() or "received" in classes.lower() else "outbound"
                
                messages.append({
                    "content": content,
                    "direction": direction,
                    "sent_at": datetime.utcnow(),  # Approximatif depuis DOM
                    "sender_name": "Voyageur" if direction == "inbound" else "Hôte",
                })
            except:
                continue
        
        logger.info(f"✅ {len(messages)} message(s) extrait(s) depuis DOM")
        return messages
        
    except Exception as e:
        logger.warning(f"⚠️ Erreur extraction DOM: {e}")
        return []


def fetch_threads_via_graphql_with_data(page: Page, captured_data: dict) -> List[Dict[str, Any]]:
    """
    Récupère les threads depuis les données GraphQL capturées
    Version optimisée qui utilise aussi les messages préchargés dans la liste
    """
    try:
        # Si pas de données capturées, essayer de les récupérer depuis le DOM
        if not captured_data.get("data"):
            logger.warning("⚠️ Aucune réponse GraphQL interceptée")
            return []
        
        data = captured_data["data"]
        
        # Debug: afficher la structure des données
        logger.debug(f"Structure des données capturées: {json.dumps(data, indent=2)[:500]}...")
        
        # Parser les données GraphQL (plusieurs structures possibles)
        threads_edges = []
        try:
            data_dict = data.get("data", {}) if isinstance(data, dict) else {}
            
            # Structure 1: data.node.messagingInbox.threads.edges
            if "node" in data_dict:
                node = data_dict.get("node", {})
                inbox = node.get("messagingInbox", {})
                if inbox:
                    threads_edges = inbox.get("threads", {}).get("edges", [])
                    logger.debug("✅ Structure trouvée: data.node.messagingInbox.threads.edges")
            
            # Structure 2: data.messagingInbox.threads.edges (alternative)
            if not threads_edges and "messagingInbox" in data_dict:
                inbox = data_dict.get("messagingInbox", {})
                threads_edges = inbox.get("threads", {}).get("edges", [])
                logger.debug("✅ Structure trouvée: data.messagingInbox.threads.edges")
            
            # Structure 3: directement dans data.threads
            if not threads_edges and "threads" in data_dict:
                threads_data = data_dict.get("threads", {})
                if isinstance(threads_data, dict):
                    threads_edges = threads_data.get("edges", [])
                elif isinstance(threads_data, list):
                    threads_edges = threads_data
                logger.debug("✅ Structure trouvée: data.threads")
            
            # Structure 4: data.inbox.threads.edges
            if not threads_edges and "inbox" in data_dict:
                inbox = data_dict.get("inbox", {})
                threads_edges = inbox.get("threads", {}).get("edges", [])
                logger.debug("✅ Structure trouvée: data.inbox.threads.edges")
            
            # Structure 5: Explorer récursivement pour trouver "threads" ou "edges"
            if not threads_edges:
                def find_threads(obj, depth=0, max_depth=5):
                    """Fonction récursive pour trouver les threads"""
                    if depth > max_depth:
                        return None
                    
                    if isinstance(obj, dict):
                        # Chercher directement "threads" ou "edges"
                        if "threads" in obj and isinstance(obj["threads"], dict):
                            edges = obj["threads"].get("edges", [])
                            if edges and isinstance(edges, list) and len(edges) > 0:
                                # Vérifier que ce sont bien des threads
                                first_edge = edges[0]
                                if isinstance(first_edge, dict):
                                    node = first_edge.get("node", {})
                                    item_id = str(node.get("id", ""))
                                    if "MessageThread" in item_id:
                                        return edges
                        
                        if "edges" in obj and isinstance(obj["edges"], list) and len(obj["edges"]) > 0:
                            # Vérifier si c'est une liste de threads
                            first_item = obj["edges"][0]
                            if isinstance(first_item, dict):
                                node = first_item.get("node", first_item)
                                item_id = str(node.get("id", ""))
                                if "MessageThread" in item_id:
                                    return obj["edges"]
                        
                        # Chercher récursivement dans les valeurs
                        for key, value in obj.items():
                            if isinstance(value, (dict, list)):
                                result = find_threads(value, depth + 1, max_depth)
                                if result:
                                    return result
                    elif isinstance(obj, list) and len(obj) > 0:
                        # Vérifier si la liste contient directement des threads
                        first_item = obj[0]
                        if isinstance(first_item, dict):
                            item_id = str(first_item.get("id", ""))
                            if "MessageThread" in item_id:
                                return obj
                        # Chercher récursivement
                        for item in obj:
                            if isinstance(item, (dict, list)):
                                result = find_threads(item, depth + 1, max_depth)
                                if result:
                                    return result
                    return None
                
                found_threads = find_threads(data)
                if found_threads and isinstance(found_threads, list) and len(found_threads) > 0:
                    threads_edges = found_threads
                    logger.debug(f"✅ Structure trouvée récursivement: {len(threads_edges)} threads")
            
            if not threads_edges:
                logger.warning(f"⚠️ Aucune structure de threads trouvée. Clés disponibles: {list(data.keys()) if isinstance(data, dict) else 'N/A'}")
                
                # Afficher la structure de data.data pour debug
                if isinstance(data, dict) and "data" in data:
                    data_structure = data.get("data", {})
                    if isinstance(data_structure, dict):
                        logger.debug(f"   Structure data.data: {list(data_structure.keys())}")
                        # Explorer récursivement data.data
                        def explore_structure(obj, depth=0, path="", max_depth=3):
                            """Explore la structure récursivement"""
                            if depth > max_depth:
                                return
                            if isinstance(obj, dict):
                                for key, value in obj.items():
                                    full_path = f"{path}.{key}" if path else key
                                    if "thread" in key.lower() or "message" in key.lower() or "inbox" in key.lower():
                                        logger.debug(f"   📍 Chemin suspect trouvé: {full_path} (type: {type(value).__name__})")
                                    if isinstance(value, (dict, list)) and depth < max_depth:
                                        explore_structure(value, depth + 1, full_path, max_depth)
                        explore_structure(data_structure)
                
                # Sauvegarder un échantillon des données pour debug
                try:
                    debug_data = json.dumps(data, indent=2)[:2000]  # Limiter à 2000 chars
                    logger.debug(f"   Échantillon des données: {debug_data}...")
                except:
                    pass
        except Exception as e:
            logger.error(f"❌ Erreur parsing GraphQL: {e}")
            import traceback
            logger.debug(traceback.format_exc())
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
            
            # Extraire le dernier message (déjà dans la liste des threads)
            last_message = ""
            messages_edges = thread.get("messages", {}).get("edges", [])
            
            # Extraire tous les messages disponibles dans la liste (souvent 2-5 messages)
            messages = []
            if messages_edges:
                for msg_edge in messages_edges:
                    msg_node = msg_edge.get("node", {})
                    content_preview = msg_node.get("contentPreview", {})
                    content = content_preview.get("content", "") if content_preview else ""
                    
                    # Déterminer la direction
                    account = msg_node.get("account", {})
                    role = account.get("accountType", "")
                    is_guest = role in ["GUEST", "BOOKER"] or (not role and account.get("isGuest", False))
                    
                    msg_id_raw = msg_node.get("id", "")
                    msg_id = msg_id_raw.replace("Message:", "") if msg_id_raw else ""
                    
                    # Extraire la date
                    sent_at = datetime.utcnow()
                    if msg_node.get("createdAtMs"):
                        try:
                            timestamp_ms = msg_node.get("createdAtMs")
                            if isinstance(timestamp_ms, str):
                                timestamp_ms = int(timestamp_ms)
                            sent_at = datetime.fromtimestamp(timestamp_ms / 1000)
                        except:
                            pass
                    
                    messages.append({
                        "airbnb_message_id": msg_id,
                        "content": content,
                        "direction": "inbound" if is_guest else "outbound",
                        "sent_at": sent_at,
                        "sender_name": account.get("name", guest_name if is_guest else "Hôte"),
                    })
                    
                    if not last_message and content:
                        last_message = content
            
            # Extraire la date du dernier message
            last_message_at = None
            if thread.get("mostRecentInboxActivityAtMsFromROS"):
                try:
                    timestamp_ms = thread.get("mostRecentInboxActivityAtMsFromROS")
                    # Convertir en int ou float si c'est une string
                    if isinstance(timestamp_ms, str):
                        timestamp_ms = int(timestamp_ms)
                    if isinstance(timestamp_ms, (int, float)):
                        last_message_at = datetime.fromtimestamp(timestamp_ms / 1000)
                except (ValueError, TypeError) as e:
                    logger.debug(f"Erreur conversion timestamp: {e}")
                    last_message_at = None
            
            threads.append({
                "airbnb_thread_id": thread_id,
                "guest_name": guest_name,
                "last_message": last_message,
                "last_message_at": last_message_at,
                "unread_count": thread.get("unreadCount", 0),
                "messages": messages,  # Messages déjà disponibles dans la liste
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
        try:
            page.remove_listener("response", handle_response)
        except:
            pass


def fetch_messages_for_thread_via_graphql(page: Page, thread_id: str) -> List[Dict[str, Any]]:
    """
    Récupère les messages d'un thread via interception GraphQL
    Version optimisée avec timeout plus court et fallback DOM
    """
    captured_thread_data = {"data": None}
    
    def handle_thread_response(response):
        """Intercepte les réponses GraphQL pour un thread"""
        try:
            url = response.url
            if "ViaductGetThreadAndDataQuery" in url or ("thread" in url.lower() and "graphql" in url.lower()):
                try:
                    json_data = response.json()
                    captured_thread_data["data"] = json_data
                    logger.debug(f"✅ Données thread capturées pour {thread_id}")
                except:
                    pass
        except:
            pass
    
    # Écouter les réponses AVANT la navigation
    page.on("response", handle_thread_response)
    
    try:
        # Naviguer vers le thread avec timeout plus court
        thread_url = f"{HOSTING_MESSAGES_URL}/{thread_id}"
        try:
            page.goto(thread_url, wait_until="domcontentloaded", timeout=20000)
            
            # Attendre un peu pour que les requêtes GraphQL soient faites (pas besoin de networkidle)
            HumanInteraction.random_delay(1500, 2500)
            
            # Essayer d'attendre la réponse GraphQL avec un timeout court
            try:
                page.wait_for_load_state("load", timeout=8000)  # Timeout plus court
            except:
                pass  # Pas critique si timeout
            
        except Exception as e:
            logger.warning(f"⚠️ Erreur navigation vers thread {thread_id}: {e}, utilisation DOM fallback")
            # Si la navigation échoue, essayer le fallback DOM directement
            try:
                page.remove_listener("response", handle_thread_response)
            except:
                pass
            return fetch_messages_from_dom(page, thread_id)
        
        # Récupérer les données capturées
        data = captured_thread_data.get("data")
        
        if not data:
            logger.debug(f"⚠️ Aucune donnée thread capturée pour {thread_id}, utilisation DOM fallback")
            # Fallback: utiliser les messages visibles dans le DOM
            try:
                page.remove_listener("response", handle_thread_response)
            except:
                pass
            return fetch_messages_from_dom(page, thread_id)
        
        thread_data = data.get("data", {}).get("threadData", {})
        
        if not thread_data:
            logger.debug(f"⚠️ Structure de données thread incorrecte pour {thread_id}, utilisation DOM fallback")
            try:
                page.remove_listener("response", handle_thread_response)
            except:
                pass
            return fetch_messages_from_dom(page, thread_id)
        
        # Récupérer les participants pour déterminer qui est guest/host
        participants = {}
        participants_edges = thread_data.get("participants", {}).get("edges", [])
        for edge in participants_edges:
            node = edge.get("node", {})
            account_id = node.get("accountId")
            role = node.get("participantRole")
            if account_id:
                participants[account_id] = role
        
        # Récupérer les messages
        messages = []
        messages_edges = thread_data.get("messages", {}).get("edges", [])
        
        for edge in messages_edges:
            node = edge.get("node", {})
            account = node.get("account", {})
            account_id = account.get("accountId")
            role = participants.get(account_id, "")
            
            # Déterminer si c'est un message guest (inbound)
            is_guest = role in ["GUEST", "BOOKER"] or (not role and account.get("isGuest", False))
            
            # Extraire l'ID du message
            msg_id_raw = node.get("id", "")
            msg_id = msg_id_raw.replace("Message:", "") if msg_id_raw else ""
            
            # Extraire le contenu
            content_preview = node.get("contentPreview", {})
            content = content_preview.get("content", "") if content_preview else ""
            
            # Extraire la date
            sent_at = datetime.utcnow()
            if node.get("createdAtMs"):
                try:
                    timestamp_ms = node.get("createdAtMs")
                    if isinstance(timestamp_ms, str):
                        timestamp_ms = int(timestamp_ms)
                    sent_at = datetime.fromtimestamp(timestamp_ms / 1000)
                except:
                    pass
            
            # Extraire le nom de l'expéditeur
            sender_name = account.get("name", "") or (node.get("account", {}).get("name", ""))
            
            messages.append({
                "airbnb_message_id": msg_id,
                "content": content,
                "direction": "inbound" if is_guest else "outbound",
                "sent_at": sent_at,
                "sender_name": sender_name,
            })
        
        logger.info(f"✅ {len(messages)} message(s) récupéré(s) pour thread {thread_id}")
        return messages
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la récupération des messages: {e}")
        # Fallback DOM en cas d'erreur
        try:
            page.remove_listener("response", handle_thread_response)
        except:
            pass
        return fetch_messages_from_dom(page, thread_id)
    finally:
        # Nettoyer l'écouteur
        try:
            page.remove_listener("response", handle_thread_response)
        except:
            pass


def fetch_threads_and_messages() -> List[Dict[str, Any]]:
    """
    Fonction principale pour récupérer tous les threads et leurs messages
    Version optimisée qui utilise les messages déjà dans la liste principale
    """
    results = []
    
    with BrowserManager() as manager:
        page = manager.new_page()
        
        # ✅ VÉRIFICATION COOKIES: Tester la session avant de scraper
        try:
            logger.info("🔐 Vérification de la validité de la session...")
            page.goto("https://www.airbnb.com/hosting/inbox", 
                     wait_until="domcontentloaded", timeout=30000)
            time.sleep(3)
            
            current_url = page.url
            if "/login" in current_url or "/authenticate" in current_url:
                logger.error("🚨 COOKIES EXPIRÉS - SESSION INVALIDE")
                logger.error("🚨 Action requise: Refaire l'auth avec reconnect_airbnb.py")
                # Pause visuelle pour debug
                from src.config import settings
                if not settings.AIRBNB_HEADLESS:
                    logger.info("⏸️  Pause de 10s pour inspection visuelle...")
                    time.sleep(10)
                return []
            
            logger.info("✅ Session valide, début du scraping...")
        except Exception as check_error:
            logger.error(f"❌ Erreur vérification session: {check_error}")
            from src.config import settings
            if not settings.AIRBNB_HEADLESS:
                time.sleep(10)
            return []
        
        try:
            # Mettre en place l'interception des réponses AVANT la navigation
            # Capturer TOUTES les réponses GraphQL (pas juste la première)
            captured_responses = []
            
            def handle_response(response):
                """Intercepte les réponses GraphQL"""
                try:
                    url = response.url
                    # Capturer toutes les réponses qui pourraient contenir des threads
                    if ("inbox" in url.lower() and "graphql" in url.lower()) or \
                       "ViaductInboxData" in url or \
                       ("query" in url.lower() and "thread" in url.lower()):
                        try:
                            json_data = response.json()
                            captured_responses.append(json_data)
                            logger.debug(f"✅ Réponse GraphQL capturée: {url[:100]}")
                        except:
                            pass
                except:
                    pass
            
            # Écouter les réponses AVANT la navigation
            page.on("response", handle_response)
            
            # Naviguer vers la page des messages
            logger.info(f"🌐 Navigation vers {HOSTING_MESSAGES_URL}")
            page.goto(HOSTING_MESSAGES_URL, wait_until="domcontentloaded", timeout=60000)
            
            # Attendre un peu pour que les requêtes GraphQL soient faites
            try:
                logger.info("⏳ Attente du chargement des données GraphQL...")
                # Attendre que la page soit chargée (domcontentloaded est déjà fait)
                page.wait_for_load_state("load", timeout=20000)
                HumanInteraction.random_delay(3000, 5000)  # Donner plus de temps pour les requêtes GraphQL
                logger.info("✅ Page chargée")
            except Exception as e:
                logger.warning(f"⚠️ Timeout attente chargement: {e}, continuation...")
                HumanInteraction.random_delay(2000, 4000)
            
            # Vérifier les redirections et CAPTCHA (arrêt propre si détecté)
            if check_for_login_redirect(page):
                raise Exception("Session expirée - redirection vers login")
            
            # Détection et gestion propre du CAPTCHA
            handle_captcha(page, raise_exception=True)
            
            # Délai naturel avant de continuer
            HumanInteraction.random_delay(1000, 2000)
            
            # Récupérer les threads via GraphQL (utiliser les données capturées)
            # Essayer toutes les réponses capturées jusqu'à trouver des threads
            threads = []
            for i, response_data in enumerate(captured_responses):
                logger.debug(f"Tentative parsing réponse {i+1}/{len(captured_responses)}")
                threads = fetch_threads_via_graphql_with_data(page, {"data": response_data})
                if threads:
                    logger.info(f"✅ Threads trouvés dans réponse {i+1}")
                    break
            
            if not threads:
                logger.warning("⚠️ Aucun thread trouvé dans les réponses capturées")
            
            # Nettoyer l'écouteur
            try:
                page.remove_listener("response", handle_response)
            except:
                pass
            
            if not threads:
                logger.warning("⚠️ Aucun thread trouvé")
                return []
            
            # Pour chaque thread, utiliser les messages déjà dans la liste (plus rapide)
            # On ne va chercher les détails que si nécessaire
            for thread in threads:
                thread_id = thread["airbnb_thread_id"]
                messages_in_list = thread.get("messages", [])
                
                # Si on a déjà des messages dans la liste, les utiliser
                # Sinon, aller chercher les détails (mais avec timeout court)
                if messages_in_list:
                    detailed_messages = messages_in_list
                    logger.info(f"✅ {len(detailed_messages)} message(s) depuis la liste pour thread {thread_id}")
                else:
                    # Aller chercher les détails (mais avec timeout court pour éviter les blocages)
                    try:
                        logger.info(f"📨 Récupération messages pour thread {thread_id}")
                        detailed_messages = fetch_messages_for_thread_via_graphql(page, thread_id)
                    except Exception as e:
                        logger.error(f"❌ Erreur pour thread {thread_id}: {e}")
                        detailed_messages = []
                
                results.append({
                    "airbnb_thread_id": thread_id,
                    "guest_name": thread["guest_name"],
                    "last_message": thread.get("last_message", ""),
                    "last_message_at": thread.get("last_message_at"),
                    "unread_count": thread.get("unread_count", 0),
                    "messages": detailed_messages,
                })
            
            logger.info(f"✅ {len(results)} thread(s) traité(s) avec succès")
            return results
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du scraping: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            take_screenshot_on_error(page)
            return []
