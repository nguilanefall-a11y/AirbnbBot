// Script de migration pour Supabase
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Connexion à Supabase...');
    await client.connect();
    console.log('✅ Connecté!');

    console.log('📦 Lecture du script de migration...');
    const sql = fs.readFileSync('./migrate-db.sql', 'utf8');

    console.log('🚀 Exécution de la migration...');
    const result = await client.query(sql);
    console.log('✅ Migration terminée avec succès!');
    
    // Vérifier les tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('\n📋 Tables existantes:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Vérifier les colonnes de bookings
    const bookingCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bookings'
      ORDER BY ordinal_position;
    `);
    console.log('\n📋 Colonnes de bookings:');
    bookingCols.rows.forEach(row => console.log(`  - ${row.column_name}`));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
    // Essayer d'exécuter les commandes une par une
    console.log('\n🔄 Tentative d\'exécution individuelle...');
    const commands = [
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS access_key VARCHAR UNIQUE DEFAULT substring(md5(random()::text), 1, 12)`,
      `ALTER TABLE property_assignments ADD COLUMN IF NOT EXISTS can_view_calendar BOOLEAN DEFAULT true`,
      `ALTER TABLE property_assignments ADD COLUMN IF NOT EXISTS can_add_notes BOOLEAN DEFAULT true`,
      `ALTER TABLE property_assignments ADD COLUMN IF NOT EXISTS can_manage_tasks BOOLEAN DEFAULT true`,
      `ALTER TABLE cleaning_notes ADD COLUMN IF NOT EXISTS cleaning_task_id VARCHAR`,
      `ALTER TABLE special_requests ADD COLUMN IF NOT EXISTS response_message TEXT`,
      `ALTER TABLE ical_sync_logs ADD COLUMN IF NOT EXISTS sync_status VARCHAR DEFAULT 'pending'`,
      `ALTER TABLE ical_sync_logs ADD COLUMN IF NOT EXISTS bookings_imported VARCHAR DEFAULT '0'`,
      `ALTER TABLE ical_sync_logs ADD COLUMN IF NOT EXISTS bookings_updated VARCHAR DEFAULT '0'`,
      `ALTER TABLE ical_sync_logs ADD COLUMN IF NOT EXISTS error_message TEXT`,
    ];

    for (const cmd of commands) {
      try {
        await client.query(cmd);
        console.log(`  ✅ ${cmd.substring(0, 60)}...`);
      } catch (e) {
        console.log(`  ⚠️ ${e.message.substring(0, 60)}...`);
      }
    }
  } finally {
    await client.end();
  }
}

runMigration();

