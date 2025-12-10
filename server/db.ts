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
    // Extraire le hostname pour le logging (sans exposer le mot de passe)
    const urlObj = new URL(process.env.DATABASE_URL);
    const hostname = urlObj.hostname;
    const dbType = hostname.includes('neon.tech') ? 'Neon' : 
                   hostname.includes('supabase.co') || hostname.includes('pooler.supabase.com') ? 'Supabase' : 
                   'PostgreSQL';
    
    console.log(`🔌 Attempting to connect to ${dbType} database at ${hostname}...`);
    
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: hostname.includes('neon.tech') 
        ? { rejectUnauthorized: false } 
        : hostname.includes('supabase.co') || hostname.includes('pooler.supabase.com')
        ? { 
            rejectUnauthorized: false,
            require: true 
          }
        : undefined,
      connectionTimeoutMillis: 30000, // 30 secondes
      idleTimeoutMillis: 30000,
      max: 10,
      // Retry logic
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
    
    // Test de connexion immédiat
    const testClient = await pool.connect();
    try {
      await testClient.query('SELECT NOW()');
      console.log(`✅ Database connection successful (${dbType})`);
    } finally {
      testClient.release();
    }
    
    db = drizzle(pool, { schema });
    
    // Gestion des erreurs de connexion
    pool.on('error', (err) => {
      console.error('❌ Database pool error:', err.message);
      if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
        console.error('⚠️  DNS resolution failed. Check:');
        console.error('   1. DATABASE_URL is correctly set on Render');
        console.error('   2. Supabase project is not paused');
        console.error('   3. Network connectivity from Render');
      }
    });
    
  } catch (error: any) {
    console.error("❌ Failed to initialize database:", error.message);
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('⚠️  DNS resolution error. Possible causes:');
      console.error('   - DATABASE_URL not set correctly on Render');
      console.error('   - Supabase project is paused (check dashboard)');
      console.error('   - Incorrect hostname in DATABASE_URL');
      console.error('   - Network/firewall blocking connection');
    }
    // Ne pas bloquer le démarrage, mais loguer l'erreur
    pool = null;
    db = null;
  }
} else {
  console.warn("⚠️  DATABASE_URL not set, database features disabled");
}

export { pool, db };
