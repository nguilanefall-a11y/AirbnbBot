/**
 * Script pour trouver le dernier message réellement reçu depuis Airbnb
 * et répondre avec l'IA
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, "..", ".env") });

import { storage } from "../server/storage";
import { generateChatResponse } from "../server/gemini";
import { sendMessageAsCoHost, fetchConversationMessages } from "../server/airbnb-cohost-playwright";
import { pool } from "../server/db";

async function main() {
  try {
    const userId = process.env.TEST_USER_ID || "d4cadb35-8d62-44d3-a80e-ca44b12e3187";
    
    console.log("🔍 Recherche de la conversation avec Nguilane...");
    const props = await storage.getPropertiesByUser(userId);
    
    if (props.length === 0) {
      console.error("❌ Aucune propriété trouvée");
      process.exit(1);
    }
    
    const convs = await storage.getConversationsByProperty(props[0].id);
    const nguilaneConv = convs.find((c) => c.guestName?.toLowerCase().includes("nguilane"));
    
    if (!nguilaneConv || !nguilaneConv.externalId) {
      console.error("❌ Conversation Nguilane non trouvée ou sans externalId");
      process.exit(1);
    }
    
    console.log(`✅ Conversation trouvée: ${nguilaneConv.id} (${nguilaneConv.guestName})`);
    console.log(`   External ID (Airbnb): ${nguilaneConv.externalId}`);
    
    // Récupérer les cookies
    const user = await storage.getUser(userId);
    if (!user?.airbnbCohostCookies) {
      console.error("❌ Cookies co-hôte non configurés");
      process.exit(1);
    }
    
    console.log("\n📥 Récupération des messages directement depuis Airbnb...");
    
    // Récupérer les messages directement depuis Airbnb (plus récent)
    const airbnbMessages = await fetchConversationMessages(
      nguilaneConv.externalId,
      user.airbnbCohostCookies,
    );
    
    console.log(`✅ ${airbnbMessages.length} message(s) récupéré(s) depuis Airbnb\n`);
    
    // Afficher tous les messages pour debug
    console.log("📨 Tous les messages depuis Airbnb:\n");
    airbnbMessages
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .forEach((msg, index) => {
        const type = msg.isGuest ? "⬅️  REÇU" : "➡️  ENVOYÉ";
        console.log(`${index + 1}. ${msg.sentAt.toLocaleString("fr-FR")} - ${type}`);
        console.log(`   "${msg.content.substring(0, 100)}${msg.content.length > 100 ? "..." : ""}"\n`);
      });
    
    // Filtrer pour trouver les messages reçus (isGuest = true) et les trier par date
    let receivedMessages = airbnbMessages
      .filter((msg) => msg.isGuest === true && msg.content.trim().length > 0)
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
    
    // Si aucun message reçu n'est trouvé, prendre les messages de la DB pour comparer
    if (receivedMessages.length === 0) {
      console.log("⚠️  Aucun message reçu trouvé depuis Airbnb.");
      console.log("🔍 Vérification des messages dans la base de données...\n");
      
      const dbMessages = await storage.getMessagesByConversation(nguilaneConv.id);
      const dbReceivedMessages = dbMessages
        .filter((m) => !m.isBot && (m.direction === "inbound" || m.direction === null))
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
      
      if (dbReceivedMessages.length > 0) {
        console.log(`✅ ${dbReceivedMessages.length} message(s) reçu(s) trouvé(s) dans la DB\n`);
        dbReceivedMessages.forEach((msg, index) => {
          console.log(`${index + 1}. ${msg.createdAt ? new Date(msg.createdAt).toLocaleString("fr-FR") : "Date inconnue"}`);
          console.log(`   "${msg.content.substring(0, 100)}${msg.content.length > 100 ? "..." : ""}"\n`);
        });
        
        // Utiliser le message de la DB le plus récent
        const lastDbMessage = dbReceivedMessages[0];
        receivedMessages = [
          {
            content: lastDbMessage.content,
            isGuest: true,
            sentAt: lastDbMessage.createdAt ? new Date(lastDbMessage.createdAt) : new Date(),
          },
        ];
        console.log("✅ Utilisation du message le plus récent de la base de données\n");
      } else {
        console.error("❌ Aucun message reçu trouvé ni dans Airbnb ni dans la DB");
        console.error("💡 Essayez de synchroniser les messages d'abord ou vérifiez qu'il y a bien un message reçu");
        process.exit(1);
      }
    }
    
    console.log("📨 Messages reçus trouvés (du plus récent au plus ancien):\n");
    receivedMessages.forEach((msg, index) => {
      const isRecent = index === 0 ? " ⭐ PLUS RÉCENT" : "";
      console.log(`${index + 1}. ${msg.sentAt.toLocaleString("fr-FR")}${isRecent}`);
      console.log(`   "${msg.content.substring(0, 100)}${msg.content.length > 100 ? "..." : ""}"\n`);
    });
    
    // Prendre le message le plus récent
    const lastReceivedMessage = receivedMessages[0];
    
    console.log("🎯 Message sélectionné pour répondre:");
    console.log(`   Date: ${lastReceivedMessage.sentAt.toLocaleString("fr-FR")}`);
    console.log(`   Contenu: "${lastReceivedMessage.content}"\n`);
    
    // Vérifier si on a déjà répondu à ce message en cherchant dans la DB
    const dbMessages = await storage.getMessagesByConversation(nguilaneConv.id);
    const alreadyResponded = dbMessages.some(
      (dbMsg) =>
        dbMsg.isBot === true &&
        dbMsg.createdAt &&
        new Date(dbMsg.createdAt) > lastReceivedMessage.sentAt,
    );
    
    if (alreadyResponded) {
      console.log("ℹ️  Il semble qu'une réponse ait déjà été envoyée après ce message.");
      console.log("   Voulez-vous quand même répondre? (Oui = continuer)\n");
    }
    
    // Générer la réponse IA
    console.log("🤖 Génération de la réponse IA...");
    const aiResponse = await generateChatResponse(lastReceivedMessage.content, props[0]);
    console.log("✅ Réponse IA générée:");
    console.log(`   "${aiResponse.substring(0, 150)}${aiResponse.length > 150 ? "..." : ""}"\n`);
    
    // Envoyer la réponse sur Airbnb
    console.log("📤 Envoi de la réponse sur Airbnb...");
    const sendResult = await sendMessageAsCoHost(
      nguilaneConv.externalId,
      aiResponse,
      user.airbnbCohostCookies,
    );
    
    if (sendResult.success) {
      console.log("✅ Réponse envoyée sur Airbnb avec succès!");
      
      // Sauvegarder la réponse dans la DB
      await storage.createMessage({
        conversationId: nguilaneConv.id,
        content: aiResponse,
        isBot: true,
        direction: "outbound",
        externalId: sendResult.messageId,
        metadata: {
          channel: "airbnb-cohost",
          respondedTo: lastReceivedMessage.content.substring(0, 50),
          respondedAt: lastReceivedMessage.sentAt.toISOString(),
        },
      });
      
      console.log("✅ Réponse sauvegardée dans la base de données");
      console.log("\n🎉 Terminé! Vérifie sur Airbnb que la réponse apparaît bien.");
    } else {
      console.error(`❌ Erreur envoi: ${sendResult.error}`);
      process.exit(1);
    }
    
    await pool?.end?.();
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error?.message || error);
    if (error.stack) {
      console.error(error.stack);
    }
    await pool?.end?.();
    process.exit(1);
  }
}

main();

