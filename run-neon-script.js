import pg from 'pg';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env') });

const { Client } = pg;

async function runScript() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000
  });

  try {
    console.log('🔌 Connexion à Neon...');
    await client.connect();
    console.log('✅ Connecté !\n');

    console.log('📖 Lecture du script SQL...');
    const sql = readFileSync(resolve(__dirname, 'create-tables-neon-final.sql'), 'utf-8');
    
    // Exécuter le script complet
    console.log('📝 Exécution du script...\n');
    
    try {
      await client.query(sql);
      console.log('✅ Script exécuté avec succès !');
    } catch (error) {
      // Si erreur, essayer commande par commande
      if (error.message.includes('multiple statements')) {
        console.log('⚠️  Exécution commande par commande...\n');
        const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);
        
        for (let i = 0; i < commands.length; i++) {
          const cmd = commands[i].trim();
          if (cmd && !cmd.startsWith('--')) {
            try {
              await client.query(cmd);
              if (cmd.includes('CREATE TABLE')) {
                const match = cmd.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
                if (match) console.log(`✅ Table: ${match[1]}`);
              }
            } catch (err) {
              if (!err.message.includes('already exists')) {
                console.error(`❌ Erreur: ${err.message.substring(0, 80)}`);
              }
            }
          }
        }
      } else {
        throw error;
      }
    }

    console.log('\n🎉 Toutes les tables ont été créées !');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 Timeout. Vérifiez que votre projet Neon est actif.');
    }
    process.exit(1);
  }
}

runScript();

