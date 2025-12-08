// Load environment variables FIRST before anything else
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
config({ path: resolve(__dirname, "..", ".env") });

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Nécessaire pour Supabase
    });
    db = drizzle(pool, { schema });
    console.log("✅ Database connection initialized (Supabase)");
  } catch (error) {
    console.error("⚠️  Failed to initialize database:", error);
  }
} else {
  console.warn("⚠️  DATABASE_URL not set, database features disabled");
}

export { pool, db };
