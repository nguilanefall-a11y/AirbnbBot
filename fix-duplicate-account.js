import pg from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

const { Pool } = pg;

async function fixDuplicateAccount() {
  console.log('🔍 Recherche des comptes en double pour nguilane.fall@gmail.com...\n');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
  });

  const client = await pool.connect();

  try {
    // 1. Trouver tous les comptes avec cet email
    const duplicates = await client.query(`
      SELECT 
        u.id,
        u.email,
        u.created_at,
        u.role,
        COUNT(p.id) as property_count,
        array_agg(p.id) as property_ids,
        array_agg(p.name) as property_names
      FROM users u
      LEFT JOIN properties p ON p.user_id = u.id
      WHERE u.email = 'nguilane.fall@gmail.com'
      GROUP BY u.id, u.email, u.created_at, u.role
      ORDER BY u.created_at ASC
    `);

    if (duplicates.rows.length === 0) {
      console.log('❌ Aucun compte trouvé avec cet email.\n');
      return;
    }

    console.log(`📋 ${duplicates.rows.length} compte(s) trouvé(s) :\n`);
    
    duplicates.rows.forEach((account, index) => {
      console.log(`${index + 1}. Compte ID: ${account.id}`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Rôle: ${account.role}`);
      console.log(`   Créé le: ${account.created_at}`);
      console.log(`   Propriétés: ${account.property_count}`);
      if (account.property_count > 0) {
        console.log(`   Noms des propriétés: ${account.property_names.filter(Boolean).join(', ')}`);
      }
      console.log('');
    });

    // 2. Identifier le compte avec propriétés (ancien) et celui sans (nouveau)
    const accountWithProperties = duplicates.rows.find(a => parseInt(a.property_count) > 0);
    const accountWithoutProperties = duplicates.rows.find(a => parseInt(a.property_count) === 0);

    if (!accountWithProperties) {
      console.log('⚠️  Aucun compte avec propriétés trouvé. Aucune action nécessaire.\n');
      return;
    }

    if (!accountWithoutProperties) {
      console.log('✅ Aucun compte vide trouvé. Pas de doublon à nettoyer.\n');
      return;
    }

    console.log('🔧 CORRECTION :\n');
    console.log(`   ✅ Compte à CONSERVER : ${accountWithProperties.id} (${accountWithProperties.property_count} propriétés)`);
    console.log(`   ❌ Compte à SUPPRIMER : ${accountWithoutProperties.id} (0 propriété)\n`);

    // 3. Vérifier s'il y a d'autres données associées au compte à supprimer
    const otherData = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM conversations WHERE property_id IN (SELECT id FROM properties WHERE user_id = $1)) as conversations,
        (SELECT COUNT(*) FROM bookings WHERE property_id IN (SELECT id FROM properties WHERE user_id = $1)) as bookings,
        (SELECT COUNT(*) FROM cleaning_tasks WHERE property_id IN (SELECT id FROM properties WHERE user_id = $1)) as cleaning_tasks
    `, [accountWithoutProperties.id]);

    // 4. Supprimer le compte vide
    console.log('🗑️  Suppression du compte vide...');
    
    // D'abord, supprimer les sessions associées
    await client.query(`
      DELETE FROM sessions 
      WHERE sess->>'passport' LIKE $1
    `, [`%${accountWithoutProperties.id}%`]);
    console.log('   ✅ Sessions supprimées');

    // Ensuite, supprimer le compte
    await client.query(`DELETE FROM users WHERE id = $1`, [accountWithoutProperties.id]);
    console.log(`   ✅ Compte ${accountWithoutProperties.id} supprimé\n`);

    // 5. Vérification finale
    const remaining = await client.query(`
      SELECT id, email, COUNT(p.id) as property_count
      FROM users u
      LEFT JOIN properties p ON p.user_id = u.id
      WHERE u.email = 'nguilane.fall@gmail.com'
      GROUP BY u.id, u.email
    `);

    console.log('📊 VÉRIFICATION FINALE :\n');
    if (remaining.rows.length === 1) {
      console.log('✅ SUCCÈS ! Un seul compte reste :');
      console.log(`   ID: ${remaining.rows[0].id}`);
      console.log(`   Email: ${remaining.rows[0].email}`);
      console.log(`   Propriétés: ${remaining.rows[0].property_count}\n`);
      
      // Afficher les propriétés
      const props = await client.query(`
        SELECT id, name FROM properties WHERE user_id = $1 ORDER BY created_at DESC
      `, [remaining.rows[0].id]);
      
      if (props.rows.length > 0) {
        console.log('   Propriétés associées :');
        props.rows.forEach(prop => {
          console.log(`     - ${prop.name} (${prop.id})`);
        });
      }
    } else {
      console.log('⚠️  Plusieurs comptes restent. Vérification manuelle nécessaire.\n');
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixDuplicateAccount()
  .then(() => {
    console.log('\n✅ Correction terminée !');
    console.log('💡 Vous pouvez maintenant vous connecter avec votre compte original.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec:', error.message);
    process.exit(1);
  });

