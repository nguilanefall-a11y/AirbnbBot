#!/usr/bin/env python3
"""
Point d'entrée principal de l'application
Peut être utilisé pour lancer tous les services ensemble
"""
import sys
import argparse
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

def main():
    parser = argparse.ArgumentParser(description="Airbnb Co-Host Bot")
    parser.add_argument(
        "service",
        choices=["api", "sync", "send", "syncsend", "sync2months", "all"],
        help="Service à lancer"
    )
    
    args = parser.parse_args()
    
    if args.service == "api":
        from src.api.main import app
        import uvicorn
        from src.config import settings
        uvicorn.run(app, host=settings.API_HOST, port=settings.API_PORT)
    
    elif args.service == "sync":
        from src.workers.sync_worker import run_sync_worker
        run_sync_worker()
    
    elif args.service == "send":
        from src.workers.send_worker import run_send_worker
        run_send_worker()
    
    elif args.service == "syncsend":
        from src.playwright_async.sync_send_worker import start_sync_send
        start_sync_send()
    
    elif args.service == "sync2months":
        from src.playwright_async.sync_scraper_2months import start_sync_2months
        start_sync_2months()
    
    elif args.service == "all":
        print("🚀 Lancement de tous les services...")
        print("⚠️  Utilise docker-compose ou PM2 pour lancer tous les services ensemble")
        print("   Ou lance-les dans des terminaux séparés:")
        print("   - Terminal 1: python src/main.py api")
        print("   - Terminal 2: python src/main.py sync")
        print("   - Terminal 3: python src/main.py send")
        print("   - Async workers: python src/main.py syncsend")
        print("   - 2 mois scraper: python src/main.py sync2months")
        sys.exit(1)


if __name__ == "__main__":
    main()
