"""
Gestionnaire de navigateur Playwright avec session persistante et configuration robuste
"""
import os
import logging
import random
from contextlib import contextmanager
from pathlib import Path
from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page
from src.config import settings

logger = logging.getLogger(__name__)

# User-agents réalistes (rotation pour plus de naturalité)
USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
]

# Viewports réalistes
VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1440, "height": 900},
    {"width": 1536, "height": 864},
]


class BrowserManager:
    """
    Gestionnaire de navigateur Playwright robuste avec :
    - Session persistante
    - Configuration anti-détection (user-agent, viewport réalistes)
    - Gestion d'erreurs propre
    """
    
    def __init__(self):
        self.playwright = None
        self.browser: Browser = None
        self.context: BrowserContext = None
        self._session_path = Path(settings.PLAYWRIGHT_SESSION_PATH)
        self._session_path.parent.mkdir(parents=True, exist_ok=True)
        self._user_agent = random.choice(USER_AGENTS)
        self._viewport = random.choice(VIEWPORTS)
    
    def start(self):
        """Démarre Playwright et le navigateur avec configuration robuste"""
        try:
            # Utiliser sync_playwright() directement - il gère son propre contexte
            self.playwright = sync_playwright().start()
            
            # Configuration du navigateur (anti-détection)
            self.browser = self.playwright.chromium.launch(
                headless=settings.AIRBNB_HEADLESS,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",
                ],
                timeout=settings.PLAYWRIGHT_TIMEOUT,
            )
            
            # Charger la session si elle existe
            storage_state = None
            session_file = self._session_path
            
            # Si c'est un répertoire, chercher storage_state.json à l'intérieur
            if session_file.is_dir():
                session_file = session_file / "storage_state.json"
            
            if session_file.exists() and session_file.is_file():
                try:
                    storage_state = str(session_file)
                    logger.info(f"📂 Session chargée depuis: {storage_state}")
                except Exception as e:
                    logger.warning(f"⚠️ Impossible de charger la session: {e}")
            
            # Configuration du contexte (plus réaliste)
            self.context = self.browser.new_context(
                viewport=self._viewport,
                user_agent=self._user_agent,
                locale="fr-FR",
                timezone_id="Europe/Paris",
                permissions=["geolocation"],
                geolocation={"latitude": 48.8566, "longitude": 2.3522},  # Paris
                storage_state=storage_state,
                # Masquer les traces d'automation
                ignore_https_errors=True,
                # Extra headers pour paraître plus naturel
                extra_http_headers={
                    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                },
            )
            
            # Masquer les propriétés webdriver
            self.context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
                window.navigator.chrome = {
                    runtime: {}
                };
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5]
                });
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['fr-FR', 'fr', 'en-US', 'en']
                });
            """)
            
            logger.info("✅ Navigateur Playwright démarré")
            logger.debug(f"   User-Agent: {self._user_agent[:50]}...")
            logger.debug(f"   Viewport: {self._viewport['width']}x{self._viewport['height']}")
            return self.context
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du démarrage du navigateur: {e}")
            raise
    
    def save_session(self):
        """Sauvegarde la session (cookies, storage)"""
        try:
            if self.context:
                self.context.storage_state(path=str(self._session_path))
                logger.info(f"💾 Session sauvegardée: {self._session_path}")
        except Exception as e:
            logger.error(f"❌ Erreur lors de la sauvegarde de la session: {e}")
    
    def new_page(self) -> Page:
        """Crée une nouvelle page"""
        if not self.context:
            self.start()
        return self.context.new_page()
    
    def close(self):
        """Ferme le navigateur et sauvegarde la session"""
        try:
            if self.context:
                self.save_session()
                self.context.close()
            if self.browser:
                self.browser.close()
            if self.playwright:
                self.playwright.stop()
            logger.info("🔒 Navigateur fermé")
        except Exception as e:
            logger.error(f"❌ Erreur lors de la fermeture: {e}")
    
    def __enter__(self):
        """Context manager entry"""
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()


@contextmanager
def get_browser_manager():
    """Context manager pour obtenir un BrowserManager"""
    manager = BrowserManager()
    try:
        manager.start()
        yield manager
    finally:
        manager.close()


def check_session_exists() -> bool:
    """Vérifie si une session existe"""
    return Path(settings.PLAYWRIGHT_SESSION_PATH).exists()

