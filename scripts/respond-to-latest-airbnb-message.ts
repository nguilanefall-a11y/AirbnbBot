/**
 * Script pour répondre au dernier message reçu directement depuis Airbnb
 * Récupère les messages en temps réel depuis Airbnb (pas depuis la DB)
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
import { sendMessageAsCoHost, fetchConversationMessages } from "../server/airbnb-cohost-playwright";
import { pool } from "../server/db";

async function main() {
  try {
    const userId = process.env.TEST_USER_ID || "d4cadb35-8d62-44d3-a80e-ca44b12e3187";
    const conversationId = "2355609262"; // ID de la conversation avec Nguilane
    
    console.log("🔍 Récupération des messages directement depuis Airbnb...");
    
    // Récupérer l'utilisateur et les cookies
    const user = await storage.getUser(userId);
    if (!user?.airbnbCohostCookies) {
      console.error("❌ Cookies co-hôte non configurés");
      process.exit(1);
    }
    
    // Récupérer les messages directement depuis Airbnb
    const airbnbMessages = await fetchConversationMessages(conversationId, user.airbnbCohostCookies);
    
    console.log(`✅ ${airbnbMessages.length} message(s) récupéré(s) depuis Airbnb`);
    
    // Filtrer uniquement les messages des voyageurs (isGuest: true)
    const guestMessages = airbnbMessages.filter((m) => m.isGuest);
    
    if (guestMessages.length === 0) {
      console.log("⚠️ Aucun message de voyageur trouvé");
      process.exit(0);
    }
    
    // Trier par date (le plus récent en premier)
    const sortedGuestMessages = guestMessages.sort((a, b) => {
      return b.sentAt.getTime() - a.sentAt.getTime();
    });
    
    console.log("\n📋 Derniers messages reçus (depuis Airbnb):");
    sortedGuestMessages.slice(0, 5).forEach((msg, i) => {
      console.log(`   ${i + 1}. [${msg.sentAt.toLocaleString("fr-FR")}] "${msg.content.substring(0, 60)}${msg.content.length > 60 ? "..." : ""}"`);
    });
    
    // Prendre le dernier message reçu
    const lastGuestMessage = sortedGuestMessages[0];
    
    console.log(`\n📨 Dernier message reçu à répondre:`);
    console.log(`   Date: ${lastGuestMessage.sentAt.toLocaleString("fr-FR")}`);
    console.log(`   Contenu: "${lastGuestMessage.content}"`);
    
    // Vérifier si on a déjà répondu à ce message en vérifiant les messages dans la DB
    const props = await storage.getPropertiesByUser(userId);
    if (props.length === 0) {
      console.error("❌ Aucune propriété trouvée");
      process.exit(1);
    }
    
    const convs = await storage.getConversationsByProperty(props[0].id);
    const nguilaneConv = convs.find((c) => c.guestName?.toLowerCase().includes("nguilane"));
    
    if (nguilaneConv) {
      const dbMessages = await storage.getMessagesByConversation(nguilaneConv.id);
      const hasAlreadyReplied = dbMessages.some((dbMsg) => {
        // Vérifier si on a déjà une réponse IA après ce message
        if (!dbMsg.isBot) return false;
        
        const dbDate = new Date(dbMsg.createdAt || 0);
        // Si la réponse IA est après le message reçu (à 30 secondes près)
        return dbDate.getTime() >= lastGuestMessage.sentAt.getTime() - 30000;
      });
      
      if (hasAlreadyReplied) {
        console.log("\n⚠️ Une réponse existe déjà pour ce message dans la DB");
        console.log("   On répond quand même au dernier message reçu...");
      }
    }
    
    // Générer la réponse IA
    console.log("\n🤖 Génération de la réponse IA...");
    const aiResponse = await generateChatResponse(lastGuestMessage.content, props[0]);
    console.log("✅ Réponse IA générée:");
    console.log(`   "${aiResponse.substring(0, 150)}${aiResponse.length > 150 ? "..." : ""}"`);
    
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



