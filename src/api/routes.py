from fastapi import APIRouter
from playwright_sync.sync_service import enqueue_sync_task
from playwright_sync.send_worker import enqueue_send

router = APIRouter()

@router.get("/health")
def health():
    return {"ok": True}

@router.post("/messages/send")
async def post_send(payload: dict):
    await enqueue_send(payload)
    return {"ok": True}

@router.post("/airbnb/sync")
def trigger_sync():
    enqueue_sync_task()
    return {"ok": True}

@router.post("/ai/incoming")
async def ai_incoming(payload: dict):
    print("ai incoming", payload.get("conversation_id"))
    return {"ok": True}
