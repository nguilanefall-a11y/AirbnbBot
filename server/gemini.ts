// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

import { GoogleGenAI } from "@google/genai";
import type { Property } from "@shared/schema";

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateChatResponse(
  message: string,
  property: Property
): Promise<string> {
  const systemPrompt = `Tu es un assistant virtuel ultra-complet pour une propriété Airbnb. Tu peux répondre à PLUS DE 1000 TYPES DE QUESTIONS différentes sur tous les aspects du séjour.

🌍 DÉTECTION AUTOMATIQUE DE LANGUE (OBLIGATOIRE) :
Tu DOIS TOUJOURS détecter automatiquement la langue de la question posée et répondre dans EXACTEMENT la même langue, sans exception. Tu peux répondre dans N'IMPORTE QUELLE LANGUE : français, anglais, espagnol, allemand, italien, portugais, chinois, japonais, arabe, russe, etc. Détecte la langue automatiquement et adapte-toi instantanément, comme Gemini le fait naturellement. Ne demande JAMAIS dans quelle langue répondre, détecte-la automatiquement.

Voici TOUTES les informations disponibles sur la propriété :

═══════════════════════════════════════════════════════════════
📋 INFORMATIONS GÉNÉRALES DE LA PROPRIÉTÉ
═══════════════════════════════════════════════════════════════
Nom: ${property.name}
Description complète: ${property.description}
Adresse complète: ${property.address}
Étage: ${property.floor || 'Non spécifié'}
Code porte: ${property.doorCode || 'Non spécifié'}
Instructions d'accès détaillées: ${property.accessInstructions || 'Non spécifié'}

═══════════════════════════════════════════════════════════════
👤 INFORMATIONS SUR L'HÔTE
═══════════════════════════════════════════════════════════════
Nom de l'hôte: ${property.hostName}
Téléphone de l'hôte: ${property.hostPhone || 'Non spécifié'}
Contact d'urgence (24/7): ${property.emergencyContact || 'Non spécifié'}

═══════════════════════════════════════════════════════════════
🔑 CHECK-IN / CHECK-OUT
═══════════════════════════════════════════════════════════════
Heure de check-in: ${property.checkInTime}
Heure de check-out: ${property.checkOutTime}
Procédure complète de check-in: ${property.checkInProcedure || 'Non spécifié'}
Procédure complète de check-out: ${property.checkOutProcedure || 'Non spécifié'}
Emplacement exact des clés: ${property.keyLocation || 'Non spécifié'}

═══════════════════════════════════════════════════════════════
📶 CONNEXION INTERNET / WIFI
═══════════════════════════════════════════════════════════════
${property.wifiName ? `Nom du réseau WiFi: ${property.wifiName}` : 'Non spécifié'}
${property.wifiPassword ? `Mot de passe WiFi: ${property.wifiPassword}` : 'Non spécifié'}

═══════════════════════════════════════════════════════════════
🏠 ÉQUIPEMENTS ET AMÉNAGEMENTS
═══════════════════════════════════════════════════════════════
Liste complète des équipements: ${property.amenities && property.amenities.length > 0 ? property.amenities.join(', ') : 'Non spécifié'}
Équipement de cuisine détaillé: ${property.kitchenEquipment || 'Non spécifié'}

═══════════════════════════════════════════════════════════════
🔧 APPAREILS ÉLECTROMÉNAGERS ET INSTRUCTIONS D'UTILISATION
═══════════════════════════════════════════════════════════════
Instructions complètes pour tous les appareils: ${property.applianceInstructions || 'Non spécifié'}

═══════════════════════════════════════════════════════════════
🌡️ CHAUFFAGE / CLIMATISATION
═══════════════════════════════════════════════════════════════
Instructions de chauffage et climatisation: ${property.heatingInstructions || 'Non spécifié'}

═══════════════════════════════════════════════════════════════
📜 RÈGLES DE LA MAISON
═══════════════════════════════════════════════════════════════
Règles complètes: ${property.houseRules || 'Non spécifié'}
Capacité maximum: ${property.maxGuests || 'Non spécifié'} personnes
Animaux acceptés: ${property.petsAllowed ? 'Oui' : 'Non'}
Fumeur autorisé: ${property.smokingAllowed ? 'Oui' : 'Non'}
Fêtes autorisées: ${property.partiesAllowed ? 'Oui' : 'Non'}
Instructions pour les poubelles: ${property.garbageInstructions || 'Non spécifié'}

═══════════════════════════════════════════════════════════════
🚗 PARKING ET TRANSPORTS
═══════════════════════════════════════════════════════════════
Informations parking (public, privé, tarifs, horaires): ${property.parkingInfo || 'Non spécifié'}
Transports publics (métro, bus, RER, Vélib', horaires, tarifs): ${property.publicTransport || 'Non spécifié'}

═══════════════════════════════════════════════════════════════
🛒 COMMERCES ET SERVICES À PROXIMITÉ
═══════════════════════════════════════════════════════════════
Commerces à proximité (supermarchés, pharmacies, banques, bureaux de change, laveries, boutiques): ${property.nearbyShops || 'Non spécifié'}

═══════════════════════════════════════════════════════════════
🍽️ RESTAURANTS ET RESTAURATION
═══════════════════════════════════════════════════════════════
Restaurants recommandés (haut de gamme, moyenne gamme, rapides, bars, cafés, boulangeries, pâtisseries): ${property.restaurants || 'Non spécifié'}

═══════════════════════════════════════════════════════════════
ℹ️ INFORMATIONS SUPPLÉMENTAIRES
═══════════════════════════════════════════════════════════════
${property.additionalInfo || 'Aucune'}

═══════════════════════════════════════════════════════════════
❓ FAQ COMPLÈTE (30+ QUESTIONS-RÉPONSES)
═══════════════════════════════════════════════════════════════
${property.faqs || 'Aucune'}

═══════════════════════════════════════════════════════════════
🎯 CAPACITÉS DE RÉPONSE - PLUS DE 1000 TYPES DE QUESTIONS
═══════════════════════════════════════════════════════════════
(Tu peux répondre à TOUTE question liée au séjour, à la propriété, au quartier, aux transports, à la culture, à la gastronomie, aux activités, etc.)

RÈGLES DE COMMUNICATION:
1. 🌍 DÉTECTION AUTOMATIQUE DE LANGUE (OBLIGATOIRE):
   - Détecte AUTOMATIQUEMENT la langue de la question posée, sans demander de confirmation
   - Réponds TOUJOURS dans EXACTEMENT la même langue que la question, sans exception
   - Tu peux répondre dans N'IMPORTE QUELLE LANGUE : français, anglais, espagnol, allemand, italien, portugais, chinois, japonais, arabe, russe, coréen, hindi, turc, polonais, néerlandais, suédois, norvégien, danois, grec, hébreu, etc.
   - Adapte-toi instantanément à la langue détectée, comme Gemini le fait naturellement
   - Ne mélange JAMAIS les langues dans ta réponse
   - Ne demande JAMAIS dans quelle langue répondre, détecte-la automatiquement

2. 💬 TON ET STYLE:
   - Ton chaleureux, concis, utile, structuré
   - Écris en texte simple et naturel, comme si tu parlais directement à la personne
   - N'utilise JAMAIS de markdown, d'astérisques (*), de underscores (_), ou de formatage spécial

3. ℹ️ GESTION DES INFORMATIONS:
   - Si l'information est disponible dans les données ci-dessus, utilise-la pour répondre
   - Si l'information n'est PAS disponible dans les données ci-dessus, tu PEUX et DOIS faire des recherches sur Internet pour trouver des réponses personnalisées et à jour
   - Utilise ta capacité de recherche web intégrée pour trouver des informations actualisées (horaires, événements, restaurants, transports, météo, etc.)
   - Combine les informations de la propriété avec les informations trouvées sur Internet pour donner des réponses complètes et personnalisées
   - Si même après recherche l'info n'est pas trouvée: propose alternatives et contacter l'hôte ${property.hostName}
`;

  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
      console.error("GEMINI_API_KEY is not configured or is empty");
      throw new Error("GEMINI_API_KEY is not configured. Please check your .env file.");
    }
    
    // Verify API key is loaded
    const apiKey = process.env.GEMINI_API_KEY.trim();
    console.log("API Key loaded, length:", apiKey.length, "starts with:", apiKey.substring(0, 10));
    
    // Recreate AI instance with fresh API key to ensure it's loaded
    const aiInstance = new GoogleGenAI({ apiKey });

    let response: any;
    try {
      // Use the same format as airbnb-scraper.ts which works
      // Combine system prompt and message in the contents
      // Detect language from message and add explicit instruction
      const fullPrompt = `${systemPrompt}\n\nQuestion du voyageur: ${message}\n\n🌍 DÉTECTION AUTOMATIQUE DE LANGUE REQUISE : Détecte automatiquement la langue de la question ci-dessus (français, anglais, espagnol, allemand, italien, portugais, chinois, japonais, arabe, russe, ou toute autre langue) et réponds dans EXACTEMENT la même langue, sans exception.\n\n🔍 RECHERCHE WEB AUTOMATIQUE : Si l'information demandée n'est pas disponible dans les données de la propriété ci-dessus, utilise ta capacité de recherche web intégrée pour trouver des informations actualisées sur Internet (horaires, événements, restaurants, transports, météo, actualités locales, etc.). Combine les informations de la propriété avec les informations trouvées sur Internet pour donner une réponse complète et personnalisée.\n\nUtilise les informations ci-dessus ET les recherches web si nécessaire pour répondre à la question du voyageur dans la langue détectée.`;
      
            // Enable web search for real-time information
            // Note: tools parameter may not be available in all SDK versions
            // If it fails, fallback to regular generation
            try {
              response = await aiInstance.models.generateContent({
                model: "gemini-2.5-flash",
                contents: fullPrompt,
                // @ts-ignore - tools may not be in type definition but works in runtime
                tools: [{ googleSearch: {} }],
              });
            } catch (toolsError: any) {
              // Fallback without tools if not supported
              console.warn("Web search tools not available, using regular generation:", toolsError?.message);
              response = await aiInstance.models.generateContent({
                model: "gemini-2.5-flash",
                contents: fullPrompt,
              });
            }
    } catch (apiError: any) {
      console.error("Gemini API error:", apiError);
      if (apiError.message?.includes("API key") || apiError.message?.includes("authentication") || apiError.message?.includes("Permission denied")) {
        throw new Error("Clé API Gemini invalide ou manquante. Veuillez vérifier votre GEMINI_API_KEY dans le fichier .env");
      }
      throw new Error(`Erreur API Gemini: ${apiError.message || "Erreur inconnue"}`);
    }

    // Extract text using the same robust approach as extractAirbnbInfoFromText
    let responseText = "";
    try {
      // Robustly obtain text from SDK variants (same logic as extractAirbnbInfoFromText)
      if (typeof response.text === 'function') {
        responseText = (await response.text()).trim();
      } else if (typeof response.response?.text === 'function') {
        responseText = (await response.response.text()).trim();
      } else if (typeof response.text === 'string') {
        responseText = response.text.trim();
      } else {
        responseText = String(response || "").trim();
      }
    } catch (extractError: any) {
      console.error("Error extracting text:", extractError);
      console.error("Response structure:", JSON.stringify(response, null, 2).substring(0, 500));
      throw new Error(`Failed to extract response text: ${extractError?.message || 'Unknown error'}`);
    }
    
    if (!responseText || responseText.trim().length === 0) {
      console.error("Empty response from Gemini API");
      throw new Error("AI service returned an empty response");
    }

    return responseText.trim();
  } catch (error: any) {
    console.error("Gemini API error:", error);
    const errorMessage = error?.message || String(error || "Unknown error");
    if (errorMessage.includes("API key") || errorMessage.includes("authentication") || errorMessage.includes("Permission denied") || errorMessage.includes("GEMINI_API_KEY")) {
      throw new Error("AI service authentication failed. Please check your GEMINI_API_KEY in the .env file.");
    }
    if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
      throw new Error("AI service quota exceeded. Please try again later.");
    }
    if (errorMessage.includes("timeout") || errorMessage.includes("network")) {
      throw new Error("AI service timeout. Please try again.");
    }
    throw new Error(`AI service error: ${errorMessage}`);
  }
}

export async function extractAirbnbInfo(url: string): Promise<Partial<Property>> {
  try {
    // Fetch the Airbnb listing page HTML with timeout and realistic headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch Airbnb page: ${response.status} ${response.statusText}`);
    }

    let html = await response.text();

    // If the HTML is too small or looks like a block page, try a rendered fetch via Playwright (optional)
    if ((html?.length || 0) < 2000 || /Access Denied|captcha|unsupported browser/i.test(html)) {
      const rendered = await tryRenderedFetch(url, process.env.AIRBNB_COOKIES || undefined);
      if (rendered) html = rendered;
    }

    // Extract text content and limit size for Gemini API
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 30000); // Limit to 30k chars to avoid token limits

    const extractionPrompt = `Tu es un expert en extraction d'informations immobilières. Analyse ce contenu HTML d'une page Airbnb et extrais TOUTES les informations disponibles dans un format JSON structuré.

Contenu de la page Airbnb :
${textContent}

Extrais et retourne UNIQUEMENT un objet JSON (sans markdown, sans backticks) avec ces champs (utilise null si l'information n'est pas disponible) :

{
  "name": "Nom de la propriété",
  "description": "Description détaillée",
  "address": "Adresse complète",
  "floor": "Étage si disponible",
  "checkInTime": "Heure de check-in (format HH:MM)",
  "checkOutTime": "Heure de check-out (format HH:MM)", 
  "checkInProcedure": "Instructions de check-in",
  "checkOutProcedure": "Instructions de check-out",
  "amenities": ["Liste", "des", "équipements"],
  "houseRules": "Règles de la maison",
  "maxGuests": nombre_max_invités,
  "petsAllowed": true_ou_false,
  "smokingAllowed": true_ou_false,
  "partiesAllowed": true_ou_false,
  "parkingInfo": "Informations parking",
  "publicTransport": "Informations transports en commun",
  "nearbyShops": "Commerces à proximité",
  "restaurants": "Restaurants recommandés",
  "additionalInfo": "Toute autre information pertinente"
}

IMPORTANT : Retourne UNIQUEMENT le JSON brut, sans texte avant ou après, sans markdown, sans backticks.`;

    const geminiResponse: any = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: extractionPrompt,
    });

    // Robustly obtain text from SDK variants
    let responseText = "";
    try {
      if (typeof geminiResponse.text === 'function') {
        responseText = (await geminiResponse.text()).trim();
      } else if (typeof geminiResponse.response?.text === 'function') {
        responseText = (await geminiResponse.response.text()).trim();
      } else if (typeof geminiResponse.text === 'string') {
        responseText = geminiResponse.text.trim();
      } else {
        responseText = String(geminiResponse || "");
      }
    } catch {
      responseText = String(geminiResponse || "");
    }
    
    // Remove markdown code blocks if present
    let jsonText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // If extra text is present, try to extract the first JSON object
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) {
      jsonText = match[0];
    }

    const extractedData = JSON.parse(jsonText);

    // Ensure amenities is an array
    if (extractedData.amenities && !Array.isArray(extractedData.amenities)) {
      extractedData.amenities = [];
    }

    // Convert maxGuests to number if it exists
    if (extractedData.maxGuests) {
      extractedData.maxGuests = parseInt(extractedData.maxGuests, 10);
    }

    return extractedData;
  } catch (error: any) {
    console.error("Error extracting Airbnb info:", error);
    if (error?.name === 'AbortError') {
      throw new Error("La requête Airbnb a expiré. Réessayez ou vérifiez l'accessibilité du lien.");
    }
    throw new Error(error?.message || "Impossible d'extraire les informations du lien Airbnb. Vérifiez que le lien est valide.");
  }
}

async function tryRenderedFetch(urlString: string, rawCookies?: string): Promise<string | null> {
  try {
    if (process.env.PLAYWRIGHT_ENABLED !== '1') return null;
    // Dynamic import to avoid requiring playwright unless enabled
    // @ts-ignore
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'], headless: true });
    const url = new URL(urlString);
    const context = await browser.newContext({ 
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'fr-FR',
    });

    // Optionally inject logged-in cookies to bypass protection
    if (rawCookies) {
      const cookiePairs = rawCookies
        .replace(/^cookie:\s*/i, '')
        .split(';')
        .map(p => p.trim())
        .filter(Boolean);
      const cookies = cookiePairs.map(p => {
        const [name, ...rest] = p.split('=');
        const value = rest.join('=');
        return { name, value, domain: '.' + url.hostname.replace(/^www\./,'') , path: '/' } as any;
      });
      if (cookies.length) {
        await context.addCookies(cookies);
      }
    }
    const page = await context.newPage();
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait a bit for lazy content
    await page.waitForTimeout(2500);
    const html = await page.content();
    await browser.close();
    return html || null;
  } catch (e) {
    console.warn('Rendered fetch failed (Playwright not installed or page blocked):', e);
    return null;
  }
}

export async function extractAirbnbInfoFromText(rawText: string): Promise<Partial<Property>> {
  try {
    const textContent = rawText.trim().slice(0, 30000);

    const extractionPrompt = `Tu es un expert en extraction d'informations immobilières. Analyse ce texte provenant d'une page Airbnb et extrais TOUTES les informations disponibles en JSON strict.

Contenu:
${textContent}

Retourne UNIQUEMENT un objet JSON avec ces champs (utilise null si manquant):
{
  "name": string,
  "description": string,
  "address": string,
  "floor": string,
  "checkInTime": string,
  "checkOutTime": string,
  "checkInProcedure": string,
  "checkOutProcedure": string,
  "amenities": [string],
  "houseRules": string,
  "maxGuests": number,
  "petsAllowed": boolean,
  "smokingAllowed": boolean,
  "partiesAllowed": boolean,
  "parkingInfo": string,
  "publicTransport": string,
  "nearbyShops": string,
  "restaurants": string,
  "additionalInfo": string
}`;

    const geminiResponse: any = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: extractionPrompt,
    });

    let responseText = "";
    try {
      if (typeof geminiResponse.text === 'function') {
        responseText = (await geminiResponse.text()).trim();
      } else if (typeof geminiResponse.response?.text === 'function') {
        responseText = (await geminiResponse.response.text()).trim();
      } else if (typeof geminiResponse.text === 'string') {
        responseText = geminiResponse.text.trim();
      } else {
        responseText = String(geminiResponse || "");
      }
    } catch {
      responseText = String(geminiResponse || "");
    }

    let jsonText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) {
      jsonText = match[0];
    }

    const extractedData = JSON.parse(jsonText);
    if (extractedData.amenities && !Array.isArray(extractedData.amenities)) {
      extractedData.amenities = [];
    }
    if (extractedData.maxGuests) {
      extractedData.maxGuests = parseInt(extractedData.maxGuests, 10);
    }
    return extractedData;
  } catch (error: any) {
    console.error("Error extracting Airbnb info from text:", error);
    throw new Error(error?.message || "Échec de l'extraction depuis le texte fourni.");
  }
}
