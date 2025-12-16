#!/usr/bin/env python3
"""
Script de test pour forcer une synchronisation immédiate et voir les logs
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

print("🔄 FORCE SYNC - Mode Debug")
print("=" * 80)

# Import avec gestion d'erreur
try:
    from src.playwright.scraping_actions import fetch_threads_and_messages
    from src.workers.sync_worker import process_scraped_data
    print("✅ Imports OK")
except Exception as e:
    print(f"❌ Erreur import: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Lancer la synchronisation
try:
    print("\n🌐 Lancement scraping Airbnb...")
    scraped_data = fetch_threads_and_messages()
    
    if scraped_data:
        print(f"✅ {len(scraped_data)} thread(s) récupéré(s)")
        
        # Traiter les données
        print("\n💾 Traitement des données...")
        new_messages = process_scraped_data(scraped_data)
        print(f"✅ {new_messages} nouveau(x) message(s) traité(s)")
        
        # Afficher les threads
        for i, thread in enumerate(scraped_data[:3], 1):
            print(f"\n📨 Thread {i}:")
            print(f"   ID: {thread.get('airbnb_thread_id')}")
            print(f"   Guest: {thread.get('guest_name')}")
            print(f"   Messages: {len(thread.get('messages', []))}")
    else:
        print("⚠️ Aucun thread récupéré")
        
except KeyboardInterrupt:
    print("\n\n⚠️ Arrêt manuel")
except Exception as e:
    print(f"\n❌ Erreur: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n✅ Sync terminée")
