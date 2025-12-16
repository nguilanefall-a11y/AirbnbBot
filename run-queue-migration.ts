import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readFileSync } from 'fs';

async function runMigration() {
  try {
    const client = postgres(process.env.DATABASE_URL!);
    const db = drizzle(client);
    
    const sql = readFileSync('./migrations/create_queue_outbox.sql', 'utf-8');
    
    console.log('🔄 Création de la table queue_outbox...');
    await client.unsafe(sql);
    
    console.log('✅ Migration réussie!');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur de migration:', error);
    process.exit(1);
  }
}

runMigration();
