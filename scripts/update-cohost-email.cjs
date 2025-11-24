require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ No SUPABASE_DB_URL or DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

async function updateEmail() {
  const newEmail = process.argv[2];
  const userEmail = process.argv[3];
  if (!newEmail || !userEmail) {
    console.error('Usage: node scripts/update-cohost-email.cjs <newCohostEmail> <userEmail>');
    process.exit(1);
  }
  try {
    const res = await pool.query(
      'UPDATE users SET airbnb_cohost_email = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email, airbnb_cohost_email',
      [newEmail, userEmail],
    );
    if (res.rows.length === 0) {
      console.log('⚠️ Aucun utilisateur trouvé avec cet email');
    } else {
      console.log('✅ Mis à jour:', res.rows[0]);
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  } finally {
    await pool.end();
  }
}

updateEmail();
