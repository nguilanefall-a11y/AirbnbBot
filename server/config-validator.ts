/**
 * Validation des variables d'environnement au démarrage
 * Empêche l'application de démarrer si des variables critiques sont manquantes
 */

export function validateEnvironment() {
  const required = ["DATABASE_URL", "GEMINI_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:", missing);
    console.error("   Please check your .env file");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    console.error("❌ SESSION_SECRET required in production");
    process.exit(1);
  }

  console.log("✅ Environment variables validated successfully");
}
