#!/usr/bin/env python3
"""
Script pour tester les sélecteurs Playwright sur une conversation Airbnb
"""
import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.playwright.browser_manager import BrowserManager
from src.playwright.selectors import SELECTORS, FALLBACK_SELECTORS, THREAD_URL_TEMPLATE
from src.playwright.utils import wait_for_element_safe
from src.config import settings

def test_selectors(thread_id: str):
    """Teste tous les sélecteurs sur une conversation"""
    print("=" * 60)
    print(f"🧪 Test des sélecteurs pour thread: {thread_id}")
    print("=" * 60)
    print()
    
    with BrowserManager() as manager:
        page = manager.new_page()
        
        try:
            # Naviguer vers la conversation
            thread_url = THREAD_URL_TEMPLATE.format(thread_id=thread_id)
            print(f"🌐 Navigation vers: {thread_url}")
            page.goto(thread_url, wait_until="networkidle", timeout=60000)
            print("✅ Page chargée")
            print()
            
            # Tester les sélecteurs principaux
            print("📋 Test des sélecteurs principaux:")
            print("-" * 60)
            
            test_results = {}
            
            for key, selector in SELECTORS.items():
                found = wait_for_element_safe(page, selector, timeout=5000)
                count = len(page.locator(selector).all()) if found else 0
                test_results[key] = {"found": found, "count": count}
                
                status = "✅" if found else "❌"
                print(f"{status} {key:30s} -> {count:3d} élément(s) trouvé(s)")
            
            print()
            print("📋 Test des sélecteurs de fallback:")
            print("-" * 60)
            
            for key, selectors in FALLBACK_SELECTORS.items():
                print(f"\n{key}:")
                for selector in selectors:
                    found = wait_for_element_safe(page, selector, timeout=2000)
                    count = len(page.locator(selector).all()) if found else 0
                    status = "✅" if found else "❌"
                    print(f"  {status} {selector:50s} -> {count:3d} élément(s)")
            
            print()
            print("=" * 60)
            print("✅ Test terminé")
            print("=" * 60)
            
            # Afficher un résumé
            print("\n📊 Résumé:")
            working = sum(1 for r in test_results.values() if r["found"])
            total = len(test_results)
            print(f"   Sélecteurs fonctionnels: {working}/{total}")
            
            if working < total:
                print("\n⚠️  Certains sélecteurs ne fonctionnent pas.")
                print("   Airbnb a peut-être changé son interface.")
                print("   Vérifie les sélecteurs dans src/playwright/selectors.py")
            
        except Exception as e:
            print(f"\n❌ Erreur: {e}")
            import traceback
            traceback.print_exc()
            return 1
    
    return 0


def main():
    parser = argparse.ArgumentParser(description="Tester les sélecteurs Playwright")
    parser.add_argument(
        "thread_id",
        help="ID du thread Airbnb à tester (ex: 123456789)"
    )
    
    args = parser.parse_args()
    
    return test_selectors(args.thread_id)


if __name__ == "__main__":
    sys.exit(main())



