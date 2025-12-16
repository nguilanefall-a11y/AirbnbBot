"""
🔍 DIAGNOSTIC COMPLET DU SYSTÈME - MODE DEBUG VISUEL
Teste chaque composant indépendamment avec screenshots et logs détaillés
"""
import sys
import os
import logging
from pathlib import Path
from datetime import datetime

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.playwright.browser_manager import BrowserManager
from src.config import settings
from src.db.db import get_db_session
from sqlalchemy import text

# Configuration logging détaillé
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('./logs/diagnostic.log'),
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)

# Créer dossier debug
DEBUG_DIR = Path("./debug_screenshots")
DEBUG_DIR.mkdir(exist_ok=True)

def save_debug_screenshot(page, name: str):
    """Sauvegarde un screenshot avec timestamp"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = DEBUG_DIR / f"{name}_{timestamp}.png"
    page.screenshot(path=str(path), full_page=True)
    logger.info(f"📸 Screenshot sauvegardé: {path}")
    return path


def test_database_connection():
    """ÉTAPE 1: Teste la connexion à la base de données"""
    logger.info("=" * 80)
    logger.info("🔍 ÉTAPE 1: TEST CONNEXION BASE DE DONNÉES")
    logger.info("=" * 80)
    
    try:
        db = get_db_session()
        
        # Test connexion
        result = db.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        logger.info(f"✅ Connexion PostgreSQL OK")
        logger.info(f"   Version: {version}")
        
        # Vérifier les tables
        result = db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        tables = [row[0] for row in result.fetchall()]
        logger.info(f"✅ Tables trouvées: {', '.join(tables)}")
        
        # Compter les messages
        result = db.execute(text("SELECT COUNT(*) FROM messages"))
        msg_count = result.fetchone()[0]
        logger.info(f"📊 Messages en DB: {msg_count}")
        
        # Compter la queue
        result = db.execute(text("SELECT COUNT(*) FROM queue_outbox WHERE status = 'pending'"))
        queue_count = result.fetchone()[0]
        logger.info(f"📊 Messages pending dans queue: {queue_count}")
        
        db.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur DB: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def test_session_validity():
    """ÉTAPE 2: Vérifie que la session Airbnb est valide"""
    logger.info("=" * 80)
    logger.info("🔍 ÉTAPE 2: TEST SESSION AIRBNB")
    logger.info("=" * 80)
    
    session_file = Path(settings.PLAYWRIGHT_SESSION_PATH)
    if session_file.is_dir():
        session_file = session_file / "storage_state.json"
    
    if not session_file.exists():
        logger.error(f"❌ Fichier de session manquant: {session_file}")
        return False
    
    logger.info(f"✅ Fichier de session trouvé: {session_file}")
    
    # Vérifier avec un navigateur
    try:
        with BrowserManager() as manager:
            page = manager.new_page()
            
            logger.info("🌐 Navigation vers Airbnb hosting/inbox...")
            page.goto("https://www.airbnb.com/hosting/inbox", wait_until="networkidle", timeout=60000)
            
            # Screenshot immédiat
            save_debug_screenshot(page, "01_inbox_loaded")
            
            # Vérifier si on est connecté
            url = page.url
            logger.info(f"📍 URL actuelle: {url}")
            
            if "login" in url.lower() or "authenticate" in url.lower():
                logger.error("❌ Redirection vers login - SESSION EXPIRÉE")
                save_debug_screenshot(page, "01_session_expired")
                return False
            
            # Chercher des éléments qui prouvent qu'on est connecté
            try:
                # Attendre un élément caractéristique de l'inbox
                page.wait_for_selector("text=Messages, text=Inbox, [data-testid*='inbox']", timeout=10000)
                logger.info("✅ Session valide - page inbox chargée")
                return True
            except:
                logger.warning("⚠️ Impossible de confirmer la connexion")
                save_debug_screenshot(page, "01_session_uncertain")
                return False
                
    except Exception as e:
        logger.error(f"❌ Erreur test session: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def test_thread_detection():
    """ÉTAPE 3: Teste la détection des conversations (sélecteurs)"""
    logger.info("=" * 80)
    logger.info("🔍 ÉTAPE 3: TEST DÉTECTION DES THREADS")
    logger.info("=" * 80)
    
    try:
        with BrowserManager() as manager:
            page = manager.new_page()
            
            logger.info("🌐 Navigation vers hosting/inbox...")
            page.goto("https://www.airbnb.com/hosting/inbox", wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(3000)
            
            # Screenshot de l'inbox
            save_debug_screenshot(page, "02_inbox_full")
            
            # Test des sélecteurs robustes (ROLE-BASED)
            logger.info("🔍 Test sélecteurs robustes...")
            
            # Méthode 1: Role-based (RECOMMANDÉ)
            try:
                threads_by_role = page.get_by_role("article").all()
                logger.info(f"✅ Méthode role='article': {len(threads_by_role)} éléments trouvés")
            except Exception as e:
                logger.warning(f"⚠️ Méthode role='article' échouée: {e}")
                threads_by_role = []
            
            # Méthode 2: Links vers /hosting/messages/
            try:
                threads_by_link = page.locator("a[href*='/hosting/messages/']").all()
                logger.info(f"✅ Méthode link href: {len(threads_by_link)} liens trouvés")
            except Exception as e:
                logger.warning(f"⚠️ Méthode link href échouée: {e}")
                threads_by_link = []
            
            # Méthode 3: Text "Voyageur" ou noms
            try:
                guest_elements = page.get_by_text("Voyageur", exact=False).all()
                logger.info(f"✅ Méthode text='Voyageur': {len(guest_elements)} éléments trouvés")
            except Exception as e:
                logger.warning(f"⚠️ Méthode text='Voyageur' échouée: {e}")
                guest_elements = []
            
            # Méthode 4: Anciens sélecteurs CSS (fragiles)
            try:
                threads_by_testid = page.locator("[data-testid*='thread'], [data-testid*='inbox']").all()
                logger.info(f"⚠️  Méthode data-testid (fragile): {len(threads_by_testid)} éléments trouvés")
            except Exception as e:
                logger.warning(f"⚠️ Méthode data-testid échouée: {e}")
                threads_by_testid = []
            
            # Analyse du HTML brut
            logger.info("🔍 Analyse HTML de la page...")
            html_content = page.content()
            
            if "MessageThread" in html_content:
                logger.info("✅ Trouvé: chaîne 'MessageThread' dans le HTML")
            if "hosting/messages/" in html_content:
                logger.info("✅ Trouvé: URLs de threads dans le HTML")
            if '"threads"' in html_content or '"edges"' in html_content:
                logger.info("✅ Trouvé: structure GraphQL dans le HTML")
            
            # Compter les vraies conversations
            total_found = max(len(threads_by_role), len(threads_by_link))
            
            if total_found == 0:
                logger.error("❌ AUCUN THREAD DÉTECTÉ - SÉLECTEURS CASSÉS")
                save_debug_screenshot(page, "02_no_threads_found")
                
                # Dump du HTML pour analyse
                html_file = DEBUG_DIR / "inbox_html_dump.html"
                html_file.write_text(html_content)
                logger.info(f"📄 HTML sauvegardé dans: {html_file}")
                
                return False
            else:
                logger.info(f"✅ {total_found} thread(s) détecté(s) avec succès")
                
                # Extraire les IDs
                if threads_by_link:
                    first_link = threads_by_link[0]
                    href = first_link.get_attribute("href")
                    logger.info(f"📍 Exemple thread URL: {href}")
                
                return True
                
    except Exception as e:
        logger.error(f"❌ Erreur test threads: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def test_message_injection():
    """ÉTAPE 4: Injecte un faux message et teste la pipeline IA"""
    logger.info("=" * 80)
    logger.info("🔍 ÉTAPE 4: TEST INJECTION MESSAGE + PIPELINE IA")
    logger.info("=" * 80)
    
    try:
        db = get_db_session()
        
        # 1. Créer/récupérer une propriété
        result = db.execute(text("SELECT id FROM properties LIMIT 1"))
        prop = result.fetchone()
        
        if not prop:
            logger.info("📝 Création d'une propriété de test...")
            result = db.execute(text("""
                INSERT INTO properties (name, address) 
                VALUES ('Test Property', 'Test Address')
                RETURNING id
            """))
            prop_id = result.fetchone()[0]
            db.commit()
        else:
            prop_id = prop[0]
        
        logger.info(f"✅ Propriété ID: {prop_id}")
        
        # 2. Créer une conversation de test
        test_thread_id = f"test_thread_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        result = db.execute(text("""
            INSERT INTO conversations (property_id, guest_name, external_id, source)
            VALUES (:prop_id, 'TEST Voyageur Debug', :thread_id, 'airbnb-cohost')
            ON CONFLICT (external_id, source) DO UPDATE SET guest_name = EXCLUDED.guest_name
            RETURNING id
        """), {"prop_id": prop_id, "thread_id": test_thread_id})
        conv_id = result.fetchone()[0]
        db.commit()
        
        logger.info(f"✅ Conversation créée ID: {conv_id}")
        
        # 3. Insérer un message INBOUND (non lu)
        result = db.execute(text("""
            INSERT INTO messages (
                conversation_id, content, direction, 
                sender_name, status, external_id
            )
            VALUES (
                :conv_id, 'TEST: La piscine est-elle chauffée ?', 'inbound',
                'TEST Voyageur', 'unread', :msg_id
            )
            RETURNING id
        """), {
            "conv_id": conv_id,
            "msg_id": f"test_msg_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        })
        msg_id = result.fetchone()[0]
        db.commit()
        
        logger.info(f"✅ Message injecté ID: {msg_id}")
        logger.info("   Contenu: 'TEST: La piscine est-elle chauffée ?'")
        
        # 4. Tester l'appel API pour générer réponse IA
        logger.info("🤖 Test génération réponse IA...")
        
        try:
            import requests
            response = requests.post(
                f"http://localhost:{settings.API_PORT}/api/messages/auto-respond",
                json={"message": "La piscine est-elle chauffée ?"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Réponse IA générée: {data}")
                
                # Vérifier queue_outbox
                result = db.execute(text("""
                    SELECT id, thread_id, message, status 
                    FROM queue_outbox 
                    ORDER BY created_at DESC 
                    LIMIT 1
                """))
                outbox = result.fetchone()
                
                if outbox:
                    logger.info(f"✅ Message en queue_outbox:")
                    logger.info(f"   ID: {outbox[0]}")
                    logger.info(f"   Thread: {outbox[1]}")
                    logger.info(f"   Status: {outbox[3]}")
                    logger.info(f"   Message: {outbox[2][:100]}...")
                    return True
                else:
                    logger.warning("⚠️ Réponse générée mais pas de message en queue")
                    return False
            else:
                logger.error(f"❌ API erreur {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur appel API: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False
        
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Erreur test injection: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def test_send_field_detection():
    """ÉTAPE 5: Teste la détection du champ d'envoi"""
    logger.info("=" * 80)
    logger.info("🔍 ÉTAPE 5: TEST DÉTECTION CHAMP D'ENVOI")
    logger.info("=" * 80)
    
    try:
        db = get_db_session()
        
        # Récupérer un vrai thread_id
        result = db.execute(text("""
            SELECT external_id 
            FROM conversations 
            WHERE source = 'airbnb-cohost'
            LIMIT 1
        """))
        thread = result.fetchone()
        db.close()
        
        if not thread:
            logger.warning("⚠️ Aucun thread réel en DB, utilisation d'un ID fictif")
            thread_id = "123456789"
        else:
            thread_id = thread[0]
        
        logger.info(f"📍 Thread de test: {thread_id}")
        
        with BrowserManager() as manager:
            page = manager.new_page()
            
            url = f"https://www.airbnb.com/hosting/messages/{thread_id}"
            logger.info(f"🌐 Navigation vers: {url}")
            
            page.goto(url, wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(3000)
            
            # Screenshot du thread
            save_debug_screenshot(page, "03_thread_opened")
            
            # Tester les sélecteurs pour le champ texte
            logger.info("🔍 Test sélecteurs champ texte...")
            
            selectors_to_test = [
                ("role=textbox", page.get_by_role("textbox")),
                ("textarea", page.locator("textarea")),
                ("[contenteditable='true']", page.locator("[contenteditable='true']")),
                ("[placeholder*='message' i]", page.locator("[placeholder*='message' i]")),
            ]
            
            found_input = None
            for name, locator in selectors_to_test:
                try:
                    count = locator.count()
                    logger.info(f"   {name}: {count} élément(s)")
                    
                    if count > 0 and not found_input:
                        # Vérifier si visible
                        if locator.first.is_visible(timeout=2000):
                            logger.info(f"✅ Champ trouvé et visible: {name}")
                            found_input = locator.first
                            
                            # Highlight pour screenshot
                            try:
                                found_input.evaluate("el => el.style.border = '5px solid red'")
                            except:
                                pass
                except Exception as e:
                    logger.warning(f"   {name}: erreur - {e}")
            
            if found_input:
                save_debug_screenshot(page, "03_input_field_found")
                logger.info("✅ Champ d'entrée détecté avec succès")
                
                # Test écriture
                try:
                    logger.info("✍️  Test écriture dans le champ...")
                    found_input.fill("TEST MESSAGE - NE PAS ENVOYER")
                    save_debug_screenshot(page, "03_input_filled")
                    logger.info("✅ Écriture réussie")
                    return True
                except Exception as e:
                    logger.error(f"❌ Erreur écriture: {e}")
                    return False
            else:
                logger.error("❌ AUCUN CHAMP D'ENTRÉE TROUVÉ")
                save_debug_screenshot(page, "03_no_input_field")
                return False
                
    except Exception as e:
        logger.error(f"❌ Erreur test send field: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def main():
    """Lance tous les tests de diagnostic"""
    logger.info("╔" + "═" * 78 + "╗")
    logger.info("║" + " " * 20 + "🔍 DIAGNOSTIC COMPLET SYSTÈME" + " " * 28 + "║")
    logger.info("╚" + "═" * 78 + "╝")
    logger.info("")
    
    results = {}
    
    # Test 1: Base de données
    results['database'] = test_database_connection()
    logger.info("")
    
    # Test 2: Session Airbnb
    results['session'] = test_session_validity()
    logger.info("")
    
    # Test 3: Détection threads
    results['threads'] = test_thread_detection()
    logger.info("")
    
    # Test 4: Pipeline IA
    results['pipeline'] = test_message_injection()
    logger.info("")
    
    # Test 5: Champ d'envoi
    results['send_field'] = test_send_field_detection()
    logger.info("")
    
    # Résumé
    logger.info("=" * 80)
    logger.info("📊 RÉSUMÉ DU DIAGNOSTIC")
    logger.info("=" * 80)
    
    for test_name, success in results.items():
        status = "✅ OK" if success else "❌ ÉCHEC"
        logger.info(f"   {test_name.upper():15s} : {status}")
    
    logger.info("")
    logger.info(f"📂 Screenshots sauvegardés dans: {DEBUG_DIR.absolute()}")
    logger.info(f"📄 Log complet dans: ./logs/diagnostic.log")
    logger.info("")
    
    if all(results.values()):
        logger.info("🎉 TOUS LES TESTS RÉUSSIS - Le système devrait fonctionner")
        return 0
    else:
        logger.error("⚠️ CERTAINS TESTS ONT ÉCHOUÉ - Voir logs ci-dessus")
        return 1


if __name__ == "__main__":
    sys.exit(main())
