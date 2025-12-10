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

    console.log('📖 Lecture du script SQL...');
    const sql = readFileSync(resolve(__dirname, 'fix-supabase-tables.sql'), 'utf-8');
    
    // Diviser en commandes
    const commands = [];
    let current = '';
    let inDoBlock = false;
    let doDepth = 0;
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const next3 = sql.substring(i, i + 3);
      
      if (next3 === 'DO ' && !inDoBlock) {
        inDoBlock = true;
        doDepth = 1;
        current += 'DO ';
        i += 2;
        continue;
      }
      
      if (inDoBlock) {
        current += char;
        if (next3 === '$$' && sql[i - 1] !== '$') {
          if (sql[i + 2] === ';') {
            doDepth--;
            if (doDepth === 0) {
              current += '$$;';
              commands.push(current.trim());
              current = '';
              inDoBlock = false;
              i += 2;
              continue;
            }
          } else {
            doDepth++;
          }
        }
        continue;
      }
      
      if (char === ';' && !inDoBlock) {
        current += char;
        if (current.trim().length > 0 && !current.trim().startsWith('--')) {
          commands.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim().length > 0) {
      commands.push(current.trim());
    }

    console.log(`📝 Exécution de ${commands.length} commandes...\n`);

    let success = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i].trim();
      
      if (!cmd || cmd.startsWith('--') || cmd.length < 3) {
        continue;
      }

      try {
        await client.query(cmd);
        
        if (cmd.includes('ALTER TABLE')) {
          const match = cmd.match(/ALTER TABLE (\w+)/i);
          if (match) {
            console.log(`✅ Corrigé: ${match[1]}`);
            success++;
          }
        } else if (cmd.includes('CREATE TABLE')) {
          const match = cmd.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
          if (match) {
            console.log(`✅ Table: ${match[1]}`);
            success++;
          }
        } else if (cmd.includes('CREATE INDEX')) {
          // Ignorer silencieusement les index
        } else if (cmd.includes('DO $$')) {
          // Les blocs DO sont silencieux
        }
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('relation already exists') ||
            error.message.includes('does not exist')) {
          skipped++;
        } else {
          console.error(`❌ Erreur: ${error.message.substring(0, 100)}`);
          errors++;
        }
      }
    }

    console.log(`\n✅ ${success} opérations réussies`);
    if (skipped > 0) console.log(`⏭️  ${skipped} déjà existants (ignorés)`);
    if (errors > 0) console.log(`❌ ${errors} erreurs`);
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

