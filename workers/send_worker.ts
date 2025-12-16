/**
 * SEND WORKER - Envoi de messages via GraphQL API Airbnb
 * 
 * Rôle: Envoie les messages de queue_outbox via l'API GraphQL
 * - DB check AVANT de lancer (optimisation)
 * - Utilise CreateBulkMessagesMutation
 * - Réutilise airbnb-session.json pour les cookies
 * - Délai humain aléatoire entre messages
 * - Resilience infinie (never exit)
 */

import axios from 'axios';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const SEND_INTERVAL_SEC = parseInt(process.env.SEND_INTERVAL_SEC || '20', 10);
const SESSION_FILE = path.join(process.cwd(), 'airbnb-session.json');
const API_KEY = 'd306zoyjsyarp7ifhu67rjxn52tv0t20'; // API key publique Airbnb

// Hash de mutation GraphQL (découvert par reverse engineering)
const MUTATION_HASH = 'ab236ebb9e7b55c20cf2a7a4ccfd585674e1beee8e8f1a20055e06aa0d988f92';
const GRAPHQL_URL = `https://www.airbnb.com/api/v3/CreateBulkMessagesMutation/${MUTATION_HASH}`;

interface QueueItem {
  id: number;
  conversationId: number;
  messageContent: string;
  status: string;
  createdAt: Date;
}

/**
 * Charge les cookies depuis airbnb-session.json
 */
function loadCookies(): string {
  try {
    if (!fs.existsSync(SESSION_FILE)) {
      console.error('❌ [SEND] airbnb-session.json introuvable');
      return '';
    }

    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    const cookies = sessionData.cookies || [];

    // Convertir en format Cookie header
    const cookieString = cookies
      .map((cookie: any) => `${cookie.name}=${cookie.value}`)
      .join('; ');

    console.log(`✅ [SEND] ${cookies.length} cookies chargés`);
    return cookieString;
  } catch (error) {
    console.error('❌ [SEND] Erreur chargement cookies:', error);
    return '';
  }
}

/**
 * Récupère le nombre de messages en attente (optimisation DB check)
 */
async function getPendingCount(): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM queue_outbox
      WHERE status = 'pending'
    `);

    const count = parseInt(result.rows[0]?.count || '0', 10);
    return count;
  } catch (error) {
    console.error('❌ [SEND] Erreur count pending:', error);
    return 0;
  }
}

/**
 * Récupère les messages à envoyer
 */
async function getPendingMessages(): Promise<QueueItem[]> {
  try {
    const result = await db.execute(sql`
      SELECT 
        qo.id,
        qo.conversation_id,
        qo.message_content,
        qo.status,
        qo.created_at
      FROM queue_outbox qo
      WHERE qo.status = 'pending'
      ORDER BY qo.created_at ASC
      LIMIT 5
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      conversationId: row.conversation_id,
      messageContent: row.message_content,
      status: row.status,
      createdAt: new Date(row.created_at)
    }));
  } catch (error) {
    console.error('❌ [SEND] Erreur query pending:', error);
    return [];
  }
}

/**
 * Récupère l'external_id (Airbnb thread ID) d'une conversation
 */
async function getThreadId(conversationId: number): Promise<string | null> {
  try {
    const result = await db.execute(sql`
      SELECT external_id
      FROM conversations
      WHERE id = ${conversationId}
    `);

    return result.rows[0]?.external_id || null;
  } catch (error) {
    console.error('❌ [SEND] Erreur get thread ID:', error);
    return null;
  }
}

/**
 * Envoie un message via GraphQL API Airbnb
 */
async function sendMessageViaAPI(
  threadId: string,
  message: string,
  cookies: string
): Promise<boolean> {
  try {
    const uniqueIdentifier = randomUUID();

    const payload = {
      operationName: 'CreateBulkMessages',
      variables: {
        input: {
          messages: [
            {
              threadId: threadId,
              message: message,
              uniqueIdentifier: uniqueIdentifier
            }
          ]
        }
      },
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash: MUTATION_HASH
        }
      }
    };

    const response = await axios.post(GRAPHQL_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-airbnb-api-key': API_KEY,
        'x-csrf-without-token': '1',
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Origin': 'https://www.airbnb.com',
        'Referer': 'https://www.airbnb.com/hosting/inbox'
      },
      timeout: 15000
    });

    if (response.status === 200 && response.data?.data?.createBulkMessages) {
      const sentMessage = response.data.data.createBulkMessages.messages[0];
      console.log(`✅ [SEND] Message envoyé via API - ID: ${sentMessage.id}`);
      return true;
    } else {
      console.error('❌ [SEND] Réponse API invalide:', response.data);
      return false;
    }
  } catch (error: any) {
    console.error('❌ [SEND] Erreur envoi API:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Met à jour le statut d'un message dans queue_outbox
 */
async function updateQueueStatus(
  queueId: number,
  status: 'sent' | 'failed',
  errorMessage?: string
) {
  try {
    if (status === 'sent') {
      await db.execute(sql`
        UPDATE queue_outbox
        SET status = 'sent', sent_at = NOW()
        WHERE id = ${queueId}
      `);
    } else {
      await db.execute(sql`
        UPDATE queue_outbox
        SET status = 'failed', error_message = ${errorMessage || 'Unknown error'}
        WHERE id = ${queueId}
      `);
    }

    console.log(`✅ [SEND] Queue ${queueId} → ${status}`);
  } catch (error) {
    console.error('❌ [SEND] Erreur update queue:', error);
  }
}

/**
 * Délai humain aléatoire (anti-ban)
 */
async function humanDelay() {
  const delay = Math.floor(Math.random() * 10000) + 10000; // 10-20s
  console.log(`⏳ [SEND] Délai humain: ${(delay / 1000).toFixed(1)}s`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Boucle infinie d'envoi (Pattern Python avec optimisation DB check)
 */
async function runSendWorkerInfinite() {
  console.log('🚀 [SEND] Worker démarré - Mode résilient infini');

  // Charger les cookies une seule fois au démarrage
  let cookies = loadCookies();

  if (!cookies) {
    console.error('❌ [SEND] Impossible de démarrer sans cookies');
    process.exit(1);
  }

  while (true) {
    try {
      console.log('📤 [SEND] Vérification queue_outbox...');

      // 1. DB check AVANT tout traitement (optimisation Python)
      const pendingCount = await getPendingCount();

      if (pendingCount === 0) {
        console.log('✅ [SEND] Aucun message à envoyer, skip cycle');
        await new Promise(resolve => setTimeout(resolve, SEND_INTERVAL_SEC * 1000));
        continue;
      }

      console.log(`📬 [SEND] ${pendingCount} messages en attente`);

      // 2. Récupération items à envoyer
      const pendingItems = await getPendingMessages();

      // 3. Pour chaque message
      for (const item of pendingItems) {
        try {
          // Récupérer l'Airbnb thread ID
          const threadId = await getThreadId(item.conversationId);

          if (!threadId) {
            console.error(`❌ [SEND] Thread ID introuvable pour conversation ${item.conversationId}`);
            await updateQueueStatus(item.id, 'failed', 'Thread ID not found');
            continue;
          }

          // Envoi via API GraphQL
          const success = await sendMessageViaAPI(threadId, item.messageContent, cookies);

          if (success) {
            await updateQueueStatus(item.id, 'sent');
            console.log(`✅ [SEND] Message ${item.id} envoyé avec succès`);
          } else {
            await updateQueueStatus(item.id, 'failed', 'API request failed');
          }

          // Délai humain entre chaque envoi (anti-ban)
          if (pendingItems.indexOf(item) < pendingItems.length - 1) {
            await humanDelay();
          }

        } catch (error: any) {
          console.error(`❌ [SEND] Erreur envoi message ${item.id}:`, error.message);
          await updateQueueStatus(item.id, 'failed', error.message);
          continue;
        }
      }

      console.log(`✅ [SEND] Cycle terminé: ${pendingItems.length} messages traités`);

    } catch (error: any) {
      console.error(`❌ [SEND] Erreur worker:`, error.message);
      
      // Si erreur cookies expirés, recharger
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.warn('🔄 [SEND] Rechargement cookies...');
        cookies = loadCookies();
      }
      
      // Pas de exit, juste log et retry
    } finally {
      // Pause avant prochain cycle
      console.log(`💤 [SEND] Sleep ${SEND_INTERVAL_SEC}s avant prochain cycle`);
      await new Promise(resolve => setTimeout(resolve, SEND_INTERVAL_SEC * 1000));
    }
  }
}

// Lancement du worker
if (require.main === module) {
  console.log('🟢 [SEND] Initialisation Send Worker...');
  runSendWorkerInfinite().catch((error) => {
    console.error('💥 [SEND] Crash fatal:', error);
    process.exit(1);
  });
}

export { runSendWorkerInfinite };
