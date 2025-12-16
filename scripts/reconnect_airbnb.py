#!/usr/bin/env python3
"""
Script pour reconnecter automatiquement à Airbnb et sauvegarder la session
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.playwright.browser_manager import BrowserManager
from src.config import settings

def reconnect():
    """Reconnecte à Airbnb et sauvegarde la session"""
    print("=" * 60)
    print("🔐 Reconnexion à Airbnb")
    print("=" * 60)
    print()
    print("Le navigateur va s'ouvrir.")
    print("Connecte-toi manuellement à Airbnb.")
    print("Le script détectera automatiquement la connexion et sauvegardera la session.")
    print()
    
    # Forcer le mode visible
    settings.AIRBNB_HEADLESS = False
    
    try:
        with BrowserManager() as manager:
            page = manager.new_page()
            
            print("🌐 Ouverture de la page de login Airbnb...")
            page.goto("https://www.airbnb.com/login", wait_until="domcontentloaded", timeout=60000)
            
            print()
            print("=" * 60)
            print("📋 INSTRUCTIONS:")
            print("=" * 60)
            print("1. Connecte-toi manuellement dans le navigateur")
            print("2. Si tu as un MFA/captcha, complète-le")
            print("3. Attends que le script détecte automatiquement la connexion")
            print("   (il vérifie toutes les 5 secondes pendant 5 minutes)")
            print("=" * 60)
            print()
            
            # Attendre la connexion automatiquement
            max_wait = 60 * 5  # 5 minutes
            check_interval = 5  # toutes les 5 secondes
            waited = 0
            
            while waited < max_wait:
                try:
                    # Naviguer vers la page des messages pour vérifier la connexion
                    page.goto("https://www.airbnb.com/hosting/messages", wait_until="domcontentloaded", timeout=10000)
                    current_url = page.url
                    
                    # Vérifier si on est connecté (pas de redirection vers login)
                    if "/login" not in current_url and "/signup" not in current_url:
                        # On est connecté !
                        print()
                        print("✅ Connexion détectée !")
                        
                        # Sauvegarder la session
                        manager.save_session()
                        
                        print()
                        print("✅ Session sauvegardée avec succès!")
                        print(f"📂 Fichier: {settings.PLAYWRIGHT_SESSION_PATH}")
                        print()
                        print("Tu peux maintenant fermer le navigateur.")
                        print("La synchronisation peut reprendre.")
                        return 0
                    
                    # Pas encore connecté, attendre un peu
                    print(f"⏳ En attente de connexion... ({waited}/{max_wait}s)", end='\r')
                    time.sleep(check_interval)
                    waited += check_interval
                    
                except Exception as e:
                    # Erreur de navigation, continuer d'attendre
                    time.sleep(check_interval)
                    waited += check_interval
            
            print()
            print("⚠️  Timeout atteint. Si tu es connecté, la session a peut-être été sauvegardée.")
            print("   Sinon, relance le script.")
            return 1
            
    except KeyboardInterrupt:
        print("\n🛑 Interrompu par l'utilisateur")
        return 1
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(reconnect())



