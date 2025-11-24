/**
 * Script pour trouver le dernier message récent (non "salut") et répondre avec l'IA
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
import { sendMessageAsCoHost } from "../server/airbnb-cohost-playwright";
import { syncAllCoHostListings } from "../server/cohost-sync-service";
import { pool } from "../server/db";

async function main() {
  try {
    const userId = "d4cadb35-8d62-44d3-a80e-ca44b12e3187";
    
    console.log("🔄 Étape 1: Synchronisation des messages depuis Airbnb...");
    const user = await storage.getUser(userId);
    if (!user?.airbnbCohostCookies) {
      console.error("❌ Cookies non configurés");
      process.exit(1);
    }
    
    const syncResult = await syncAllCoHostListings(userId, { cookies: user.airbnbCohostCookies });
    console.log(`✅ ${syncResult.messagesProcessed} message(s) synchronisé(s)`);
    
    console.log("\n🔍 Étape 2: Recherche de la conversation avec Nguilane...");
    const props = await storage.getPropertiesByUser(userId);
    if (props.length === 0) {
      console.error("❌ Aucune propriété trouvée");
      process.exit(1);
    }
    
    const convs = await storage.getConversationsByProperty(props[0].id);
    const nguilaneConv = convs.find((c) => c.guestName?.toLowerCase().includes("nguilane"));
    
    if (!nguilaneConv) {
      console.error("❌ Conversation Nguilane non trouvée");
      process.exit(1);
    }
    
    console.log(`✅ Conversation trouvée: ${nguilaneConv.id}`);
    
    console.log("\n📨 Étape 3: Recherche du dernier message récent (pas 'salut')...");
    const messages = await storage.getMessagesByConversation(nguilaneConv.id);
    
    // Filtrer les messages utilisateur (non bot, inbound ou null direction)
    const userMessages = messages
      .filter((m) => !m.isBot && (m.direction === "inbound" || m.direction === null))
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Plus récent en premier
      });
    
    console.log(`\n📋 ${userMessages.length} message(s) utilisateur trouvé(s):`);
    userMessages.slice(0, 5).forEach((msg, i) => {
      const date = new Date(msg.createdAt || "").toLocaleString("fr-FR");
      console.log(`   ${i + 1}. [${date}] "${msg.content.substring(0, 60)}..."`);
    });
    
    // Trouver le premier message qui n'est pas juste "salut" (ignorer les variations)
    const salutations = ["salut", "bonjour", "hello", "hi", "coucou", "hey"];
    const lastRealMessage = userMessages.find(
      (msg) => !salutations.includes(msg.content.trim().toLowerCase())
    );
    
    if (!lastRealMessage) {
      console.error("\n❌ Aucun message autre que des salutations trouvé");
      console.log("💡 Utilisation du message le plus récent même si c'est 'salut'...");
      
      if (userMessages.length > 0) {
        const targetMessage = userMessages[0];
        await respondToMessage(targetMessage, nguilaneConv, props[0], user);
      } else {
        console.error("❌ Aucun message trouvé");
        process.exit(1);
      }
    } else {
      console.log(`\n✅ Message trouvé: "${lastRealMessage.content}"`);
      console.log(`   Date: ${new Date(lastRealMessage.createdAt || "").toLocaleString("fr-FR")}`);
      await respondToMessage(lastRealMessage, nguilaneConv, props[0], user);
    }
    
    await pool?.end?.();
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error?.message || error);
    await pool?.end?.();
    process.exit(1);
  }
}

async function respondToMessage(
  message: any,
  conversation: any,
  property: any,
  user: any,
) {
  console.log("\n🤖 Génération de la réponse IA...");
  const aiResponse = await generateChatResponse(message.content, property);
  console.log("✅ Réponse IA générée:");
  console.log(`   "${aiResponse.substring(0, 150)}${aiResponse.length > 150 ? "..." : ""}"`);
  
  if (conversation.externalId) {
    console.log("\n📤 Envoi de la réponse sur Airbnb...");
    const sendResult = await sendMessageAsCoHost(
      conversation.externalId,
      aiResponse,
      user.airbnbCohostCookies!,
    );
    
    if (sendResult.success) {
      console.log("✅ Réponse envoyée sur Airbnb avec succès!");
      
      await storage.createMessage({
        conversationId: conversation.id,
        content: aiResponse,
        isBot: true,
        direction: "outbound",
      });
      
      console.log("✅ Réponse sauvegardée dans la base de données");
      console.log("\n🎉 Terminé! Vérifie sur Airbnb.");
    } else {
      console.error(`❌ Erreur envoi: ${sendResult.error}`);
      throw new Error(sendResult.error);
    }
  }
}

main();

