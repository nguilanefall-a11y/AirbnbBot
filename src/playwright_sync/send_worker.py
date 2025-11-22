import asyncio
from playwright.async_api import async_playwright
from config import PLAYWRIGHT_SESSION_DIR
from db.db import engine
from sqlalchemy import text

async def human_type(page, selector, text):
    for ch in text:
        await page.type(selector, ch, delay=20 + int(50 * (0.5)))

async def enqueue_send(payload):
    # simple DB insert to send_queue
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO send_queue(conversation_id, conversation_url, body) VALUES (:cid,:url,:b)"), 
                     {"cid": payload.get('conversation_id'), "url": payload.get('conversation_url'), "b": payload.get('body')})
    return True

async def send_from_queue():
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(PLAYWRIGHT_SESSION_DIR, headless=True)
        page = await browser.new_page()
        while True:
            try:
                with engine.begin() as conn:
                    row = conn.execute(text("SELECT * FROM send_queue WHERE status='pending' ORDER BY created_at LIMIT 1")).fetchone()
                    if row:
                        try:
                            conn.execute(text("UPDATE send_queue SET status='processing' WHERE id=:id"), {"id": row.id})
                            await page.goto(row.conversation_url)
                            await page.wait_for_selector('textarea, [data-testid="thread-message-input"]', timeout=10000)
                            sel = 'textarea, [data-testid="thread-message-input"]'
                            await human_type(page, sel, row.body)
                            await page.click('[data-testid="thread-send-button"], button[type=submit]')
                            await page.wait_for_timeout(1000)
                            conn.execute(text("UPDATE send_queue SET status='sent' WHERE id=:id"), {"id": row.id})
                        except Exception as e:
                            conn.execute(text("UPDATE send_queue SET attempts=attempts+1, last_error=:err, status='failed' WHERE id=:id"), {"id": row.id, "err": str(e)})
                    else:
                        await asyncio.sleep(2)
            except Exception as e:
                print('Queue worker error', e)
                await asyncio.sleep(5)
