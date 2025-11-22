"""
Connexion à la base de données PostgreSQL
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from contextlib import contextmanager
from src.config import settings
from src.db.models import Base
import logging

logger = logging.getLogger(__name__)

# Détecter si c'est Supabase et configurer SSL
connect_args = {}
if "supabase.co" in settings.DATABASE_URL:
    # Supabase nécessite SSL mais accepte les certificats auto-signés
    connect_args = {
        "sslmode": "require",
        "sslcert": None,
        "sslkey": None,
        "sslrootcert": None,
    }
    logger.info("🔒 Configuration SSL pour Supabase")

# Créer l'engine SQLAlchemy
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,  # Pas de pool pour éviter les problèmes de connexion
    echo=False,  # Mettre à True pour debug SQL
    pool_pre_ping=True,  # Vérifier les connexions avant utilisation
    connect_args=connect_args,
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialise les tables dans la base de données"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Base de données initialisée avec succès")
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'initialisation de la base de données: {e}")
        raise


@contextmanager
def get_db():
    """Context manager pour obtenir une session DB"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur DB: {e}")
        raise
    finally:
        db.close()


def get_db_session() -> Session:
    """Obtient une session DB (à fermer manuellement)"""
    return SessionLocal()
