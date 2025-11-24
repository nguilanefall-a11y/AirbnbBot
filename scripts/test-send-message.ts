/**
 * Script de test pour envoyer un message sur Airbnb
 * Usage: npx tsx scripts/test-send-message.ts <conversationId> <message>
 * Exemple: npx tsx scripts/test-send-message.ts 2355609262 "Salut, test depuis le script"
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
config({ path: resolve(__dirname, "..", ".env") });

import { sendMessageAsCoHost } from "../server/airbnb-cohost-playwright";
import { storage } from "../server/storage";
import { pool } from "../server/db";

async function main() {
  const [, , conversationId, message] = process.argv;

  if (!conversationId || !message) {
    console.error("❌ Usage: npx tsx scripts/test-send-message.ts <conversationId> <message>");
    console.error("   Exemple: npx tsx scripts/test-send-message.ts 2355609262 \"Salut, test depuis le script\"");
    process.exit(1);
  }

  try {
    console.log("🔍 Récupération des cookies du co-hôte...");
    
    // Récupérer l'utilisateur (tu peux changer l'ID si nécessaire)
    const userId = process.env.TEST_USER_ID || "d4cadb35-8d62-44d3-a80e-ca44b12e3187";
    const user = await storage.getUser(userId);
    
    if (!user) {
      console.error("❌ Utilisateur non trouvé. Vérifie TEST_USER_ID dans .env");
      process.exit(1);
    }

    const cookies = user.airbnbCohostCookies || process.env.AIRBNB_COHOST_COOKIES;
    
    if (!cookies) {
      console.error("❌ Aucun cookie co-hôte trouvé. Configure-les dans les paramètres ou .env");
      process.exit(1);
    }

    console.log(`✅ Cookies trouvés (${cookies.length} caractères)`);
    console.log(`📤 Envoi du message vers la conversation ${conversationId}...`);
    console.log(`💬 Message: "${message}"`);
    console.log("");

    // Envoyer le message
    const result = await sendMessageAsCoHost(conversationId, message, cookies);

    console.log("");
    if (result.success) {
      console.log("✅ SUCCÈS ! Le message a été envoyé sur Airbnb");
      console.log(`   Message ID: ${result.messageId}`);
      console.log("");
      console.log("👉 Vérifie sur Airbnb que le message apparaît bien dans la conversation");
    } else {
      console.error("❌ ÉCHEC ! Le message n'a pas pu être envoyé");
      console.error(`   Erreur: ${result.error}`);
      console.log("");
      console.log("💡 Suggestions:");
      console.log("   - Vérifie que les cookies sont à jour");
      console.log("   - Vérifie que la conversation ID est correcte");
      console.log("   - Essaie avec PLAYWRIGHT_HEADLESS=0 pour voir le navigateur");
    }

    await pool?.end?.();
    process.exit(result.success ? 0 : 1);
  } catch (error: any) {
    console.error("❌ Erreur:", error?.message || error);
    await pool?.end?.();
    process.exit(1);
  }
}

main();



