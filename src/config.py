"""
Configuration centralisée de l'application
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/airbnb_bot")
    
    # Redis (optionnel pour la queue)
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS: bool = os.getenv("USE_REDIS", "false").lower() == "true"
    
    # Playwright
    PLAYWRIGHT_SESSION_PATH: str = os.getenv("PLAYWRIGHT_SESSION_PATH", "./session")
    PLAYWRIGHT_SESSION_DIR: str = os.getenv("PLAYWRIGHT_SESSION_DIR", "./session")
    AIRBNB_BASE_URL: str = "https://www.airbnb.com"
    AIRBNB_HEADLESS: bool = os.getenv("AIRBNB_HEADLESS", "true").lower() == "true"
    PLAYWRIGHT_TIMEOUT: int = int(os.getenv("PLAYWRIGHT_TIMEOUT", "60000"))
    
    # Workers
    SCRAPE_INTERVAL_SEC: int = int(os.getenv("SCRAPE_INTERVAL_SEC", "45"))
    SEND_WORKER_INTERVAL_SEC: int = int(os.getenv("SEND_WORKER_INTERVAL_SEC", "15"))
    MAX_RETRY_SEND: int = int(os.getenv("MAX_RETRY_SEND", "5"))
    RETRY_DELAY_SEC: int = int(os.getenv("RETRY_DELAY_SEC", "60"))
    
    # Anti-ban
    MIN_DELAY_MS: int = int(os.getenv("MIN_DELAY_MS", "1000"))
    MAX_DELAY_MS: int = int(os.getenv("MAX_DELAY_MS", "3000"))
    RANDOM_DELAY_ENABLED: bool = os.getenv("RANDOM_DELAY_ENABLED", "true").lower() == "true"
    
    # AI Integration
    AI_WEBHOOK_URL: Optional[str] = os.getenv("AI_WEBHOOK_URL")
    AI_API_KEY: Optional[str] = os.getenv("AI_API_KEY")
    
    # Notifications
    ADMIN_WEBHOOK_URL: Optional[str] = os.getenv("ADMIN_WEBHOOK_URL")
    SLACK_WEBHOOK_URL: Optional[str] = os.getenv("SLACK_WEBHOOK_URL")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "./logs/app.log")
    
    # API
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_SECRET_KEY: str = os.getenv("API_SECRET_KEY", "change-me-in-production")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
