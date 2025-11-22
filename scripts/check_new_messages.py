#!/usr/bin/env python3
"""
Script pour vérifier les nouveaux messages reçus
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta
from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.db.db import get_db_session

def check_new_messages():
    """Vérifie les nouveaux messages des 5 dernières minutes"""
    db = get_db_session()
    try:
        # Chercher les messages inbound des 5 dernières minutes
        five_min_ago = datetime.utcnow() - timedelta(minutes=5)
        
        result = db.execute(
            text("""
            SELECT 
                m.id,
                m.content,
                m.sender_name,
                m.direction,
                m.created_at,
                c.guest_name,
                c.external_id
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.direction = 'inbound'
            AND m.created_at > :five_min_ago
            ORDER BY m.created_at DESC
            LIMIT 10
            """),
            {"five_min_ago": five_min_ago}
        )
        
        messages = result.fetchall()
        
        if messages:
            print(f"\n✅ {len(messages)} nouveau(x) message(s) trouvé(s) :\n")
            for msg in messages:
                print(f"📨 De: {msg[2] or msg[5] or 'Inconnu'}")
                print(f"   Message: {msg[1][:100]}...")
                print(f"   Conversation: {msg[6]}")
                print(f"   Date: {msg[4]}")
                print()
            return True
        else:
            print("\n⏳ Aucun nouveau message des 5 dernières minutes")
            print("   Vérifie que les workers tournent ou lance:")
            print("   python3 src/main.py syncsend")
            return False
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    check_new_messages()

