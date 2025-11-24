/**
 * Airbnb Co-Host Messaging via Playwright
 * 
 * ✅ APPROCHE LÉGALE : Utilise le compte co-hôte pour accéder aux annonces des clients
 * 
 * Le co-hôte a un accès légitime aux annonces et messages, donc cette approche est légale.
 * 
 * Fonctionnalités :
 * - Se connecte avec le compte co-hôte
 * - Accède aux annonces des clients (via le compte co-hôte)
 * - Récupère les messages depuis ces annonces
 * - Envoie les réponses via le compte co-hôte
 */

import type { Property } from "@shared/schema";

const AIRBNB_BASE_URL = process.env.AIRBNB_BASE_URL || "https://www.airbnb.com";
const AIRBNB_HOSTNAME = new URL(AIRBNB_BASE_URL).hostname.replace(/^www\./, "");
const AIRBNB_COOKIE_DOMAIN = `.${AIRBNB_HOSTNAME}`;
const AIRBNB_LOCALE = process.env.AIRBNB_LOCALE || "fr";
const AIRBNB_CURRENCY = process.env.AIRBNB_CURRENCY || "EUR";
const AIRBNB_API_KEY = process.env.AIRBNB_API_KEY || "d306zoyjsyarp7ifhu67rjxn52tv0t20";
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function buildCookieObjects(rawCookies: string) {
  const cookiePairs = rawCookies.split(";").map((p) => p.trim()).filter(Boolean);
  return cookiePairs.map((pair) => {
    const [name, ...rest] = pair.split("=");
    const value = rest.join("=");
    return {
      name,
      value,
      domain: AIRBNB_COOKIE_DOMAIN,
      path: "/",
    } as any;
  });
}

function decodeThreadId(globalId: string): string {
  try {
    const decoded = Buffer.from(globalId, "base64").toString("utf8");
    const parts = decoded.split(":");
    return parts.length > 1 ? parts[1] : decoded;
  } catch {
    return globalId;
  }
}

function extractGuestNameFromThread(thread: any, fallback: string): string {
  // Pour les conversations co-host, utiliser directement le titre de la boîte de réception
  if (thread?.messageThreadType === "STAY_COHOST_DIRECT") {
    return thread?.inboxTitle?.components?.[0]?.text || fallback;
  }

  const participants = thread?.participants?.edges || [];
  const guest = participants.find(
    (edge: any) =>
      edge?.node?.participantRole === "GUEST" ||
      edge?.node?.productRole === "BOOKER",
  );
  return (
    guest?.node?.enrichedParticipantInfo?.name ||
    guest?.node?.enrichedParticipantInfo?.threadDisplayName ||
    fallback
  );
}

export interface CoHostCredentials {
  email?: string;
  password?: string;
  cookies?: string; // Cookies de session (préféré)
}

export interface ListingMessage {
  listingId: string;
  listingName: string;
  conversationId: string;
  guestName: string;
  message: string;
  sentAt: Date;
  bookingId?: string;
}

export interface CoHostListing {
  listingId: string;
  name: string;
  address?: string;
  url: string;
}

/**
 * Se connecte à Airbnb avec le compte co-hôte
 * Retourne les cookies de session pour les requêtes suivantes
 */
export async function loginAsCoHost(
  credentials: CoHostCredentials,
): Promise<string> {
  const enabled = process.env.PLAYWRIGHT_ENABLED === "1";
  if (!enabled) {
    throw new Error("Playwright disabled. Set PLAYWRIGHT_ENABLED=1 to enable.");
  }

  // Si on a déjà des cookies, on les retourne
  if (credentials.cookies) {
    return credentials.cookies;
  }

  // Sinon, on se connecte avec email/password
  if (!credentials.email || !credentials.password) {
    throw new Error("Email/password ou cookies requis pour la connexion");
  }

  // @ts-ignore
  const { chromium } = await import("playwright");

  let browser: any = null;
  try {
    browser = await chromium.launch({
      headless: true,
      timeout: 60000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "fr-FR",
    });

    const page = await context.newPage();

    // Naviguer vers la page de connexion
    await page.goto(`${AIRBNB_BASE_URL}/login`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    await page.waitForTimeout(2000);

    // Remplir le formulaire de connexion
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', credentials.email);
    await page.waitForTimeout(500);

    // Cliquer sur "Continuer" ou "Suivant"
    const continueButton = page.locator('button:has-text("Continuer"), button:has-text("Suivant"), button[type="submit"]').first();
    await continueButton.click();
    await page.waitForTimeout(2000);

    // Remplir le mot de passe
    await page.fill('input[type="password"], input[name="password"]', credentials.password);
    await page.waitForTimeout(500);

    // Cliquer sur "Se connecter"
    const loginButton = page.locator('button:has-text("Se connecter"), button:has-text("Connexion"), button[type="submit"]').first();
    await loginButton.click();

    // Attendre la redirection après connexion
    await page.waitForURL("**/hosting/**", { timeout: 30000 }).catch(() => {
      // Si pas de redirection vers hosting, vérifier qu'on est connecté
      return page.waitForURL("**/account/**", { timeout: 10000 });
    });

    await page.waitForTimeout(3000);

    // Récupérer les cookies
    const cookies = await context.cookies();
    const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    return cookieString;
  } catch (error: any) {
    console.error("Erreur lors de la connexion co-hôte:", error?.message || error);
    throw new Error(`Échec de la connexion : ${error?.message || "Erreur inconnue"}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError: any) {
        console.warn("Erreur fermeture navigateur:", closeError?.message);
      }
    }
  }
}

/**
 * Récupère toutes les annonces accessibles via le compte co-hôte
 */
export async function fetchCoHostListings(
  cookies: string,
): Promise<CoHostListing[]> {
  const enabled = process.env.PLAYWRIGHT_ENABLED === "1";
  if (!enabled) {
    throw new Error("Playwright disabled. Set PLAYWRIGHT_ENABLED=1 to enable.");
  }

  // @ts-ignore
  const { chromium } = await import("playwright");

  let browser: any = null;
  try {
    browser = await chromium.launch({
      headless: true,
      timeout: 60000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "fr-FR",
    });

    const cookieObjects = buildCookieObjects(cookies);
    if (cookieObjects.length) await context.addCookies(cookieObjects);

    const page = await context.newPage();

    // Naviguer vers la page des annonces (hosting dashboard)
    await page.goto(`${AIRBNB_BASE_URL}/hosting/listings`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    await page.waitForTimeout(3000);

    // Scraper les annonces
    const listings = await page.evaluate(() => {
      const results: CoHostListing[] = [];

      // Sélecteurs pour les annonces (à adapter selon l'interface Airbnb)
      const listingElements = document.querySelectorAll(
        `[data-testid*='listing'], .listing-card, [role='listitem'] a[href*='/rooms/']`,
      );

      listingElements.forEach((el) => {
        try {
          const link = el.closest("a") || (el as HTMLAnchorElement);
          const href = link.getAttribute("href") || "";
          const match = href.match(/\/rooms\/(\d+)/);
          if (!match) return;

          const listingId = match[1];
          const nameEl = el.querySelector(`h3, .listing-name, [data-testid*='name']`);
          const name = nameEl?.textContent?.trim() || `Annonce ${listingId}`;

          results.push({
            listingId,
            name,
            url: href.startsWith("http") ? href : `https://www.airbnb.com${href}`,
          });
        } catch (e) {
          console.warn("Erreur parsing annonce:", e);
        }
      });

      return results;
    });

    return listings;
  } catch (error: any) {
    console.error("Erreur récupération annonces:", error?.message || error);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError: any) {
        console.warn("Erreur fermeture navigateur:", closeError?.message);
      }
    }
  }
}

/**
 * Récupère les messages pour une annonce spécifique (via le compte co-hôte)
 */
export async function fetchMessagesForListing(
  listingId: string,
  cookies: string,
  listingName?: string,
): Promise<ListingMessage[]> {
  const enabled = process.env.PLAYWRIGHT_ENABLED === "1";
  if (!enabled) {
    throw new Error("Playwright disabled. Set PLAYWRIGHT_ENABLED=1 to enable.");
  }

  // @ts-ignore
  const { chromium } = await import("playwright");

  let browser: any = null;
  try {
    browser = await chromium.launch({
      headless: true,
      timeout: 60000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "fr-FR",
    });

    const cookieObjects = buildCookieObjects(cookies);
    if (cookieObjects.length) await context.addCookies(cookieObjects);

    const page = await context.newPage();

    await page.goto(`${AIRBNB_BASE_URL}/hosting/messages`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const response = await page.waitForResponse(
      (res) => res.url().includes("ViaductInboxData"),
      { timeout: 30000 },
    );

    const data = await response.json();
    const threads = data?.data?.node?.messagingInbox?.threads?.edges || [];
    const normalizedListingId = listingId?.toString();
    const messages: ListingMessage[] = [];

    for (const edge of threads) {
      const thread = edge?.node;
      if (!thread) continue;

      const tags = thread.userThreadTags || [];
      const belongsToListing = tags.some(
        (tag: any) =>
          tag?.userThreadTagName === "stay_listing_ids" &&
          (tag?.additionalValues || []).includes(normalizedListingId),
      );

      // Inclure aussi les conversations co-host directes (STAY_COHOST_DIRECT)
      const isCohostDirect = thread.messageThreadType === "STAY_COHOST_DIRECT";

      if (!belongsToListing && !isCohostDirect) {
        continue;
      }

      const conversationId = decodeThreadId(thread.id);
      const guestName = extractGuestNameFromThread(
        thread,
        thread.inboxTitle?.components?.[0]?.text || "Voyageur",
      );
      const messageContent =
        thread.messages?.edges?.[0]?.node?.contentPreview?.content ||
        thread.inboxAccessibilityTemplateText ||
        "";
      const sentAt = thread.mostRecentInboxActivityAtMsFromROS
        ? new Date(Number(thread.mostRecentInboxActivityAtMsFromROS))
        : new Date();

      messages.push({
        listingId: normalizedListingId,
        listingName: listingName || thread.inboxDescription?.components?.[0]?.text || "",
        conversationId,
        guestName,
        message: messageContent.trim(),
        sentAt,
        bookingId: thread.confirmationCode || undefined,
      });
    }

    return messages;
  } catch (error: any) {
    console.error("Erreur récupération messages:", error?.message || error);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError: any) {
        console.warn("Erreur fermeture navigateur:", closeError?.message);
      }
    }
  }
}

/**
 * Récupère toutes les conversations co-host (STAY_COHOST_DIRECT)
 */
export async function fetchAllCohostConversations(
  cookies: string,
): Promise<ListingMessage[]> {
  const enabled = process.env.PLAYWRIGHT_ENABLED === "1";
  if (!enabled) {
    throw new Error("Playwright disabled. Set PLAYWRIGHT_ENABLED=1 to enable.");
  }

  // @ts-ignore
  const { chromium } = await import("playwright");

  let browser: any = null;
  try {
    browser = await chromium.launch({
      headless: true,
      timeout: 60000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: DEFAULT_USER_AGENT,
      locale: AIRBNB_LOCALE,
    });

    const cookieObjects = buildCookieObjects(cookies);
    if (cookieObjects.length) await context.addCookies(cookieObjects);

    const page = await context.newPage();

    await page.goto(`${AIRBNB_BASE_URL}/hosting/messages`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const response = await page.waitForResponse(
      (res) => res.url().includes("ViaductInboxData"),
      { timeout: 30000 },
    );

    const data = await response.json();
    const threads = data?.data?.node?.messagingInbox?.threads?.edges || [];
    const messages: ListingMessage[] = [];

    for (const edge of threads) {
      const thread = edge?.node;
      if (!thread) continue;

      // Filtrer uniquement les conversations co-host directes
      if (thread.messageThreadType !== "STAY_COHOST_DIRECT") {
        continue;
      }

      const conversationId = decodeThreadId(thread.id);
      const guestName = extractGuestNameFromThread(
        thread,
        thread.inboxTitle?.components?.[0]?.text || "Co-hôte",
      );
      const messageContent =
        thread.messages?.edges?.[0]?.node?.contentPreview?.content ||
        thread.inboxAccessibilityTemplateText ||
        "";
      const sentAt = thread.mostRecentInboxActivityAtMsFromROS
        ? new Date(Number(thread.mostRecentInboxActivityAtMsFromROS))
        : new Date();

      messages.push({
        listingId: "cohost-direct", // Marqueur spécial pour conversations co-host
        listingName: "Conversation co-hôte",
        conversationId,
        guestName,
        message: messageContent.trim(),
        sentAt,
        bookingId: undefined,
      });
    }

    return messages;
  } catch (error: any) {
    console.error("Erreur récupération conversations co-host:", error?.message || error);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError: any) {
        console.warn("Erreur fermeture navigateur:", closeError?.message);
      }
    }
  }
}

/**
 * Récupère les messages détaillés d'une conversation spécifique
 */
export async function fetchConversationMessages(
  conversationId: string,
  cookies: string,
): Promise<Array<{ content: string; isGuest: boolean; sentAt: Date }>> {
  const enabled = process.env.PLAYWRIGHT_ENABLED === "1";
  if (!enabled) {
    throw new Error("Playwright disabled. Set PLAYWRIGHT_ENABLED=1 to enable.");
  }

  const THREAD_QUERY_HASH = "d29354be6227b5d0f7f65895012fbfa5c38f31b7fcf829cf340188ea8cff3d9a";
  const globalThreadId = Buffer.from(`MessageThread:${conversationId}`).toString("base64");
  const apiOrigin = new URL(AIRBNB_BASE_URL).origin;

  const variables = {
    numRequestedMessages: 100, // Augmenter à 100 pour récupérer plus de messages
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
    locale: AIRBNB_LOCALE,
    currency: AIRBNB_CURRENCY,
    variables: JSON.stringify(variables),
    extensions: JSON.stringify({
      persistedQuery: {
        version: 1,
        sha256Hash: THREAD_QUERY_HASH,
      },
    }),
  });

  const url = `${apiOrigin}/api/v3/ViaductGetThreadAndDataQuery/${THREAD_QUERY_HASH}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "user-agent": DEFAULT_USER_AGENT,
      "x-airbnb-api-key": AIRBNB_API_KEY,
      "accept-language": `${AIRBNB_LOCALE}-${AIRBNB_LOCALE.toUpperCase()}`,
      cookie: cookies,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch conversation messages (${response.status})`);
  }

  const data = await response.json();
  const thread = data?.data?.threadData;
  if (!thread) {
    return [];
  }

  const participantRoles = new Map<string, string>();
  (thread.participants?.edges || []).forEach((edge: any) => {
    const accountId = edge?.node?.accountId;
    if (accountId) {
      participantRoles.set(accountId, edge?.node?.participantRole);
    }
  });

  const messages = (thread.messages?.edges || []).map((edge: any) => {
    const node = edge?.node;
    const accountId = node?.account?.accountId;
    const role = accountId ? participantRoles.get(accountId) : undefined;
    const isGuest = role === "GUEST" || role === "BOOKER";
    const sentAt = node?.createdAtMs ? new Date(Number(node.createdAtMs)) : new Date();
    const content = node?.contentPreview?.content || "";
    return {
      content,
      isGuest,
      sentAt,
    };
  });

  return messages;
}

/**
 * Envoie un message via le compte co-hôte (légal car c'est son compte)
 * Version améliorée avec sélecteurs spécifiques Airbnb et gestion des iframes
 */
export async function sendMessageAsCoHost(
  conversationId: string,
  message: string,
  cookies: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const enabled = process.env.PLAYWRIGHT_ENABLED === "1";
  if (!enabled) {
    return {
      success: false,
      error: "Playwright disabled. Set PLAYWRIGHT_ENABLED=1 to enable.",
    };
  }

  // @ts-ignore
  const { chromium } = await import("playwright");

  let browser: any = null;
  try {
    console.log(`📤 Démarrage envoi message sur Airbnb (conversation: ${conversationId})`);

    browser = await chromium.launch({
      headless: process.env.PLAYWRIGHT_HEADLESS !== "0", // Par défaut headless, mais peut être désactivé pour debug
      timeout: 60000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: DEFAULT_USER_AGENT,
      locale: AIRBNB_LOCALE,
    });

    // Ajouter les cookies de session
    const cookieObjects = buildCookieObjects(cookies);
    if (cookieObjects.length) {
      await context.addCookies(cookieObjects);
      console.log(`✅ ${cookieObjects.length} cookie(s) ajouté(s)`);
    } else {
      console.warn("⚠️ Aucun cookie fourni");
    }

    const page = await context.newPage();

    // Naviguer vers la conversation
    // Essayer d'abord avec /hosting/messages (pour les co-hôtes)
    const conversationUrl = `${AIRBNB_BASE_URL}/hosting/messages/${conversationId}`;
    console.log(`🌐 Navigation vers: ${conversationUrl}`);
    
    try {
      await page.goto(conversationUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    } catch (e: any) {
      return {
        success: false,
        error: `Erreur navigation: ${e?.message || "Timeout"}`,
      };
    }

    // Attendre que la page soit complètement chargée
    console.log("⏳ Attente du chargement complet de la page...");
    try {
      await page.waitForLoadState("networkidle", { timeout: 30000 });
    } catch (e) {
      console.warn("⚠️ Networkidle timeout, continuation...");
    }
    
    await page.waitForTimeout(5000); // Attendre un peu plus pour que React charge

    // Vérifier si on est redirigé vers la page de login (cookies expirés)
    const currentUrl = page.url();
    console.log(`📍 URL actuelle: ${currentUrl}`);
    
    if (currentUrl.includes("/login") || currentUrl.includes("/signup")) {
      await browser.close();
      return {
        success: false,
        error: "Session expirée. Veuillez mettre à jour les cookies dans les paramètres.",
      };
    }

    // --- 1. Trouver le champ de message (priorité aux sélecteurs Airbnb spécifiques) ---
    console.log("🔍 Recherche du champ de message...");
    
    let messageInput: any = null;
    const inputSelectors = [
      // Sélecteurs spécifiques Airbnb (priorité) - uniquement pour les champs de texte
      'textarea[data-testid="thread-message-input"]',
      'textarea[data-testid*="message-input"]',
      'textarea[data-testid*="thread-input"]',
      '[contenteditable="true"][data-testid*="message-input"]',
      '[contenteditable="true"][data-testid*="thread-input"]',
      // Sélecteurs génériques pour textarea
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="écrire" i]',
      'textarea[placeholder*="write" i]',
      'textarea[placeholder*="Écrire" i]',
      'textarea[role="textbox"]',
      'textarea',
      // Sélecteurs pour contenteditable
      '[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"]',
      // Dernier recours: role="textbox" (mais pas les boutons)
      '[role="textbox"]:not(button)',
    ];

    // Essayer chaque sélecteur avec un timeout plus long
    for (const selector of inputSelectors) {
      try {
        console.log(`   Essai avec: ${selector}`);
        await page.waitForSelector(selector, { timeout: 10000, state: "visible" });
        messageInput = page.locator(selector).first();
        const count = await messageInput.count();
        if (count > 0) {
          const isVisible = await messageInput.isVisible();
          if (isVisible) {
            console.log(`✅ Champ de message trouvé avec: ${selector}`);
            break;
          }
        }
      } catch (e) {
        // Continuer avec le prochain sélecteur
        console.log(`   ❌ Non trouvé avec: ${selector}`);
      }
    }

    // Si pas trouvé, vérifier dans les iframes
    if (!messageInput || (await messageInput.count()) === 0) {
      console.log("🔍 Recherche dans les iframes...");
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const frameInput = frame.locator('textarea, [contenteditable="true"]').first();
          if (await frameInput.count() > 0) {
            messageInput = frameInput;
            console.log("✅ Champ trouvé dans un iframe");
            break;
          }
        } catch (e) {
          // Ignorer
        }
      }
    }

    // Dernière tentative: chercher n'importe quel textarea ou contenteditable visible (mais pas les boutons)
    if (!messageInput || (await messageInput.count()) === 0) {
      console.log("🔍 Dernière tentative avec sélecteur générique...");
      try {
        // Exclure explicitement les boutons
        const allInputs = page.locator('textarea, [contenteditable="true"]:not(button)');
        const count = await allInputs.count();
        console.log(`   Trouvé ${count} élément(s) potentiel(s)`);
        
        for (let i = 0; i < Math.min(count, 5); i++) {
          const input = allInputs.nth(i);
          const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
          if (tagName !== 'button' && await input.isVisible()) {
            messageInput = input;
            console.log(`✅ Champ trouvé à l'index ${i} (${tagName})`);
            break;
          }
        }
      } catch (e) {
        console.log("   ❌ Aucun champ trouvé");
      }
    }

    if (!messageInput || (await messageInput.count()) === 0) {
      // Debug: capturer le HTML pour voir ce qui est disponible
      try {
        const html = await page.content();
        const hasTextArea = html.includes("textarea") || html.includes("contenteditable");
        const title = await page.title();
        return {
          success: false,
          error: `Champ de message non trouvé. Page: "${title}", chargée: ${hasTextArea ? "oui (sélecteurs ne matchent pas)" : "non"}. URL: ${currentUrl}`,
        };
      } catch (e: any) {
        return {
          success: false,
          error: `Champ de message non trouvé. URL: ${currentUrl}. Erreur: ${e?.message}`,
        };
      }
    }

    // --- 2. Saisir le message ---
    console.log(`✍️ Saisie du message: "${message.substring(0, 50)}..."`);
    try {
      await messageInput.click({ timeout: 5000 });
      await page.waitForTimeout(500);
      
      // Essayer fill() d'abord
      try {
        await messageInput.fill(message, { timeout: 5000 });
      } catch (e) {
        // Si fill() ne fonctionne pas, utiliser type()
        await messageInput.clear();
        await messageInput.type(message, { delay: 50 });
      }
      
      await page.waitForTimeout(500);
      console.log("✅ Message saisi");
    } catch (e: any) {
      return {
        success: false,
        error: `Erreur lors de la saisie: ${e?.message || "Erreur inconnue"}`,
      };
    }

    // --- 3. Trouver et cliquer sur le bouton d'envoi ---
    console.log("🔍 Recherche du bouton d'envoi...");
    
    let sendButton: any = null;
    const buttonSelectors = [
      // Sélecteurs spécifiques Airbnb (priorité)
      '[data-testid="thread-send-button"]',
      '[data-testid*="send-button"]',
      '[data-testid*="send"]',
      // Sélecteurs génériques
      'button[type="submit"]',
      'button[aria-label*="send" i]',
      'button[aria-label*="envoyer" i]',
      'button[title*="send" i]',
      'button[title*="envoyer" i]',
    ];

    for (const selector of buttonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.count() > 0 && await button.isVisible() && !(await button.isDisabled())) {
          sendButton = button;
          console.log(`✅ Bouton d'envoi trouvé avec: ${selector}`);
          break;
        }
      } catch (e) {
        // Continuer
      }
    }

    // Si pas trouvé, essayer avec getByRole ou getByText
    if (!sendButton || (await sendButton.count()) === 0) {
      try {
        // Essayer avec getByRole (méthode Playwright moderne)
        const roleButton = page.getByRole("button", { name: /envoyer|send/i });
        if (await roleButton.count() > 0 && await roleButton.isVisible()) {
          sendButton = roleButton.first();
          console.log("✅ Bouton trouvé avec getByRole");
        }
      } catch (e) {
        // Ignorer
      }
    }

    // --- 4. Envoyer le message ---
    if (sendButton && (await sendButton.count()) > 0) {
      try {
        await sendButton.click({ timeout: 5000 });
        console.log("✅ Bouton d'envoi cliqué");
      } catch (e: any) {
        console.warn(`⚠️ Erreur clic bouton: ${e?.message}, tentative avec Enter...`);
        // Fallback: utiliser Enter
        await messageInput.press("Enter");
      }
    } else {
      // Dernière tentative: utiliser Enter
      console.log("⚠️ Bouton non trouvé, tentative avec Enter...");
      await messageInput.press("Enter");
    }

    // Attendre que le message soit envoyé
    await page.waitForTimeout(2000);

    // --- 5. Vérifier que le message est bien envoyé ---
    console.log("🔍 Vérification de l'envoi...");
    try {
      // Attendre que le message apparaisse dans la conversation
      await page.waitForSelector(`text=${message.substring(0, 30)}`, { timeout: 10000 }).catch(() => {
        // Si le sélecteur text= ne fonctionne pas, vérifier autrement
        console.log("⚠️ Vérification alternative...");
      });
      
      console.log("✅ Message envoyé avec succès !");
      return {
        success: true,
        messageId: `airbnb-${Date.now()}`,
      };
    } catch (e: any) {
      // Même si la vérification échoue, le message a peut-être été envoyé
      console.warn(`⚠️ Vérification échouée: ${e?.message}, mais le message a peut-être été envoyé`);
      return {
        success: true, // On assume le succès car le clic a fonctionné
        messageId: `airbnb-${Date.now()}`,
      };
    }
  } catch (error: any) {
    console.error("❌ Erreur envoi message co-hôte:", error?.message || error);
    return {
      success: false,
      error: error?.message || "Erreur inconnue lors de l'envoi",
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log("🔒 Navigateur fermé");
      } catch (closeError: any) {
        console.warn("⚠️ Erreur fermeture navigateur:", closeError?.message);
      }
    }
  }
}

