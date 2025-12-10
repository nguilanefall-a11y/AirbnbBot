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

async function setupDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000
  });

  try {
    console.log('🔌 Connexion à Neon...');
    await client.connect();
    console.log('✅ Connecté !\n');

    console.log('📖 Lecture du script SQL...');
    const sql = readFileSync(resolve(__dirname, 'create-tables-neon.sql'), 'utf-8');
    
    // Diviser le script en commandes individuelles
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Exécution de ${commands.length} commandes...\n`);

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      if (cmd.includes('CREATE TABLE') || cmd.includes('CREATE INDEX') || cmd.includes('CREATE EXTENSION')) {
        try {
          await client.query(cmd);
          const tableName = cmd.match(/CREATE (?:TABLE|INDEX|EXTENSION) (?:IF NOT EXISTS )?(\w+)/i)?.[1] || 'objet';
          console.log(`✅ ${tableName}`);
        } catch (error) {
          // Ignorer les erreurs "already exists"
          if (!error.message.includes('already exists')) {
            console.error(`❌ Erreur: ${error.message.substring(0, 80)}`);
          }
        }
      } else if (cmd.includes('SELECT')) {
        // Exécuter les SELECT pour voir le résultat
        const result = await client.query(cmd);
        if (result.rows.length > 0) {
          console.log(`\n${result.rows[0].status || '✅ Succès'}\n`);
        }
      }
    }

    console.log('\n🎉 Base de données configurée avec succès !');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('\n💡 Essayez d\'exécuter le script manuellement dans Neon SQL Editor');
    process.exit(1);
  }
}

setupDatabase();

