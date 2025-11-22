#!/usr/bin/env python3
"""
Script pour initialiser/migrer la base de données
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.db.db import init_db, engine
from src.config import settings
from sqlalchemy import text

def run_sql_migration():
    """Exécute la migration SQL"""
    migration_file = Path(__file__).parent.parent / "src" / "db" / "migrations" / "001_initial_schema.sql"
    
    if not migration_file.exists():
        print("⚠️  Fichier de migration SQL non trouvé, utilisation de SQLAlchemy")
        return False
    
    try:
        with open(migration_file, "r") as f:
            sql_content = f.read()
        
        with engine.connect() as conn:
            conn.execute(text(sql_content))
            conn.commit()
        
        print("✅ Migration SQL exécutée avec succès")
        return True
    except Exception as e:
        print(f"⚠️  Erreur migration SQL: {e}, utilisation de SQLAlchemy")
        return False

def main():
    print("=" * 60)
    print("🗄️  Initialisation de la base de données")
    print("=" * 60)
    print()
    db_url_display = settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL
    print(f"Database URL: {db_url_display}")
    print()
    
    try:
        # Essayer d'abord la migration SQL
        if not run_sql_migration():
            # Fallback sur SQLAlchemy
            print("📦 Création des tables via SQLAlchemy...")
            init_db()
        
        print()
        print("✅ Base de données initialisée avec succès!")
        print()
        print("Tables créées:")
        print("  - listings")
        print("  - threads")
        print("  - messages")
        print("  - queue_outbox")
        print("  - worker_heartbeats")
        print()
        return 0
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

