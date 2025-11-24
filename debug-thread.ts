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
  const hash = "d29354be6227b5d0f7f65895012fbfa5c38f31b7fcf829cf340188ea8cff3d9a";
  const globalThreadId = Buffer.from("MessageThread:2300908313").toString("base64");
  const result = await page.evaluate(async ({ globalThreadId, hash }) => {
    const variables = {
      numRequestedMessages: 50,
      getThreadState: true,
      getParticipants: true,
      mockThreadIdentifier: null,
      mockMessageTestIdentifier: null,
      getLastReads: true,
      forceUgcTranslation: false,
      isNovaLite: false,
      globalThreadId,
      mockListFooterSlot: null,
      forceReturnAllReadReceipts: false,
      originType: "USER_INBOX",
      getInboxFields: true,
    };

    const params = new URLSearchParams({
      operationName: "ViaductGetThreadAndDataQuery",
      locale: "fr",
      currency: "EUR",
      variables: JSON.stringify(variables),
      extensions: JSON.stringify({
        persistedQuery: {
          version: 1,
          sha256Hash: hash,
        },
      }),
    });

    const url = `https://www.airbnb.fr/api/v3/ViaductGetThreadAndDataQuery/${hash}?${params.toString()}`;
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`Failed request: ${response.status}`);
    }
    return response.json();
  }, { globalThreadId, hash });

  console.log(JSON.stringify(result).substring(0, 1000));
  await browser.close();
  await pool?.end?.();
  process.exit(0);
})();
