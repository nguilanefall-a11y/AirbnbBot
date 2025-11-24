/**
 * Airbnb Messaging via Playwright
 * 
 * Récupère les messages directement depuis Airbnb (contourne Smoobu)
 * Utilise Playwright pour automatiser la navigation et le scraping
 * 
 * ⚠️ AVERTISSEMENT : Utiliser avec précaution pour respecter les ToS Airbnb
 */

import type { Property } from "@shared/schema";

export interface AirbnbMessage {
  id: string;
  conversationId: string;
  guestName: string;
  guestMessage: string;
  sentAt: Date;
  bookingId?: string;
  propertyId?: string;
}

export interface AirbnbConversation {
  id: string;
  guestName: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  bookingId?: string;
}

export type ScrapeOptions = {
  cookiesHeader?: string; // Cookies de session du co-hôte Airbnb
  timeoutMs?: number;
  headless?: boolean;
};

/**
 * Récupère toutes les conversations Airbnb non lues
 * Contourne Smoobu en accédant directement à Airbnb
 */
export async function fetchAirbnbConversations(
  options: ScrapeOptions = {},
): Promise<AirbnbConversation[]> {
  const enabled = process.env.PLAYWRIGHT_ENABLED === "1";
  if (!enabled) {
    throw new Error("Playwright disabled. Set PLAYWRIGHT_ENABLED=1 to enable.");
  }

  const { cookiesHeader, timeoutMs = 60000, headless = true } = options;

  if (!cookiesHeader) {
    throw new Error("Cookies de session Airbnb requis (cookiesHeader)");
  }

  // Dynamic import pour éviter la dépendance si désactivé
  // @ts-ignore
  const { chromium } = await import("playwright");

  let browser: any = null;
  try {
    browser = await chromium.launch({
      headless,
      timeout: timeoutMs,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "fr-FR",
      timezoneId: "Europe/Paris",
    });

    // Ajouter les cookies de session
    if (cookiesHeader) {
      const cookiePairs = cookiesHeader
        .replace(/^cookie:\s*/i, "")
        .split(";")
        .map((p) => p.trim())
        .filter(Boolean);
      const cookies = cookiePairs.map((pair) => {
        const [name, ...rest] = pair.split("=");
        const value = rest.join("=");
        return {
          name,
          value,
          domain: ".airbnb.com",
          path: "/",
        } as any;
      });
      if (cookies.length) await context.addCookies(cookies);
    }

    const page = await context.newPage();

    // Naviguer vers la page des messages Airbnb
    await page.goto("https://www.airbnb.com/messages", {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    });

    // Attendre que la liste des conversations se charge
    await page.waitForTimeout(3000);

    // Scraper les conversations
    const conversations = await page.evaluate(() => {
      const convs: AirbnbConversation[] = [];

      // Sélecteurs Airbnb (peuvent changer, à adapter)
      const conversationElements = document.querySelectorAll(
        '[data-testid*="conversation"], [data-id*="conversation"], .conversation-item, [role="listitem"]',
      );

      conversationElements.forEach((el, index) => {
        try {
          const guestNameEl = el.querySelector(
            "h3, .guest-name, [data-testid*="name"], .name",
          );
          const lastMessageEl = el.querySelector(
            ".last-message, [data-testid*="message"], .preview",
          );
          const timeEl = el.querySelector(".time, .timestamp, [data-testid*="time"]");

          const guestName = guestNameEl?.textContent?.trim() || `Voyageur ${index + 1}`;
          const lastMessage = lastMessageEl?.textContent?.trim() || "";
          const timeText = timeEl?.textContent?.trim() || "";

          // Extraire l'ID de conversation depuis les attributs data ou href
          let conversationId = "";
          const dataId = el.getAttribute("data-id") || el.getAttribute("data-conversation-id");
          const href = el.querySelector("a")?.getAttribute("href");
          if (dataId) {
            conversationId = dataId;
          } else if (href) {
            const match = href.match(/\/messages\/(\d+)/);
            if (match) conversationId = match[1];
          }

          if (conversationId || guestName) {
            convs.push({
              id: conversationId || `conv-${index}`,
              guestName,
              lastMessage,
              lastMessageAt: timeText ? parseTimeText(timeText) : undefined,
            });
          }
        } catch (e) {
          console.warn("Error parsing conversation:", e);
        }
      });

      return convs;
    });

    return conversations;
  } catch (error: any) {
    console.error("Error fetching Airbnb conversations:", error?.message || error);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError: any) {
        console.warn("Error closing browser:", closeError?.message);
      }
    }
  }
}

/**
 * Récupère les messages d'une conversation spécifique
 */
export async function fetchAirbnbMessages(
  conversationId: string,
  options: ScrapeOptions = {},
): Promise<AirbnbMessage[]> {
  const enabled = process.env.PLAYWRIGHT_ENABLED === "1";
  if (!enabled) {
    throw new Error("Playwright disabled. Set PLAYWRIGHT_ENABLED=1 to enable.");
  }

  const { cookiesHeader, timeoutMs = 60000, headless = true } = options;

  if (!cookiesHeader) {
    throw new Error("Cookies de session Airbnb requis (cookiesHeader)");
  }

  // @ts-ignore
  const { chromium } = await import("playwright");

  let browser: any = null;
  try {
    browser = await chromium.launch({
      headless,
      timeout: timeoutMs,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "fr-FR",
    });

    if (cookiesHeader) {
      const cookiePairs = cookiesHeader
        .replace(/^cookie:\s*/i, "")
        .split(";")
        .map((p) => p.trim())
        .filter(Boolean);
      const cookies = cookiePairs.map((pair) => {
        const [name, ...rest] = pair.split("=");
        const value = rest.join("=");
        return {
          name,
          value,
          domain: ".airbnb.com",
          path: "/",
        } as any;
      });
      if (cookies.length) await context.addCookies(cookies);
    }

    const page = await context.newPage();

    // Naviguer vers la conversation
    await page.goto(`https://www.airbnb.com/messages/${conversationId}`, {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    });

    await page.waitForTimeout(3000);

    // Scraper les messages
    const messages = await page.evaluate(() => {
      const msgs: Array<{
        id: string;
        content: string;
        isGuest: boolean;
        guestName: string;
        sentAt: string;
      }> = [];

      // Sélecteurs pour les messages (à adapter selon l'interface Airbnb)
      const messageElements = document.querySelectorAll(
        '[data-testid*="message"], .message, [role="listitem"]',
      );

      messageElements.forEach((el, index) => {
        try {
          const contentEl = el.querySelector(".message-content, .text, [data-testid*="content"]");
          const senderEl = el.querySelector(".sender, .name, [data-testid*="sender"]");
          const timeEl = el.querySelector(".time, .timestamp, [data-testid*="time"]");

          const content = contentEl?.textContent?.trim() || "";
          const sender = senderEl?.textContent?.trim() || "";
          const timeText = timeEl?.textContent?.trim() || "";

          // Déterminer si c'est un message du voyageur (pas du hôte)
          const isGuest = !el.classList.contains("host-message") &&
            !el.classList.contains("outbound") &&
            sender !== "Vous" &&
            sender !== "You";

          if (content) {
            msgs.push({
              id: el.getAttribute("data-id") || `msg-${index}`,
              content,
              isGuest,
              guestName: isGuest ? sender : "Hôte",
              sentAt: timeText || new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn("Error parsing message:", e);
        }
      });

      return msgs;
    });

    return messages
      .filter((m) => m.isGuest)
      .map((m) => ({
        id: m.id,
        conversationId,
        guestName: m.guestName,
        guestMessage: m.content,
        sentAt: new Date(m.sentAt),
      }));
  } catch (error: any) {
    console.error("Error fetching Airbnb messages:", error?.message || error);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError: any) {
        console.warn("Error closing browser:", closeError?.message);
      }
    }
  }
}

/**
 * Envoie un message via Playwright (contourne complètement Smoobu)
 * 
 * ⚠️ AVERTISSEMENT : Peut violer les ToS Airbnb
 */
export async function sendAirbnbMessageViaPlaywright(
  conversationId: string,
  message: string,
  options: ScrapeOptions = {},
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const enabled = process.env.PLAYWRIGHT_ENABLED === "1";
  if (!enabled) {
    return {
      success: false,
      error: "Playwright disabled. Set PLAYWRIGHT_ENABLED=1 to enable.",
    };
  }

  const { cookiesHeader, timeoutMs = 60000, headless = true } = options;

  if (!cookiesHeader) {
    return {
      success: false,
      error: "Cookies de session Airbnb requis (cookiesHeader)",
    };
  }

  // @ts-ignore
  const { chromium } = await import("playwright");

  let browser: any = null;
  try {
    browser = await chromium.launch({
      headless,
      timeout: timeoutMs,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "fr-FR",
    });

    if (cookiesHeader) {
      const cookiePairs = cookiesHeader
        .replace(/^cookie:\s*/i, "")
        .split(";")
        .map((p) => p.trim())
        .filter(Boolean);
      const cookies = cookiePairs.map((pair) => {
        const [name, ...rest] = pair.split("=");
        const value = rest.join("=");
        return {
          name,
          value,
          domain: ".airbnb.com",
          path: "/",
        } as any;
      });
      if (cookies.length) await context.addCookies(cookies);
    }

    const page = await context.newPage();

    // Naviguer vers la conversation
    await page.goto(`https://www.airbnb.com/messages/${conversationId}`, {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    });

    await page.waitForTimeout(2000);

    // Trouver le champ de texte et envoyer le message
    const sent = await page.evaluate(
      (msg) => {
        // Sélecteurs pour le champ de texte (à adapter)
        const textArea = document.querySelector(
          'textarea[placeholder*="message"], textarea[data-testid*="message"], textarea#message',
        ) as HTMLTextAreaElement | null;

        if (!textArea) {
          return { success: false, error: "Champ de texte non trouvé" };
        }

        // Remplir le champ
        textArea.value = msg;
        textArea.dispatchEvent(new Event("input", { bubbles: true }));
        textArea.dispatchEvent(new Event("change", { bubbles: true }));

        // Trouver le bouton d'envoi
        const sendButton = document.querySelector(
          'button[type="submit"], button[data-testid*="send"], button[aria-label*="send"]',
        ) as HTMLButtonElement | null;

        if (!sendButton) {
          return { success: false, error: "Bouton d'envoi non trouvé" };
        }

        // Cliquer sur le bouton
        sendButton.click();

        return { success: true };
      },
      message,
    );

    if (!sent.success) {
      return sent;
    }

    // Attendre que le message soit envoyé
    await page.waitForTimeout(2000);

    // Vérifier que le message apparaît dans la conversation
    const verified = await page.evaluate(() => {
      const messages = document.querySelectorAll(
        '[data-testid*="message"], .message',
      );
      return messages.length > 0;
    });

    return {
      success: verified,
      messageId: `playwright-${Date.now()}`,
    };
  } catch (error: any) {
    console.error("Error sending message via Playwright:", error?.message || error);
    return {
      success: false,
      error: error?.message || "Erreur inconnue",
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError: any) {
        console.warn("Error closing browser:", closeError?.message);
      }
    }
  }
}

/**
 * Helper pour parser les textes de temps ("il y a 2 heures", "hier", etc.)
 */
function parseTimeText(timeText: string): Date {
  const now = new Date();
  const lower = timeText.toLowerCase();

  if (lower.includes("maintenant") || lower.includes("now")) {
    return now;
  }

  const minutesMatch = lower.match(/(\d+)\s*(min|minute)/);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1]);
    return new Date(now.getTime() - minutes * 60 * 1000);
  }

  const hoursMatch = lower.match(/(\d+)\s*(h|heure|hour)/);
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1]);
    return new Date(now.getTime() - hours * 60 * 60 * 1000);
  }

  if (lower.includes("hier") || lower.includes("yesterday")) {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const daysMatch = lower.match(/(\d+)\s*(j|jour|day)/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  // Essayer de parser une date complète
  const dateMatch = timeText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  return now; // Fallback
}



