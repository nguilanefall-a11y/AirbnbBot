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
  const hash = "d29354be6227b5d0f7f65895012fbfa5c38f31b7fcf829cf340188ea8cff3d9a";
  const baseUrl = process.env.AIRBNB_BASE_URL || "https://www.airbnb.com";
  const origin = new URL(baseUrl).origin;
  const globalThreadId = Buffer.from("MessageThread:2300908313").toString("base64");
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
  const url = `${origin}/api/v3/ViaductGetThreadAndDataQuery/${hash}?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "x-airbnb-api-key": "d306zoyjsyarp7ifhu67rjxn52tv0t20",
      "accept-language": "fr-FR",
      "cookie": cookies,
    },
  });
  console.log(response.status, response.statusText);
  const data = await response.json();
  console.log(JSON.stringify(data).substring(0, 1000));
  await pool?.end?.();
  process.exit(0);
})();
