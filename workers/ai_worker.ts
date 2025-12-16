/**
 * AI WORKER - Génération de réponses automatiques avec Gemini
 * 
 * Rôle: Génère des réponses IA pour les nouveaux messages invités
 * - Query SQL pour messages non répondus
 * - Appel Gemini API avec contexte
 * - Insertion dans queue_outbox
 * - Resilience infinie (never exit)
 */

import { db } from '../server/db';
import { conversations, messages } from '../shared/schema';
import { eq, sql, and, isNull } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';

const AI_INTERVAL_SEC = parseInt(process.env.AI_INTERVAL_SEC || '15', 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.error('❌ [AI] GEMINI_API_KEY manquant dans .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

interface UnrespondedMessage {
  id: number;
  conversationId: number;
  content: string;
  createdAt: Date;
  guestName: string;
  listingTitle?: string;
}

/**
 * Récupère les messages non répondus depuis la DB
 */
async function getUnrespondedMessages(): Promise<UnrespondedMessage[]> {
  try {
    // Query SQL inspirée du système Python
    const result = await db.execute(sql`
      SELECT 
        m.id,
        m.conversation_id,
        m.content,
        m.created_at,
        c.guest_name,
        p.name as listing_title
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN properties p ON c.property_id = p.id
      WHERE m.is_from_guest = true
        AND m.replied_at IS NULL
        AND m.created_at > NOW() - INTERVAL '7 days'
      ORDER BY m.created_at ASC
      LIMIT 10
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      conversationId: row.conversation_id,
      content: row.content,
      createdAt: new Date(row.created_at),
      guestName: row.guest_name,
      listingTitle: row.listing_title
    }));
  } catch (error) {
    console.error('❌ [AI] Erreur query messages:', error);
    return [];
  }
}

/**
 * Récupère l'historique d'une conversation pour le contexte IA
 */
async function getConversationHistory(conversationId: number): Promise<string> {
  try {
    const result = await db.execute(sql`
      SELECT content, is_from_guest, created_at
      FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
      LIMIT 20
    `);

    const history = result.rows
      .map((msg: any) => {
        const sender = msg.is_from_guest ? 'Invité' : 'Hôte';
        return `[${sender}] ${msg.content}`;
      })
      .join('\n');

    return history;
  } catch (error) {
    console.error('❌ [AI] Erreur récupération historique:', error);
    return '';
  }
}

/**
 * Génère une réponse IA avec Gemini (comme le système Python)
 */
async function generateAIResponse(
  guestMessage: string,
  guestName: string,
  listingTitle: string,
  history: string
): Promise<string> {
  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Tu es un co-hôte Airbnb professionnel et chaleureux.

Contexte:
- Invité: ${guestName}
- Logement: ${listingTitle}
- Message de l'invité: "${guestMessage}"

Historique récent de la conversation:
${history}

Génère une réponse professionnelle, chaleureuse et personnalisée en français.
Règles:
- Réponds directement sans formule d'introduction artificielle
- Sois concis (max 3-4 phrases)
- Utilise le prénom de l'invité
- Adapte le ton à l'historique
- Si question pratique, donne des réponses précises
- Si salutation, sois chaleureux mais bref

Réponse:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log(`✅ [AI] Réponse générée pour ${guestName}: "${text.substring(0, 50)}..."`);
    return text.trim();
  } catch (error: any) {
    console.error('❌ [AI] Erreur Gemini API:', error.message);
    
    // Fallback: réponse générique si Gemini échoue
    return `Bonjour ${guestName}, merci pour votre message ! Je reviens vers vous très rapidement. À bientôt !`;
  }
}

/**
 * Insère un message dans la queue d'envoi
 */
async function enqueueMessage(conversationId: number, messageContent: string) {
  try {
    await db.execute(sql`
      INSERT INTO queue_outbox (conversation_id, message_content, status, created_at)
      VALUES (${conversationId}, ${messageContent}, 'pending', NOW())
    `);

    console.log(`✅ [AI] Message ajouté à la queue pour conversation ${conversationId}`);
  } catch (error) {
    console.error('❌ [AI] Erreur insertion queue:', error);
  }
}

/**
 * Marque un message comme répondu
 */
async function markMessageAsReplied(messageId: number) {
  try {
    await db.execute(sql`
      UPDATE messages
      SET replied_at = NOW()
      WHERE id = ${messageId}
    `);

    console.log(`✅ [AI] Message ${messageId} marqué comme répondu`);
  } catch (error) {
    console.error('❌ [AI] Erreur update replied_at:', error);
  }
}

/**
 * Boucle infinie de génération IA (Pattern Python)
 */
async function runAIWorkerInfinite() {
  console.log('🚀 [AI] Worker démarré - Mode résilient infini');

  while (true) {
    try {
      console.log('🤖 [AI] Recherche messages à répondre...');

      // 1. Query SQL pour messages non répondus
      const unrespondedMessages = await getUnrespondedMessages();

      if (unrespondedMessages.length === 0) {
        console.log('✅ [AI] Aucun message à répondre');
        await new Promise(resolve => setTimeout(resolve, AI_INTERVAL_SEC * 1000));
        continue;
      }

      console.log(`📬 [AI] ${unrespondedMessages.length} messages à traiter`);

      // 2. Pour chaque message non répondu
      for (const msg of unrespondedMessages) {
        try {
          // Récupération historique conversation
          const history = await getConversationHistory(msg.conversationId);

          // Appel Gemini API
          const aiResponse = await generateAIResponse(
            msg.content,
            msg.guestName,
            msg.listingTitle || 'Logement',
            history
          );

          // Rate limiting (éviter quota exceeded)
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2s entre chaque appel

          // Insertion dans queue_outbox
          await enqueueMessage(msg.conversationId, aiResponse);

          // Marquer comme répondu
          await markMessageAsReplied(msg.id);

          console.log(`✅ [AI] Message ${msg.id} traité avec succès`);

        } catch (error: any) {
          console.error(`❌ [AI] Erreur traitement message ${msg.id}:`, error.message);
          // Continue avec le suivant, pas de exit
          continue;
        }
      }

      console.log(`✅ [AI] Cycle terminé: ${unrespondedMessages.length} messages traités`);

    } catch (error: any) {
      console.error(`❌ [AI] Erreur worker:`, error.message);
      // Pas de exit, juste log et retry
    } finally {
      // Pause avant prochain cycle
      console.log(`💤 [AI] Sleep ${AI_INTERVAL_SEC}s avant prochain cycle`);
      await new Promise(resolve => setTimeout(resolve, AI_INTERVAL_SEC * 1000));
    }
  }
}

// Lancement du worker
if (require.main === module) {
  console.log('🟢 [AI] Initialisation AI Worker...');
  runAIWorkerInfinite().catch((error) => {
    console.error('💥 [AI] Crash fatal:', error);
    process.exit(1);
  });
}

export { runAIWorkerInfinite };
