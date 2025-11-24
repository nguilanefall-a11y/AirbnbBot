/**
 * Message Router - Système hybride Smoobu + Playwright
 * 
 * Stratégie :
 * 1. Smoobu en priorité (légal, stable, API officielle)
 * 2. Playwright en fallback (si Smoobu échoue ou indisponible)
 * 3. Playwright pour le scraping de données (moins risqué)
 */

import { storage } from "./storage";
import { generateChatResponse } from "./gemini";
import { sendSmoobuMessage, fetchSmoobuBooking, type SmoobuWebhookPayload } from "./smoobu-client";
import type { Property, InsertMessage } from "@shared/schema";

export type MessageChannel = "smoobu" | "playwright" | "direct";

export interface MessageContext {
  property: Property;
  conversationId: string;
  guestName: string;
  guestMessage: string;
  bookingId?: string;
  language?: string;
}

export interface SendMessageResult {
  success: boolean;
  channel: MessageChannel;
  error?: string;
  messageId?: string;
}

/**
 * Routeur principal : choisit la meilleure méthode pour envoyer un message
 */
export async function routeAndSendMessage(
  context: MessageContext,
  userId: string,
): Promise<SendMessageResult> {
  const { property, conversationId, guestMessage, bookingId } = context;

  // 1. Vérifier si Smoobu est configuré et actif
  const smoobuIntegration = await storage.getPmsIntegration(userId, "smoobu");
  const useSmoobu = smoobuIntegration?.isActive && smoobuIntegration?.apiKey && bookingId;

  if (useSmoobu) {
    try {
      // Essayer Smoobu en premier (méthode recommandée)
      const result = await sendViaSmoobu(
        smoobuIntegration.apiKey,
        context,
      );
      
      if (result.success) {
        console.log(`✅ Message envoyé via Smoobu (bookingId: ${bookingId})`);
        return result;
      } else {
        console.warn(`⚠️ Smoobu a échoué, basculement vers Playwright: ${result.error}`);
        // Continuer vers le fallback Playwright
      }
    } catch (error: any) {
      console.error("❌ Erreur Smoobu, basculement vers Playwright:", error?.message);
      // Continuer vers le fallback
    }
  }

  // 2. Fallback : Playwright (si Smoobu indisponible ou non configuré)
  const usePlaywright = process.env.PLAYWRIGHT_ENABLED === "1";
  
  if (usePlaywright) {
    try {
      const result = await sendViaPlaywright(context);
      
      if (result.success) {
        console.log(`✅ Message envoyé via Playwright (fallback)`);
        return result;
      } else {
        console.error(`❌ Playwright a également échoué: ${result.error}`);
        return result;
      }
    } catch (error: any) {
      console.error("❌ Erreur Playwright:", error?.message);
      return {
        success: false,
        channel: "playwright",
        error: error?.message || "Erreur inconnue avec Playwright",
      };
    }
  }

  // 3. Aucune méthode disponible
  return {
    success: false,
    channel: "direct",
    error: "Aucune méthode d'envoi disponible (Smoobu non configuré, Playwright désactivé)",
  };
}

/**
 * Envoie un message via l'API Smoobu (méthode recommandée)
 */
async function sendViaSmoobu(
  apiKey: string,
  context: MessageContext,
): Promise<SendMessageResult> {
  const { property, guestMessage, bookingId } = context;

  if (!bookingId) {
    return {
      success: false,
      channel: "smoobu",
      error: "bookingId requis pour Smoobu",
    };
  }

  try {
    // Générer la réponse IA
    const aiResponse = await generateChatResponse(guestMessage, property);

    // Envoyer via Smoobu
    const result = await sendSmoobuMessage(apiKey, {
      bookingId,
      body: aiResponse,
      channel: "airbnb", // ou context.channel si disponible
    });

    // Sauvegarder le message dans la DB
    await storage.createMessage({
      conversationId: context.conversationId,
      content: aiResponse,
      isBot: true,
      direction: "outbound",
      senderName: property.hostName || "Coach IA",
      language: context.language || null,
      metadata: {
        channel: "smoobu",
        bookingId,
        autoReply: true,
      },
    });

    return {
      success: true,
      channel: "smoobu",
      messageId: (result as any).id || undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      channel: "smoobu",
      error: error?.message || "Erreur lors de l'envoi via Smoobu",
    };
  }
}

/**
 * Envoie un message via Playwright (fallback - contourne Smoobu)
 * 
 * ⚠️ AVERTISSEMENT : Cette méthode peut violer les ToS d'Airbnb.
 * Utilisez uniquement en fallback si Smoobu est indisponible.
 */
async function sendViaPlaywright(
  context: MessageContext,
): Promise<SendMessageResult> {
  const { property, guestMessage, conversationId } = context;

  try {
    // Générer la réponse IA
    const aiResponse = await generateChatResponse(guestMessage, property);

    // Récupérer les cookies du co-hôte depuis la DB ou l'environnement
    const cookiesHeader = process.env.AIRBNB_COHOST_COOKIES;
    if (!cookiesHeader) {
      // Essayer de récupérer depuis la propriété ou l'utilisateur
      // TODO: Stocker les cookies dans la DB (chiffrés)
      return {
        success: false,
        channel: "playwright",
        error: "Cookies Airbnb du co-hôte non configurés (AIRBNB_COHOST_COOKIES)",
      };
    }

    // Extraire l'ID de conversation Airbnb depuis le metadata ou externalId
    const conversation = await storage.getConversation(conversationId);
    const airbnbConversationId = conversation?.externalId || conversationId;

    // Importer la fonction Playwright
    const { sendAirbnbMessageViaPlaywright } = await import("./airbnb-messaging-playwright");

    // Envoyer via Playwright
    const result = await sendAirbnbMessageViaPlaywright(
      airbnbConversationId,
      aiResponse,
      {
        cookiesHeader,
        timeoutMs: 60000,
        headless: true,
      },
    );

    if (result.success) {
      // Sauvegarder le message dans la DB
      await storage.createMessage({
        conversationId,
        content: aiResponse,
        isBot: true,
        direction: "outbound",
        senderName: property.hostName || "Coach IA",
        language: context.language || null,
        externalId: result.messageId,
        metadata: {
          channel: "playwright",
          autoReply: true,
          airbnbConversationId,
        },
      });

      return {
        success: true,
        channel: "playwright",
        messageId: result.messageId,
      };
    } else {
      return {
        success: false,
        channel: "playwright",
        error: result.error || "Erreur lors de l'envoi via Playwright",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      channel: "playwright",
      error: error?.message || "Erreur lors de l'envoi via Playwright",
    };
  }
}

/**
 * Récupère les messages entrants depuis Smoobu ou Playwright
 */
export async function fetchIncomingMessages(
  userId: string,
  propertyId?: string,
): Promise<Array<{
  bookingId: string;
  message: string;
  guestName: string;
  sentAt: Date;
  channel: MessageChannel;
}>> {
  const messages: Array<{
    bookingId: string;
    message: string;
    guestName: string;
    sentAt: Date;
    channel: MessageChannel;
  }> = [];

  // 1. Essayer Smoobu en premier
  const smoobuIntegration = await storage.getPmsIntegration(userId, "smoobu");
  if (smoobuIntegration?.isActive && smoobuIntegration?.apiKey) {
    try {
      const smoobuMessages = await fetchSmoobuMessages(smoobuIntegration.apiKey, {
        propertyId: propertyId || undefined,
      });

      for (const msg of smoobuMessages.messages || []) {
        if (msg.direction === "inbound") {
          messages.push({
            bookingId: msg.bookingId,
            message: msg.body,
            guestName: msg.guestName || "Voyageur",
            sentAt: new Date(msg.sentAt),
            channel: "smoobu",
          });
        }
      }
    } catch (error: any) {
      console.error("Erreur lors de la récupération des messages Smoobu:", error?.message);
    }
  }

  // 2. Fallback Playwright (si nécessaire)
  // TODO: Implémenter le scraping des messages via Playwright si Smoobu échoue

  return messages;
}

/**
 * Détermine la meilleure méthode à utiliser pour une propriété
 */
export async function getRecommendedChannel(
  userId: string,
  propertyId: string,
): Promise<{
  recommended: MessageChannel;
  available: MessageChannel[];
  reason: string;
}> {
  const property = await storage.getProperty(propertyId);
  if (!property) {
    return {
      recommended: "direct",
      available: ["direct"],
      reason: "Propriété non trouvée",
    };
  }

  const smoobuIntegration = await storage.getPmsIntegration(userId, "smoobu");
  const hasSmoobu = smoobuIntegration?.isActive && smoobuIntegration?.apiKey;
  const hasPlaywright = process.env.PLAYWRIGHT_ENABLED === "1";

  const available: MessageChannel[] = [];
  if (hasSmoobu) available.push("smoobu");
  if (hasPlaywright) available.push("playwright");
  available.push("direct"); // Toujours disponible (stockage local)

  if (hasSmoobu) {
    return {
      recommended: "smoobu",
      available,
      reason: "Smoobu configuré et actif - méthode recommandée (légale et stable)",
    };
  }

  if (hasPlaywright) {
    return {
      recommended: "playwright",
      available,
      reason: "Playwright disponible en fallback (attention aux ToS Airbnb)",
    };
  }

  return {
    recommended: "direct",
    available,
    reason: "Aucune méthode externe configurée - messages stockés localement uniquement",
  };
}

