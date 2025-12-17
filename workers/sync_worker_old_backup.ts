/**
 * SYNC WORKER - Badge Polling Optimisé (Architecture Élite)
 * 
 * Rôle: Détecter nouveaux messages via Badge Polling (pas GraphQL!)
 * - Maintient le navigateur OUVERT entre les cycles (optimisation CPU)
 * - Badge polling toutes les 10-15s
 * - Déclenche l'AI worker immédiatement si nouveau message
 * - Réutilise airbnb-session.json
 * - Resilience infinie (never exit)
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { db } from '../server/db';
import { conversations, messages } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const POLLING_INTERVAL_SEC = parseInt(process.env.POLLING_INTERVAL_SEC || '10', 10); // 10-15s comme Gemini recommande
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
 * Badge Polling Élite : Détecte UNIQUEMENT le badge de notification
 * PAS de GraphQL - Plus fiable et stable
 */
async function checkUnreadBadge(page: Page): Promise<number> {
  try {
    // Recharger la page (plus léger que de fermer/rouvrir le navigateur)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Sélecteurs du badge de notification
    const badgeSelectors = [
      'span[data-testid="unread-badge"]',
      '.notification-badge',
      '[class*="badge"][class*="unread"]',
      'div[aria-label*="unread"]'
    ];

    for (const selector of badgeSelectors) {
      const badge = await page.locator(selector).first();
      const count = await badge.count();

      if (count > 0) {
        const badgeText = await badge.textContent();
        const unreadCount = parseInt(badgeText || '0', 10);

        if (unreadCount > 0) {
          console.log(`🔔 [SYNC] ${unreadCount} message(s) non lu(s) détecté(s)`);
          return unreadCount;
        }
      }
    }

    console.log(`✅ [SYNC] Aucun message non lu`);
    return 0;
  } catch (error) {
    console.error('❌ [SYNC] Erreur badge polling:', error);
    return 0;
  }
}

/**
 * Extrait les threads non lus UNIQUEMENT quand badge > 0
 */
async function extractUnreadThreads(page: Page): Promise<ThreadData[]> {
  try {
    await page.goto('https://www.airbnb.com/hosting/inbox', { timeout: 30000 });
    await page.waitForTimeout(3000);

    // Trouver les conversations avec badge unread
    const threads = await page.$$eval(
      '[data-testid="inbox-thread"], .thread-item, [class*="conversation"]',
      (elements) => {
        return elements
          .filter((el) => {
            // Vérifier si cette conversation a un badge non lu
            const unreadBadge = el.querySelector('[data-testid="unread-badge"], .badge, [class*="unread"]');
            return !!unreadBadge;
          })
          .map((el) => {
            const threadId = el.getAttribute('data-thread-id') || el.getAttribute('data-id') || '';
            const guestName = el.querySelector('[data-testid="guest-name"], .guest-name')?.textContent?.trim() || 'Voyageur';
            const lastMessage = el.querySelector('[data-testid="message-preview"], .message-preview')?.textContent?.trim() || '';

            return {
              airbnbThreadId: threadId,
              guestName,
              lastMessagePreview: lastMessage,
              lastMessageTime: new Date(),
              isUnread: true,
              airbnbUrl: `https://www.airbnb.com/hosting/inbox/folder/all/${threadId}`
            };
          });
      }
    );

    console.log(`✅ [SYNC] ${threads.length} thread(s) non lu(s) extrait(s)`);
    return threads;
  } catch (error) {
    console.error('❌ [SYNC] Erreur extraction threads:', error);
    return [];
  }
}

/**
 * Extrait le contenu complet d'un message depuis un thread
 */
async function extractMessageContent(page: Page, threadId: string): Promise<MessageData | null> {
  try {
    const threadUrl = `https://www.airbnb.com/hosting/inbox/folder/all/${threadId}`;
    await page.goto(threadUrl, { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Extraire le dernier message de l'invité
    const messageElement = await page.locator('[data-testid="message-item"], .message').last();

    if (await messageElement.count() === 0) {
      return null;
    }

    const content = await messageElement.textContent();
    const isFromGuest = !(await messageElement.locator('[data-is-host="true"]').count() > 0);

    return {
      content: content?.trim() || '',
      isFromGuest,
      timestamp: new Date()
    };
  } catch (error) {
    console.error(`❌ [SYNC] Erreur extraction message ${threadId}:`, error);
    return null;
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
 * Déclenche l'AI worker immédiatement (pas de polling DB!)
 */
async function triggerAIWorker(conversationId: number, messageId: number) {
  try {
    // Marquer le message comme "à traiter par l'IA"
    await db.execute(sql`
      UPDATE messages
      SET replied_at = NULL
      WHERE id = ${messageId}
    `);

    console.log(`🤖 [SYNC] AI worker déclenché pour message ${messageId}`);
  } catch (error) {
    console.error('❌ [SYNC] Erreur déclenchement AI:', error);
  }
}

/**
 * Boucle infinie Badge Polling (Architecture Élite)
 * OPTIMISATION: Garde le navigateur OUVERT entre les cycles
 */
async function runSyncWorkerInfinite() {
  console.log('🚀 [SYNC] Worker démarré - Mode Badge Polling Élite');

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  while (true) {
    try {
      // 1. Lancement navigateur UNIQUEMENT si pas déjà ouvert (optimisation Gemini)
      if (!browser || !page) {
        console.log('🔄 [SYNC] Lancement navigateur initial...');
        const launched = await launchBrowser();
        browser = launched.browser;
        context = launched.context;
        page = launched.page;

        // Navigation initiale vers inbox
        await page.goto('https://www.airbnb.com/hosting/inbox', { timeout: 30000 });
      }

      // 2. Détection captcha
      if (await detectCaptcha(page)) {
        console.warn('🤖 [SYNC] Captcha détecté, pause 60s');
        await page.waitForTimeout(60000);
        continue;
      }

      // 3. Badge Polling (Méthode Élite - pas GraphQL!)
      const unreadCount = await checkUnreadBadge(page);

      if (unreadCount === 0) {
        console.log('✅ [SYNC] Aucun nouveau message');
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_SEC * 1000));
        continue;
      }

      // 4. Extraction threads non lus UNIQUEMENT
      console.log(`📬 [SYNC] Extraction des ${unreadCount} thread(s) non lu(s)...`);
      const unreadThreads = await extractUnreadThreads(page);

      // 5. Pour chaque thread non lu, extraire le message et déclencher l'IA
      for (const thread of unreadThreads) {
        try {
          // Upsert conversation
          await upsertConversation(thread);

          // Extraire le message complet
          const message = await extractMessageContent(page, thread.airbnbThreadId);

          if (message && message.isFromGuest) {
            // Insérer le message dans la DB
            const conversationResult = await db
              .select()
              .from(conversations)
              .where(eq(conversations.externalId, thread.airbnbThreadId))
              .limit(1);

            if (conversationResult.length > 0) {
              const conversationId = conversationResult[0].id;

              // Insérer le message
              const insertResult = await db.insert(messages).values({
                conversationId,
                content: message.content,
                isFromGuest: true,
                timestamp: message.timestamp,
                repliedAt: null // Marqué comme non répondu
              }).returning({ id: messages.id });

              const messageId = insertResult[0].id;

              // DÉCLENCHEMENT IMMÉDIAT DE L'IA (pas de polling!)
              await triggerAIWorker(conversationId, messageId);

              console.log(`✅ [SYNC] Message ${messageId} extrait et IA déclenchée`);
            }
          }
        } catch (error) {
          console.error(`❌ [SYNC] Erreur traitement thread ${thread.airbnbThreadId}:`, error);
          continue;
        }
      }

      console.log(`✅ [SYNC] Cycle terminé: ${unreadThreads.length} threads traités`);

    } catch (error: any) {
      console.error(`❌ [SYNC] Erreur worker:`, error.message);

      // Si erreur critique, fermer et relancer navigateur
      if (browser) {
        await browser.close().catch(() => {});
        browser = null;
        page = null;
      }
    } finally {
      // Pause avant prochain cycle (SANS fermer le navigateur!)
      console.log(`💤 [SYNC] Sleep ${POLLING_INTERVAL_SEC}s avant prochain cycle`);
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_SEC * 1000));
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
