"""
API FastAPI principale
"""
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import logging
from src.api.routes import health, messages, listings, ai_webhook, messages_auto
from src.config import settings

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Airbnb Co-Host Bot API",
    description="API pour gérer les messages Airbnb via Playwright",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health.router, tags=["health"])
app.include_router(messages.router, prefix="/messages", tags=["messages"])
app.include_router(listings.router, prefix="/listings", tags=["listings"])
app.include_router(ai_webhook.router, prefix="/api", tags=["ai"])

# Route auto-respond (doit être avant /messages pour éviter les conflits)
try:
    app.include_router(messages_auto.router, prefix="/api/messages", tags=["auto"])
    logger.info("✅ Route /api/messages/auto-respond enregistrée")
except Exception as e:
    logger.error(f"❌ Erreur enregistrement route auto-respond: {e}")

# Root route to avoid 404 on '/'
@app.get("/")
def root():
    return {
        "service": "Airbnb Co-Host Bot API",
        "status": "ok",
        "auto_respond": True,
        "message": "Utilisez /health ou /api/messages/auto-respond (POST)."
    }

# Favicon route to silence 404 errors
@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)


@app.on_event("startup")
async def startup_event():
    """Événement au démarrage de l'API"""
    logger.info("🚀 API démarrée")
    logger.info(f"📡 Écoute sur {settings.API_HOST}:{settings.API_PORT}")


@app.on_event("shutdown")
async def shutdown_event():
    """Événement à l'arrêt de l'API"""
    logger.info("🛑 API arrêtée")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.API_HOST, port=settings.API_PORT)


