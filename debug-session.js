import pg from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

const { Pool } = pg;

async function debugSession() {
  console.log('🔍 Debug des sessions et propriétés...\n');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
  });

  const client = await pool.connect();

  try {
    // 1. Vérifier les sessions actives
    console.log('1️⃣  Sessions actives:');
    const activeSessions = await client.query(`
      SELECT 
        sid,
        sess->>'passport' as passport_user_id,
        expire,
        NOW() as now,
        expire > NOW() as is_valid
      FROM sessions
      WHERE expire > NOW()
      ORDER BY expire DESC
      LIMIT 10
    `);
    
    console.log(`   Total: ${activeSessions.rows.length} session(s) active(s)\n`);
    activeSessions.rows.forEach(session => {
      const userId = session.passport_user_id ? JSON.parse(session.passport_user_id).user : 'N/A';
      console.log(`   - Session: ${session.sid.substring(0, 20)}...`);
      console.log(`     User ID: ${userId}`);
      console.log(`     Expire: ${session.expire}`);
      console.log(`     Valid: ${session.is_valid}\n`);
    });

    // 2. Vérifier les propriétés pour nguilane.fall@gmail.com
    console.log('2️⃣  Propriétés pour nguilane.fall@gmail.com:');
    const userProps = await client.query(`
      SELECT u.id, u.email, COUNT(p.id) as property_count
      FROM users u
      LEFT JOIN properties p ON p.user_id = u.id
      WHERE u.email = 'nguilane.fall@gmail.com'
      GROUP BY u.id, u.email
    `);
    
    if (userProps.rows.length > 0) {
      const user = userProps.rows[0];
      console.log(`   User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Propriétés: ${user.property_count}\n`);
      
      // Détails des propriétés
      const props = await client.query(`
        SELECT id, name, user_id, created_at
        FROM properties
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [user.id]);
      
      console.log(`   Détails des propriétés:`);
      props.rows.forEach(prop => {
        console.log(`     - ${prop.name} (ID: ${prop.id})`);
        console.log(`       User ID: ${prop.user_id}`);
        console.log(`       Créée le: ${prop.created_at}\n`);
      });
    } else {
      console.log('   ❌ Utilisateur non trouvé\n');
    }

    // 3. Vérifier les sessions expirées
    console.log('3️⃣  Sessions expirées:');
    const expiredSessions = await client.query(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE expire < NOW()
    `);
    console.log(`   Total: ${expiredSessions.rows[0].count} session(s) expirée(s)\n`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

debugSession()
  .then(() => {
    console.log('✅ Debug terminé !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec:', error.message);
    process.exit(1);
  });

