"""
Détection et gestion propre du CAPTCHA
Si un CAPTCHA est détecté, le worker s'arrête proprement et envoie une alerte
"""
import logging
import time
from playwright.sync_api import Page
from src.services.notifier import notify_captcha_detected
from src.config import settings

logger = logging.getLogger(__name__)


class CaptchaDetected(Exception):
    """Exception levée quand un CAPTCHA est détecté"""
    pass


def check_for_captcha(page: Page) -> bool:
    """
    Vérifie si un CAPTCHA visible/actif est présent sur la page
    
    Args:
        page: Page Playwright
        
    Returns:
        True si un CAPTCHA actif est détecté, False sinon
    """
    try:
        current_url = page.url.lower()
        
        # Vérifier d'abord les sélecteurs de CAPTCHA visibles (plus fiable)
        # Si un iframe CAPTCHA est présent et visible, c'est un vrai CAPTCHA
        captcha_iframe_selectors = [
            'iframe[src*="recaptcha/api2/anchor"]',
            'iframe[src*="recaptcha/api2/bframe"]',
            'iframe[src*="hcaptcha.com"]',
            'iframe[title*="recaptcha"]',
            'iframe[title*="hcaptcha"]',
        ]
        
        for selector in captcha_iframe_selectors:
            try:
                iframe = page.locator(selector).first
                if iframe.count() > 0:
                    # Vérifier si l'iframe est visible
                    try:
                        box = iframe.bounding_box()
                        if box and box.get('width', 0) > 0 and box.get('height', 0) > 0:
                            logger.warning(f"🚨 CAPTCHA détecté (iframe visible: '{selector}')")
                            return True
                    except:
                        # Si on peut pas vérifier la visibilité, mais l'iframe existe, c'est suspect
                        logger.debug(f"⚠️ Iframe CAPTCHA trouvée mais visibilité indéterminée: {selector}")
            except:
                continue
        
        # Vérifier les éléments CAPTCHA visibles (pas juste dans le code)
        visible_captcha_selectors = [
            '[class*="recaptcha-challenge"]',
            '[id*="recaptcha-challenge"]',
            '[class*="hcaptcha-box"]',
            '[id*="hcaptcha-box"]',
        ]
        
        for selector in visible_captcha_selectors:
            try:
                element = page.locator(selector).first
                if element.count() > 0:
                    # Vérifier si l'élément est visible
                    try:
                        if element.is_visible():
                            logger.warning(f"🚨 CAPTCHA détecté (élément visible: '{selector}')")
                            return True
                    except:
                        pass
            except:
                continue
        
        # Vérifier uniquement les URLs de challenge (pas le contenu HTML qui peut contenir "captcha" dans le JS)
        challenge_urls = [
            "/challenge",
            "/verify",
            "/robot",
        ]
        
        for challenge in challenge_urls:
            if challenge in current_url:
                logger.warning(f"🚨 CAPTCHA détecté (URL challenge: '{challenge}')")
                return True
        
        # Dernière vérification : chercher des messages explicites de CAPTCHA visibles
        try:
            # Chercher du texte visible indiquant un CAPTCHA
            visible_text_indicators = [
                "verify you're human",
                "are you a robot",
                "confirmez que vous êtes humain",
                "vérification humaine requise",
            ]
            
            for text in visible_text_indicators:
                element = page.locator(f"text={text}").first
                if element.count() > 0:
                    try:
                        if element.is_visible():
                            logger.warning(f"🚨 CAPTCHA détecté (texte visible: '{text}')")
                            return True
                    except:
                        pass
        except:
            pass
        
        # Si aucun CAPTCHA visible n'est détecté, on retourne False
        return False
        
    except Exception as e:
        logger.debug(f"Erreur lors de la vérification CAPTCHA: {e}")
        return False


def handle_captcha(page: Page, raise_exception: bool = True):
    """
    Gère la détection d'un CAPTCHA :
    - Log l'événement
    - Prend un screenshot pour debugging
    - Envoie une alerte
    - Lève une exception si demandé
    
    Args:
        page: Page Playwright
        raise_exception: Si True, lève CaptchaDetected après avoir géré le CAPTCHA
        
    Raises:
        CaptchaDetected: Si raise_exception est True
    """
    if not check_for_captcha(page):
        return
    
    logger.error("=" * 60)
    logger.error("🚨 CAPTCHA DÉTECTÉ - ARRÊT PROPRE DU WORKER")
    logger.error("=" * 60)
    logger.error("Un CAPTCHA a été détecté sur la page Airbnb.")
    logger.error("Le worker va s'arrêter proprement.")
    logger.error("Action requise: Reconnexion manuelle via scripts/reconnect_airbnb.py")
    logger.error("=" * 60)
    
    # Prendre un screenshot pour debugging
    try:
        screenshot_path = f"./logs/captcha_detected_{int(time.time())}.png"
        page.screenshot(path=screenshot_path, full_page=True)
        logger.info(f"📸 Screenshot sauvegardé: {screenshot_path}")
    except Exception as e:
        logger.warning(f"Impossible de prendre screenshot: {e}")
    
    # Envoyer une alerte
    try:
        notify_captcha_detected()
    except Exception as e:
        logger.warning(f"Impossible d'envoyer l'alerte: {e}")
    
    # Lever l'exception pour arrêter le worker
    if raise_exception:
        raise CaptchaDetected("CAPTCHA détecté sur Airbnb - Reconnexion manuelle requise")


def check_for_login_redirect(page: Page) -> bool:
    """
    Vérifie si on a été redirigé vers la page de login (session expirée)
    
    Args:
        page: Page Playwright
        
    Returns:
        True si redirection vers login détectée
    """
    current_url = page.url.lower()
    login_indicators = ["/login", "/signup", "/sign-in"]
    
    for indicator in login_indicators:
        if indicator in current_url:
            logger.warning(f"🚨 Redirection vers login détectée: {current_url}")
            return True
    
    return False

