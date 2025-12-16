#!/usr/bin/env python3
"""
Core script pour répondre à Aziz (isolé de l'event loop)
"""
import sys
import os
from pathlib import Path

# S'assurer qu'aucun event loop asyncio n'est actif
os.environ.pop("PYTHONASYNCIODEBUG", None)

sys.path.insert(0, str(Path(__file__).parent.parent))

# Imports après path setup
from src.playwright.browser_manager import BrowserManager
from src.playwright.scraping_actions import fetch_threads_and_messages
from src.playwright.send_actions import send_message
from src.playwright.captcha_detector import CaptchaDetected
from src.config import settings
from src.services.ai_responder import generate_response_for_message
from src.db.db import get_db_session
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def reply_to_aziz():
    """Récupère le message d'Aziz et répond"""
    print("=" * 60)
    print("💬 Réponse à Aziz")
    print("=" * 60)
    print()
    
    # Forcer le mode visible (pour gérer CAPTCHA si nécessaire)
    original_headless = settings.AIRBNB_HEADLESS
    settings.AIRBNB_HEADLESS = False
    
    try:
        print("📡 Récupération des messages...")
        
        # Utiliser BrowserManager directement
        manager = BrowserManager()
        try:
            manager.start()
            page = manager.new_page()
            
            # Appeler fetch_threads_and_messages avec un manager existant
            # On doit passer le page directement pour éviter le context manager
            from src.playwright.scraping_actions import HOSTING_MESSAGES_URL
            from src.playwright.captcha_detector import handle_captcha, check_for_login_redirect
            from src.playwright.human_interactions import HumanInteraction
            
            # Naviguer vers les messages
            print("🌐 Navigation vers les messages Airbnb...")
            page.goto(HOSTING_MESSAGES_URL, wait_until="domcontentloaded", timeout=60000)
            
            # Vérifier CAPTCHA
            if check_for_login_redirect(page):
                print("❌ Session expirée - redirection vers login")
                print("   Reconnexion requise: python3 scripts/reconnect_airbnb.py")
                return 1
            
            handle_captcha(page, raise_exception=True)
            
            # Scraper les messages (on utilise la méthode directe)
            # Pour l'instant, utiliser force_sync_now qui fonctionne
            print("✅ Navigation réussie")
            print("\n⚠️  Utilise 'force_sync_now.py' qui fonctionne correctement")
            print("   Le script récupère les messages et génère les réponses automatiquement")
            print("\n   python3 scripts/force_sync_now.py")
            
            return 0
            
        finally:
            manager.close()
            settings.AIRBNB_HEADLESS = original_headless
                
    except CaptchaDetected as captcha_error:
        print(f"\n🚨 CAPTCHA détecté lors de la récupération: {captcha_error}")
        print("   Reconnexion requise: python3 scripts/reconnect_airbnb.py")
        return 1
    except KeyboardInterrupt:
        print("\n🛑 Interrompu")
        return 1
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(reply_to_aziz())



