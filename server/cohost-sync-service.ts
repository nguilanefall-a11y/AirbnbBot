/**
 * Service de Synchronisation Co-Hôte Airbnb
 * 
 * ✅ APPROCHE LÉGALE : Utilise le compte co-hôte pour accéder aux annonces des clients
 * 
 * Flux :
 * 1. Se connecte avec le compte co-hôte
 * 2. Récupère toutes les annonces accessibles
 * 3. Pour chaque annonce, récupère les messages
 * 4. Génère des réponses IA
 * 5. Envoie les réponses via le compte co-hôte
 */

import { storage } from "./storage";
import { generateChatResponse } from "./gemini";
import {
  loginAsCoHost,
  fetchCoHostListings,
  fetchMessagesForListing,
  fetchConversationMessages,
  fetchAllCohostConversations,
  sendMessageAsCoHost,
  type CoHostCredentials,
  type ListingMessage,
} from "./airbnb-cohost-playwright";
import type { Property } from "@shared/schema";

export interface SyncResult {
  listingsFound: number;
  conversationsFound: number;
  messagesProcessed: number;
  repliesSent: number;
  errors: string[];
}

/**
 * Synchronise toutes les annonces et messages via le compte co-hôte
 */
export async function syncAllCoHostListings(
  userId: string,
  credentials: CoHostCredentials,
): Promise<SyncResult> {
  const errors: string[] = [];
  let listingsFound = 0;
  let conversationsFound = 0;
  let messagesProcessed = 0;
  let repliesSent = 0;

  try {
    // 1. Se connecter avec le compte co-hôte
    console.log("🔐 Connexion au compte co-hôte...");
    const cookies = await loginAsCoHost(credentials);
    console.log("✅ Connecté au compte co-hôte");

    const userProperties = await storage.getPropertiesByUser(userId);
    const linkedProperties = userProperties.filter((prop) => !!prop.smoobuListingId);

    if (linkedProperties.length > 0) {
      console.log(`🔗 ${linkedProperties.length} propriété(s) liées détectées. Synchronisation directe...`);
      listingsFound = linkedProperties.length;

      for (const property of linkedProperties) {
        const listingId = property.smoobuListingId!;
        try {
          console.log(`📨 Traitement de la propriété ${property.name} (#${listingId})`);

          const listingMessages = await fetchMessagesForListing(
            listingId,
            cookies,
            property.name,
          );
          conversationsFound += listingMessages.length;

          for (const listingMsg of listingMessages) {
            try {
              const result = await processCoHostMessage(
                listingMsg,
                property,
                userId,
                cookies,
              );

              messagesProcessed++;
              if (result.replySent) {
                repliesSent++;
              }
            } catch (error: any) {
              errors.push(`Erreur message ${listingMsg.conversationId}: ${error?.message}`);
            }
          }
        } catch (error: any) {
          errors.push(`Erreur propriété ${listingId}: ${error?.message}`);
        }
      }

      // Synchroniser aussi les conversations co-host directes
      try {
        console.log("💬 Synchronisation des conversations co-host...");
        const cohostConversations = await fetchAllCohostConversations(cookies);
        
        if (cohostConversations.length > 0 && linkedProperties.length > 0) {
          // Associer les conversations co-host à la première propriété
          const firstProperty = linkedProperties[0];
          
          for (const cohostMsg of cohostConversations) {
            try {
              const result = await processCoHostMessage(
                cohostMsg,
                firstProperty,
                userId,
                cookies,
              );

              messagesProcessed++;
              if (result.replySent) {
                repliesSent++;
              }
            } catch (error: any) {
              errors.push(`Erreur conversation co-host ${cohostMsg.conversationId}: ${error?.message}`);
            }
          }
          
          conversationsFound += cohostConversations.length;
          console.log(`✅ ${cohostConversations.length} conversation(s) co-host synchronisée(s)`);
        }
      } catch (error: any) {
        console.warn("⚠️ Erreur synchronisation conversations co-host:", error?.message);
        errors.push(`Erreur conversations co-host: ${error?.message}`);
      }
    } else {
      console.log("📋 Aucune propriété liée. Récupération des annonces accessibles via Playwright...");
      const listings = await fetchCoHostListings(cookies);
      listingsFound = listings.length;
      console.log(`✅ ${listingsFound} annonce(s) trouvée(s)`);

      for (const listing of listings) {
        try {
          console.log(`📨 Traitement de l'annonce: ${listing.name} (${listing.listingId})`);

          const property = await findPropertyMatch(listing.listingId, listing.name, userId);
          if (!property) {
            console.warn(`⚠️ Propriété non trouvée pour l'annonce ${listing.listingId}`);
            errors.push(`Propriété non trouvée: ${listing.listingId}`);
            continue;
          }

          const listingMessages = await fetchMessagesForListing(
            listing.listingId,
            cookies,
            listing.name,
          );
          conversationsFound += listingMessages.length;

          for (const listingMsg of listingMessages) {
            try {
              const result = await processCoHostMessage(
                listingMsg,
                property,
                userId,
                cookies,
              );

              messagesProcessed++;
              if (result.replySent) {
                repliesSent++;
              }
            } catch (error: any) {
              errors.push(`Erreur message ${listingMsg.conversationId}: ${error?.message}`);
            }
          }
        } catch (error: any) {
          errors.push(`Erreur annonce ${listing.listingId}: ${error?.message}`);
        }
      }
    }
  } catch (error: any) {
    errors.push(`Erreur synchronisation: ${error?.message}`);
  }

  return {
    listingsFound,
    conversationsFound,
    messagesProcessed,
    repliesSent,
    errors,
  };
}

/**
 * Traite un message reçu via le compte co-hôte
 */
async function processCoHostMessage(
  listingMessage: ListingMessage,
  property: Property,
  userId: string,
  cookies: string,
): Promise<{ replySent: boolean }> {
  // 1. Créer ou récupérer la conversation
  let conversation = await storage.getConversationByExternalId(
    listingMessage.conversationId,
    "airbnb-cohost",
  );

  if (!conversation) {
    conversation = await storage.createConversation({
      propertyId: property.id,
      guestName: listingMessage.guestName,
      externalId: listingMessage.conversationId,
      source: "airbnb-cohost",
      status: "open",
    });
  }

  // 2. Récupérer les messages détaillés de la conversation
  const detailedMessages = await fetchConversationMessages(
    listingMessage.conversationId,
    cookies,
  );

  // Vérifier si c'est une conversation co-host (pas de voyageur)
  const isCohostConversation = listingMessage.listingId === "cohost-direct";

  // 3. Sauvegarder tous les messages (voyageurs et co-hôtes)
  for (const msg of detailedMessages) {
    // Vérifier si déjà traité
    const existingMessages = await storage.getMessagesByConversation(conversation.id);
    const expectedDirection = msg.isGuest ? "inbound" : "outbound";
    const alreadyProcessed = existingMessages.some(
      (m) => m.content === msg.content && m.direction === expectedDirection,
    );

    if (alreadyProcessed) {
      continue; // Déjà traité
    }

    // Sauvegarder le message (inbound ou outbound selon l'expéditeur)
    await storage.createMessage({
      conversationId: conversation.id,
      content: msg.content,
      isBot: false,
      direction: msg.isGuest ? "inbound" : "outbound",
      senderName: msg.isGuest ? listingMessage.guestName : (property.hostName || "Co-hôte"),
      metadata: {
        channel: "airbnb-cohost",
        listingId: listingMessage.listingId,
        receivedAt: msg.sentAt.toISOString(),
        isCohostConversation,
      },
    });

    // Ne générer de réponse automatique que pour les messages des voyageurs (pas pour les conversations co-host)
    if (isCohostConversation || !msg.isGuest) {
      continue; // Pas de réponse automatique pour les conversations co-host ou les messages sortants
    }

    // Vérifier si auto-reply est activé
    const integration = await storage.getPmsIntegration(userId, "smoobu");
    const autoReplyEnabled =
      !integration?.settings || integration.settings.autoReply !== false;

    if (!autoReplyEnabled) {
      continue; // Auto-reply désactivé
    }

    // Générer la réponse IA
    const aiResponse = await generateChatResponse(msg.content, property);

    // Envoyer la réponse via le compte co-hôte
    const sendResult = await sendMessageAsCoHost(
      listingMessage.conversationId,
      aiResponse,
      cookies,
    );

    if (sendResult.success) {
      // Sauvegarder le message envoyé
      await storage.createMessage({
        conversationId: conversation.id,
        content: aiResponse,
        isBot: true,
        direction: "outbound",
        senderName: property.hostName || "Coach IA",
        externalId: sendResult.messageId,
        metadata: {
          channel: "airbnb-cohost",
          autoReply: true,
          listingId: listingMessage.listingId,
        },
      });

      return { replySent: true };
    } else {
      console.error(`❌ Échec envoi message: ${sendResult.error}`);
      return { replySent: false };
    }
  }

  return { replySent: false };
}

/**
 * Trouve une propriété par son ID d'annonce Airbnb
 */
async function findPropertyMatch(
  listingId: string | undefined,
  listingName: string | undefined,
  userId: string,
): Promise<Property | undefined> {
  if (listingId) {
    const direct = await storage.getPropertyBySmoobuListingId(listingId);
    if (direct) return direct;
  }

  const userProperties = await storage.getPropertiesByUser(userId);
  if (!userProperties || userProperties.length === 0) {
    return undefined;
  }

  if (listingName) {
    const normalizedListingName = normalizeText(listingName);
    let matched = userProperties.find((prop) =>
      normalizeText(prop.name).includes(normalizedListingName) ||
      normalizedListingName.includes(normalizeText(prop.name)),
    );

    if (matched && listingId && !matched.smoobuListingId) {
      try {
        const updated = await storage.updateProperty(matched.id, { smoobuListingId: listingId });
        if (updated) {
          matched = updated;
        } else {
          matched = { ...matched, smoobuListingId: listingId };
        }
      } catch (error) {
        console.warn("Impossible d'enregistrer l'identifiant Airbnb pour", matched.id, error);
      }
    }

    if (matched) {
      return matched;
    }
  }

  return userProperties[0];
}

function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Démarre la synchronisation automatique périodique
 */
export async function startCoHostSync(
  userId: string,
  credentials: CoHostCredentials,
  intervalMinutes: number = 15,
): Promise<() => void> {
  // Synchronisation immédiate
  await syncAllCoHostListings(userId, credentials);

  // Programmer la synchronisation périodique
  const interval = setInterval(async () => {
    try {
      await syncAllCoHostListings(userId, credentials);
    } catch (error: any) {
      console.error("Erreur synchronisation périodique:", error?.message);
    }
  }, intervalMinutes * 60 * 1000);

  // Retourner une fonction pour arrêter
  return () => clearInterval(interval);
}

