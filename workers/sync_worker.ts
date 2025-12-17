/**
 * SYNC WORKER - ARCHITECTURE HYBRIDE (Playwright Harvesting + API GraphQL Polling)
 * 
 * PHASE 1: HARVESTING (Playwright)
 * - Lance navigateur et va sur /hosting/inbox
 * - Extrait x-csrf-token, x-airbnb-api-key, cookies
 * - Intercepte requêtes réseau si nécessaire
 * 
 * PHASE 2: POLLING API (Axios - Boucle Infinie)
 * - Boucle while(true) toutes les 10s
 * - Appel MessagingThreadListQuery GraphQL
 * - Upsert conversations en DB
 * - Détecte messages non lus
 * - Re-harvest tokens si 401/403
 */

import 'dotenv/config';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import axios, { AxiosError } from 'axios';
import { db } from '../server/db';
import { conversations, messages } from '../shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const POLLING_INTERVAL_SEC = parseInt(process.env.POLLING_INTERVAL_SEC || '10', 10);
const SESSION_FILE = path.join(process.cwd(), 'airbnb-session.json');
const INBOX_URL = 'https://www.airbnb.com/hosting/inbox';
const API_ENDPOINT = 'https://www.airbnb.com/api/v3/MessagingThreadListQuery';

// ============================================================================
// TYPES
// ============================================================================

interface AuthHeaders {
  'x-csrf-token': string;
  'x-airbnb-api-key': string;
  'Cookie': string;
  'User-Agent': string;
  'Content-Type': string;
  'Accept': string;
  'Origin': string;
  'Referer': string;
}

interface AirbnbThread {
  id: string;
  lastMessagePreview: string;
  isUnread: boolean;
  guest: {
    firstName: string;
    lastName?: string;
    id: string;
  };
  lastMessageTimestamp: number;
  listing?: {
    id: string;
    name: string;
  };
}

interface AirbnbAPIResponse {
  data: {
    messaging: {
      threadList: {
        threads: AirbnbThread[];
        hasMore: boolean;
      };
    };
  };
  errors?: any[];
}

// ============================================================================
// PHASE 1: HARVESTING - EXTRACTION DES SECRETS
// ============================================================================

/**
 * Charge la session Playwright depuis airbnb-session.json
 */
async function loadPlaywrightSession(context: BrowserContext): Promise<void> {
  try {
    if (!fs.existsSync(SESSION_FILE)) {
      throw new Error(`❌ Fichier session introuvable: ${SESSION_FILE}`);
    }

    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    const cookies = sessionData.cookies || sessionData;

    if (!Array.isArray(cookies) || cookies.length === 0) {
      throw new Error('❌ Format de cookies invalide');
    }

    await context.addCookies(cookies);
    console.log(`✅ [HARVEST] ${cookies.length} cookies chargés depuis ${SESSION_FILE}`);
  } catch (error) {
    console.error('❌ [HARVEST] Erreur chargement session:', error);
    throw error;
  }
}

/**
 * Extrait le CSRF token depuis la page
 */
async function extractCsrfToken(page: Page): Promise<string> {
  try {
    // Méthode 1: Meta tag
    const csrfFromMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="csrf-token"]');
      return meta ? meta.getAttribute('content') : null;
    });

    if (csrfFromMeta) {
      console.log(`✅ [HARVEST] CSRF token extrait depuis <meta>: ${csrfFromMeta.substring(0, 20)}...`);
      return csrfFromMeta;
    }

    // Méthode 2: Window variable
    const csrfFromWindow = await page.evaluate(() => {
      return (window as any)._csrf_token || (window as any).csrfToken || null;
    });

    if (csrfFromWindow) {
      console.log(`✅ [HARVEST] CSRF token extrait depuis window: ${csrfFromWindow.substring(0, 20)}...`);
      return csrfFromWindow;
    }

    // Méthode 3: Cookies
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find(c => c.name === 'csrf_token' || c.name === '_csrf_token');
    
    if (csrfCookie) {
      console.log(`✅ [HARVEST] CSRF token extrait depuis cookie: ${csrfCookie.value.substring(0, 20)}...`);
      return csrfCookie.value;
    }

    throw new Error('❌ CSRF token introuvable');
  } catch (error) {
    console.error('❌ [HARVEST] Erreur extraction CSRF:', error);
    throw error;
  }
}

/**
 * Extrait l'API key Airbnb depuis la page ou les requêtes réseau
 */
async function extractApiKey(page: Page): Promise<string> {
  try {
    // Méthode 1: Config bootstrap dans le HTML
    const apiKeyFromConfig = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const content = script.textContent || '';
        
        // Chercher patterns communs
        const patterns = [
          /api[_-]?key["']\s*:\s*["']([^"']+)["']/i,
          /x-airbnb-api-key["']\s*:\s*["']([^"']+)["']/i,
          /apiKey["']\s*:\s*["']([^"']+)["']/i,
          /"key"\s*:\s*"([a-z0-9]{32})"/i
        ];

        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match && match[1]) {
            return match[1];
          }
        }
      }
      return null;
    });

    if (apiKeyFromConfig) {
      console.log(`✅ [HARVEST] API Key extraite depuis config: ${apiKeyFromConfig.substring(0, 20)}...`);
      return apiKeyFromConfig;
    }

    // Méthode 2: Interception réseau
    console.log('🔍 [HARVEST] API Key non trouvée dans le HTML, interception réseau...');
    
    const apiKeyFromNetwork = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: API Key non capturée'));
      }, 15000);

      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/api/v3/') || url.includes('airbnb.com/api/')) {
          const headers = request.headers();
          const apiKey = headers['x-airbnb-api-key'];
          
          if (apiKey) {
            clearTimeout(timeout);
            console.log(`✅ [HARVEST] API Key capturée depuis requête réseau: ${apiKey.substring(0, 20)}...`);
            resolve(apiKey);
          }
        }
      });

      // Trigger une interaction pour forcer des requêtes
      page.evaluate(() => {
        window.scrollBy(0, 100);
      }).catch(() => {});
    });

    return apiKeyFromNetwork;

  } catch (error) {
    // Fallback: Utiliser la clé par défaut connue
    const fallbackKey = process.env.AIRBNB_API_KEY || 'd306zoyjsyarp7ifhu67rjxn52tv0t20';
    console.warn(`⚠️  [HARVEST] API Key non extraite, utilisation fallback: ${fallbackKey.substring(0, 20)}...`);
    return fallbackKey;
  }
}

/**
 * Convertit les cookies en string Cookie header
 */
function cookiesToHeaderString(cookies: any[]): string {
  return cookies
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
}

/**
 * FONCTION PRINCIPALE D'EXTRACTION DES AUTH HEADERS
 */
async function getAuthHeaders(page: Page): Promise<AuthHeaders> {
  try {
    console.log('🔐 [HARVEST] Début extraction auth headers...');

    // 1. Naviguer vers inbox
    console.log(`📡 [HARVEST] Navigation vers ${INBOX_URL}...`);
    await page.goto(INBOX_URL, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // 2. Attendre que la page charge
    await page.waitForTimeout(5000);

    // 3. Extraire CSRF token
    const csrfToken = await extractCsrfToken(page);

    // 4. Extraire API key
    const apiKey = await extractApiKey(page);

    // 5. Récupérer tous les cookies
    const cookies = await page.context().cookies();
    const cookieHeader = cookiesToHeaderString(cookies);

    // 6. Construire headers complets
    const headers: AuthHeaders = {
      'x-csrf-token': csrfToken,
      'x-airbnb-api-key': apiKey,
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://www.airbnb.com',
      'Referer': INBOX_URL
    };

    console.log('✅ [HARVEST] Auth headers extraits avec succès');
    console.log(`   - CSRF Token: ${csrfToken.substring(0, 20)}...`);
    console.log(`   - API Key: ${apiKey.substring(0, 20)}...`);
    console.log(`   - Cookies: ${cookies.length} cookies`);

    return headers;

  } catch (error) {
    console.error('❌ [HARVEST] Erreur extraction headers:', error);
    throw error;
  }
}

// ============================================================================
// PHASE 2: POLLING API - BOUCLE INFINIE
// ============================================================================

/**
 * Requête GraphQL pour récupérer les threads
 */
const MESSAGING_THREAD_LIST_QUERY = `
  query MessagingThreadListQuery($request: MessagingThreadListRequest!) {
    messaging {
      threadList(request: $request) {
        threads {
          id
          lastMessagePreview
          isUnread
          guest {
            firstName
            lastName
            id
          }
          lastMessageTimestamp
          listing {
            id
            name
          }
        }
        hasMore
      }
    }
  }
`;

/**
 * Appel API GraphQL pour récupérer les conversations
 */
async function fetchThreadsFromAPI(headers: AuthHeaders): Promise<AirbnbThread[]> {
  try {
    console.log('📡 [API] Appel MessagingThreadListQuery...');

    const payload = {
      query: MESSAGING_THREAD_LIST_QUERY,
      variables: {
        request: {
          offset: 0,
          limit: 50,
          filter: "INBOX"
        }
      }
    };

    const response = await axios.post<AirbnbAPIResponse>(API_ENDPOINT, payload, {
      headers: headers as any,
      timeout: 15000
    });

    // Vérifier erreurs GraphQL
    if (response.data.errors && response.data.errors.length > 0) {
      console.error('❌ [API] Erreurs GraphQL:', response.data.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
    }

    // Extraire threads
    const threads = response.data?.data?.messaging?.threadList?.threads || [];
    console.log(`✅ [API] ${threads.length} conversations récupérées`);

    return threads;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Détection token expiré
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        console.error('🔑 [API] Token expiré (401/403) - Re-harvest nécessaire');
        throw new Error('TOKEN_EXPIRED');
      }

      console.error(`❌ [API] Erreur HTTP ${axiosError.response?.status}:`, axiosError.message);
      console.error('   Response:', axiosError.response?.data);
    } else {
      console.error('❌ [API] Erreur:', error);
    }
    throw error;
  }
}

/**
 * Insert/Update conversation dans la DB
 */
async function upsertConversation(thread: AirbnbThread): Promise<string> {
  try {
    const guestName = `${thread.guest.firstName} ${thread.guest.lastName || ''}`.trim();
    const listingName = thread.listing?.name || 'Propriété inconnue';

    // Check si existe
    const existing = await db
      .select()
      .from(conversations)
      .where(eq(conversations.externalId, thread.id))
      .limit(1);

    if (existing.length > 0) {
      // Update
      await db
        .update(conversations)
        .set({
          guestName,
          lastMessageAt: new Date(thread.lastMessageTimestamp)
        })
        .where(eq(conversations.id, existing[0].id));

      return existing[0].id;
    } else {
      // Insert (besoin propertyId - prendre le premier ou défaut)
      const allConvs = await db.select().from(conversations).limit(1);
      const propertyId = allConvs[0]?.propertyId || 'default-property';

      const result = await db
        .insert(conversations)
        .values({
          propertyId,
          guestName,
          externalId: thread.id,
          source: 'airbnb',
          lastMessageAt: new Date(thread.lastMessageTimestamp)
        })
        .returning();

      console.log(`✅ [DB] Nouvelle conversation créée: ${thread.id}`);
      return result[0].id;
    }
  } catch (error) {
    console.error(`❌ [DB] Erreur upsert conversation ${thread.id}:`, error);
    throw error;
  }
}

/**
 * Traite les threads récupérés
 */
async function processThreads(threads: AirbnbThread[]): Promise<void> {
  try {
    // Filtrer non lus
    const unreadThreads = threads.filter(t => t.isUnread);
    console.log(`📬 [SYNC] ${unreadThreads.length} conversation(s) non lue(s) sur ${threads.length}`);

    // Upsert tous les threads
    for (const thread of threads) {
      try {
        await upsertConversation(thread);
        
        if (thread.isUnread) {
          console.log(`🔔 [SYNC] Nouveau message détecté ! Thread: ${thread.id}, Guest: ${thread.guest.firstName}`);
        }
      } catch (error) {
        console.error(`❌ [SYNC] Erreur traitement thread ${thread.id}:`, error);
        // Continue avec les autres
      }
    }

    console.log(`✅ [SYNC] ${threads.length} conversations traitées`);
  } catch (error) {
    console.error('❌ [SYNC] Erreur processThreads:', error);
  }
}

// ============================================================================
// ORCHESTRATEUR PRINCIPAL
// ============================================================================

/**
 * Boucle infinie de polling avec re-harvest automatique
 */
async function runSyncWorkerInfinite(): Promise<void> {
  console.log('🚀 [SYNC] Démarrage Sync Worker - Architecture Hybride');
  console.log(`⏱️  [SYNC] Interval polling: ${POLLING_INTERVAL_SEC}s`);

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let authHeaders: AuthHeaders | null = null;

  while (true) {
    try {
      // PHASE 1: HARVESTING (si pas de headers ou expirés)
      if (!authHeaders) {
        console.log('\n🔐 [PHASE 1] HARVESTING - Extraction auth headers...');

        // Lancer browser si pas déjà fait
        if (!browser) {
          browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
        }

        if (!context) {
          context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            viewport: { width: 1920, height: 1080 }
          });

          // Charger session
          await loadPlaywrightSession(context);
        }

        if (!page) {
          page = await context.newPage();
        }

        // Extraire headers
        authHeaders = await getAuthHeaders(page);
        console.log('✅ [PHASE 1] HARVESTING terminé\n');
      }

      // PHASE 2: POLLING API
      console.log('📡 [PHASE 2] POLLING API...');
      
      const threads = await fetchThreadsFromAPI(authHeaders);
      await processThreads(threads);

      console.log(`✅ [PHASE 2] Cycle terminé avec succès\n`);

    } catch (error: any) {
      console.error('❌ [SYNC] Erreur dans boucle principale:', error);

      // Si token expiré, réinitialiser pour re-harvest
      if (error.message === 'TOKEN_EXPIRED') {
        console.log('🔄 [SYNC] Réinitialisation pour re-harvest des tokens...');
        authHeaders = null;
        
        // Fermer et réinitialiser le browser
        if (page) {
          await page.close().catch(() => {});
          page = null;
        }
        if (context) {
          await context.close().catch(() => {});
          context = null;
        }
        if (browser) {
          await browser.close().catch(() => {});
          browser = null;
        }
        
        // Retry immédiatement
        continue;
      }
    }

    // Attente avant prochain cycle
    console.log(`⏳ [SYNC] Attente ${POLLING_INTERVAL_SEC}s avant prochain cycle...\n`);
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_SEC * 1000));
  }
}

// ============================================================================
// LANCEMENT
// ============================================================================

runSyncWorkerInfinite().catch(error => {
  console.error('💥 [SYNC] Crash fatal:', error);
  process.exit(1);
});
