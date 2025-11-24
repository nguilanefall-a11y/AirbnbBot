/**
 * Script de debug pour voir tous les messages depuis Airbnb
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, "..", ".env") });

import { storage } from "../server/storage";
import { fetchConversationMessages } from "../server/airbnb-cohost-playwright";
import { pool } from "../server/db";

async function main() {
  try {
    const userId = "d4cadb35-8d62-44d3-a80e-ca44b12e3187";
    
    const props = await storage.getPropertiesByUser(userId);
    const convs = await storage.getConversationsByProperty(props[0].id);
    const nguilaneConv = convs.find((c) => c.guestName?.toLowerCase().includes("nguilane"));
    
    if (!nguilaneConv?.externalId) {
      console.error("❌ Conversation non trouvée");
      process.exit(1);
    }
    
    const user = await storage.getUser(userId);
    if (!user?.airbnbCohostCookies) {
      console.error("❌ Cookies non configurés");
      process.exit(1);
    }
    
    console.log("📥 Récupération de TOUS les messages depuis Airbnb...\n");
    
    const airbnbMessages = await fetchConversationMessages(
      nguilaneConv.externalId,
      user.airbnbCohostCookies,
    );
    
    console.log(`✅ ${airbnbMessages.length} message(s) récupéré(s)\n`);
    console.log("=" .repeat(80));
    console.log("📨 TOUS LES MESSAGES (du plus ancien au plus récent):\n");
    
    // Trier du plus ancien au plus récent pour voir l'ordre chronologique
    const sortedMessages = [...airbnbMessages].sort(
      (a, b) => a.sentAt.getTime() - b.sentAt.getTime(),
    );
    
    sortedMessages.forEach((msg, index) => {
      const direction = msg.isGuest ? "⬅️  REÇU (voyageur)" : "➡️  ENVOYÉ (co-host/IA)";
      const content = msg.content.trim() || "(vide)";
      
      console.log(`${index + 1}. ${msg.sentAt.toLocaleString("fr-FR")} - ${direction}`);
      console.log(`   "${content.substring(0, 150)}${content.length > 150 ? "..." : ""}"`);
      console.log("");
    });
    
    console.log("=" .repeat(80));
    
    // Filtrer les messages reçus
    const received = airbnbMessages.filter((m) => m.isGuest);
    const sent = airbnbMessages.filter((m) => !m.isGuest);
    
    console.log(`\n📊 Statistiques:`);
    console.log(`   Messages reçus (voyageur): ${received.length}`);
    console.log(`   Messages envoyés (co-host/IA): ${sent.length}`);
    
    if (received.length > 0) {
      const lastReceived = [...received].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())[0];
      console.log(`\n📨 Dernier message reçu:`);
      console.log(`   Date: ${lastReceived.sentAt.toLocaleString("fr-FR")}`);
      console.log(`   Contenu: "${lastReceived.content}"`);
    } else {
      console.log(`\n⚠️  Aucun message reçu trouvé. Tous les messages sont marqués comme envoyés.`);
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

