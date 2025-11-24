/**
 * Synchronisation Airbnb via Playwright (contourne Smoobu)
 * 
 * Récupère les messages directement depuis Airbnb sans passer par Smoobu
 * Utilise l'API Smoobu uniquement pour l'envoi (si configuré)
 * 
 * Stratégie :
 * 1. Récupérer les messages via Playwright (contourne Smoobu)
 * 2. Envoyer les réponses via API Smoobu (légal, nécessite compte Smoobu)
 *    OU via Playwright (si pas de compte Smoobu)
 */

import { storage } from "./storage";
import { generateChatResponse } from "./gemini";
import {
  fetchAirbnbConversations,
  fetchAirbnbMessages,
  type AirbnbMessage,
  type AirbnbConversation,
} from "./airbnb-messaging-playwright";
import { sendSmoobuMessage } from "./smoobu-client";
import type { Property } from "@shared/schema";

export interface SyncOptions {
  userId: string;
  cookiesHeader?: string;
  useSmoobuForSending?: boolean; // Utiliser Smoobu API pour l'envoi (si configuré)
}

/**
 * Synchronise les messages Airbnb via Playwright
 * Contourne Smoobu pour la réception, utilise Smoobu ou Playwright pour l'envoi
 */
export async function syncAirbnbMessagesViaPlaywright(
  options: SyncOptions,
): Promise<{
  conversationsFound: number;
  messagesProcessed: number;
  repliesSent: number;
  errors: string[];
}> {
  const { userId, cookiesHeader, useSmoobuForSending = true } = options;

  if (!cookiesHeader) {
    throw new Error("Cookies Airbnb requis pour la synchronisation");
  }

  const errors: string[] = [];
  let conversationsFound = 0;
  let messagesProcessed = 0;
  let repliesSent = 0;

  try {
    // 1. Récupérer toutes les conversations Airbnb
    const conversations = await fetchAirbnbConversations({
      cookiesHeader,
      timeoutMs: 60000,
      headless: true,
    });

    conversationsFound = conversations.length;

    // 2. Récupérer l'intégration Smoobu (si on veut utiliser pour l'envoi)
    const smoobuIntegration = useSmoobuForSending
      ? await storage.getPmsIntegration(userId, "smoobu")
      : null;

    // 3. Pour chaque conversation, récupérer les messages
    for (const conv of conversations) {
      try {
        const messages = await fetchAirbnbMessages(conv.id, {
          cookiesHeader,
          timeoutMs: 60000,
          headless: true,
        });

        messagesProcessed += messages.length;

        // 4. Traiter chaque message
        for (const message of messages) {
          try {
            await processIncomingMessage(
              message,
              userId,
              smoobuIntegration?.apiKey,
              useSmoobuForSending,
              cookiesHeader,
            );
            repliesSent++;
          } catch (error: any) {
            errors.push(`Erreur traitement message ${message.id}: ${error?.message}`);
          }
        }
      } catch (error: any) {
        errors.push(`Erreur conversation ${conv.id}: ${error?.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`Erreur synchronisation: ${error?.message}`);
  }

  return {
    conversationsFound,
    messagesProcessed,
    repliesSent,
    errors,
  };
}

/**
 * Traite un message entrant et envoie une réponse
 */
async function processIncomingMessage(
  message: AirbnbMessage,
  userId: string,
  smoobuApiKey: string | undefined,
  useSmoobuForSending: boolean,
  cookiesHeader: string,
): Promise<void> {
  // 1. Trouver la propriété correspondante
  // On peut utiliser le bookingId ou chercher par guestName
  let property: Property | undefined;

  if (message.propertyId) {
    property = await storage.getPropertyBySmoobuListingId(message.propertyId);
  }

  // Si pas trouvé, prendre la première propriété de l'utilisateur
  if (!property) {
    const userProperties = await storage.getPropertiesByUser(userId);
    property = userProperties[0];
  }

  if (!property) {
    throw new Error("Aucune propriété trouvée pour ce message");
  }

  // 2. Créer ou récupérer la conversation
  let conversation = await storage.getConversationByExternalId(
    message.conversationId,
    "airbnb-playwright",
  );

  if (!conversation) {
    conversation = await storage.createConversation({
      propertyId: property.id,
      guestName: message.guestName,
      externalId: message.conversationId,
      source: "airbnb-playwright",
      status: "open",
    });
  }

  // 3. Vérifier si le message existe déjà (éviter les doublons)
  const existingMessages = await storage.getMessagesByConversation(conversation.id);
  const alreadyProcessed = existingMessages.some(
    (m) => m.externalId === message.id || m.content === message.guestMessage,
  );

  if (alreadyProcessed) {
    return; // Message déjà traité
  }

  // 4. Sauvegarder le message entrant
  await storage.createMessage({
    conversationId: conversation.id,
    content: message.guestMessage,
    isBot: false,
    direction: "inbound",
    senderName: message.guestName,
    externalId: message.id,
    metadata: {
      channel: "airbnb-playwright",
      receivedAt: message.sentAt.toISOString(),
    },
  });

  // 5. Vérifier si auto-reply est activé
  const integration = await storage.getPmsIntegration(userId, "smoobu");
  const autoReplyEnabled =
    !integration?.settings || integration.settings.autoReply !== false;

  if (!autoReplyEnabled) {
    return; // Auto-reply désactivé
  }

  // 6. Générer la réponse IA
  const aiResponse = await generateChatResponse(message.guestMessage, property);

  // 7. Envoyer la réponse
  if (useSmoobuForSending && smoobuApiKey && message.bookingId) {
    // Utiliser l'API Smoobu pour l'envoi (légal)
    try {
      await sendSmoobuMessage(smoobuApiKey, {
        bookingId: message.bookingId,
        body: aiResponse,
        channel: "airbnb",
      });

      // Sauvegarder le message envoyé
      await storage.createMessage({
        conversationId: conversation.id,
        content: aiResponse,
        isBot: true,
        direction: "outbound",
        senderName: property.hostName || "Coach IA",
        metadata: {
          channel: "smoobu-api",
          autoReply: true,
        },
      });
    } catch (error: any) {
      console.error("Erreur envoi via Smoobu API, basculement vers Playwright:", error);
      // Fallback vers Playwright
      await sendViaPlaywright(conversation.id, aiResponse, cookiesHeader);
    }
  } else {
    // Utiliser Playwright pour l'envoi (contourne Smoobu complètement)
    await sendViaPlaywright(conversation.id, aiResponse, cookiesHeader);
  }
}

/**
 * Envoie un message via Playwright
 */
async function sendViaPlaywright(
  conversationId: string,
  message: string,
  cookiesHeader: string,
): Promise<void> {
  const { sendAirbnbMessageViaPlaywright } = await import("./airbnb-messaging-playwright");

  const result = await sendAirbnbMessageViaPlaywright(conversationId, message, {
    cookiesHeader,
    timeoutMs: 60000,
    headless: true,
  });

  if (!result.success) {
    throw new Error(result.error || "Échec envoi via Playwright");
  }
}

/**
 * Fonction helper pour récupérer les messages (à appeler périodiquement)
 */
export async function startAirbnbSync(
  userId: string,
  intervalMinutes: number = 15,
): Promise<() => void> {
  const cookiesHeader = process.env.AIRBNB_COHOST_COOKIES;
  if (!cookiesHeader) {
    throw new Error("AIRBNB_COHOST_COOKIES non configuré");
  }

  // Synchronisation immédiate
  await syncAirbnbMessagesViaPlaywright({
    userId,
    cookiesHeader,
    useSmoobuForSending: true, // Utiliser Smoobu API pour l'envoi si disponible
  });

  // Programmer la synchronisation périodique
  const interval = setInterval(async () => {
    try {
      await syncAirbnbMessagesViaPlaywright({
        userId,
        cookiesHeader,
        useSmoobuForSending: true,
      });
    } catch (error: any) {
      console.error("Erreur synchronisation périodique:", error?.message);
    }
  }, intervalMinutes * 60 * 1000);

  // Retourner une fonction pour arrêter la synchronisation
  return () => clearInterval(interval);
}

