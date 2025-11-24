/**
 * Script pour répondre directement aux messages depuis Airbnb
 * Récupère les messages directement depuis Airbnb (pas depuis la DB)
 * et répond avec l'IA
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
    const airbnbMessages = await fetchConversationMessages(
      nguilaneConv.externalId,
      user.airbnbCohostCookies,
    );
    
    if (airbnbMessages.length === 0) {
      console.error("❌ Aucun message trouvé sur Airbnb");
      process.exit(1);
    }
    
    console.log(`✅ ${airbnbMessages.length} message(s) récupéré(s) depuis Airbnb`);
    
    // Afficher tous les messages pour debug
    console.log("\n📋 Tous les messages récupérés:");
    airbnbMessages.forEach((m, i) => {
      console.log(`   ${i + 1}. [${m.isGuest ? "Voyageur" : "Hôte"}] "${m.content.substring(0, 50)}..." (${m.sentAt})`);
    });
    
    // Filtrer les messages entrants (isGuest = true)
    let guestMessages = airbnbMessages.filter((m) => m.isGuest);
    
    // Si aucun message n'est marqué comme voyageur, prendre les messages qui ne sont pas des réponses IA
    // (on peut identifier les réponses IA car elles contiennent souvent des phrases spécifiques)
    if (guestMessages.length === 0) {
      console.log("⚠️ Aucun message marqué comme voyageur");
      console.log("   Recherche des messages qui ne sont pas des réponses IA...");
      
      // Prendre tous les messages et exclure ceux qui ressemblent à des réponses IA
      const aiPhrases = ["assistant virtuel", "bienvenue", "comment puis-je", "n'hésite pas"];
      guestMessages = airbnbMessages.filter(
        (m) => !aiPhrases.some((phrase) => m.content.toLowerCase().includes(phrase)),
      );
      
      // Si toujours rien, prendre tous les messages sauf le dernier (qui est peut-être une réponse)
      if (guestMessages.length === 0 && airbnbMessages.length > 1) {
        guestMessages = airbnbMessages.slice(0, -1);
      } else if (airbnbMessages.length === 1) {
        guestMessages = airbnbMessages;
      }
    }
    
    if (guestMessages.length === 0) {
      console.error("❌ Aucun message trouvé");
      process.exit(1);
    }
    
    // Prendre le dernier message (le plus récent)
    const lastGuestMessage = guestMessages[guestMessages.length - 1];
    
    console.log("\n📨 Dernier message reçu depuis Airbnb:");
    console.log(`   Contenu: "${lastGuestMessage.content}"`);
    console.log(`   Date: ${lastGuestMessage.sentAt}`);
    console.log(`   Est voyageur: ${lastGuestMessage.isGuest}`);
    
    // Vérifier si on a déjà répondu à ce message
    const dbMessages = await storage.getMessagesByConversation(nguilaneConv.id);
    const alreadyResponded = dbMessages.some(
      (m) => m.isBot && m.content.includes(lastGuestMessage.content.substring(0, 50)),
    );
    
    if (alreadyResponded) {
      console.log("\n⚠️ Une réponse a déjà été envoyée pour ce message");
      console.log("   Vérification des messages récents...");
      
      // Prendre les 3 derniers messages du voyageur
      const recentGuestMessages = guestMessages.slice(-3);
      for (const msg of recentGuestMessages.reverse()) {
        const hasResponse = dbMessages.some(
          (m) => m.isBot && m.createdAt && new Date(m.createdAt) > msg.sentAt,
        );
        if (!hasResponse) {
          console.log(`\n📨 Message non encore répondu trouvé:`);
          console.log(`   "${msg.content}"`);
          
          // Générer la réponse pour ce message
          console.log("\n🤖 Génération de la réponse IA...");
          const aiResponse = await generateChatResponse(msg.content, props[0]);
          console.log("✅ Réponse IA générée:");
          console.log(`   "${aiResponse.substring(0, 150)}${aiResponse.length > 150 ? "..." : ""}"`);
          
          // Envoyer la réponse
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
            console.log("\n🎉 Terminé!");
            await pool?.end?.();
            process.exit(0);
          } else {
            console.error(`❌ Erreur envoi: ${sendResult.error}`);
            process.exit(1);
          }
        }
      }
      
      console.log("\n✅ Tous les messages récents ont déjà une réponse");
      await pool?.end?.();
      process.exit(0);
    }
    
    // Générer la réponse IA
    console.log("\n🤖 Génération de la réponse IA...");
    const aiResponse = await generateChatResponse(lastGuestMessage.content, props[0]);
    console.log("✅ Réponse IA générée:");
    console.log(`   "${aiResponse.substring(0, 150)}${aiResponse.length > 150 ? "..." : ""}"`);
    
    // Envoyer la réponse sur Airbnb
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
    
    await pool?.end?.();
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erreur:", error?.message || error);
    console.error(error?.stack);
    await pool?.end?.();
    process.exit(1);
  }
}

main();

