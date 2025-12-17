/**
 * DIAGNOSTIC SCRAPER - Capture HTML pour debug
 */

import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SESSION_FILE = path.join(process.cwd(), 'airbnb-session.json');
const OUTPUT_FILE = path.join(process.cwd(), 'inbox-html-capture.html');
const INBOX_URL = 'https://www.airbnb.com/hosting/inbox';

async function captureInboxHTML() {
  console.log('🚀 Lancement diagnostic...');
  
  const browser = await chromium.launch({ headless: false }); // NON headless pour voir
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  // Load session
  const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
  const cookies = sessionData.cookies || sessionData;
  await context.addCookies(cookies);
  console.log(`✅ ${cookies.length} cookies chargés`);

  // Navigate
  console.log('📡 Navigation vers inbox...');
  await page.goto(INBOX_URL, { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for page to load
  await page.waitForTimeout(5000);

  // Capture URL finale (en cas de redirect)
  const finalUrl = page.url();
  console.log(`📍 URL finale: ${finalUrl}`);

  // Capture screenshot
  await page.screenshot({ path: 'inbox-screenshot.png', fullPage: true });
  console.log('📸 Screenshot: inbox-screenshot.png');

  // Capture HTML
  const html = await page.content();
  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`💾 HTML sauvegardé: ${OUTPUT_FILE} (${html.length} chars)`);

  // Search for conversation patterns
  console.log('\n🔍 Recherche patterns:');
  
  const patterns = [
    /\/hosting\/inbox\/folder\/([a-zA-Z0-9]+)/g,
    /\/hosting\/messages\/([a-zA-Z0-9]+)/g,
    /thread[-_]?id["\s:]+([a-zA-Z0-9]+)/gi,
    /conversation[-_]?id["\s:]+([a-zA-Z0-9]+)/gi
  ];

  for (const pattern of patterns) {
    const matches = [...html.matchAll(pattern)];
    console.log(`   ${pattern}: ${matches.length} matches`);
    if (matches.length > 0) {
      console.log(`      Exemples: ${matches.slice(0, 3).map(m => m[1]).join(', ')}`);
    }
  }

  // Check for specific elements
  const checks = [
    'a[href*="/hosting/inbox"]',
    'a[href*="/hosting/messages"]',
    '[data-testid*="thread"]',
    '[data-testid*="message"]',
    '[role="list"]',
    '[role="listitem"]'
  ];

  console.log('\n🎯 Éléments trouvés:');
  for (const selector of checks) {
    const count = await page.locator(selector).count();
    console.log(`   ${selector}: ${count}`);
  }

  console.log('\n⏸️  Pause 30s pour inspection manuelle...');
  await page.waitForTimeout(30000);

  await browser.close();
  console.log('✅ Diagnostic terminé');
}

captureInboxHTML().catch(console.error);
