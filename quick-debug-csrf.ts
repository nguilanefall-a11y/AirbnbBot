/**
 * QUICK DIAGNOSTIC - Capture HTML + cookies pour debug CSRF
 */

import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SESSION_FILE = path.join(process.cwd(), 'airbnb-session.json');
const INBOX_URL = 'https://www.airbnb.com/hosting/inbox';

async function quickDebug() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Load cookies
  const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
  await context.addCookies(sessionData.cookies);
  
  const page = await context.newPage();
  
  console.log('📡 Navigation...');
  await page.goto(INBOX_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  console.log('📍 URL finale:', page.url());
  
  // Extract HTML
  const html = await page.content();
  fs.writeFileSync('debug-html.html', html);
  console.log('💾 HTML sauvegardé (', html.length, 'chars)');
  
  // Search CSRF
  console.log('\n🔍 Recherche CSRF token:');
  
  // 1. Meta tag
  const metaMatches = html.match(/<meta[^>]+name=["']csrf[^"']*["'][^>]*>/gi);
  console.log('Meta tags CSRF:', metaMatches || 'Aucun');
  
  // 2. Window variables
  const windowMatches = html.match(/csrf[_-]?token["'\s:=]+["']([^"']+)["']/gi);
  console.log('Window CSRF vars:', windowMatches?.slice(0, 3) || 'Aucun');
  
  // 3. Cookies
  const cookies = await context.cookies();
  const csrfCookies = cookies.filter(c => c.name.toLowerCase().includes('csrf'));
  console.log('CSRF cookies:', csrfCookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`));
  
  // 4. All cookies
  console.log('\n🍪 Tous les cookies:');
  cookies.forEach(c => {
    console.log(`   ${c.name}: ${c.value.substring(0, 30)}...`);
  });
  
  // 5. Check for API key
  const apiKeyMatches = html.match(/["']?api[_-]?key["']?\s*[:=]\s*["']([a-z0-9]{20,})["']/gi);
  console.log('\n🔑 API Keys trouvées:', apiKeyMatches?.slice(0, 2) || 'Aucune');
  
  await browser.close();
}

quickDebug().catch(console.error);
