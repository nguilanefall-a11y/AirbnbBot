import pg from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

const { Pool } = pg;

async function validateDataConsistency() {
  console.log('🔍 Validation de la cohérence des données...\n');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
  });

  const client = await pool.connect();

  try {
    const issues = [];

    // 1. Vérifier les comptes en double
    console.log('1️⃣  Vérification des comptes en double...');
    const duplicates = await client.query(`
      SELECT email, COUNT(*) as count, array_agg(id) as user_ids
      FROM users
      GROUP BY email
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length > 0) {
      issues.push({
        type: 'DUPLICATE_EMAILS',
        count: duplicates.rows.length,
        details: duplicates.rows
      });
      console.log(`   ❌ ${duplicates.rows.length} email(s) en double trouvé(s)`);
      duplicates.rows.forEach(dup => {
        console.log(`      - ${dup.email}: ${dup.count} compte(s) (IDs: ${dup.user_ids.join(', ')})`);
      });
    } else {
      console.log('   ✅ Aucun compte en double');
    }

    // 2. Vérifier les propriétés orphelines (sans propriétaire)
    console.log('\n2️⃣  Vérification des propriétés orphelines...');
    const orphanProperties = await client.query(`
      SELECT p.id, p.name, p.user_id
      FROM properties p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE u.id IS NULL
    `);
    
    if (orphanProperties.rows.length > 0) {
      issues.push({
        type: 'ORPHAN_PROPERTIES',
        count: orphanProperties.rows.length,
        details: orphanProperties.rows
      });
      console.log(`   ❌ ${orphanProperties.rows.length} propriété(s) orpheline(s) trouvée(s)`);
      orphanProperties.rows.forEach(prop => {
        console.log(`      - ${prop.name} (ID: ${prop.id}, user_id: ${prop.user_id})`);
      });
    } else {
      console.log('   ✅ Aucune propriété orpheline');
    }

    // 3. Vérifier les réservations orphelines
    console.log('\n3️⃣  Vérification des réservations orphelines...');
    const orphanBookings = await client.query(`
      SELECT b.id, b.guest_name, b.property_id
      FROM bookings b
      LEFT JOIN properties p ON p.id = b.property_id
      WHERE p.id IS NULL
    `);
    
    if (orphanBookings.rows.length > 0) {
      issues.push({
        type: 'ORPHAN_BOOKINGS',
        count: orphanBookings.rows.length,
        details: orphanBookings.rows
      });
      console.log(`   ❌ ${orphanBookings.rows.length} réservation(s) orpheline(s) trouvée(s)`);
    } else {
      console.log('   ✅ Aucune réservation orpheline');
    }

    // 4. Vérifier les conversations orphelines
    console.log('\n4️⃣  Vérification des conversations orphelines...');
    const orphanConversations = await client.query(`
      SELECT c.id, c.guest_name, c.property_id
      FROM conversations c
      LEFT JOIN properties p ON p.id = c.property_id
      WHERE p.id IS NULL
    `);
    
    if (orphanConversations.rows.length > 0) {
      issues.push({
        type: 'ORPHAN_CONVERSATIONS',
        count: orphanConversations.rows.length,
        details: orphanConversations.rows
      });
      console.log(`   ❌ ${orphanConversations.rows.length} conversation(s) orpheline(s) trouvée(s)`);
    } else {
      console.log('   ✅ Aucune conversation orpheline');
    }

    // 5. Vérifier les sessions expirées
    console.log('\n5️⃣  Vérification des sessions expirées...');
    const expiredSessions = await client.query(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE expire < NOW()
    `);
    
    const expiredCount = parseInt(expiredSessions.rows[0].count);
    if (expiredCount > 0) {
      console.log(`   ⚠️  ${expiredCount} session(s) expirée(s) (nettoyage recommandé)`);
    } else {
      console.log('   ✅ Aucune session expirée');
    }

    // Résumé
    console.log('\n📊 RÉSUMÉ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (issues.length === 0) {
      console.log('✅ Aucun problème de cohérence détecté !');
    } else {
      console.log(`❌ ${issues.length} type(s) de problème(s) détecté(s):`);
      issues.forEach(issue => {
        console.log(`   - ${issue.type}: ${issue.count} occurrence(s)`);
      });
      console.log('\n💡 Actions recommandées:');
      console.log('   1. Exécutez cleanup-sessions.sql pour nettoyer les sessions');
      console.log('   2. Vérifiez manuellement les données orphelines');
      console.log('   3. Supprimez ou réassignez les données orphelines');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de la validation:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

validateDataConsistency()
  .then(() => {
    console.log('✅ Validation terminée !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec de la validation:', error.message);
    process.exit(1);
  });

