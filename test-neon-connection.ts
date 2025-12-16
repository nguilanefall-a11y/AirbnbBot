import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function testConnection() {
  try {
    const client = postgres(process.env.DATABASE_URL!);
    const db = drizzle(client);
    
    await db.execute('SELECT 1');
    console.log('✅ Connexion Neon réussie!');
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur de connexion:', error);
    process.exit(1);
  }
}

testConnection();
