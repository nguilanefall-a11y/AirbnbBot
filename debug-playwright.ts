import { storage } from "./server/storage";
import { pool } from "./server/db";

(async () => {
  const userId = "d4cadb35-8d62-44d3-a80e-ca44b12e3187";
  const user = await storage.getUser(userId);
  if (!user?.airbnbCohostCookies) {
    console.error("no cookies");
    process.exit(1);
  }
  const cookies = user.airbnbCohostCookies;
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "fr-FR",
  });
  const cookiePairs = cookies.split(";").map((p) => p.trim()).filter(Boolean);
  await context.addCookies(
    cookiePairs.map((pair) => {
      const [name, ...rest] = pair.split("=");
      return { name, value: rest.join("="), domain: ".airbnb.com", path: "/" } as any;
    }),
  );
  const page = await context.newPage();
  await page.goto("https://www.airbnb.com/hosting/messages", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const data = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("[id^='inbox_list_']"));
    return rows.slice(0, 5).map((row, index) => {
      const anchor = row.matches("a") ? row : row.querySelector("a[data-testid^='inbox_list_']");
      const idAttr = anchor?.getAttribute("data-testid") || row.id || "";
      const match = idAttr.match(/inbox_list_(\d+)/);
      const conversationId = match ? match[1] : `conv-${index}`;
      const guestSpan = row.querySelector("span");
      const lastMessageEl = row.querySelector("[data-testid*='preview']") || row.querySelector("p");
      return {
        idAttr,
        conversationId,
        guest: guestSpan?.textContent?.trim(),
        snippet: lastMessageEl?.textContent?.trim(),
      };
    });
  });
  console.log(data);
  await browser.close();
  await pool?.end?.();
  process.exit(0);
})();
