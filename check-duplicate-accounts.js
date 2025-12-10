import pg from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

const { Pool } = pg;

async function checkDuplicateAccounts() {
  console.log('🔌 Connexion à Supabase...');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
  });

  const client = await pool.connect();

  try {
    console.log('✅ Connecté !\n');

    // 1. Vérifier les comptes en double
    console.log('🔍 Recherche des comptes en double...\n');
    const duplicates = await client.query(`
      SELECT email, COUNT(*) as count, array_agg(id) as user_ids, array_agg(role) as roles
      FROM users
      GROUP BY email
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    if (duplicates.rows.length > 0) {
      console.log('⚠️  COMPTES EN DOUBLE TROUVÉS :\n');
      for (const dup of duplicates.rows) {
        console.log(`   Email: ${dup.email}`);
        console.log(`   Nombre de comptes: ${dup.count}`);
        console.log(`   IDs: ${dup.user_ids.join(', ')}`);
        console.log(`   Rôles: ${dup.roles.join(', ')}\n`);
      }
    } else {
      console.log('✅ Aucun compte en double trouvé.\n');
    }

    // 2. Vérifier les propriétés pour nguilane.fall@gmail.com
    console.log('🔍 Recherche des propriétés pour nguilane.fall@gmail.com...\n');
    const userProps = await client.query(`
      SELECT u.id, u.email, u.role, COUNT(p.id) as property_count
      FROM users u
      LEFT JOIN properties p ON p.user_id = u.id
      WHERE u.email = 'nguilane.fall@gmail.com'
      GROUP BY u.id, u.email, u.role
    `);

    if (userProps.rows.length > 0) {
      console.log('📋 Comptes trouvés :\n');
      for (const user of userProps.rows) {
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Rôle: ${user.role}`);
        console.log(`   Propriétés: ${user.property_count}\n`);
      }

      // Afficher les propriétés détaillées
      if (userProps.rows.length > 0) {
        const userId = userProps.rows[0].id;
        const properties = await client.query(`
          SELECT id, name, created_at
          FROM properties
          WHERE user_id = $1
          ORDER BY created_at DESC
        `, [userId]);

        if (properties.rows.length > 0) {
          console.log('   Propriétés associées :');
          for (const prop of properties.rows) {
            console.log(`     - ${prop.name} (ID: ${prop.id})`);
          }
        } else {
          console.log('   ⚠️  Aucune propriété associée à ce compte');
        }
      }
    } else {
      console.log('❌ Aucun compte trouvé avec cet email.\n');
    }

    // 3. Vérifier toutes les propriétés
    console.log('\n🔍 Toutes les propriétés dans la base :\n');
    const allProps = await client.query(`
      SELECT p.id, p.name, u.email, u.id as user_id, p.created_at
      FROM properties p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `);

    if (allProps.rows.length > 0) {
      for (const prop of allProps.rows) {
        console.log(`   - ${prop.name}`);
        console.log(`     Propriétaire: ${prop.email || 'AUCUN'} (ID: ${prop.user_id || 'NULL'})`);
        console.log(`     Créée le: ${prop.created_at}\n`);
      }
    } else {
      console.log('   Aucune propriété dans la base.\n');
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkDuplicateAccounts()
  .then(() => {
    console.log('✅ Vérification terminée !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec:', error.message);
    process.exit(1);
  });

