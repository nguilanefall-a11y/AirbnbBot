"""
Worker SYNC qui scrape 2 mois d'historique de toutes les conversations
"""
import asyncio
import random
import logging
from datetime import datetime, timedelta
from playwright.async_api import async_playwright
from sqlalchemy import text
from pathlib import Path
import sys

from src.config import settings
from src.db.db import get_db_session

# Ajouter le chemin parent pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

logger = logging.getLogger(__name__)


def log(msg):
    """Log avec timestamp"""
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[SYNC-2MONTHS {now}] {msg}")
    logger.info(msg)


async def human_delay(min_ms=600, max_ms=1800):
    """Attente humaine aléatoire (en millisecondes)"""
    await asyncio.sleep(random.uniform(min_ms/1000, max_ms/1000))


def captcha_detected(html: str) -> bool:
    """Détecte si une page contient un CAPTCHA"""
    keywords = ["captcha", "robot", "security", "verify", "suspicious"]
    html_lower = html.lower()
    return any(k in html_lower for k in keywords)


def generate_message_id(conversation_id: str, sender: str, content: str, timestamp: str) -> str:
    """Génère un ID unique pour un message"""
    import hashlib
    key = f"{conversation_id}-{sender}-{timestamp}-{content}"
    return hashlib.sha256(key.encode()).hexdigest()[:36]


def save_message(conversation_id: str, sender: str, content: str, timestamp: str, direction: str = "inbound") -> bool:
    """
    Sauvegarde un message SI et SEULEMENT SI il est nouveau ET récent (< 60 jours).
    """
    db = get_db_session()
    try:
        # Parser le timestamp
        try:
            ts_str = timestamp.replace("Z", "+00:00") if timestamp else datetime.utcnow().isoformat()
            ts = datetime.fromisoformat(ts_str)
        except:
            ts = datetime.utcnow()
        
        # Ignore messages trop anciens (> 60 jours)
        limit = datetime.utcnow() - timedelta(days=60)
        if ts < limit:
            return False
        
        message_id = generate_message_id(conversation_id, sender, content, timestamp)
        
        # Vérifier si le message existe déjà
        exists = db.execute(
            text("SELECT 1 FROM messages WHERE airbnb_message_id = :id OR id = :id"),
            {"id": message_id}
        ).fetchone()
        
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
            import uuid
            conv_id = str(uuid.uuid4())
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
                "sent_at": ts.isoformat(),
                "airbnb_id": message_id
            }
        )
        
        db.commit()
        return True
        
    except Exception as e:
        db.rollback()
        log(f"❌ Erreur save_message: {e}")
        return False
    finally:
        db.close()


def delete_old_messages():
    """Supprime les messages de plus de 60 jours"""
    db = get_db_session()
    try:
        result = db.execute(
            text("""
            DELETE FROM messages 
            WHERE sent_at < NOW() - INTERVAL '60 days'
            OR (sent_at IS NULL AND created_at < NOW() - INTERVAL '60 days')
            """)
        )
        deleted = result.rowcount
        db.commit()
        if deleted > 0:
            log(f"🗑️ {deleted} ancien(s) message(s) supprimé(s)")
    except Exception as e:
        db.rollback()
        log(f"❌ Erreur delete_old_messages: {e}")
    finally:
        db.close()


async def notify_ai(conversation_id: str, sender: str, content: str):
    """Envoie un nouveau message à l'API IA"""
    if not settings.AI_WEBHOOK_URL:
        return
    
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.post(
                settings.AI_WEBHOOK_URL,
                json={
                    "conversation_id": conversation_id,
                    "sender": sender,
                    "message": content
                },
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    log(f"✅ Notification IA envoyée")
    except Exception as e:
        log(f"⚠️ Erreur notification IA: {e}")


async def scroll_up_to_two_months(page):
    """Scroll jusqu'à atteindre environ 60 jours d'historique."""
    log("📜 Scroll pour récupérer 2 mois d'historique...")
    last_height = None
    scroll_count = 0
    max_scrolls = 80  # Limite de sécurité
    
    for _ in range(max_scrolls):
        scroll_count += 1
        
        # Scroll vers le haut
        await page.mouse.wheel(0, -1200)
        await human_delay(500, 900)
        
        # Vérifier les timestamps
        try:
            timestamps = await page.locator("time").evaluate_all(
                "nodes => nodes.map(n => n.getAttribute('datetime')).filter(n => n)"
            )
            
            if timestamps:
                # Trouver le plus ancien timestamp
                oldest = min(timestamps)
                try:
                    dt_str = oldest.replace("Z", "+00:00")
                    dt = datetime.fromisoformat(dt_str)
                    days_ago = (datetime.utcnow() - dt.replace(tzinfo=None)).days
                    
                    if days_ago >= 60:
                        log(f"✅ 60 jours d'historique atteint après {scroll_count} scrolls")
                        return
                    
                    if scroll_count % 10 == 0:
                        log(f"   ... {days_ago} jours d'historique récupéré...")
                except:
                    pass
        except:
            pass
        
        # Vérifier si on peut encore scroller
        try:
            current_height = await page.evaluate("document.body.scrollHeight")
            if current_height == last_height:
                log(f"→ Fin du scroll (aucun contenu supplémentaire) après {scroll_count} scrolls")
                break
            last_height = current_height
        except:
            pass
    
    log(f"✅ Scroll terminé ({scroll_count} scrolls)")


async def process_conversation(page, convo_url: str):
    """Traite une conversation en scrollant 2 mois d'historique"""
    try:
        await page.goto(convo_url, wait_until="domcontentloaded", timeout=60000)
        await human_delay(800, 1500)
        
        # Vérifier CAPTCHA
        html = await page.content()
        if captcha_detected(html):
            log("⚠️ CAPTCHA détecté → arrêt")
            return "CAPTCHA"
        
        # Scroll jusqu'à 2 mois
        await scroll_up_to_two_months(page)
        
        # Attendre un peu que tout se stabilise
        await human_delay(1000, 2000)
        
        # Récupérer tous les messages
        items = page.locator("[data-testid='message-item'], .message, [class*='message']")
        count = await items.count()
        
        if count == 0:
            log("⚠️ Aucun message trouvé")
            return "EMPTY"
        
        log(f"→ {count} messages trouvés")
        
        conversation_id = convo_url.split("/")[-1].split("?")[0]
        new_messages_count = 0
        
        for i in range(count):
            try:
                msg = items.nth(i)
                
                # Récupérer le sender
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
                
                # Déterminer la direction
                direction = "inbound" if sender.lower() not in ["you", "vous", "toi", "moi"] else "outbound"
                
                # Sauvegarder le message
                is_new = save_message(conversation_id, sender, body, timestamp, direction)
                
                if is_new and direction == "inbound":
                    new_messages_count += 1
                    log(f"🟢 Nouveau message → {sender}: {body[:50]}...")
                    await notify_ai(conversation_id, sender, body)
                    
            except Exception as e:
                log(f"⚠️ Erreur traitement message {i}: {e}")
                continue
        
        if new_messages_count > 0:
            log(f"✅ {new_messages_count} nouveau(x) message(s) sauvegardé(s)")
        
        return "OK"
        
    except Exception as e:
        log(f"❌ Erreur process_conversation: {e}")
        import traceback
        traceback.print_exc()
        return "ERROR"


async def sync_two_months():
    """Boucle principale SYNC — scanne toutes les conversations sur 2 mois."""
    log("🚀 Démarrage worker SYNC 2 MOIS...")
    
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
        
        page = await context.new_page()
        
        while True:
            try:
                log("→ Chargement de l'inbox...")
                await page.goto("https://www.airbnb.com/hosting/messages", wait_until="domcontentloaded", timeout=60000)
                await human_delay(1500, 2500)
                
                html = await page.content()
                if captcha_detected(html):
                    log("⚠️ CAPTCHA détecté → arrêt SYNC")
                    break
                
                # Récupérer les liens des conversations
                convo_links_elem = page.locator("a[href*='/hosting/messages/'], a[href*='/messaging/threads/']")
                count = await convo_links_elem.count()
                
                convo_links = []
                for i in range(count):
                    try:
                        href = await convo_links_elem.nth(i).get_attribute("href")
                        if href:
                            if href.startswith("/"):
                                href = f"https://www.airbnb.com{href}"
                            if "/messaging/threads/" in href or "/hosting/messages/" in href:
                                convo_links.append(href)
                    except:
                        continue
                
                # Dédupliquer
                convo_links = list(dict.fromkeys(convo_links))
                log(f"📌 {len(convo_links)} conversations trouvées")
                
                # Traiter chaque conversation
                for link in convo_links:
                    result = await process_conversation(page, link)
                    if result == "CAPTCHA":
                        return
                    await human_delay(500, 1200)
                
                # Nettoyage occasionnel des anciens messages
                if random.random() < 0.15:  # 15% de chance à chaque cycle
                    delete_old_messages()
                
            except Exception as e:
                log(f"❌ Erreur SYNC: {e}")
                import traceback
                traceback.print_exc()
            
            # Attendre avant le prochain cycle
            wait_seconds = settings.SCRAPE_INTERVAL_SEC
            log(f"⏳ Attente {wait_seconds}s avant le prochain cycle...")
            await asyncio.sleep(wait_seconds)
    
    log("SYNC terminé.")


def start_sync_2months():
    """Entry point pour lancer le worker SYNC 2 mois"""
    asyncio.run(sync_two_months())


if __name__ == "__main__":
    start_sync_2months()

