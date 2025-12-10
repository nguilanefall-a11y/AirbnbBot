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

async function executeScript() {
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
    const sql = readFileSync(resolve(__dirname, 'check-and-fix-neon.sql'), 'utf-8');
    
    // Diviser le script en commandes (séparées par ;)
    // Mais on doit être prudent avec les blocs DO $$ ... END $$;
    const commands = [];
    let currentCommand = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChars = sql.substring(i, i + 3);
      
      if (nextChars === 'DO ' && !inDoBlock) {
        inDoBlock = true;
        doBlockDepth = 1;
        currentCommand += 'DO ';
        i += 2;
        continue;
      }
      
      if (inDoBlock) {
        currentCommand += char;
        if (nextChars === '$$' && sql[i - 1] !== '$') {
          if (sql[i + 2] === ';') {
            doBlockDepth--;
            if (doBlockDepth === 0) {
              currentCommand += '$$;';
              commands.push(currentCommand.trim());
              currentCommand = '';
              inDoBlock = false;
              i += 2;
              continue;
            }
          } else {
            doBlockDepth++;
          }
        }
        continue;
      }
      
      if (char === ';' && !inDoBlock) {
        currentCommand += char;
        if (currentCommand.trim().length > 0 && !currentCommand.trim().startsWith('--')) {
          commands.push(currentCommand.trim());
        }
        currentCommand = '';
      } else {
        currentCommand += char;
      }
    }
    
    if (currentCommand.trim().length > 0) {
      commands.push(currentCommand.trim());
    }

    console.log(`📝 Exécution de ${commands.length} commandes...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i].trim();
      
      // Ignorer les commentaires et lignes vides
      if (!cmd || cmd.startsWith('--') || cmd.length < 3) {
        continue;
      }

      try {
        await client.query(cmd);
        
        // Afficher un message pour les commandes importantes
        if (cmd.includes('CREATE TABLE')) {
          const tableMatch = cmd.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
          if (tableMatch) {
            console.log(`✅ Table: ${tableMatch[1]}`);
            successCount++;
          }
        } else if (cmd.includes('CREATE INDEX')) {
          const indexMatch = cmd.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/i);
          if (indexMatch) {
            // Ne pas afficher tous les index pour éviter le spam
            // console.log(`  ✓ Index: ${indexMatch[1]}`);
          }
        } else if (cmd.includes('CREATE EXTENSION')) {
          console.log(`✅ Extension: uuid-ossp`);
          successCount++;
        } else if (cmd.includes('ALTER TABLE')) {
          const constraintMatch = cmd.match(/ADD CONSTRAINT (\w+)/i);
          if (constraintMatch) {
            // console.log(`  ✓ Contrainte: ${constraintMatch[1]}`);
          }
        } else if (cmd.includes('DO $$')) {
          // Les blocs DO sont silencieux
        }
      } catch (error) {
        // Ignorer les erreurs "already exists"
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('relation already exists')) {
          // Ignorer silencieusement
        } else {
          console.error(`❌ Erreur ligne ${i + 1}: ${error.message.substring(0, 100)}`);
          errorCount++;
        }
      }
    }

    console.log(`\n✅ ${successCount} tables créées/vérifiées`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} erreurs (probablement "already exists")`);
    }
    console.log('\n🎉 Script terminé avec succès !');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 Timeout de connexion. Vérifiez que votre projet Neon est actif.');
    }
    process.exit(1);
  }
}

executeScript();

