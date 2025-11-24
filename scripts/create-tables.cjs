// Script Node.js pour créer les tables dans Supabase
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ SUPABASE_DB_URL ou DATABASE_URL non configuré');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

async function createTables() {
  try {
    console.log('📖 Lecture du script SQL...');
    const sql = fs.readFileSync(path.join(__dirname, 'create-tables.sql'), 'utf8');
    
    console.log('🔧 Création des tables...');
    await pool.query(sql);
    
    console.log('✅ Toutes les tables ont été créées avec succès !');
    
    // Vérifier les tables créées
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Tables existantes:');
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des tables:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Certaines tables existent déjà, c\'est normal.');
    } else {
      console.error(error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

createTables();



