import pg from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

const { Pool } = pg;

async function testTables() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') 
      ? { rejectUnauthorized: false } 
      : undefined,
    connectionTimeoutMillis: 30000,
  });

  const client = await pool.connect();

  try {
    console.log('🔌 Connexion à Neon...');
    console.log('✅ Connecté !\n');

    // Vérifier les tables principales
    const tables = [
      'users', 'properties', 'bookings', 'conversations', 'messages',
      'cleaning_staff', 'cleaning_tasks', 'cleaning_notes', 'property_assignments',
      'cleaner_unavailability', 'blocked_periods', 'sessions'
    ];

    console.log('📋 Vérification des tables...\n');

    for (const table of tables) {
      try {
        const result = await client.query(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
          [table]
        );
        const exists = result.rows[0].count > 0;
        console.log(`${exists ? '✅' : '❌'} ${table}`);
      } catch (error) {
        console.log(`❌ ${table} - Erreur: ${error.message.substring(0, 50)}`);
      }
    }

    // Test d'une requête simple
    console.log('\n🧪 Test de requête...');
    try {
      const result = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`✅ Requête réussie - ${result.rows[0].count} utilisateur(s)`);
    } catch (error) {
      console.log(`❌ Erreur de requête: ${error.message}`);
    }

    console.log('\n🎉 Test terminé !');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.code === 'ETIMEDOUT') {
      console.error('💡 Timeout. Vérifiez que votre projet Neon est actif.');
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testTables()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

