"""
Actions Playwright pour envoyer des messages sur Airbnb
"""
import logging
import time
from typing import Tuple, Optional
from playwright.sync_api import Page
from src.playwright.browser_manager import BrowserManager
from src.playwright.selectors import THREAD_URL_TEMPLATE, SELECTORS, FALLBACK_SELECTORS
from src.playwright.utils import (
    random_delay, wait_for_element_safe, take_screenshot_on_error,
    try_multiple_selectors, safe_click, safe_fill
)
from src.playwright.captcha_detector import handle_captcha, check_for_login_redirect
from src.playwright.human_interactions import HumanInteraction
from src.config import settings

logger = logging.getLogger(__name__)


def send_message(thread_id: str, message: str) -> Tuple[bool, Optional[str]]:
    """
    Envoie un message sur Airbnb via Playwright
    
    Returns:
        (success: bool, error_message: Optional[str])
    """
    with BrowserManager() as manager:
        page = manager.new_page()
        
        try:
            # ✅ VÉRIFICATION COOKIES: Tester la session avant de continuer
            logger.info("🔐 Vérification de la validité de la session...")
            page.goto("https://www.airbnb.com/hosting/inbox", wait_until="domcontentloaded", timeout=30000)
            random_delay(2000, 3000)
            
            current_url = page.url
            if "/login" in current_url or "/authenticate" in current_url:
                logger.error("🚨 COOKIES EXPIRÉS - SESSION INVALIDE")
                logger.error("🚨 Action requise: Refaire l'authentification avec reconnect_airbnb.py")
                # Pause visuelle pour debug
                if not settings.AIRBNB_HEADLESS:
                    logger.info("⏸️  Pause de 10s pour inspection visuelle...")
                    time.sleep(10)
                return False, "🚨 COOKIES EXPIRÉS - REFAIRE L'AUTH"
            
            logger.info("✅ Session valide, continuons...")
            
            # Naviguer vers la conversation
            thread_url = THREAD_URL_TEMPLATE.format(thread_id=thread_id)
            logger.info(f"🌐 Navigation vers: {thread_url}")
            
            page.goto(thread_url, wait_until="networkidle", timeout=60000)
            random_delay(3000, 5000)
            
            # Vérifier les redirections
            if check_for_login_redirect(page):
                return False, "Session expirée - redirection vers login"
            
            # Détection et gestion propre du CAPTCHA
            try:
                handle_captcha(page, raise_exception=True)
            except Exception as captcha_error:
                return False, f"CAPTCHA détecté - arrêt propre: {str(captcha_error)}"
            
            # Trouver le champ de message
            logger.info("🔍 Recherche du champ de message...")
            input_found = False
            input_selector = None
            
            # Essayer les sélecteurs dans l'ordre
            for selector in FALLBACK_SELECTORS["composer_input"]:
                if wait_for_element_safe(page, selector, timeout=5000):
                    input_selector = selector
                    input_found = True
                    logger.info(f"✅ Champ trouvé avec: {selector}")
                    break
            
            if not input_found:
                take_screenshot_on_error(page, Exception("Champ non trouvé"), "send_message")
                return False, "Champ de message non trouvé"
            
            # Saisir le message avec interactions humaines
            logger.info(f"✍️ Saisie du message: {message[:50]}...")
            try:
                element = page.locator(input_selector).first
                
                # Scroll naturel vers l'élément
                HumanInteraction.scroll_naturally(page, element)
                
                # Cliquer avec délai naturel
                HumanInteraction.click_with_delay(element, delay_before=300, delay_after=500)
                
                # Taper avec rythme humain
                HumanInteraction.type_with_human_rhythm(element, message)
                
                logger.info("✅ Message saisi")
                
            except Exception as e:
                logger.error(f"❌ Erreur lors de la saisie: {e}")
                return False, f"Erreur saisie: {str(e)}"
            
            # Trouver et cliquer sur le bouton d'envoi
            logger.info("🔍 Recherche du bouton d'envoi...")
            send_found = False
            
            for selector in FALLBACK_SELECTORS["send_button"]:
                try:
                    button = page.locator(selector).first
                    if button.is_visible(timeout=2000) and not button.is_disabled():
                        button.click(timeout=5000)
                        send_found = True
                        logger.info(f"✅ Bouton trouvé et cliqué: {selector}")
                        break
                except:
                    continue
            
            # Fallback: utiliser Enter
            if not send_found:
                logger.warning("⚠️ Bouton non trouvé, tentative avec Enter...")
                try:
                    page.keyboard.press("Enter")
                    send_found = True
                    logger.info("✅ Message envoyé avec Enter")
                except Exception as e:
                    logger.error(f"❌ Erreur avec Enter: {e}")
            
            if not send_found:
                return False, "Bouton d'envoi non trouvé"
            
            # Attendre que le message soit envoyé (délai naturel)
            HumanInteraction.random_delay(2000, 3500)
            
            # Vérifier que le message apparaît (optionnel)
            try:
                # Attendre que le message apparaisse dans la liste
                page.wait_for_selector(
                    f"text={message[:30]}",
                    timeout=10000,
                    state="visible"
                )
                logger.info("✅ Message vérifié dans la conversation")
            except:
                # Même si la vérification échoue, on assume le succès
                logger.warning("⚠️ Vérification échouée, mais message peut-être envoyé")
            
            logger.info("✅ Message envoyé avec succès!")
            return True, None
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'envoi: {e}")
            take_screenshot_on_error(page, e, "send_message")
            return False, str(e)


def send_message_batch(thread_id: str, messages: list) -> Tuple[int, int]:
    """
    Envoie plusieurs messages à la suite (avec delays)
    
    Returns:
        (success_count, failed_count)
    """
    success_count = 0
    failed_count = 0
    
    for i, message in enumerate(messages):
        success, error = send_message(thread_id, message)
        
        if success:
            success_count += 1
        else:
            failed_count += 1
            logger.error(f"❌ Échec message {i+1}/{len(messages)}: {error}")
        
        # Délai entre les messages
        if i < len(messages) - 1:
            random_delay(3000, 6000)
    
    return success_count, failed_count

