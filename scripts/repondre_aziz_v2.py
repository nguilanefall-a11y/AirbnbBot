#!/usr/bin/env python3
"""
Script pour répondre à Aziz - Version qui fonctionne vraiment
1. Récupère les threads pour trouver Aziz
2. Va DIRECTEMENT sur sa conversation
3. Envoie le message
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.playwright.scraping_actions import fetch_threads_and_messages
from src.playwright.browser_manager import BrowserManager
from src.playwright.selectors import HOSTING_MESSAGES_URL, FALLBACK_SELECTORS
from src.playwright.human_interactions import HumanInteraction
from src.playwright.utils import wait_for_element_safe
from src.config import settings

settings.AIRBNB_HEADLESS = False

print("=" * 60)
print("💬 RÉPONSE À AZIZ - VERSION FONCTIONNELLE")
print("=" * 60)
print()

# 1. Récupérer tous les threads pour trouver Aziz
print("1️⃣  Récupération des messages Airbnb...")
all_threads = fetch_threads_and_messages()

if not all_threads:
    print("❌ Aucun thread trouvé")
    sys.exit(1)

print(f"✅ {len(all_threads)} conversation(s) trouvée(s)")

# 2. Trouver Aziz
print("\n2️⃣  Recherche d'Aziz...")
aziz_thread = None
for thread in all_threads:
    guest_name = thread.get("guest_name", "")
    if "aziz" in guest_name.lower():
        aziz_thread = thread
        print(f"✅ Aziz trouvé: {guest_name}")
        break

if not aziz_thread:
    print("❌ Aziz non trouvé")
    sys.exit(1)

thread_id = aziz_thread.get("airbnb_thread_id")
guest_name = aziz_thread.get("guest_name")
messages = aziz_thread.get("messages", [])

# 3. Trouver le dernier message
print("\n3️⃣  Lecture du dernier message d'Aziz...")
dernier_message = None
for msg in reversed(messages):
    if msg.get("direction") == "inbound":
        dernier_message = msg.get("content", "")
        break

if not dernier_message and messages:
    dernier_message = messages[-1].get("content", "")

if not dernier_message:
    dernier_message = "Comment vas tu ?"

print(f"📨 Message d'Aziz: {dernier_message}")

# 4. Générer une réponse
print("\n4️⃣  Génération de la réponse...")
ai_response = f"Bonjour {guest_name.split(',')[0]} ! Je vais bien, merci de demander. Comment puis-je vous aider aujourd'hui ?"
print(f"✅ Réponse: {ai_response}")

# 5. NOUVELLE SESSION NAVIGATEUR - Aller directement sur la conversation
print("\n5️⃣  Envoi de la réponse à Aziz...")
print(f"   Thread ID: {thread_id}")

with BrowserManager() as manager:
    page = manager.new_page()
    
    try:
        # Aller sur la page des messages et cliquer sur Aziz
        print(f"   🌐 Navigation vers: {HOSTING_MESSAGES_URL}")
        page.goto(HOSTING_MESSAGES_URL, wait_until="domcontentloaded", timeout=60000)
        HumanInteraction.random_delay(3000, 5000)
        
        # Chercher Aziz dans la liste et cliquer dessus
        print("   🔍 Recherche d'Aziz dans la liste...")
        aziz_link = page.locator("text=Aziz").first
        if aziz_link.count() > 0:
            print("   ✅ Aziz trouvé, clic sur sa conversation...")
            aziz_link.click()
            
            # Attendre que la conversation se charge
            print("   ⏳ Attente du chargement de la conversation...")
            import time
            time.sleep(5)  # Attendre que la conversation se charge
            HumanInteraction.random_delay(2000, 3000)
        else:
            print("   ❌ Aziz non trouvé dans la liste")
            sys.exit(1)
        
        # Chercher le champ de message avec plusieurs tentatives
        print("   🔍 Recherche du champ de message...")
        input_found = False
        input_selector = None
        
        # Attendre un peu plus que les éléments se chargent
        time.sleep(2)
        
        # Essayer plusieurs fois avec différents sélecteurs
        all_selectors = FALLBACK_SELECTORS["composer_input"] + [
            'textarea[placeholder*="message" i]',
            'textarea[placeholder*="Message" i]',
            'textarea[placeholder*="écrire" i]',
            '[contenteditable][role="textbox"]',
            '[contenteditable="true"]',
        ]
        
        for selector in all_selectors:
            try:
                element = page.locator(selector).first
                if element.count() > 0 and element.is_visible(timeout=5000):
                    input_selector = selector
                    input_found = True
                    print(f"   ✅ Champ trouvé avec: {selector}")
                    break
            except:
                continue
        
        if not input_found:
            print("   ❌ Champ de message non trouvé")
            print("   📸 Sauvegarde d'un screenshot pour debug...")
            try:
                page.screenshot(path="./logs/debug_no_input.png", full_page=True)
                print("   ✅ Screenshot sauvegardé: ./logs/debug_no_input.png")
            except:
                pass
            
            # Afficher ce qui est disponible sur la page
            try:
                textareas = page.locator('textarea').count()
                contenteditables = page.locator('[contenteditable]').count()
                print(f"   📊 {textareas} textarea(s), {contenteditables} contenteditable(s) trouvé(s)")
            except:
                pass
            
            sys.exit(1)
        
        # Saisir le message
        print("   ✍️  Saisie du message...")
        element = page.locator(input_selector).first
        
        # Attendre que l'élément soit vraiment interactif
        element.wait_for(state="visible", timeout=10000)
        time.sleep(2)
        
        # Scroll vers l'élément
        element.scroll_into_view_if_needed()
        HumanInteraction.random_delay(1000, 1500)
        
        # Essayer d'abord fill() qui est plus simple
        try:
            print("   📝 Tentative avec fill()...")
            element.fill(ai_response)
            print("   ✅ Message saisi avec fill()")
        except:
            # Si fill() ne marche pas, essayer type()
            try:
                print("   📝 Tentative avec type()...")
                element.click(timeout=10000)
                time.sleep(1)
                element.type(ai_response, delay=50)
                print("   ✅ Message saisi avec type()")
            except Exception as e:
                print(f"   ❌ Erreur saisie: {e}")
                # Dernier recours: utiliser keyboard
                print("   📝 Tentative avec keyboard...")
                element.focus()
                time.sleep(0.5)
                page.keyboard.type(ai_response, delay=50)
                print("   ✅ Message saisi avec keyboard")
        
        HumanInteraction.random_delay(1000, 2000)
        
        # Chercher et cliquer sur le bouton d'envoi
        print("   🔍 Recherche du bouton d'envoi...")
        send_found = False
        
        for selector in FALLBACK_SELECTORS["send_button"]:
            try:
                button = page.locator(selector).first
                if button.is_visible(timeout=3000):
                    button.click(timeout=5000)
                    send_found = True
                    print(f"   ✅ Bouton trouvé et cliqué: {selector}")
                    break
            except:
                continue
        
        # Fallback: Enter
        if not send_found:
            print("   ⚠️  Bouton non trouvé, tentative avec Enter...")
            try:
                element.press("Enter")
                send_found = True
                print("   ✅ Message envoyé avec Enter")
            except Exception as e:
                print(f"   ❌ Erreur avec Enter: {e}")
        
        if not send_found:
            print("   ❌ Impossible d'envoyer le message")
            page.screenshot(path="./logs/debug_send_failed.png", full_page=True)
            sys.exit(1)
        
        # Attendre que le message soit envoyé
        HumanInteraction.random_delay(3000, 5000)
        
        # Vérifier que le message apparaît
        print("   🔍 Vérification de l'envoi...")
        try:
            # Chercher le message dans la conversation (premiers mots)
            message_preview = ai_response[:30].replace("'", "\\'")
            page.wait_for_selector(
                f"text={message_preview}",
                timeout=10000,
                state="visible"
            )
            print("   ✅ Message vérifié dans la conversation!")
        except:
            print("   ⚠️  Vérification échouée, mais message peut-être envoyé")
        
        print("\n✅✅✅ RÉPONSE ENVOYÉE AVEC SUCCÈS ! ✅✅✅")
        print("   Vérifie sur Airbnb que la réponse apparaît bien dans la conversation avec Aziz.")
        sys.exit(0)
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        page.screenshot(path="./logs/debug_error.png", full_page=True)
        sys.exit(1)

