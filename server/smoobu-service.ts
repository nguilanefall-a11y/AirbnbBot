import { storage } from "./storage";
import { generateChatResponse } from "./gemini";
import {
  sendSmoobuMessage,
  fetchSmoobuBooking,
  type SmoobuWebhookPayload,
} from "./smoobu-client";

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

  const aiResponse = await generateChatResponse(data.body, property);

  await storage.createMessage({
    conversationId: conversation.id,
    content: aiResponse,
    isBot: true,
    direction: "outbound",
    senderName: property.hostName || "Coach IA",
    language: data.language || null,
    metadata: {
      autoReply: true,
      channel: source,
    },
  });

  await sendSmoobuMessage(integration.apiKey, {
    bookingId,
    body: aiResponse,
    channel: source,
  });

  return { handled: true, reason: "auto_reply_sent" };
}

export async function fetchSmoobuContext(apiKey: string, bookingId: string | number) {
  const booking = await fetchSmoobuBooking(apiKey, bookingId);
  return booking;
}

