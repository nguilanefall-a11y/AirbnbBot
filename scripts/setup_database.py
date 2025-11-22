#!/usr/bin/env python3
"""
Script interactif pour configurer la DATABASE_URL Supabase
"""
import sys
import os
import re
from pathlib import Path
from urllib.parse import quote_plus

def encode_password(password: str) -> str:
    """Encode le mot de passe pour l'URL (caractères spéciaux)"""
    return quote_plus(password)

def format_database_url(project_ref: str, password: str) -> str:
    """Formate la DATABASE_URL pour Supabase"""
    encoded_password = encode_password(password)
    return f"postgresql://postgres:{encoded_password}@db.{project_ref}.supabase.co:5432/postgres"

def extract_project_ref_from_url(url: str) -> str:
    """Extrait le project_ref depuis une URL Supabase complète"""
    match = re.search(r'db\.([^.]+)\.supabase\.co', url)
    if match:
        return match.group(1)
    return ""

def update_env_file(env_path: Path, database_url: str):
    """Met à jour le fichier .env avec la DATABASE_URL"""
    env_content = ""
    
    if env_path.exists():
        env_content = env_path.read_text()
    
    # Vérifier si DATABASE_URL existe déjà
    lines = env_content.split('\n')
    updated = False
    new_lines = []
    
    for line in lines:
        if line.startswith('DATABASE_URL='):
            new_lines.append(f'DATABASE_URL={database_url}')
            updated = True
        else:
            new_lines.append(line)
    
    if not updated:
        # Ajouter à la fin
        if new_lines and new_lines[-1] and not new_lines[-1].endswith('\n'):
            new_lines.append('')
        new_lines.append(f'DATABASE_URL={database_url}')
    
    env_path.write_text('\n'.join(new_lines))
    print(f"✅ Fichier .env mis à jour: {env_path}")

def test_connection(database_url: str) -> bool:
    """Teste la connexion à la base de données"""
    try:
        from sqlalchemy import create_engine, text
        
        connect_args = {}
        if "supabase.co" in database_url:
            connect_args = {
                "sslmode": "require",
            }
        
        engine = create_engine(
            database_url,
            connect_args=connect_args,
            pool_pre_ping=True,
        )
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        
        print("✅ Connexion à la base de données réussie!")
        return True
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False

def main():
    print("=" * 60)
    print("🔧 Configuration de la DATABASE_URL Supabase")
    print("=" * 60)
    print()
    
    # Chemin du fichier .env
    project_root = Path(__file__).parent.parent
    env_path = project_root / ".env"
    
    # Option 1: URL complète
    print("Option 1: Entrer l'URL complète Supabase")
    print("   Format: postgresql://postgres:password@db.xxx.supabase.co:5432/postgres")
    print()
    print("Option 2: Entrer les informations séparément")
    print()
    
    choice = input("Choisis une option (1 ou 2, ou 'q' pour quitter): ").strip()
    
    if choice.lower() == 'q':
        print("❌ Annulé")
        return 1
    
    database_url = ""
    
    if choice == "1":
        # URL complète
        full_url = input("\nEntre l'URL complète Supabase: ").strip()
        
        if not full_url:
            print("❌ URL vide")
            return 1
        
        # Extraire le project_ref pour vérification
        project_ref = extract_project_ref_from_url(full_url)
        if not project_ref:
            print("⚠️  Format d'URL invalide. Utilisation de l'URL telle quelle.")
        
        database_url = full_url
        
    elif choice == "2":
        # Informations séparées
        project_ref = input("\nEntre le Project Reference Supabase (ex: abcdefghijklmnop): ").strip()
        password = input("Entre le mot de passe PostgreSQL: ").strip()
        
        if not project_ref or not password:
            print("❌ Project Reference et mot de passe requis")
            return 1
        
        database_url = format_database_url(project_ref, password)
        print(f"\n📋 URL générée: {database_url.split('@')[0]}@...")
    
    else:
        print("❌ Option invalide")
        return 1
    
    # Mettre à jour le .env
    print(f"\n📝 Mise à jour du fichier .env...")
    update_env_file(env_path, database_url)
    
    # Tester la connexion
    print(f"\n🔍 Test de la connexion...")
    if test_connection(database_url):
        print("\n✅ Configuration terminée avec succès!")
        print("\n📋 Prochaines étapes:")
        print("   1. Lance la migration: python3 scripts/migrate.py")
        print("   2. Connecte-toi à Airbnb: python3 scripts/run_headless_first.py")
        return 0
    else:
        print("\n⚠️  La connexion a échoué, mais la DATABASE_URL a été sauvegardée.")
        print("   Vérifie tes credentials et réessaie.")
        return 1

if __name__ == "__main__":
    sys.exit(main())


