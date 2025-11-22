"""
Utilitaires pour Playwright : delays, randomisation, anti-ban
IMPORTANT: Utiliser human_interactions.py pour les interactions humaines
"""
import random
import time
import logging
from typing import Optional
from playwright.sync_api import Page
from src.config import settings
from src.playwright.human_interactions import HumanInteraction

logger = logging.getLogger(__name__)

# Alias pour compatibilité
random_delay = HumanInteraction.random_delay
human_type_delay = HumanInteraction.human_type_delay


def human_type_delay():
    """Délai entre chaque caractère lors de la saisie (simulation humaine)"""
    return random.randint(50, 150) / 1000.0


def take_screenshot_on_error(page: Page, error: Exception, context: str = ""):
    """Prend une capture d'écran en cas d'erreur pour debugging"""
    try:
        timestamp = int(time.time())
        filename = f"./logs/screenshot_error_{context}_{timestamp}.png"
        page.screenshot(path=filename, full_page=True)
        logger.error(f"📸 Screenshot sauvegardé: {filename}")
    except Exception as e:
        logger.error(f"❌ Impossible de prendre screenshot: {e}")


def wait_for_element_safe(
    page: Page,
    selector: str,
    timeout: int = 10000,
    state: str = "visible"
) -> bool:
    """Attend un élément de manière sécurisée avec retry"""
    try:
        page.wait_for_selector(selector, timeout=timeout, state=state)
        return True
    except Exception as e:
        logger.warning(f"⚠️ Élément non trouvé: {selector} - {e}")
        return False


def try_multiple_selectors(
    page: Page,
    selectors: list,
    action: callable,
    timeout: int = 5000
) -> bool:
    """Essaie plusieurs sélecteurs jusqu'à ce qu'un fonctionne"""
    for selector in selectors:
        try:
            if wait_for_element_safe(page, selector, timeout=timeout):
                action(selector)
                return True
        except Exception as e:
            logger.debug(f"Tentative échouée avec {selector}: {e}")
            continue
    
    return False


def scroll_to_element(page: Page, selector: str):
    """Scroll jusqu'à un élément"""
    try:
        element = page.locator(selector).first
        element.scroll_into_view_if_needed()
        random_delay(300, 600)
    except Exception as e:
        logger.warning(f"⚠️ Impossible de scroller vers {selector}: {e}")


def check_for_captcha(page: Page) -> bool:
    """Vérifie si une page de captcha est présente"""
    captcha_indicators = [
        "captcha",
        "challenge",
        "verify you're human",
        "robot",
    ]
    
    page_content = page.content().lower()
    for indicator in captcha_indicators:
        if indicator in page_content:
            logger.warning("🚨 CAPTCHA détecté!")
            return True
    
    return False


def check_for_login_redirect(page: Page) -> bool:
    """Vérifie si on a été redirigé vers la page de login"""
    current_url = page.url
    if "/login" in current_url or "/signup" in current_url:
        logger.warning("🚨 Redirection vers login détectée!")
        return True
    return False


def safe_click(page: Page, selector: str, timeout: int = 5000):
    """Clique sur un élément de manière sécurisée"""
    try:
        element = page.locator(selector).first
        if element.is_visible(timeout=timeout):
            element.click(timeout=timeout)
            random_delay(500, 1000)
            return True
    except Exception as e:
        logger.warning(f"⚠️ Impossible de cliquer sur {selector}: {e}")
        return False
    return False


def safe_fill(page: Page, selector: str, text: str, timeout: int = 5000):
    """Remplit un champ de manière sécurisée"""
    try:
        element = page.locator(selector).first
        if element.is_visible(timeout=timeout):
            element.click(timeout=timeout)
            random_delay(200, 400)
            element.fill(text, timeout=timeout)
            random_delay(300, 600)
            return True
    except Exception as e:
        logger.warning(f"⚠️ Impossible de remplir {selector}: {e}")
        return False
    return False

