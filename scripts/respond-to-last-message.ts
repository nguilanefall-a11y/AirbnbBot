/**
 * Script pour répondre avec l'IA au dernier message reçu d'une conversation
 * Usage: npx tsx scripts/respond-to-last-message.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
config({ path: resolve(__dirname, "..", ".env") });

import { storage } from "../server/storage";
import { generateChatResponse } from "../server/gemini";
import { sendMessageAsCoHost } from "../server/airbnb-cohost-playwright";
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
    
    if (!nguilaneConv) {
      console.error("❌ Conversation Nguilane non trouvée");
      process.exit(1);
    }
    
    console.log(`✅ Conversation trouvée: ${nguilaneConv.id} (${nguilaneConv.guestName})`);
    
    // Récupérer tous les messages
    const messages = await storage.getMessagesByConversation(nguilaneConv.id);
    
    // Filtrer les messages qui ne sont pas du bot (messages entrants/réels)
    const userMessages = messages.filter((m) => !m.isBot && (m.direction === "inbound" || m.direction === null));
    
    if (userMessages.length === 0) {
      console.error("❌ Aucun message utilisateur trouvé");
      process.exit(1);
    }
    
    // Prendre le dernier message (le plus récent)
    const lastMessage = userMessages.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    })[0];
    
    console.log("\n📨 Dernier message reçu:");
    console.log(`   Contenu: "${lastMessage.content}"`);
    console.log(`   Date: ${lastMessage.createdAt}`);
    
    // Générer la réponse IA
    console.log("\n🤖 Génération de la réponse IA...");
    const aiResponse = await generateChatResponse(lastMessage.content, props[0]);
    console.log("✅ Réponse IA générée:");
    console.log(`   "${aiResponse.substring(0, 150)}${aiResponse.length > 150 ? "..." : ""}"`);
    
    // Envoyer la réponse sur Airbnb
    if (nguilaneConv.externalId) {
      const user = await storage.getUser(userId);
      if (user?.airbnbCohostCookies) {
        console.log("\n📤 Envoi de la réponse sur Airbnb...");
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
          });
          
          console.log("✅ Réponse sauvegardée dans la base de données");
          console.log("\n🎉 Terminé! Vérifie sur Airbnb que la réponse apparaît bien.");
        } else {
          console.error(`❌ Erreur envoi: ${sendResult.error}`);
          process.exit(1);
        }
      } else {
        console.error("❌ Cookies co-hôte non configurés");
        process.exit(1);
      }
    } else {
      console.error("❌ Conversation sans externalId");
      process.exit(1);
    }
    
    await pool?.end?.();
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error?.message || error);
    await pool?.end?.();
    process.exit(1);
  }
}

main();



