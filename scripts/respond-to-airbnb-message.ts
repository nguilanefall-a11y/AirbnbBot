/**
 * Script pour récupérer directement les messages depuis Airbnb et répondre au dernier message réel
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
    const conversationId = "2355609262"; // ID de conversation Nguilane
    
    console.log("🔍 Récupération des messages directement depuis Airbnb...");
    
    const user = await storage.getUser(userId);
    if (!user?.airbnbCohostCookies) {
      console.error("❌ Cookies co-hôte non configurés");
      process.exit(1);
    }
    
    // Récupérer les messages directement depuis Airbnb
    console.log(`📨 Récupération des messages de la conversation ${conversationId}...`);
    const airbnbMessages = await fetchConversationMessages(conversationId, user.airbnbCohostCookies);
    
    if (airbnbMessages.length === 0) {
      console.error("❌ Aucun message trouvé sur Airbnb");
      process.exit(1);
    }
    
    console.log(`✅ ${airbnbMessages.length} message(s) récupéré(s) depuis Airbnb\n`);
    
    // Afficher tous les messages pour debug
    console.log("📋 Tous les messages (du plus ancien au plus récent):");
    airbnbMessages.forEach((msg, index) => {
      const date = msg.sentAt.toLocaleString("fr-FR");
      const type = msg.isGuest ? "👤 Voyageur" : "🤖 Hôte/Co-hôte";
      const isGuest = msg.isGuest ? "OUI" : "NON";
      console.log(`\n${index + 1}. [${date}] ${type} (isGuest: ${isGuest}):`);
      console.log(`   "${msg.content.substring(0, 200)}${msg.content.length > 200 ? "..." : ""}"`);
    });
    
    // Trouver le dernier message du voyageur (guest)
    const guestMessages = airbnbMessages.filter(m => m.isGuest);
    const hostMessages = airbnbMessages.filter(m => !m.isGuest);
    
    console.log(`\n📊 Statistiques:`);
    console.log(`   Messages voyageur: ${guestMessages.length}`);
    console.log(`   Messages hôte/co-hôte: ${hostMessages.length}`);
    console.log(`   Total: ${airbnbMessages.length}`);
    
    if (guestMessages.length === 0) {
      console.error("\n⚠️ Aucun message de voyageur trouvé");
      console.log("\n💡 Vérification des messages les plus récents...");
      
      // Prendre les 3 derniers messages récents
      const recentMessages = airbnbMessages
        .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
        .slice(0, 3);
      
      console.log("\n📨 Les 3 derniers messages (du plus récent au plus ancien):");
      recentMessages.forEach((msg, index) => {
        const date = msg.sentAt.toLocaleString("fr-FR");
        const type = msg.isGuest ? "👤 Voyageur" : "🤖 Hôte/Co-hôte";
        console.log(`\n${index + 1}. [${date}] ${type}:`);
        console.log(`   "${msg.content}"`);
      });
      
      // Si aucun message voyageur, utiliser le dernier message non-bot récent
      const lastMessage = recentMessages[0];
      if (lastMessage && lastMessage.content.trim()) {
        console.log(`\n💬 Utilisation du dernier message trouvé pour répondre...`);
        
        // Récupérer la propriété
        const props = await storage.getPropertiesByUser(userId);
        if (props.length === 0) {
          console.error("❌ Aucune propriété trouvée");
          process.exit(1);
        }
        
        // Générer la réponse IA
        console.log(`\n🤖 Génération de la réponse IA pour: "${lastMessage.content}"...`);
        const aiResponse = await generateChatResponse(lastMessage.content, props[0]);
        console.log("✅ Réponse IA générée:");
        console.log(`   "${aiResponse.substring(0, 200)}${aiResponse.length > 200 ? "..." : ""}"`);
        
        // Envoyer la réponse sur Airbnb
        console.log("\n📤 Envoi de la réponse sur Airbnb...");
        const sendResult = await sendMessageAsCoHost(
          conversationId,
          aiResponse,
          user.airbnbCohostCookies,
        );
        
        if (sendResult.success) {
          console.log("✅ Réponse envoyée sur Airbnb avec succès!");
        } else {
          console.error(`❌ Erreur envoi: ${sendResult.error}`);
        }
        
        await pool?.end?.();
        process.exit(sendResult.success ? 0 : 1);
      }
      
      process.exit(1);
    }
    
    // Prendre le dernier message du voyageur
    const lastGuestMessage = guestMessages[guestMessages.length - 1];
    
    console.log("\n" + "=".repeat(60));
    console.log("🎯 DERNIER MESSAGE DU VOYAGEUR À RÉPONDRE:");
    console.log("=".repeat(60));
    console.log(`📅 Date: ${lastGuestMessage.sentAt.toLocaleString("fr-FR")}`);
    console.log(`💬 Message: "${lastGuestMessage.content}"`);
    console.log("=".repeat(60));
    
    // Récupérer la propriété
    const props = await storage.getPropertiesByUser(userId);
    if (props.length === 0) {
      console.error("❌ Aucune propriété trouvée");
      process.exit(1);
    }
    
    // Générer la réponse IA
    console.log("\n🤖 Génération de la réponse IA...");
    const aiResponse = await generateChatResponse(lastGuestMessage.content, props[0]);
    console.log("✅ Réponse IA générée:");
    console.log(`   "${aiResponse.substring(0, 200)}${aiResponse.length > 200 ? "..." : ""}"`);
    
    // Envoyer la réponse sur Airbnb
    console.log("\n📤 Envoi de la réponse sur Airbnb...");
    const sendResult = await sendMessageAsCoHost(
      conversationId,
      aiResponse,
      user.airbnbCohostCookies,
    );
    
    if (sendResult.success) {
      console.log("✅ Réponse envoyée sur Airbnb avec succès!");
      
      // Sauvegarder la réponse dans la DB
      const convs = await storage.getConversationsByProperty(props[0].id);
      const nguilaneConv = convs.find((c) => c.guestName?.toLowerCase().includes("nguilane"));
      
      if (nguilaneConv) {
        await storage.createMessage({
          conversationId: nguilaneConv.id,
          content: aiResponse,
          isBot: true,
          direction: "outbound",
        });
        console.log("✅ Réponse sauvegardée dans la base de données");
      }
      
      console.log("\n🎉 Terminé! Vérifie sur Airbnb que la réponse apparaît bien.");
    } else {
      console.error(`❌ Erreur envoi: ${sendResult.error}`);
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

