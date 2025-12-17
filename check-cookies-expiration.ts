/**
 * CHECK COOKIES EXPIRATION
 * Vérifie si les cookies dans airbnb-session.json sont expirés
 */

import fs from 'fs';
import path from 'path';

const SESSION_FILE = path.join(process.cwd(), 'airbnb-session.json');

function checkCookiesExpiration() {
  console.log('🍪 VÉRIFICATION EXPIRATION COOKIES\n');
  console.log('=' .repeat(60));

  try {
    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    const cookies = sessionData.cookies || sessionData;

    if (!Array.isArray(cookies)) {
      console.error('❌ Format invalide');
      return;
    }

    const now = Date.now() / 1000; // Timestamp en secondes
    let expiredCount = 0;
    let validCount = 0;
    let sessionCount = 0;

    console.log(`\n📊 Total: ${cookies.length} cookies\n`);

    for (const cookie of cookies) {
      const name = cookie.name;
      const expires = cookie.expires;

      if (!expires || expires === -1) {
        // Cookie de session (pas d'expiration)
        console.log(`⏳ SESSION: ${name.padEnd(30)} (expire à la fermeture du browser)`);
        sessionCount++;
      } else if (expires < now) {
        // Cookie expiré
        const expiredDate = new Date(expires * 1000).toISOString();
        const daysAgo = Math.floor((now - expires) / 86400);
        console.log(`❌ EXPIRÉ:  ${name.padEnd(30)} (depuis ${daysAgo} jours - ${expiredDate})`);
        expiredCount++;
      } else {
        // Cookie valide
        const expiresDate = new Date(expires * 1000).toISOString();
        const daysLeft = Math.floor((expires - now) / 86400);
        console.log(`✅ VALIDE:  ${name.padEnd(30)} (expire dans ${daysLeft} jours - ${expiresDate})`);
        validCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📈 RÉSUMÉ:');
    console.log(`   ✅ Valides:  ${validCount} cookies`);
    console.log(`   ❌ Expirés:  ${expiredCount} cookies`);
    console.log(`   ⏳ Session:  ${sessionCount} cookies`);
    console.log(`   📊 Total:    ${cookies.length} cookies`);

    if (expiredCount > 0) {
      console.log('\n⚠️  ATTENTION: Des cookies sont expirés !');
      console.log('   → La session Airbnb est probablement invalide');
      console.log('   → Recommandation: Rafraîchir airbnb-session.json');
    } else {
      console.log('\n✅ Tous les cookies sont valides !');
    }

    // Check cookies critiques
    console.log('\n🔑 COOKIES CRITIQUES:');
    const criticalCookies = ['csrf_token', '_csrf_token', 'auth_token', 'bev', 'everest_cookie'];
    
    for (const criticalName of criticalCookies) {
      const found = cookies.find(c => c.name === criticalName);
      if (found) {
        const status = !found.expires || found.expires > now ? '✅' : '❌';
        console.log(`   ${status} ${criticalName}: ${found.value.substring(0, 30)}...`);
      } else {
        console.log(`   ⚠️  ${criticalName}: NON TROUVÉ`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkCookiesExpiration();
