import { storage } from "./storage";
import { generateChatResponse } from "./gemini";
import {
  sendSmoobuMessage,
  fetchSmoobuBooking,
  type SmoobuWebhookPayload,
} from "./smoobu-client";
import { routeAndSendMessage, type MessageContext } from "./message-router";

function shouldAutoReply(settings: Record<string, any> | null | undefined): boolean {
  if (!settings) return true;
  if (typeof settings.autoReply === "boolean") {
    return settings.autoReply;
  }
  return true;
}

export async function handleSmoobuWebhook(payload: SmoobuWebhookPayload) {
  const data = payload?.data;
  if (!data) {
    throw new Error("Invalid Smoobu payload");
  }

  const bookingId = data.bookingId?.toString();
  if (!bookingId) {
    throw new Error("Missing bookingId in Smoobu payload");
  }

  const property =
    (data.propertyId && (await storage.getPropertyBySmoobuListingId(data.propertyId.toString()))) ||
    null;

  if (!property) {
    console.warn("No property matched Smoobu propertyId", data.propertyId);
    return { handled: false, reason: "property_not_found" };
  }

  const source = data.channel || "smoobu";
  let conversation = await storage.getConversationByExternalId(bookingId, "smoobu");

  if (!conversation) {
    conversation = await storage.createConversation({
      propertyId: property.id,
      guestName: data.guestName || "Voyageur",
      externalId: bookingId,
      source,
    });
  }

  await storage.createMessage({
    conversationId: conversation.id,
    content: data.body,
    isBot: false,
    direction: "inbound",
    senderName: data.guestName || "Voyageur",
    language: data.language || null,
    externalId: data.messageId,
    metadata: {
      channel: source,
      receivedAt: data.sentAt || new Date().toISOString(),
    },
  });

  if (!property.userId) {
    return { handled: true, reason: "no_owner" };
  }

  const integration = await storage.getPmsIntegration(property.userId, "smoobu");
  if (!integration) {
    console.warn("No Smoobu integration configured for user", property.userId);
    return { handled: true, reason: "no_integration" };
  }

  if (!shouldAutoReply(integration.settings as Record<string, any> | undefined)) {
    return { handled: true, reason: "manual_review" };
  }

  // Utiliser le routeur hybride (Smoobu en priorité, Playwright en fallback)
  const messageContext: MessageContext = {
    property,
    conversationId: conversation.id,
    guestName: data.guestName || "Voyageur",
    guestMessage: data.body,
    bookingId,
    language: data.language || null,
  };

  const sendResult = await routeAndSendMessage(messageContext, property.userId!);

  if (sendResult.success) {
    return { 
      handled: true, 
      reason: `auto_reply_sent_via_${sendResult.channel}`,
      channel: sendResult.channel,
    };
  } else {
    // Si l'envoi a échoué, marquer pour révision manuelle
    // Note: updateConversationStatus n'existe pas encore, on peut l'ajouter si nécessaire
    // Pour l'instant, on retourne juste l'erreur
    console.error(`Failed to send message via ${sendResult.channel}:`, sendResult.error);
    return { 
      handled: false, 
      reason: `send_failed_${sendResult.channel}`,
      error: sendResult.error,
    };
  }
}

export async function fetchSmoobuContext(apiKey: string, bookingId: string | number) {
  const booking = await fetchSmoobuBooking(apiKey, bookingId);
  return booking;
}


