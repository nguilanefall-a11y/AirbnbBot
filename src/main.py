#!/usr/bin/env python3
"""
Point d'entrée principal de l'application
Peut être utilisé pour lancer tous les services ensemble
"""
import sys
import argparse
import multiprocessing as mp
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))


# --- Top-level process targets for multiprocessing (macOS spawn-safe) ---
def run_api():
    from src.config import settings
    from src.api.main import app
    import uvicorn
    uvicorn.run(app, host=settings.API_HOST, port=settings.API_PORT)


def run_sync_process():
    from src.workers.sync_worker import run_sync_worker
    run_sync_worker()


def run_send_process():
    from src.workers.send_worker import run_send_worker
    run_send_worker()


def run_ai_process():
    from src.workers.ai_worker import run_ai_worker
    run_ai_worker()


def main():
    parser = argparse.ArgumentParser(description="Airbnb Co-Host Bot")
    parser.add_argument(
        "service",
        choices=[
            "api", "sync", "send", "ai", "syncsend", "sync2months", "all"
        ],
        help="Service à lancer"
    )

    args = parser.parse_args()

    if args.service == "api":
        run_api()

    elif args.service == "sync":
        run_sync_process()

    elif args.service == "send":
        run_send_process()

    elif args.service == "ai":
        run_ai_process()

    elif args.service == "syncsend":
        from src.playwright_async.sync_send_worker import start_sync_send
        start_sync_send()

    elif args.service == "sync2months":
        from src.playwright_async.sync_scraper_2months import start_sync_2months
        start_sync_2months()

    elif args.service == "all":
        mp.set_start_method('spawn', force=True)
        
        processes = [
            mp.Process(target=run_api, name="api"),
            mp.Process(target=run_sync_process, name="sync_worker"),
            mp.Process(target=run_send_process, name="send_worker"),
            mp.Process(target=run_ai_process, name="ai_worker"),
        ]
        
        print("🚀 Démarrage de tous les services en processus séparés...")
        for p in processes:
            p.start()
            print(f"   ✅ {p.name} démarré (PID: {p.pid})")
        
        try:
            for p in processes:
                p.join()
        except KeyboardInterrupt:
            print("\n🛑 Arrêt de tous les services...")
            for p in processes:
                p.terminate()
            for p in processes:
                p.join(timeout=5)


if __name__ == "__main__":
    main()
