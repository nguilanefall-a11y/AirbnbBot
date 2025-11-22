"""
Workers async pour SYNC et SEND des messages Airbnb
Utilise Playwright async API pour une meilleure performance
"""
import asyncio
import random
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Ajouter le chemin parent pour les imports AVANT playwright
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Maintenant importer playwright
from playwright.async_api import async_playwright
from sqlalchemy import text

from src.config import settings
from src.db.db import get_db_session

logger = logging.getLogger(__name__)


def log(msg):
    """Log avec timestamp"""
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[SYNC/SEND {now}] {msg}")
    logger.info(msg)


async def human_wait(a=600, b=1800):
    """Attente humaine aléatoire (en millisecondes)"""
    await asyncio.sleep(random.uniform(a/1000, b/1000))


def captcha_detected(html: str) -> bool:
    """Détecte si une page contient un CAPTCHA"""
    keywords = ["captcha", "security check", "robot", "verify", "suspicious"]
    html_lower = html.lower()
    return any(k in html_lower for k in keywords)


async def store_message(conversation_id: str, sender: str, content: str, timestamp: str, direction: str = "inbound"):
    """Stocke un message en DB s'il est nouveau"""
    db = get_db_session()
    try:
        # Générer un ID unique basé sur conversation_id + timestamp + sender + content hash
        import hashlib
        unique_key = f"{conversation_id}-{timestamp}-{sender}-{content}"
        message_id = hashlib.sha256(unique_key.encode()).hexdigest()[:36]  # UUID-like length
        
        # Vérifier si le message existe déjà
        result = db.execute(
            text("SELECT 1 FROM messages WHERE airbnb_message_id = :id OR id = :id"),
            {"id": message_id}
        )
        exists = result.fetchone()
        
        if exists:
            return False
        
        # Trouver ou créer la conversation
        conv_result = db.execute(
            text("SELECT id FROM conversations WHERE external_id = :external_id AND source = 'airbnb-cohost'"),
            {"external_id": conversation_id}
        )
        conv = conv_result.fetchone()
        
        if not conv:
            # Créer la conversation
            conv_id = str(random.randint(100000, 999999))  # Simple ID
            db.execute(
                text("""
                INSERT INTO conversations (id, external_id, source, guest_name, created_at, updated_at)
                VALUES (:id, :external_id, 'airbnb-cohost', :guest_name, NOW(), NOW())
                """),
                {"id": conv_id, "external_id": conversation_id, "guest_name": sender}
            )
            conversation_db_id = conv_id
        else:
            conversation_db_id = conv[0]
        
        # Insérer le message
        db.execute(
            text("""
            INSERT INTO messages (
                id, conversation_id, direction, content, sender_name, 
                sent_at, airbnb_message_id, created_at
            )
            VALUES (:id, :cid, :dir, :content, :sender, :sent_at, :airbnb_id, NOW())
            """),
            {
                "id": message_id,
                "cid": conversation_db_id,
                "dir": direction,
                "content": content,
                "sender": sender,
                "sent_at": timestamp,
                "airbnb_id": message_id
            }
        )
        
        db.commit()
        return True
        
    except Exception as e:
        db.rollback()
        log(f"Erreur store_message: {e}")
        return False
    finally:
        db.close()


async def notify_ai(conversation_id: str, sender: str, content: str, property_id: str = None):
    """
    Appelle directement l'API principale (localhost:5000) pour générer une réponse IA
    et ajoute automatiquement la réponse dans la queue d'envoi
    """
    try:
        import aiohttp
        from src.services.message_queue import MessageQueue
        
        # Appeler directement l'API principale sur localhost:5000
        log(f"🤖 Appel de l'IA principale pour générer une réponse (conversation: {conversation_id})...")
        
        # Chercher la conversation_id interne depuis l'external_id
        db = get_db_session()
        internal_conversation_id = conversation_id
        try:
            result = db.execute(
                text("SELECT id FROM conversations WHERE external_id = :external_id AND source = 'airbnb-cohost' LIMIT 1"),
                {"external_id": conversation_id}
            )
            conv = result.fetchone()
            if conv:
                internal_conversation_id = conv[0]
        except:
            pass
        finally:
            db.close()
        
        # Appeler l'API principale pour générer une réponse
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://localhost:5000/api/messages",
                json={
                    "conversationId": internal_conversation_id,
                    "content": content,
                    "isBot": False,  # Message utilisateur, l'API générera la réponse IA automatiquement
                },
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 201:
                    response_data = await response.json()
                    bot_message = response_data.get("botMessage")
                    
                    if bot_message:
                        log(f"✅ Réponse IA générée: {bot_message[:50]}...")
                        
                        # Ajouter directement la réponse dans la queue d'envoi
                        outbox_id = MessageQueue.enqueue_send(
                            thread_id=conversation_id,
                            message=bot_message,
                            metadata={"ai_reply": True, "sender": sender}
                        )
                        log(f"✅ Réponse IA ajoutée à la queue (outbox_id: {outbox_id})")
                    else:
                        log(f"⚠️ Pas de réponse IA dans la réponse de l'API principale")
                else:
                    error_text = await response.text()
                    log(f"⚠️ Erreur API principale: {response.status} - {error_text[:200]}")
                    
    except asyncio.TimeoutError:
        log(f"⏱️ Timeout lors de l'appel à l'IA (conversation: {conversation_id})")
    except Exception as e:
        log(f"❌ Erreur notification IA: {e}")
        import traceback
        traceback.print_exc()


async def enqueue_ai_reply(conversation_id: str, reply_message: str, sender: str = None):
    """Ajoute directement une réponse IA dans la queue d'envoi"""
    try:
        from src.services.message_queue import MessageQueue
        
        # Ajouter le message dans la queue
        outbox_id = MessageQueue.enqueue_send(
            thread_id=conversation_id,
            message=reply_message,
            metadata={"ai_reply": True, "sender": sender}
        )
        log(f"✅ Réponse IA ajoutée à la queue (outbox_id: {outbox_id})")
    except Exception as e:
        log(f"❌ Erreur enqueue_ai_reply: {e}")


async def process_conversation(page, convo_url: str):
    """Traite une conversation : récupère les messages et les stocke"""
    db = None
    try:
        log(f"→ Lecture conversation : {convo_url}")
        
        await page.goto(convo_url, wait_until="domcontentloaded", timeout=60000)
        await human_wait(1200, 2500)
        
        html = await page.content()
        if captcha_detected(html):
            log("⚠️ CAPTCHA détecté → arrêt SYNC")
            return "CAPTCHA"
        
        # Chercher les messages
        messages = page.locator("[data-testid='message-item'], .message, [class*='message']")
        count = await messages.count()
        
        if count == 0:
            log("⚠️ Aucun message trouvé dans la conversation")
            return "EMPTY"
        
        conversation_id = convo_url.split("/")[-1].split("?")[0]
        new_messages_count = 0
        
        for i in range(count):
            try:
                msg = messages.nth(i)
                
                # Essayer de récupérer le sender
                sender = "Guest"
                try:
                    sender_elem = msg.locator("[data-testid='message-sender'], .sender, [class*='sender']").first
                    if await sender_elem.count() > 0:
                        sender = await sender_elem.inner_text()
                except:
                    pass
                
                # Récupérer le contenu
                body = ""
                try:
                    body_elem = msg.locator("[data-testid='message-text'], .message-text, [class*='text']").first
                    if await body_elem.count() > 0:
                        body = await body_elem.inner_text()
                    else:
                        body = await msg.inner_text()
                except:
                    body = await msg.inner_text()
                
                # Récupérer le timestamp
                ts_elem = msg.locator("time").first
                timestamp = datetime.utcnow().isoformat()
                try:
                    if await ts_elem.count() > 0:
                        timestamp = await ts_elem.get_attribute("datetime") or timestamp
                except:
                    pass
                
                # Déterminer la direction (inbound si ce n'est pas nous)
                direction = "inbound" if sender.lower() not in ["you", "vous", "toi", "moi"] else "outbound"
                
                # Stocker le message
                is_new = await store_message(conversation_id, sender, body, timestamp, direction)
                
                if is_new and direction == "inbound":
                    new_messages_count += 1
                    log(f"🟢 Nouveau message inbound détecté : {sender} → {body[:40]}...")
                    
                    # Récupérer property_id si disponible
                    db_temp = get_db_session()
                    property_id = None
                    try:
                        conv_result = db_temp.execute(
                            text("SELECT property_id FROM conversations WHERE external_id = :external_id AND source = 'airbnb-cohost'"),
                            {"external_id": conversation_id}
                        )
                        conv = conv_result.fetchone()
                        if conv and conv[0]:
                            property_id = conv[0]
                    except:
                        pass
                    finally:
                        db_temp.close()
                    
                    # Appeler l'IA pour générer une réponse automatique
                    await notify_ai(conversation_id, sender, body, property_id)
                    
            except Exception as e:
                log(f"⚠️ Erreur traitement message {i}: {e}")
                continue
        
        if new_messages_count > 0:
            log(f"✅ {new_messages_count} nouveau(x) message(s) traité(s)")
        
        return "OK"
        
    except Exception as e:
        log(f"❌ Erreur process_conversation : {e}")
        import traceback
        traceback.print_exc()
        return "ERROR"


async def sync_worker(context):
    """
    Worker SYNC : récupère les messages de toutes les conversations
    Tourne en continu 24/7, s'arrête uniquement en cas de CAPTCHA
    """
    page = await context.new_page()
    cycle_count = 0
    
    log("🚀 Worker SYNC démarré - mode 24/7")
    
    while True:
        cycle_count += 1
        try:
            log(f"📥 SYNC Cycle #{cycle_count} — Chargement Inbox…")
            await page.goto("https://www.airbnb.com/hosting/messages", wait_until="domcontentloaded", timeout=60000)
            await human_wait(1500, 2500)
            
            html = await page.content()
            if captcha_detected(html):
                log("⚠️ CAPTCHA détecté en inbox → arrêt propre du worker SYNC")
                log("   ➜ Reconnexion requise: python3 scripts/reconnect_airbnb.py")
                break
            
            # Récupération des conversations
            links_elements = page.locator("a[href*='/hosting/messages/'], a[href*='/messaging/threads/']")
            count = await links_elements.count()
            
            links = []
            for i in range(count):
                try:
                    href = await links_elements.nth(i).get_attribute("href")
                    if href:
                        if href.startswith("/"):
                            href = f"https://www.airbnb.com{href}"
                        links.append(href)
                except:
                    continue
            
            # Dédupliquer
            links = list(dict.fromkeys(links))
            log(f"📌 {len(links)} conversations détectées")
            
            for link in links:
                result = await process_conversation(page, link)
                if result == "CAPTCHA":
                    log("⚠️ CAPTCHA détecté lors du traitement → arrêt propre")
                    return
                await human_wait(400, 800)
                
        except KeyboardInterrupt:
            log("🛑 Arrêt demandé par l'utilisateur")
            break
        except Exception as e:
            log(f"❌ Erreur boucle SYNC : {e}")
            import traceback
            traceback.print_exc()
            # Continue même en cas d'erreur (sauf CAPTCHA)
            await asyncio.sleep(5)  # Attendre un peu avant de réessayer
        
        # Attendre avant le prochain cycle (24/7 en continu)
        wait_seconds = settings.SCRAPE_INTERVAL_SEC
        log(f"⏳ Cycle #{cycle_count} terminé - Attente {wait_seconds}s avant le prochain cycle...")
        await asyncio.sleep(wait_seconds)
    
    log("🛑 Worker SYNC arrêté")


async def send_worker(context):
    """
    Worker SEND : envoie les messages depuis la queue
    Tourne en continu 24/7, s'arrête uniquement en cas de CAPTCHA
    """
    page = await context.new_page()
    cycle_count = 0
    
    log("🚀 Worker SEND démarré - mode 24/7")
    
    while True:
        cycle_count += 1
        db = None
        try:
            db = get_db_session()
            
            # Récupérer un message en attente
            result = db.execute(
                text("""
                SELECT id, thread_id, payload_json, status 
                FROM queue_outbox 
                WHERE status = 'pending' 
                ORDER BY created_at 
                LIMIT 1
                """)
            )
            job = result.fetchone()
            db.close()
            db = None
            
            if not job:
                await human_wait(1500, 2500)
                continue
            
            job_id = job[0]
            thread_id = job[1]
            payload = job[2]
            
            # Parser le payload
            import json
            try:
                payload_data = json.loads(payload) if payload else {}
                message_body = payload_data.get("body") or payload_data.get("message") or ""
            except:
                message_body = payload or ""
            
            log(f"✉️ ENVOI — Conversation {thread_id}")
            
            # Marquer en processing
            db = get_db_session()
            db.execute(
                text("UPDATE queue_outbox SET status='processing', updated_at=NOW() WHERE id=:id"),
                {"id": job_id}
            )
            db.commit()
            db.close()
            db = None
            
            # Construire l'URL de la conversation
            convo_url = f"https://www.airbnb.com/hosting/messages/threads/{thread_id}"
            
            # Aller à la conversation
            await page.goto(convo_url, wait_until="domcontentloaded", timeout=60000)
            await human_wait(1000, 2000)
            
            html = await page.content()
            if captcha_detected(html):
                log("⚠️ CAPTCHA détecté → arrêt propre du worker SEND")
                log("   ➜ Reconnexion requise: python3 scripts/reconnect_airbnb.py")
                break
            
            # Chercher le champ de message
            input_selectors = [
                "[data-testid='thread-message-input']",
                "[data-testid='message-composer-input']",
                "[role='textbox']:not(button)",
                "textarea",
                "[contenteditable='true']",
            ]
            
            input_found = False
            for selector in input_selectors:
                try:
                    input_elem = page.locator(selector).first
                    if await input_elem.count() > 0 and await input_elem.is_visible():
                        await input_elem.fill(message_body)
                        input_found = True
                        log(f"✅ Message saisi avec selector: {selector}")
                        break
                except:
                    continue
            
            if not input_found:
                log("❌ Champ de message non trouvé")
                db = get_db_session()
                db.execute(
                    text("UPDATE queue_outbox SET status='failed', error_message='Champ non trouvé', updated_at=NOW() WHERE id=:id"),
                    {"id": job_id}
                )
                db.commit()
                db.close()
                continue
            
            await human_wait(500, 1200)
            
            # Chercher le bouton d'envoi
            send_selectors = [
                "[data-testid='thread-send-button']",
                "[data-testid*='send']",
                "button[type='submit']",
                "button:has-text('Send')",
                "button:has-text('Envoyer')",
            ]
            
            send_found = False
            for selector in send_selectors:
                try:
                    send_btn = page.locator(selector).first
                    if await send_btn.count() > 0 and await send_btn.is_visible():
                        await send_btn.click()
                        send_found = True
                        log(f"✅ Bouton d'envoi cliqué: {selector}")
                        break
                except:
                    continue
            
            # Fallback: Enter
            if not send_found:
                try:
                    await page.keyboard.press("Enter")
                    send_found = True
                    log("✅ Message envoyé avec Enter")
                except:
                    pass
            
            await human_wait(1500, 2500)
            
            # Vérifier que ça a été envoyé
            try:
                last_msg = page.locator("[data-testid='message-text'], .message-text").last
                if await last_msg.count() > 0:
                    last_text = await last_msg.inner_text()
                    if message_body.strip()[:20] in last_text:
                        db = get_db_session()
                        db.execute(
                            text("UPDATE queue_outbox SET status='sent', processed_at=NOW(), updated_at=NOW() WHERE id=:id"),
                            {"id": job_id}
                        )
                        db.commit()
                        db.close()
                        log("🟢 Message envoyé avec succès")
                    else:
                        raise Exception("Message non trouvé dans la conversation")
                else:
                    raise Exception("Aucun message trouvé")
            except Exception as e:
                log(f"⚠️ Vérification échouée: {e}, mais message peut-être envoyé")
                db = get_db_session()
                db.execute(
                    text("UPDATE queue_outbox SET status='sent', processed_at=NOW(), updated_at=NOW() WHERE id=:id"),
                    {"id": job_id}
                )
                db.commit()
                db.close()
                
        except KeyboardInterrupt:
            log("🛑 Arrêt demandé par l'utilisateur")
            break
        except Exception as e:
            log(f"❌ Erreur SEND : {e}")
            import traceback
            traceback.print_exc()
            if db:
                try:
                    db.rollback()
                    db.close()
                except:
                    pass
            # Continue même en cas d'erreur (sauf CAPTCHA)
            await asyncio.sleep(2)
        
        # Attendre avant de vérifier à nouveau la queue (24/7 en continu)
        await human_wait(800, 1500)
    
    log("🛑 Worker SEND arrêté")


async def main_async():
    """Lance les deux workers en parallèle"""
    log("🚀 Démarrage des workers SYNC et SEND...")
    
    session_dir = Path(settings.PLAYWRIGHT_SESSION_DIR)
    session_dir.mkdir(parents=True, exist_ok=True)
    
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            str(session_dir),
            headless=settings.AIRBNB_HEADLESS,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
            ]
        )
        
        log("✅ Context Playwright créé")
        
        # Lancer les deux workers en parallèle
        await asyncio.gather(
            sync_worker(context),
            send_worker(context),
        )


def start_sync_send():
    """Entry point pour lancer les workers"""
    asyncio.run(main_async())

