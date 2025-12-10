import pg from 'pg';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

const { Pool } = pg;

async function executeFixScript() {
  console.log('🔌 Connexion à Supabase...');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
    idleTimeoutMillis: 30000,
    max: 1,
  });

  const client = await pool.connect();

  try {
    console.log('✅ Connecté !\n');

    const sql = readFileSync(resolve(__dirname, 'fix-supabase-tables.sql'), 'utf-8');
    
    // Exécuter le script complet d'un coup
    console.log('📝 Exécution du script SQL...\n');
    
    try {
      await client.query(sql);
      console.log('✅ Script exécuté avec succès !');
    } catch (error) {
      // Si erreur, essayer commande par commande
      console.log('⚠️  Exécution commande par commande...\n');
      const commands = sql.split(';').filter(cmd => cmd.trim().length > 0 && !cmd.trim().startsWith('--'));
      
      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i].trim();
        if (!cmd || cmd.length < 3) continue;
        
        try {
          await client.query(cmd);
          if (cmd.includes('ALTER TABLE')) {
            const match = cmd.match(/ALTER TABLE (\w+)/i);
            if (match) console.log(`✅ Corrigé: ${match[1]}`);
          } else if (cmd.includes('CREATE TABLE')) {
            const match = cmd.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
            if (match) console.log(`✅ Table: ${match[1]}`);
          }
        } catch (err) {
          if (!err.message.includes('already exists') && !err.message.includes('does not exist')) {
            console.error(`❌ Erreur ligne ${i+1}: ${err.message.substring(0, 80)}`);
          }
        }
      }
    }

    console.log('\n🎉 Script terminé !');

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

executeFixScript()
  .then(() => {
    console.log('\n✅ Terminé avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec:', error.message);
    process.exit(1);
  });

