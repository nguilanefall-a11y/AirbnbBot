#!/usr/bin/env python3
"""
Script rapide pour répondre à un voyageur (ex: Aziz)
Utilise l'API du projet principal si disponible, sinon Playwright
"""
import sys
import requests
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def reply_via_api(thread_id: str, message: str):
    """Tente de répondre via l'API du projet principal"""
    try:
        response = requests.post(
            "http://localhost:5000/api/messages",
            json={
                "conversationId": thread_id,
                "content": message,
                "isBot": False,
            },
            timeout=10
        )
        if response.status_code == 201:
            print("✅ Message envoyé via l'API du projet principal")
            return True
    except Exception as e:
        print(f"⚠️  API principale non disponible: {e}")
    return False


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/quick_reply.py <thread_id> \"<message>\"")
        print("   ou: python3 scripts/quick_reply.py aziz \"<message>\"")
        sys.exit(1)
    
    thread_id_or_name = sys.argv[1]
    message = sys.argv[2]
    
    # Si c'est "aziz", on cherche le thread ID
    if thread_id_or_name.lower() == "aziz":
        print("🔍 Recherche du thread d'Aziz...")
        # Pour l'instant, il faut fournir le thread_id
        print("⚠️  Fournis le thread_id directement pour l'instant")
        print("   Ex: python3 scripts/quick_reply.py 123456789 \"Bonjour Aziz !\"")
        sys.exit(1)
    
    thread_id = thread_id_or_name
    
    print(f"📤 Envoi du message vers thread {thread_id}...")
    print(f"   Message: {message[:50]}...")
    
    # Essayer via l'API principale d'abord
    if reply_via_api(thread_id, message):
        return 0
    
    # Sinon, utiliser Playwright (via force_sync_now.py adapté)
    print("\n⚠️  Utilise le script reply_to_aziz.py pour l'envoi via Playwright")
    print("   python3 scripts/reply_to_aziz.py")
    
    return 1


if __name__ == "__main__":
    sys.exit(main())


