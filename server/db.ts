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
      ssl: process.env.DATABASE_URL?.includes('neon.tech') 
        ? { rejectUnauthorized: false } 
        : process.env.DATABASE_URL?.includes('supabase.co') || process.env.DATABASE_URL?.includes('pooler.supabase.com')
        ? { 
            rejectUnauthorized: false,
            require: true 
          }
        : undefined,
      connectionTimeoutMillis: 60000,
      idleTimeoutMillis: 30000,
      max: 10,
    });
    db = drizzle(pool, { schema });
    const dbType = process.env.DATABASE_URL?.includes('neon.tech') ? 'Neon' : 
                   process.env.DATABASE_URL?.includes('supabase.co') ? 'Supabase' : 'PostgreSQL';
    console.log(`✅ Database connection initialized (${dbType})`);
  } catch (error) {
    console.error("⚠️  Failed to initialize database:", error);
  }
} else {
  console.warn("⚠️  DATABASE_URL not set, database features disabled");
}

export { pool, db };
