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

async function resetPasswords() {
  console.log('🔌 Connexion à Supabase...');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
  });

  const client = await pool.connect();

  try {
    console.log('✅ Connecté !\n');

    // Mots de passe simples
    const adminPassword = 'Admin123!';
    const cleanerPassword = 'Cleaner123!';
    
    // Hasher les mots de passe
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const cleanerHash = await bcrypt.hash(cleanerPassword, 10);

    console.log('🔑 Réinitialisation des mots de passe...\n');

    // Trouver ou créer le compte admin
    const adminEmail = 'nguilane.fall@gmail.com';
    let adminResult = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [adminEmail]
    );

    if (adminResult.rows.length > 0) {
      await client.query(
        'UPDATE users SET password = $1, role = $2 WHERE email = $3',
        [adminHash, 'host', adminEmail]
      );
      console.log(`✅ Compte admin mis à jour: ${adminEmail}`);
    } else {
      const newAdmin = await client.query(
        'INSERT INTO users (email, password, role, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, email',
        [adminEmail, adminHash, 'host', 'Admin', 'User']
      );
      console.log(`✅ Compte admin créé: ${adminEmail}`);
    }

    // Trouver ou créer le compte cleaner
    const cleanerEmail = 'nguilane.fall2@gmail.com';
    let cleanerResult = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [cleanerEmail]
    );

    if (cleanerResult.rows.length > 0) {
      await client.query(
        'UPDATE users SET password = $1, role = $2 WHERE email = $3',
        [cleanerHash, 'cleaning_agent', cleanerEmail]
      );
      console.log(`✅ Compte cleaner mis à jour: ${cleanerEmail}`);
    } else {
      const newCleaner = await client.query(
        'INSERT INTO users (email, password, role, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, email',
        [cleanerEmail, cleanerHash, 'cleaning_agent', 'Marie', 'Dupont']
      );
      console.log(`✅ Compte cleaner créé: ${cleanerEmail}`);
    }

    console.log('\n📋 MOTS DE PASSE :');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👤 Compte Admin (Hôte):`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Mot de passe: ${adminPassword}`);
    console.log('');
    console.log(`🧹 Compte Agent de Ménage:`);
    console.log(`   Email: ${cleanerEmail}`);
    console.log(`   Mot de passe: ${cleanerPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetPasswords()
  .then(() => {
    console.log('✅ Terminé avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec:', error.message);
    process.exit(1);
  });

