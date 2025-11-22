# Utility to run the sync service in visible mode to create the session manually.
import asyncio
from playwright.async_api import async_playwright
from config import PLAYWRIGHT_SESSION_DIR

HEADLESS = False

async def run_once():
    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(PLAYWRIGHT_SESSION_DIR, headless=HEADLESS)
        page = await browser.new_page()
        await page.goto('https://www.airbnb.com/login')
        print('Open the browser, login manually, then close the process once session saved.')

if __name__ == '__main__':
    asyncio.run(run_once())
