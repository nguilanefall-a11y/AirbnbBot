#!/usr/bin/env python3
"""
Lancement simplifié de tous les services avec threading
"""
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.config import settings
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_sync_worker_thread():
    """Lance le sync worker dans un thread"""
    try:
        from src.workers.sync_worker import run_sync_worker
        logger.info("🔄 Démarrage sync_worker...")
        run_sync_worker()
    except Exception as e:
        logger.error(f"❌ Erreur sync_worker: {e}")


def run_send_worker_thread():
    """Lance le send worker dans un thread"""
    try:
        from src.workers.send_worker import run_send_worker
        logger.info("📤 Démarrage send_worker...")
        run_send_worker()
    except Exception as e:
        logger.error(f"❌ Erreur send_worker: {e}")


def main():
    logger.info("🚀 Lancement de tous les workers...")
    
    # Créer les threads
    sync_thread = threading.Thread(target=run_sync_worker_thread, daemon=True)
    send_thread = threading.Thread(target=run_send_worker_thread, daemon=True)
    
    # Démarrer les threads
    sync_thread.start()
    time.sleep(2)  # Délai entre les démarrages
    send_thread.start()
    
    logger.info("✅ Workers démarrés")
    logger.info("Appuyez sur Ctrl+C pour arrêter...")
    
    # Garder le processus principal actif
    try:
        while True:
            time.sleep(10)
            # Vérifier que les threads sont toujours actifs
            if not sync_thread.is_alive():
                logger.warning("⚠️  sync_worker s'est arrêté")
            if not send_thread.is_alive():
                logger.warning("⚠️  send_worker s'est arrêté")
    except KeyboardInterrupt:
        logger.info("🛑 Arrêt demandé...")
        sys.exit(0)


if __name__ == "__main__":
    main()
