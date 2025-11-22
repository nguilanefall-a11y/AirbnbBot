#!/usr/bin/env python3
"""
Script pour la première connexion manuelle à Airbnb
Lance Playwright en mode visible pour se connecter et sauvegarder la session
"""
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from playwright.sync_api import sync_playwright
from src.config import settings
from src.playwright.browser_manager import BrowserManager

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Connexion à Airbnb")
    parser.add_argument("--email", help="Email Airbnb")
    parser.add_argument("--password", help="Mot de passe Airbnb")
    parser.add_argument("--auto", action="store_true", help="Connexion automatique")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("🔐 Connexion à Airbnb")
    print("=" * 60)
    print()
    
    try:
        # Forcer le mode visible pour la première connexion
        original_headless = settings.AIRBNB_HEADLESS
        settings.AIRBNB_HEADLESS = False
        
        with BrowserManager() as manager:
            page = manager.new_page()
            
            print("🌐 Ouverture de la page de login Airbnb...")
            page.goto("https://www.airbnb.com/login", wait_until="domcontentloaded", timeout=60000)
            
            # Connexion automatique si credentials fournis
            auto_login = False
            if args.email and args.password:
                print(f"🔑 Connexion automatique avec {args.email}...")
                auto_login = True
                
                try:
                    # Trouver et remplir le champ email
                    email_input = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first
                    if email_input.is_visible(timeout=10000):
                        email_input.fill(args.email)
                        print("✅ Email saisi")
                    else:
                        print("⚠️  Champ email non trouvé, connexion manuelle requise")
                        auto_login = False
                        raise Exception("Email input not found")
                    
                    # Cliquer sur continuer ou trouver le bouton suivant
                    try:
                        continue_button = page.locator('button[type="submit"], button:has-text("Continuer"), button:has-text("Continue")').first
                        if continue_button.is_visible(timeout=5000):
                            continue_button.click()
                            page.wait_for_timeout(2000)
                    except:
                        pass
                    
                    # Trouver et remplir le champ password
                    password_input = page.locator('input[type="password"], input[name="password"]').first
                    if password_input.is_visible(timeout=10000):
                        password_input.fill(args.password)
                        print("✅ Mot de passe saisi")
                        
                        # Cliquer sur se connecter
                        login_button = page.locator('button[type="submit"], button:has-text("Se connecter"), button:has-text("Log in")').first
                        if login_button.is_visible(timeout=5000):
                            login_button.click()
                            print("✅ Tentative de connexion...")
                            
                            # Attendre la redirection
                            page.wait_for_timeout(5000)
                        else:
                            auto_login = False
                    else:
                        print("⚠️  Champ mot de passe non trouvé, connexion manuelle requise")
                        auto_login = False
                except Exception as e:
                    print(f"⚠️  Erreur connexion automatique: {e}")
                    print("   Passage en mode manuel...")
                    auto_login = False
            
            if not auto_login:
                print()
                print("=" * 60)
                print("📋 INSTRUCTIONS:")
                print("=" * 60)
                print("1. Connecte-toi à ton compte co-hôte Airbnb dans le navigateur")
                print("2. Si tu as un MFA/captcha, complète-le")
                print("3. Une fois connecté, reviens ici et appuie sur Enter")
                print("=" * 60)
                print()
                
                input("Appuie sur Enter une fois connecté...")
            
            # Vérifier qu'on est bien connecté
            page.wait_for_timeout(2000)
            current_url = page.url
            if "/login" in current_url or "/signup" in current_url:
                print("⚠️  Tu n'es pas encore connecté. Complète la connexion dans le navigateur.")
                input("Appuie sur Enter une fois connecté...")
                current_url = page.url
                if "/login" in current_url or "/signup" in current_url:
                    print("❌ Connexion échouée. Réessaie.")
                    return 1
            
            # Sauvegarder la session
            manager.save_session()
            
            print()
            print("✅ Session sauvegardée avec succès!")
            print(f"📂 Fichier: {settings.PLAYWRIGHT_SESSION_PATH}")
            print()
            print("Tu peux maintenant lancer les workers en mode headless.")
            return 0
            
    except KeyboardInterrupt:
        print("\n🛑 Interrompu par l'utilisateur")
        return 1
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

