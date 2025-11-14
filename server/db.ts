// Load environment variables FIRST before anything else
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
config({ path: resolve(__dirname, "..", ".env") });

import pg from "pg";
let pool: pg.Pool | null = null;
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

let db: ReturnType<typeof drizzle> | null = null;

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (connectionString) {
  try {
    const sslConfig = connectionString.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : undefined;

    const poolInstance = new pg.Pool({
      connectionString,
      ssl: sslConfig,
    });

    pool = poolInstance;
    db = drizzle(poolInstance, { schema });
    console.log("✅ Database connection initialized");
  } catch (error) {
    console.error("⚠️  Failed to initialize database:", error);
  }
} else {
  console.warn("⚠️  No database connection string configured (SUPABASE_DB_URL or DATABASE_URL)");
}

export { pool, db };
