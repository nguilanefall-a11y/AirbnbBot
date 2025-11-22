import type { InsertProperty } from "@shared/schema";

export type ScrapeOptions = {
  cookiesHeader?: string; // raw Cookie header string
  timeoutMs?: number;
};

export async function scrapeAirbnbWithPlaywright(urlString: string, options: ScrapeOptions = {}): Promise<Partial<InsertProperty>> {
  const enabled = process.env.PLAYWRIGHT_ENABLED === '1';
  if (!enabled) throw new Error("Playwright disabled. Set PLAYWRIGHT_ENABLED=1 to enable rendered fetch.");

  const { cookiesHeader, timeoutMs = 60000 } = options; // Increased default timeout to 60s
  // Dynamic import to avoid hard dependency when disabled
  // @ts-ignore
  const { chromium } = await import('playwright');
  const url = new URL(urlString);

  let browser: any = null;
  try {
    // Launch browser with stealth settings to avoid detection
    browser = await chromium.launch({ 
      headless: true, 
      timeout: timeoutMs, // Timeout for browser launch
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ]
    });
  } catch (launchError: any) {
    console.error("Failed to launch browser:", launchError?.message);
    throw new Error(`Failed to launch browser: ${launchError?.message || "Unknown error"}`);
  }
  
  try {
    // Create context with realistic browser fingerprint
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
      permissions: ['geolocation'],
      geolocation: { latitude: 48.8566, longitude: 2.3522 }, // Paris coordinates
      colorScheme: 'light' as const,
      // Additional headers to look more like a real browser
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
    });
    
    // Override webdriver property to avoid detection
    await context.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      
      // Override chrome runtime
      (window as any).chrome = {
        runtime: {},
      };
      
      // Override permissions
      const originalQuery = (window.navigator as any).permissions.query;
      (window.navigator as any).permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
      
      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['fr-FR', 'fr', 'en-US', 'en'],
      });
    });

    if (cookiesHeader) {
      const cookiePairs = cookiesHeader.replace(/^cookie:\s*/i, '').split(';').map(p => p.trim()).filter(Boolean);
      const cookies = cookiePairs.map(pair => {
        const [name, ...rest] = pair.split('=');
        const value = rest.join('=');
        return { name, value, domain: '.' + url.hostname.replace(/^www\./, ''), path: '/' } as any;
      });
      if (cookies.length) await context.addCookies(cookies);
    }

    const page = await context.newPage();
    
    // Navigate with realistic behavior
    await page.goto(url.toString(), { 
      waitUntil: 'networkidle',
      timeout: timeoutMs 
    });
    
    // Wait for page to be fully loaded
    await page.waitForTimeout(3000);
    
    // Scroll to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);
    
    // Wait for content to load
    try {
      await Promise.race([
        page.waitForSelector('h1', { timeout: 10000 }),
        page.waitForSelector('[data-section-id]', { timeout: 10000 }),
        page.waitForSelector('[data-testid]', { timeout: 10000 }),
        page.waitForSelector('script[id="__NEXT_DATA__"]', { timeout: 10000 }),
      ]);
    } catch (e) {
      console.warn("Some selectors not found, continuing anyway");
    }
    
    // Wait for network to be idle
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (e) {
      // Continue even if network is not idle
    }

    // Try to read embedded state if present (Airbnb uses Next.js)
    const stateJson = await page.evaluate(() => {
      // Try __NEXT_DATA__ first (most reliable for Next.js apps)
      const nextData = document.querySelector('script[id="__NEXT_DATA__"]');
      if (nextData && nextData.textContent && nextData.textContent.length > 500) {
        return nextData.textContent;
      }
      
      // Try other script tags
      const scripts = Array.from(document.querySelectorAll('script[type="application/json"], script[id*="data"], script[id*="state"]')) as HTMLScriptElement[];
      for (const s of scripts) {
        const txt = s.textContent || '';
        if (txt.length > 500) {
          return txt;
        }
      }
      
      // Last resort: search all scripts for Airbnb data
      const allScripts = Array.from(document.querySelectorAll('script')) as HTMLScriptElement[];
      for (const s of allScripts) {
        const txt = s.textContent || '';
        // Look for large JSON objects that might contain listing data
        if (txt.length > 1000 && (
          txt.includes('listing') || 
          txt.includes('property') || 
          txt.includes('airbnb') ||
          txt.includes('pdp_listing_detail') ||
          txt.includes('bootstrapData')
        )) {
          return txt;
        }
      }
      
      return null;
    });
    
    // Also try to get visible text content for AI extraction
    const visibleText = await page.evaluate(() => {
      // Get all visible text, excluding scripts and styles
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const style = window.getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden') {
              return NodeFilter.FILTER_REJECT;
            }
            if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      const texts: string[] = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim();
        if (text && text.length > 3) {
          texts.push(text);
        }
      }
      return texts.join('\n');
    });

    // Get text content (already extracted above as visibleText)

    const extracted: Partial<InsertProperty> = {};

    // Attempt to parse embedded JSON first (most reliable)
    if (stateJson) {
      try {
        // Try to parse as JSON directly first
        let maybeObj: any = null;
        try {
          maybeObj = JSON.parse(stateJson);
        } catch {
          // If direct parse fails, try to extract JSON object
          maybeObj = tryExtractFirstJsonObject(stateJson);
        }
        
        if (maybeObj) {
          mapFromEmbeddedJson(maybeObj, extracted);
        }
      } catch (e) {
        console.warn("Failed to parse embedded JSON:", e);
      }
    }
    
    // If we still don't have enough data, use visible text for AI extraction
    if ((!extracted.name || !extracted.description || !extracted.address) && visibleText) {
      // Store visible text for AI fallback
      (extracted as any).__visibleText = visibleText;
    }

    // Heuristic DOM extraction for common fields
    extracted.name ||= await page.title();

    // Address candidates
    const address = await page.evaluate(() => {
      const sel = [
        '[data-testid="book-it-default"] [data-testid*="address"]',
        '[data-section-id*="LOCATION_DEFAULT"] [data-testid*="text"]',
        'address',
      ];
      for (const s of sel) {
        const el = document.querySelector<HTMLElement>(s);
        if (el && el.innerText.trim().length > 5) return el.innerText.trim();
      }
      return '';
    });
    if (address && !extracted.address) extracted.address = address;

    // Description candidates
    const description = await page.evaluate(() => {
      const sel = [
        '[data-section-id*="DESCRIPTION_DEFAULT"]',
        '[data-testid="listing-description"]',
      ];
      for (const s of sel) {
        const el = document.querySelector<HTMLElement>(s);
        if (el) return el.innerText.trim();
      }
      return '';
    });
    if (description && !extracted.description) extracted.description = description;

    // Amenities list
    const amenities = await page.evaluate(() => {
      const labels = new Set<string>();
      const amenityNodes = document.querySelectorAll('[data-section-id*="AMENITIES_DEFAULT"] li, [data-testid*="amenity"]');
      amenityNodes.forEach(n => {
        const t = (n as HTMLElement).innerText?.trim();
        if (t && t.length < 80) labels.add(t);
      });
      return Array.from(labels);
    });
    if ((!extracted.amenities || !extracted.amenities.length) && amenities && amenities.length) extracted.amenities = amenities as any;

    // Defaults if missing
    extracted.name ||= 'Propriété Airbnb';
    extracted.description ||= 'Description à compléter';
    extracted.address ||= 'Adresse à compléter';
    extracted.checkInTime ||= '15:00';
    extracted.checkOutTime ||= '11:00';
    extracted.houseRules ||= '';
    extracted.hostName ||= 'Hôte';

    return extracted;
  } catch (error: any) {
    console.error("Error in scrapeAirbnbWithPlaywright:", error?.message || error);
    throw error;
  } finally {
    // Always close browser, even on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError: any) {
        console.warn("Error closing browser:", closeError?.message);
      }
    }
  }
}

function tryExtractFirstJsonObject(raw: string): any | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch {}
  return null;
}

function mapFromEmbeddedJson(obj: any, out: Partial<InsertProperty>) {
  // Heuristics for Airbnb Next.js data trees
  // Common paths in Airbnb Next.js structure: props.pageProps.listingDetails.listing
  let listing = obj;
  
  // Try to find listing object in common Next.js paths
  if (obj?.props?.pageProps?.listingDetails?.listing) {
    listing = obj.props.pageProps.listingDetails.listing;
  } else if (obj?.props?.pageProps?.listing) {
    listing = obj.props.pageProps.listing;
  } else if (obj?.listing) {
    listing = obj.listing;
  } else if (obj?.bootstrapData?.reduxData?.homePDP?.listingInfo?.listing) {
    listing = obj.bootstrapData.reduxData.homePDP.listingInfo.listing;
  }
  
  // Name/Title
  const name = listing?.name || listing?.title || listing?.pdp_listing_detail?.listing?.name || 
               deepFindString(obj, ['name','listingName','title','p3_summary_title']);
  if (name) out.name = name;
  
  // Description
  const description = listing?.description || listing?.summary || listing?.pdp_listing_detail?.listing?.summary ||
                      listing?.p3_summary_description || deepFindString(obj, ['description','listingDescription','summary']);
  if (description) out.description = description;
  
  // Address - try multiple formats
  let address = listing?.publicAddress || listing?.address || listing?.location?.address;
  if (!address) {
    const location = listing?.location || listing?.pdp_listing_detail?.listing?.location;
    if (location) {
      const parts = [];
      if (location.city) parts.push(location.city);
      if (location.state) parts.push(location.state);
      if (location.country) parts.push(location.country);
      address = parts.join(', ');
    }
  }
  if (!address) {
    address = deepFindString(obj, ['address','publicAddress','structuredAddress','location']);
  }
  if (address) {
    out.address = typeof address === 'string' ? address : JSON.stringify(address);
  }
  
  // Amenities
  let amenities = listing?.amenities || listing?.listing_amenities || listing?.amenityIds;
  if (amenities && Array.isArray(amenities)) {
    // If it's an array of objects with name/title, extract names
    if (amenities.length > 0 && typeof amenities[0] === 'object') {
      amenities = amenities.map((a: any) => a.name || a.title || a.amenity || String(a)).filter(Boolean);
    }
    out.amenities = amenities as any;
  } else {
    const found = deepFindArrayOfStrings(obj, ['amenities','listingAmenities','amenityIds']);
    if (found && found.length) out.amenities = found as any;
  }
  
  // Max Guests
  const maxGuests = listing?.personCapacity || listing?.accommodates || listing?.guestLabel?.match(/\d+/)?.[0] ||
                    deepFindNumber(obj, ['maxGuestCapacity','personCapacity','guestCount','accommodates']);
  if (maxGuests) out.maxGuests = String(maxGuests);
  
  // House Rules
  const houseRules = listing?.houseRules || listing?.rules || listing?.house_rules ||
                     deepFindString(obj, ['houseRules','rules','house_rules']);
  if (houseRules) out.houseRules = houseRules;
  
  // Check-in/Check-out times
  const checkInTime = listing?.checkInTime || listing?.check_in_time_start ||
                      deepFindString(obj, ['checkInTime','check_in_time']);
  if (checkInTime) out.checkInTime = checkInTime;
  
  const checkOutTime = listing?.checkOutTime || listing?.check_out_time ||
                       deepFindString(obj, ['checkOutTime','check_out_time']);
  if (checkOutTime) out.checkOutTime = checkOutTime;
}

function deepFindString(obj: any, keys: string[]): string | null {
  try {
    const stack = [obj];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur) continue;
      if (typeof cur === 'object') {
        for (const k of Object.keys(cur)) {
          const v = (cur as any)[k];
          if (typeof v === 'string' && keys.some(key => k.toLowerCase().includes(key.toLowerCase()))) return v;
          if (v && typeof v === 'object') stack.push(v);
        }
      }
    }
  } catch {}
  return null;
}

function deepFindNumber(obj: any, keys: string[]): number | null {
  try {
    const stack = [obj];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur) continue;
      if (typeof cur === 'object') {
        for (const k of Object.keys(cur)) {
          const v = (cur as any)[k];
          if (typeof v === 'number' && keys.some(key => k.toLowerCase().includes(key.toLowerCase()))) return v;
          if (v && typeof v === 'object') stack.push(v);
        }
      }
    }
  } catch {}
  return null;
}

function deepFindArrayOfStrings(obj: any, keys: string[]): string[] | null {
  try {
    const stack = [obj];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur) continue;
      if (Array.isArray(cur) && cur.every(x => typeof x === 'string') && cur.length) return cur as string[];
      if (typeof cur === 'object') {
        for (const k of Object.keys(cur)) {
          const v = (cur as any)[k];
          if (Array.isArray(v) && v.every(x => typeof x === 'string') && v.length && keys.some(key => k.toLowerCase().includes(key.toLowerCase()))) return v;
          if (v && typeof v === 'object') stack.push(v);
        }
      }
    }
  } catch {}
  return null;
}


