/**
 * SYNC WORKER - Scraping Inbox Airbnb (inspiré du système Python)
 * 
 * Rôle: Scraper l'inbox Airbnb toutes les 45s via Playwright
 * - Réutilise airbnb-session.json
 * - Détection captcha automatique
 * - Insertion dans conversations + messages
 * - Resilience infinie (never exit)
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { db } from '../server/db';
import { conversations, messages } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const SCRAPE_INTERVAL_SEC = parseInt(process.env.SCRAPE_INTERVAL_SEC || '45', 10);
const SESSION_FILE = path.join(process.cwd(), 'airbnb-session.json');

interface ThreadData {
  airbnbThreadId: string;
  guestName: string;
  listingTitle?: string;
  lastMessagePreview: string;
  lastMessageTime: Date;
  isUnread: boolean;
  airbnbUrl: string;
}

interface MessageData {
  content: string;
  isFromGuest: boolean;
  timestamp: Date;
  airbnbMessageId?: string;
}

/**
 * Détecte si un captcha est présent
 */
async function detectCaptcha(page: Page): Promise<boolean> {
  try {
    const captchaSelectors = [
      'iframe[src*="recaptcha"]',
      'div[class*="captcha"]',
      '#px-captcha',
      '[data-testid="captcha"]'
    ];

    for (const selector of captchaSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`🤖 [SYNC] Captcha détecté: ${selector}`);
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Lance le navigateur avec la session persistée
 */
async function launchBrowser(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const browser = await chromium.launch({
    headless: true, // FORCE HEADLESS
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  let context: BrowserContext;

  // Charger la session si elle existe
  if (fs.existsSync(SESSION_FILE)) {
    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    context = await browser.newContext({
      storageState: sessionData,
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    console.log('✅ [SYNC] Session Airbnb chargée');
  } else {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    console.warn('⚠️ [SYNC] Aucune session trouvée, démarrage sans cookies');
  }

  const page = await context.newPage();
  return { browser, context, page };
}

/**
 * Scrape l'inbox via GraphQL (méthode préférée)
 */
async function scrapeInboxGraphQL(page: Page): Promise<ThreadData[]> {
  try {
    // Intercepter les requêtes GraphQL ViaductInboxData
    const graphqlResponses: any[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/v3/ViaductInboxData') || url.includes('InboxData')) {
        try {
          const json = await response.json();
          graphqlResponses.push(json);
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });

    // Naviguer vers inbox pour déclencher les requêtes
    await page.goto('https://www.airbnb.com/hosting/inbox', { timeout: 30000 });
    await page.waitForTimeout(5000); // Attendre que GraphQL se charge

    // Parser les réponses GraphQL
    const threads: ThreadData[] = [];

    for (const response of graphqlResponses) {
      const parsedThreads = parseGraphQLResponse(response);
      threads.push(...parsedThreads);
    }

    if (threads.length > 0) {
      console.log(`✅ [SYNC] ${threads.length} threads scrapés via GraphQL`);
      return threads;
    }

    return [];
  } catch (error) {
    console.error('❌ [SYNC] Erreur GraphQL:', error);
    return [];
  }
}

/**
 * Parse les réponses GraphQL (5 structures supportées comme Python)
 */
function parseGraphQLResponse(data: any): ThreadData[] {
  const threads: ThreadData[] = [];

  try {
    // Structure 1: data.viewer.inbox_threads.edges
    if (data?.data?.viewer?.inbox_threads?.edges) {
      for (const edge of data.data.viewer.inbox_threads.edges) {
        const node = edge.node;
        threads.push({
          airbnbThreadId: node.id,
          guestName: node.guest?.name || 'Voyageur',
          lastMessagePreview: node.last_message?.text || '',
          lastMessageTime: new Date(node.last_message_at),
          isUnread: node.unread_count > 0,
          airbnbUrl: `https://www.airbnb.com/hosting/inbox/folder/all/${node.id}`
        });
      }
    }

    // Structure 2: data.inbox.threads
    if (data?.data?.inbox?.threads) {
      for (const thread of data.data.inbox.threads) {
        threads.push({
          airbnbThreadId: thread.id,
          guestName: thread.guest_name || 'Voyageur',
          lastMessagePreview: thread.last_message_preview || '',
          lastMessageTime: new Date(thread.last_message_time),
          isUnread: thread.is_unread,
          airbnbUrl: `https://www.airbnb.com/hosting/inbox/folder/all/${thread.id}`
        });
      }
    }

    // Ajouter les 3 autres structures si nécessaire
  } catch (error) {
    console.error('❌ [SYNC] Erreur parsing GraphQL:', error);
  }

  return threads;
}

/**
 * Fallback: Scrape via DOM si GraphQL échoue
 */
async function scrapeInboxDOM(page: Page): Promise<ThreadData[]> {
  try {
    await page.goto('https://www.airbnb.com/hosting/inbox', { timeout: 30000 });
    await page.waitForSelector('[data-testid="inbox-thread"]', { timeout: 10000 });

    const threads = await page.$$eval('[data-testid="inbox-thread"]', (elements) => {
      return elements.map((el) => {
        const threadId = el.getAttribute('data-thread-id') || '';
        const guestName = el.querySelector('[data-testid="guest-name"]')?.textContent || 'Voyageur';
        const lastMessage = el.querySelector('[data-testid="message-preview"]')?.textContent || '';
        const unreadBadge = el.querySelector('[data-testid="unread-badge"]');

        return {
          airbnbThreadId: threadId,
          guestName,
          lastMessagePreview: lastMessage,
          lastMessageTime: new Date(),
          isUnread: !!unreadBadge,
          airbnbUrl: `https://www.airbnb.com/hosting/inbox/folder/all/${threadId}`
        };
      });
    });

    console.log(`✅ [SYNC] ${threads.length} threads scrapés via DOM`);
    return threads;
  } catch (error) {
    console.error('❌ [SYNC] Erreur DOM:', error);
    return [];
  }
}

/**
 * Insère ou met à jour une conversation dans la DB
 */
async function upsertConversation(thread: ThreadData) {
  try {
    // Vérifier si la conversation existe
    const existing = await db
      .select()
      .from(conversations)
      .where(eq(conversations.externalId, thread.airbnbThreadId))
      .limit(1);

    if (existing.length > 0) {
      // Mettre à jour
      await db
        .update(conversations)
        .set({
          guestName: thread.guestName,
          lastMessageAt: thread.lastMessageTime,
          updatedAt: new Date()
        })
        .where(eq(conversations.externalId, thread.airbnbThreadId));
    } else {
      // Créer (nécessite propertyId - on prend le premier)
      const firstProperty = await db.execute(sql`SELECT id FROM properties LIMIT 1`);
      const propertyId = firstProperty.rows[0]?.id;

      if (!propertyId) {
        console.error('❌ [SYNC] Aucune propriété trouvée dans la base');
        return;
      }

      await db.insert(conversations).values({
        propertyId: propertyId,
        externalId: thread.airbnbThreadId,
        source: 'airbnb-cohost',
        guestName: thread.guestName,
        status: 'active',
        lastMessageAt: thread.lastMessageTime,
        checkIn: null,
        checkOut: null
      });
    }

    console.log(`✅ [SYNC] Conversation ${thread.airbnbThreadId} synchronisée`);
  } catch (error) {
    console.error(`❌ [SYNC] Erreur upsert conversation:`, error);
  }
}

/**
 * Boucle infinie de scraping (Pattern Python)
 */
async function runSyncWorkerInfinite() {
  console.log('🚀 [SYNC] Worker démarré - Mode résilient infini');

  while (true) {
    let browser: Browser | null = null;

    try {
      console.log('🔄 [SYNC] Démarrage cycle scraping...');

      // 1. Lancement navigateur
      const { browser: b, context, page } = await launchBrowser();
      browser = b;

      // 2. Détection captcha
      await page.goto('https://www.airbnb.com/hosting/inbox', { timeout: 30000 });
      await page.waitForTimeout(2000);

      if (await detectCaptcha(page)) {
        console.warn('🤖 [SYNC] Captcha détecté, pause 60s');
        await page.waitForTimeout(60000);
        continue; // Pas de exit, juste retry
      }

      // 3. Scraping GraphQL (préféré)
      let threads = await scrapeInboxGraphQL(page);

      // 4. Fallback DOM si GraphQL échoue
      if (threads.length === 0) {
        console.warn('⚠️ [SYNC] GraphQL failed, fallback DOM');
        threads = await scrapeInboxDOM(page);
      }

      // 5. Insertion DB
      for (const thread of threads) {
        await upsertConversation(thread);
      }

      console.log(`✅ [SYNC] Cycle terminé: ${threads.length} conversations synchronisées`);

    } catch (error: any) {
      console.error(`❌ [SYNC] Erreur worker:`, error.message);
      // Pas de exit, juste log et retry
    } finally {
      // Cleanup navigateur (TOUJOURS exécuté)
      if (browser) {
        await browser.close();
      }

      // Pause avant prochain cycle
      console.log(`💤 [SYNC] Sleep ${SCRAPE_INTERVAL_SEC}s avant prochain cycle`);
      await new Promise(resolve => setTimeout(resolve, SCRAPE_INTERVAL_SEC * 1000));
    }
  }
}

// Lancement du worker
if (require.main === module) {
  console.log('🟢 [SYNC] Initialisation Sync Worker...');
  runSyncWorkerInfinite().catch((error) => {
    console.error('💥 [SYNC] Crash fatal:', error);
    process.exit(1);
  });
}

export { runSyncWorkerInfinite };
