import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

const { Pool } = pg;

async function executeMigration() {
  console.log('🔌 Connexion à Supabase...');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
  });

  const client = await pool.connect();

  try {
    console.log('✅ Connecté !\n');
    console.log('📝 Exécution de la migration pour les tokens iCal...\n');

    // Lire le script SQL
    const sqlScript = readFileSync(resolve(__dirname, 'add-ical-tokens.sql'), 'utf-8');
    
    // Exécuter le script
    await client.query(sqlScript);
    
    console.log('✅ Migration terminée avec succès !\n');
    
    // Vérifier que les colonnes existent
    const checkProperties = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'properties' AND column_name = 'ical_sync_token'
    `);
    
    const checkUsers = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'ical_sync_token'
    `);
    
    console.log('📊 Vérification finale:');
    console.log(`   - properties.ical_sync_token: ${checkProperties.rows.length > 0 ? '✅ OK' : '❌ MANQUANT'}`);
    console.log(`   - users.ical_sync_token: ${checkUsers.rows.length > 0 ? '✅ OK' : '❌ MANQUANT'}\n`);

  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

executeMigration()
  .then(() => {
    console.log('✅ Migration complète !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec de la migration:', error.message);
    process.exit(1);
  });

