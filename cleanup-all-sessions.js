import pg from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

const { Pool } = pg;

async function cleanupAllSessions() {
  console.log('🧹 Nettoyage de toutes les sessions...\n');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
  });

  const client = await pool.connect();

  try {
    // Compter les sessions avant
    const beforeCount = await client.query(`SELECT COUNT(*) as count FROM sessions`);
    console.log(`📊 Sessions avant nettoyage : ${beforeCount.rows[0].count}\n`);

    // Supprimer toutes les sessions
    const result = await client.query(`DELETE FROM sessions`);
    console.log(`✅ ${result.rowCount} session(s) supprimée(s)\n`);

    // Compter les sessions après
    const afterCount = await client.query(`SELECT COUNT(*) as count FROM sessions`);
    console.log(`📊 Sessions après nettoyage : ${afterCount.rows[0].count}\n`);

    console.log('💡 Toutes les sessions ont été supprimées.');
    console.log('   Vous devrez vous reconnecter avec :');
    console.log('   Email : nguilane.fall@gmail.com');
    console.log('   Mot de passe : Admin123!\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupAllSessions()
  .then(() => {
    console.log('✅ Nettoyage terminé !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec:', error.message);
    process.exit(1);
  });

