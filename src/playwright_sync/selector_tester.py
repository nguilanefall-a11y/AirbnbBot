# This script helps test candidate selectors on a given conversation URL.
# Usage: edit CONVERSATION_URL and run `python selector_tester.py`
import asyncio, sys
from playwright.async_api import async_playwright
from config import PLAYWRIGHT_SESSION_DIR
from selectors import CONV_LIST_SELECTOR, MSG_CONTAINER_SELECTOR, MSG_ITEM_SELECTOR, MSG_SENDER_SEL, MSG_TEXT_SEL, MSG_TIME_SEL

CONVERSATION_URL = "https://www.airbnb.com/messaging/threads/REPLACE_WITH_ID"

async def test_selectors(url=CONVERSATION_URL):
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(PLAYWRIGHT_SESSION_DIR, headless=False)
        page = await ctx.new_page()
        await page.goto(url)
        await page.wait_for_timeout(3000)
        results = {}
        # report counts
        for name, sel in [
            ('msg_container', MSG_CONTAINER_SELECTOR),
            ('msg_item', MSG_ITEM_SELECTOR),
            ('sender', MSG_SENDER_SEL),
            ('text', MSG_TEXT_SEL),
            ('time', MSG_TIME_SEL)
        ]:
            try:
                count = await page.eval_on_selector_all(sel, 'nodes => nodes.length')
            except Exception as e:
                count = f'error: {e}'
            results[name] = {'selector': sel, 'count': count}
        print('Selector test results:', results)
        await ctx.close()

if __name__ == '__main__':
    asyncio.run(test_selectors())
