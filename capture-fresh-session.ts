/**
 * CAPTURE FRESH SESSION
 * Ouvre browser, demande connexion manuelle, puis sauvegarde cookies
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const OUTPUT_FILE = path.join(process.cwd(), 'airbnb-session.json');
const AIRBNB_INBOX = 'https://www.airbnb.com/hosting/inbox';

async function captureFreshSession() {
  console.log('🚀 CAPTURE SESSION AIRBNB FRAÎCHE\n');
  console.log('=' .repeat(60));
  console.log('\n📝 INSTRUCTIONS:');
  console.log('   1. Un browser va s\'ouvrir');
  console.log('   2. Connecte-toi à Airbnb avec:');
  console.log('      Email: yolo.laviecbien@gmail.com');
  console.log('      Password: Boss4922');
  console.log('   3. Attends que la page /hosting/inbox charge complètement');
  console.log('   4. Vérifie que tu vois tes conversations');
  console.log('   5. Reviens ici et appuie sur ENTRÉE\n');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  // Ouvrir page Airbnb
  console.log('🌐 Ouverture browser...');
  await page.goto(AIRBNB_INBOX, { waitUntil: 'domcontentloaded' }).catch(() => {
    console.log('⏳ Page en cours de chargement...');
  });
  
  console.log('\n✋ Connecte-toi maintenant dans le browser...');
  console.log('   Appuie sur ENTRÉE quand tu es connecté et que l\'inbox est chargé...\n');
  
  // Attendre input utilisateur
  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Appuie sur ENTRÉE pour continuer...', () => {
      rl.close();
      resolve();
    });
  });
  
  console.log('\n📸 Capture en cours...');
  
  // Capturer URL finale
  const finalUrl = page.url();
  console.log(`   URL finale: ${finalUrl}`);
  
  // Capturer cookies
  const cookies = await context.cookies();
  console.log(`   ${cookies.length} cookies capturés`);
  
  // Vérifier cookies critiques
  const csrfCookie = cookies.find(c => 
    c.name === 'csrf_token' || 
    c.name === '_csrf_token' ||
    c.name.toLowerCase().includes('csrf')
  );
  
  const authCookie = cookies.find(c => 
    c.name === 'auth_token' ||
    c.name === '_airbed_session_id'
  );
  
  // Construire objet session
  const sessionData = {
    cookies: cookies,
    metadata: {
      capturedAt: new Date().toISOString(),
      url: finalUrl,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  };
  
  // Backup ancien fichier si existe
  if (fs.existsSync(OUTPUT_FILE)) {
    const backupFile = OUTPUT_FILE.replace('.json', '-OLD.json');
    fs.copyFileSync(OUTPUT_FILE, backupFile);
    console.log(`   💾 Ancien fichier sauvegardé: ${path.basename(backupFile)}`);
  }
  
  // Sauvegarder nouvelle session
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sessionData, null, 2));
  
  console.log(`\n✅ Session capturée avec succès: ${path.basename(OUTPUT_FILE)}`);
  console.log(`   ${cookies.length} cookies sauvegardés\n`);
  
  // Résumé cookies critiques
  console.log('🔑 COOKIES CRITIQUES:');
  if (csrfCookie) {
    console.log(`   ✅ CSRF token trouvé: ${csrfCookie.name} = ${csrfCookie.value.substring(0, 30)}...`);
  } else {
    console.log(`   ⚠️  CSRF token NON TROUVÉ - Vérifie que tu es bien connecté`);
  }
  
  if (authCookie) {
    console.log(`   ✅ Auth cookie trouvé: ${authCookie.name} = ${authCookie.value.substring(0, 30)}...`);
  } else {
    console.log(`   ⚠️  Auth cookie NON TROUVÉ`);
  }
  
  // Liste tous les cookies
  console.log(`\n📋 TOUS LES COOKIES (${cookies.length}):`);
  cookies.slice(0, 10).forEach(c => {
    const expiresInfo = c.expires && c.expires > 0 
      ? `expire ${new Date(c.expires * 1000).toLocaleDateString()}`
      : 'session';
    console.log(`   - ${c.name} (${expiresInfo})`);
  });
  
  if (cookies.length > 10) {
    console.log(`   ... et ${cookies.length - 10} autres`);
  }
  
  await browser.close();
  
  // Recommandations
  console.log('\n' + '='.repeat(60));
  console.log('\n🎯 PROCHAINES ÉTAPES:');
  console.log('   1. Vérifie les cookies:');
  console.log('      npx tsx check-cookies-expiration.ts\n');
  console.log('   2. Teste le worker:');
  console.log('      npx tsx workers/sync_worker.ts\n');
  console.log('=' .repeat(60));
}

captureFreshSession().catch(error => {
  console.error('\n❌ Erreur:', error);
  process.exit(1);
});
