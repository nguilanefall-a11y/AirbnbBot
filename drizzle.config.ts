import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, ".env") });

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DB_URL or DATABASE_URL must be set");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  },
});
