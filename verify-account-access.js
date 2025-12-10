import pg from 'pg';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

const { Pool } = pg;

async function verifyAccountAccess() {
  console.log('🔍 Vérification de l\'accès au compte...\n');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
  });

  const client = await pool.connect();

  try {
    const email = 'nguilane.fall@gmail.com';
    const testPassword = 'Admin123!';

    // 1. Trouver le compte
    const userResult = await client.query(`
      SELECT id, email, password, role, created_at
      FROM users
      WHERE email = $1
    `, [email]);

    if (userResult.rows.length === 0) {
      console.log('❌ Aucun compte trouvé avec cet email.\n');
      return;
    }

    const user = userResult.rows[0];
    console.log('📋 Compte trouvé :');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rôle: ${user.role}`);
    console.log(`   Créé le: ${user.created_at}\n`);

    // 2. Vérifier le mot de passe
    console.log('🔐 Vérification du mot de passe...');
    let passwordValid = false;
    
    if (user.password.startsWith('$2')) {
      // Bcrypt
      passwordValid = await bcrypt.compare(testPassword, user.password);
    } else {
      // Legacy scrypt (ne peut pas être testé facilement ici)
      console.log('   ⚠️  Mot de passe en format legacy (scrypt)');
      passwordValid = false; // On ne peut pas tester scrypt facilement
    }

    if (passwordValid) {
      console.log('   ✅ Mot de passe valide avec "Admin123!"\n');
    } else {
      console.log('   ❌ Mot de passe ne correspond pas à "Admin123!"\n');
      console.log('   💡 Le mot de passe sera réinitialisé...\n');
      
      // Réinitialiser le mot de passe
      const newHash = await bcrypt.hash(testPassword, 10);
      await client.query(`
        UPDATE users SET password = $1 WHERE id = $2
      `, [newHash, user.id]);
      
      console.log('   ✅ Mot de passe réinitialisé à "Admin123!"\n');
    }

    // 3. Vérifier les propriétés
    const propertiesResult = await client.query(`
      SELECT id, name, user_id
      FROM properties
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [user.id]);

    console.log(`📦 Propriétés associées : ${propertiesResult.rows.length}`);
    propertiesResult.rows.forEach(prop => {
      console.log(`   - ${prop.name} (${prop.id})`);
    });
    console.log('');

    // 4. Vérifier les sessions
    const sessionsResult = await client.query(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE sess->>'passport' LIKE $1 AND expire > NOW()
    `, [`%${user.id}%`]);

    console.log(`🔐 Sessions actives : ${sessionsResult.rows[0].count}\n`);

    // 5. Résumé
    console.log('✅ RÉSUMÉ :');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Compte : ${user.email}`);
    console.log(`   ID : ${user.id}`);
    console.log(`   Mot de passe : Admin123!`);
    console.log(`   Propriétés : ${propertiesResult.rows.length}`);
    console.log(`   Sessions actives : ${sessionsResult.rows[0].count}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 Vous pouvez maintenant vous connecter avec :');
    console.log(`   Email : ${email}`);
    console.log(`   Mot de passe : Admin123!\n`);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifyAccountAccess()
  .then(() => {
    console.log('✅ Vérification terminée !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec:', error.message);
    process.exit(1);
  });

