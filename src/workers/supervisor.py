"""
Supervisor pour gérer les workers (relance automatique, monitoring)
"""
import time
import logging
import subprocess
import signal
import sys
from typing import List, Dict
from src.config import settings

logger = logging.getLogger(__name__)


class WorkerSupervisor:
    """Supervise les workers et les relance en cas de crash"""
    
    def __init__(self):
        self.workers: List[Dict] = []
        self.processes: Dict[str, subprocess.Popen] = {}
        self.running = True
    
    def register_worker(self, name: str, command: List[str], restart_delay: int = 10):
        """Enregistre un worker à superviser"""
        self.workers.append({
            "name": name,
            "command": command,
            "restart_delay": restart_delay,
            "restart_count": 0,
        })
    
    def start_worker(self, worker: Dict) -> subprocess.Popen:
        """Démarre un worker"""
        logger.info(f"🚀 Démarrage worker: {worker['name']}")
        process = subprocess.Popen(
            worker["command"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        self.processes[worker["name"]] = process
        return process
    
    def check_workers(self):
        """Vérifie l'état des workers et les relance si nécessaire"""
        for worker in self.workers:
            name = worker["name"]
            process = self.processes.get(name)
            
            if not process or process.poll() is not None:
                # Worker arrêté, le relancer
                logger.warning(f"⚠️ Worker {name} arrêté, relance...")
                worker["restart_count"] += 1
                
                if worker["restart_count"] > 10:
                    logger.error(f"❌ Worker {name} a crashé trop de fois, arrêt")
                    continue
                
                time.sleep(worker["restart_delay"])
                self.start_worker(worker)
    
    def run(self):
        """Boucle principale du supervisor"""
        logger.info("👮 Supervisor démarré")
        
        # Démarrer tous les workers
        for worker in self.workers:
            self.start_worker(worker)
            time.sleep(2)  # Délai entre les démarrages
        
        # Boucle de monitoring
        while self.running:
            try:
                self.check_workers()
                time.sleep(30)  # Vérifier toutes les 30 secondes
            except KeyboardInterrupt:
                logger.info("🛑 Arrêt du supervisor demandé")
                self.stop()
                break
            except Exception as e:
                logger.error(f"❌ Erreur supervisor: {e}")
                time.sleep(10)
    
    def stop(self):
        """Arrête tous les workers"""
        self.running = False
        logger.info("🛑 Arrêt de tous les workers...")
        
        for name, process in self.processes.items():
            try:
                process.terminate()
                process.wait(timeout=5)
                logger.info(f"✅ Worker {name} arrêté")
            except subprocess.TimeoutExpired:
                process.kill()
                logger.warning(f"⚠️ Worker {name} tué (force)")
            except Exception as e:
                logger.error(f"❌ Erreur arrêt worker {name}: {e}")


def signal_handler(sig, frame):
    """Gestionnaire de signaux pour arrêt propre"""
    logger.info("🛑 Signal reçu, arrêt...")
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    supervisor = WorkerSupervisor()
    
    # Enregistrer les workers
    supervisor.register_worker(
        "sync_worker",
        ["python", "-m", "src.workers.sync_worker"],
        restart_delay=10
    )
    supervisor.register_worker(
        "send_worker",
        ["python", "-m", "src.workers.send_worker"],
        restart_delay=10
    )
    
    supervisor.run()



