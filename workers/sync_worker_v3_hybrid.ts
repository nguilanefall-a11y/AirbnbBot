/**
 * SYNC WORKER V3 - HYBRIDE (Playwright + Scraping Amélioré)
 * 
 * Approach: Utilise Playwright pour maintenir session authentifiée
 * mais avec méthode de scraping plus robuste:
 * 1. Badge Polling (détection rapide)
 * 2. Scraping avec attente lazy loading
 * 3. Scroll pour charger toutes conversations
 * 4. Multiples sélecteurs fallback
 */

import 'dotenv/config';
import { chromium, Browser, Page } from 'playwright';
import { db } from '../server/db';
import { conversations, messages } from '../shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const POLLING_INTERVAL_SEC = parseInt(process.env.POLLING_INTERVAL_SEC || '10', 10);
const SESSION_FILE = path.join(process.cwd(), 'airbnb-session.json');
const INBOX_URL = 'https://www.airbnb.com/hosting/inbox';

interface ThreadData {
  airbnbThreadId: string;
  guestName: string;
  lastMessagePreview: string;
  isUnread: boolean;
  propertyName?: string;
  url: string;
}

/**
 * Charge session Playwright depuis fichier
 */
async function loadPlaywrightSession(page: Page): Promise<void> {
  try {
    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    const cookies = sessionData.cookies || sessionData;
    
    await page.context().addCookies(cookies);
    console.log(`✅ [SYNC] Session Playwright chargée (${cookies.length} cookies)`);
  } catch (error) {
    console.error('❌ [SYNC] Erreur chargement session:', error);
    throw error;
  }
}

/**
 * Détecte CAPTCHA
 */
async function detectCaptcha(page: Page): Promise<boolean> {
  try {
    const captchaSelectors = [
      '[data-testid="captcha"]',
      '#px-captcha',
      'iframe[src*="captcha"]'
    ];

    for (const selector of captchaSelectors) {
      const element = await page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Scraping conversations avec méthode robuste
 */
async function scrapeConversations(page: Page): Promise<ThreadData[]> {
  try {
    console.log('📡 [SYNC] Navigation vers inbox...');
    await page.goto(INBOX_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Attendre que la page charge
    await page.waitForTimeout(3000);

    // Check CAPTCHA
    if (await detectCaptcha(page)) {
      console.error('🚫 [SYNC] CAPTCHA détecté - arrêt');
      return [];
    }

    // Scroll pour lazy loading
    console.log('📜 [SYNC] Scroll pour charger toutes conversations...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(1000);
    }

    // Multiples sélecteurs pour conversations
    const selectors = [
      'a[href*="/hosting/inbox/folder/"]',
      'a[href*="/hosting/messages/"]',
      '[data-testid="thread-item"]',
      '[role="listitem"] a[href*="/hosting/"]',
      'div[data-plugin-in-point-id*="MESSAGING"] a'
    ];

    let threads: ThreadData[] = [];

    for (const selector of selectors) {
      console.log(`🔍 [SYNC] Test sélecteur: ${selector}`);
      
      const elements = await page.locator(selector).all();
      console.log(`   → ${elements.length} éléments trouvés`);

      if (elements.length > 0) {
        // Extract data
        for (const element of elements) {
          try {
            const href = await element.getAttribute('href');
            if (!href || !href.includes('/hosting/')) continue;

            // Extract thread ID from URL
            const threadIdMatch = href.match(/\/([a-f0-9]{24}|[A-Z0-9]+)(?:\/|$)/);
            if (!threadIdMatch) continue;

            const threadId = threadIdMatch[1];

            // Extract text content
            const textContent = await element.textContent();
            const isUnread = textContent?.includes('•') || 
                           textContent?.includes('nouveau') ||
                           (await element.locator('[data-unread="true"]').count() > 0);

            // Try to extract guest name (premier texte significatif)
            const guestNameElement = await element.locator('div, span').first().textContent();
            const guestName = guestNameElement?.trim().split('\n')[0] || 'Guest';

            threads.push({
              airbnbThreadId: threadId,
              guestName,
              lastMessagePreview: textContent?.substring(0, 100) || '',
              isUnread,
              url: href
            });

          } catch (error) {
            console.error('⚠️  [SYNC] Erreur extraction thread:', error);
          }
        }

        if (threads.length > 0) {
          console.log(`✅ [SYNC] ${threads.length} conversations extraites avec sélecteur: ${selector}`);
          break; // On a trouvé des résultats
        }
      }
    }

    // Fallback: Extract directement depuis HTML
    if (threads.length === 0) {
      console.log('🔧 [SYNC] Fallback: parsing HTML brut...');
      
      const html = await page.content();
      const threadIdRegex = /\/hosting\/inbox\/folder\/([a-f0-9]{24}|[A-Z0-9]{10,})/g;
      const matches = [...html.matchAll(threadIdRegex)];
      
      const uniqueIds = [...new Set(matches.map(m => m[1]))];
      console.log(`   → ${uniqueIds.length} IDs uniques trouvés dans HTML`);

      for (const id of uniqueIds) {
        threads.push({
          airbnbThreadId: id,
          guestName: 'Guest',
          lastMessagePreview: 'Message',
          isUnread: true, // On suppose non lu
          url: `/hosting/inbox/folder/${id}`
        });
      }
    }

    // Dédupliquer
    const uniqueThreads = Array.from(
      new Map(threads.map(t => [t.airbnbThreadId, t])).values()
    );

    console.log(`📊 [SYNC] Total: ${uniqueThreads.length} conversations uniques`);
    return uniqueThreads;

  } catch (error) {
    console.error('❌ [SYNC] Erreur scraping:', error);
    return [];
  }
}

/**
 * Scraping messages d'une conversation
 */
async function scrapeThreadMessages(page: Page, threadUrl: string): Promise<any[]> {
  try {
    const fullUrl = threadUrl.startsWith('http') 
      ? threadUrl 
      : `https://www.airbnb.com${threadUrl}`;

    console.log(`📨 [SYNC] Scraping messages: ${fullUrl}`);
    await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Sélecteurs pour messages
    const messageSelectors = [
      '[data-testid="message-item"]',
      '[role="article"]',
      'div[data-message-id]'
    ];

    const messages = [];

    for (const selector of messageSelectors) {
      const elements = await page.locator(selector).all();
      
      if (elements.length > 0) {
        console.log(`   → ${elements.length} messages trouvés`);
        
        for (const element of elements) {
          const text = await element.textContent();
          const isFromGuest = !(await element.locator('[data-is-host="true"]').count() > 0);
          
          messages.push({
            id: `msg_${Date.now()}_${Math.random()}`,
            text: text?.trim() || '',
            isFromGuest,
            createdAt: Date.now()
          });
        }
        break;
      }
    }

    return messages;
  } catch (error) {
    console.error(`❌ [SYNC] Erreur scraping messages:`, error);
    return [];
  }
}

/**
 * Insert/Update conversation DB
 */
async function upsertConversation(threadData: ThreadData): Promise<string> {
  try {
    const existing = await db
      .select()
      .from(conversations)
      .where(eq(conversations.externalId, threadData.airbnbThreadId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(conversations)
        .set({
          guestName: threadData.guestName,
          lastMessageAt: new Date()
        })
        .where(eq(conversations.id, existing[0].id));
      
      return existing[0].id;
    } else {
      // Besoin propertyId - utiliser un default ou le premier disponible
      const defaultPropertyId = 'default-property';

      const result = await db
        .insert(conversations)
        .values({
          propertyId: defaultPropertyId,
          guestName: threadData.guestName,
          externalId: threadData.airbnbThreadId,
          source: 'airbnb',
          lastMessageAt: new Date()
        })
        .returning();

      console.log(`✅ [SYNC] Conversation créée: ${threadData.airbnbThreadId}`);
      return result[0].id;
    }
  } catch (error) {
    console.error(`❌ [SYNC] Erreur upsert:`, error);
    throw error;
  }
}

/**
 * Insert message DB
 */
async function insertMessage(conversationId: string, messageData: any): Promise<void> {
  try {
    await db.insert(messages).values({
      conversationId,
      content: messageData.text,
      isBot: false,
      direction: messageData.isFromGuest ? 'incoming' : 'outgoing',
      senderName: messageData.isFromGuest ? 'Guest' : 'Host',
      externalId: messageData.id
    });
  } catch (error) {
    console.error(`❌ [SYNC] Erreur insert message:`, error);
  }
}

/**
 * Cycle de polling
 */
async function pollCycle(page: Page): Promise<void> {
  try {
    console.log('🔄 [SYNC] Début cycle...');

    // 1. Scrape conversations
    const threads = await scrapeConversations(page);
    
    if (threads.length === 0) {
      console.log('⚠️  [SYNC] Aucune conversation trouvée');
      return;
    }

    // 2. Filter unread
    const unreadThreads = threads.filter(t => t.isUnread);
    console.log(`📬 [SYNC] ${unreadThreads.length} conversation(s) non lue(s)`);

    // 3. Process chaque thread
    for (const thread of unreadThreads) {
      try {
        const conversationId = await upsertConversation(thread);
        
        // Scrape messages
        const threadMessages = await scrapeThreadMessages(page, thread.url);
        
        // Insert messages
        for (const msg of threadMessages) {
          await insertMessage(conversationId, msg);
        }

        console.log(`✅ [SYNC] Thread ${thread.airbnbThreadId} traité`);
      } catch (error) {
        console.error(`❌ [SYNC] Erreur thread:`, error);
      }
    }

    console.log(`✅ [SYNC] Cycle terminé`);

  } catch (error) {
    console.error('❌ [SYNC] Erreur cycle:', error);
  }
}

/**
 * Main loop
 */
async function runSyncWorker(): Promise<void> {
  console.log('🚀 [SYNC] Démarrage Sync Worker V3 (Hybrid)');
  console.log(`⏱️  [SYNC] Interval: ${POLLING_INTERVAL_SEC}s`);

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  // Load session
  await loadPlaywrightSession(page);

  // Boucle infinie
  while (true) {
    try {
      await pollCycle(page);
    } catch (error) {
      console.error('❌ [SYNC] Erreur boucle:', error);
    }

    console.log(`⏳ [SYNC] Attente ${POLLING_INTERVAL_SEC}s...`);
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_SEC * 1000));
  }
}

// Launch
runSyncWorker().catch(error => {
  console.error('💥 [SYNC] Crash fatal:', error);
  process.exit(1);
});
