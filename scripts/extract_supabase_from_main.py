#!/usr/bin/env python3
"""
Script pour extraire la DATABASE_URL depuis le projet principal
"""
import sys
import os
from pathlib import Path
import re

def find_env_file(project_path: Path) -> Path:
    """Trouve le fichier .env dans le projet principal"""
    env_path = project_path / ".env"
    if env_path.exists():
        return env_path
    return None

def extract_database_url(env_content: str) -> str:
    """Extrait la DATABASE_URL ou SUPABASE_DB_URL depuis le contenu .env"""
    # Chercher SUPABASE_DB_URL d'abord
    match = re.search(r'SUPABASE_DB_URL=(.+)', env_content)
    if match:
        return match.group(1).strip()
    
    # Chercher DATABASE_URL
    match = re.search(r'DATABASE_URL=(.+)', env_content)
    if match:
        return match.group(1).strip()
    
    return None

def main():
    main_project = Path("/Users/nguilane./Downloads/AirbnbBot 3")
    
    if not main_project.exists():
        print("❌ Projet principal non trouvé")
        return None
    
    env_file = find_env_file(main_project)
    if not env_file:
        print("⚠️  Fichier .env non trouvé dans le projet principal")
        return None
    
    try:
        env_content = env_file.read_text()
        database_url = extract_database_url(env_content)
        
        if database_url:
            print(f"✅ DATABASE_URL trouvée dans le projet principal")
            return database_url
        else:
            print("⚠️  DATABASE_URL non trouvée dans le .env du projet principal")
            return None
    except Exception as e:
        print(f"❌ Erreur lors de la lecture: {e}")
        return None

if __name__ == "__main__":
    url = main()
    if url:
        print(f"\n📋 DATABASE_URL:")
        # Masquer le mot de passe dans l'affichage
        if "@" in url:
            parts = url.split("@")
            if len(parts) == 2:
                user_pass = parts[0]
                if ":" in user_pass:
                    user, _ = user_pass.split(":", 1)
                    masked = f"{user}:***@{parts[1]}"
                    print(masked)
                else:
                    print(url.split("@")[0] + ":***@" + url.split("@")[1])
            else:
                print(url)
        else:
            print(url)
    sys.exit(0 if url else 1)


