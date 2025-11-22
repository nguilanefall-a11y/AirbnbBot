import asyncio, json, requests
from playwright.async_api import async_playwright
from config import PLAYWRIGHT_SESSION_DIR, AI_INCOMING_WEBHOOK
from db.db import engine
from utils.helpers import stable_id
from sqlalchemy import text
from selectors import CONV_LIST_SELECTOR, MSG_CONTAINER_SELECTOR, MSG_ITEM_SELECTOR, MSG_SENDER_SEL, MSG_TEXT_SEL, MSG_TIME_SEL

async def auto_scroll_to_top(page, selector):
    prev = -1
    for _ in range(120):
        await page.locator(selector).evaluate("el => el.scrollBy(0, -800)")
        await page.wait_for_timeout(300)
        top = await page.locator(selector).evaluate("el => el.scrollTop")
        if top == prev:
            break
        prev = top

async def process_conversation(page, url):
    await page.goto(url)
    await page.wait_for_selector(MSG_ITEM_SELECTOR, timeout=10000)
    await auto_scroll_to_top(page, MSG_CONTAINER_SELECTOR)

    messages = await page.locator(MSG_ITEM_SELECTOR).evaluate_all(f"""(nodes) => nodes.map(n => {{
        const sender = (n.querySelector('{MSG_SENDER_SEL.replace("'","\\'")}')? n.querySelector('{MSG_SENDER_SEL.replace("'","\\'")}').innerText : '') || '';
        const text = (n.querySelector('{MSG_TEXT_SEL.replace("'","\\'")}')? n.querySelector('{MSG_TEXT_SEL.replace("'","\\'")}').innerText : '') || n.innerText || '';
        const timeEl = n.querySelector('{MSG_TIME_SEL.replace("'","\\'")}' );
        const ts = timeEl ? (timeEl.getAttribute('datetime') || timeEl.innerText) : new Date().toISOString();
        return {{ sender, text, ts, raw: n.innerHTML }};
    }})""")

    conversation_id = url.split('/').pop()
    convo_key = f"airbnb_{conversation_id}"
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO conversations(id, guest_name, last_message_ts) VALUES (:id,:g,:t) ON CONFLICT (id) DO UPDATE SET guest_name = EXCLUDED.guest_name, last_message_ts = EXCLUDED.last_message_ts"),
                     {"id": convo_key, "g": messages[0]["sender"] if messages else None, "t": messages[-1]["ts"] if messages else None})
        for m in messages:
            mid = stable_id(conversation_id, m["sender"], m["ts"], m["text"])
            res = conn.execute(text("SELECT 1 FROM messages WHERE id=:id"), {"id": mid}).fetchone()
            if not res:
                conn.execute(text("INSERT INTO messages(id, conversation_id, sender, body, timestamp, raw_json) VALUES (:id,:cid,:s,:b,:ts,:raw)"), 
                             {"id": mid, "cid": convo_key, "s": m["sender"], "b": m["text"], "ts": m["ts"], "raw": json.dumps({"html": m["raw"]})})
                # notify AI
                try:
                    requests.post(AI_INCOMING_WEBHOOK, json={"conversation_id": convo_key, "message_id": mid, "text": m["text"], "sender": m["sender"], "timestamp": m["ts"]}, timeout=5)
                except Exception as e:
                    print("AI webhook error", e)

async def run_sync_loop():
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(PLAYWRIGHT_SESSION_DIR, headless=True, args=["--no-sandbox"])
        page = await browser.new_page()
        await page.goto("https://www.airbnb.com/inbox", wait_until="domcontentloaded")
        print("Playwright session ready.")
        while True:
            try:
                links = await page.eval_on_selector_all(CONV_LIST_SELECTOR, "nodes => nodes.map(n => n.href)")
                unique = list(dict.fromkeys(links))
                for url in unique:
                    try:
                        await process_conversation(page, url)
                    except Exception as e:
                        print("Error proc convo", url, e)
                await asyncio.sleep(30)
            except Exception as e:
                print("Main loop error", e)
                await asyncio.sleep(10)
