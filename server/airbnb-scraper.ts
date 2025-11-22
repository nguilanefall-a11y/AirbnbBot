import { GoogleGenAI } from "@google/genai";
import type { InsertProperty } from "@shared/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Fetches HTML content from Airbnb URL with timeout
 */
async function fetchAirbnbPage(url: string): Promise<string> {
  const timeout = 15000; // 15 seconds timeout
  
  try {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    if (!html || html.length < 1000) {
      throw new Error("Le contenu récupéré est trop court ou vide");
    }
    
    return html;
  } catch (error: any) {
    console.error("Error fetching Airbnb page:", error);
    
    if (error.name === 'AbortError') {
      throw new Error("La requête a pris trop de temps. L'URL Airbnb est peut-être inaccessible ou protégée.");
    }
    
    if (error.message) {
      throw error;
    }
    
    throw new Error("Impossible de récupérer le contenu de la page Airbnb. Vérifiez que l'URL est accessible et publique.");
  }
}

/**
 * Extracts text content from HTML (simplified)
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML tags but keep text content
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Limit to first 10000 characters to avoid token limits
  return text.substring(0, 10000);
}

/**
 * Analyzes an Airbnb listing page URL and extracts property information
 * Uses AI to parse and structure the data from the Airbnb listing
 */
export async function analyzeAirbnbListing(airbnbUrl: string): Promise<Partial<InsertProperty>> {
  try {
    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === "") {
      throw new Error("GEMINI_API_KEY n'est pas configurée. Veuillez ajouter votre clé API Gemini dans le fichier .env");
    }
    
    // Fetch the page content
    console.log("Fetching Airbnb page:", airbnbUrl);
    const html = await fetchAirbnbPage(airbnbUrl);
    
    // Extract text content
    const pageText = extractTextFromHTML(html);
    
    if (!pageText || pageText.length < 100) {
      throw new Error("Le contenu de la page Airbnb est trop court ou inaccessible");
    }
    
    // Use AI to extract structured data from the page content
    const prompt = `Tu es un expert en extraction de données immobilières. Analyse ce contenu extrait d'une page Airbnb et extrais toutes les informations pertinentes sur la propriété.

Contenu de la page Airbnb (extrait):
${pageText.substring(0, 8000)}

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte (utilise null pour les champs manquants):

{
  "name": "string - Titre de la propriété",
  "description": "string - Description complète",
  "address": "string - Adresse complète",
  "floor": "string - Numéro d'étage si mentionné",
  "doorCode": "string - Code de porte si mentionné",
  "maxGuests": "string - Nombre maximum de voyageurs",
  "amenities": ["array", "des", "équipements"],
  "checkInTime": "string - Heure d'arrivée (format: HH:MM)",
  "checkOutTime": "string - Heure de départ (format: HH:MM)",
  "petsAllowed": boolean,
  "smokingAllowed": boolean,
  "partiesAllowed": boolean,
  "houseRules": "string - Règles de la maison",
  "parkingInfo": "string - Informations parking",
  "publicTransport": "string - Transports en commun",
  "nearbyShops": "string - Commerces à proximité",
  "restaurants": "string - Restaurants",
  "wifiName": "string - Nom WiFi si mentionné",
  "kitchenEquipment": "string - Équipement cuisine"
}

IMPORTANT: Retourne UNIQUEMENT le JSON, sans texte supplémentaire avant ou après.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
    } catch (apiError: any) {
      console.error("Gemini API error:", apiError);
      if (apiError.message?.includes("API key") || apiError.message?.includes("authentication") || apiError.message?.includes("Permission denied")) {
        throw new Error("Clé API Gemini invalide ou manquante. Veuillez vérifier votre GEMINI_API_KEY dans le fichier .env");
      }
      throw new Error(`Erreur API Gemini: ${apiError.message || "Erreur inconnue"}`);
    }

    const responseText = response.text || "{}";
    
    // Extract JSON from response (handle cases where AI adds extra text)
    let jsonText = responseText.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    let extractedData;
    try {
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Response text:", responseText);
      throw new Error("L'IA n'a pas pu extraire les données au format JSON. Veuillez réessayer.");
    }

    // Map extracted data to our property schema
    const propertyData: Partial<InsertProperty> = {
      name: extractedData.name || "Nouvelle Propriété",
      description: extractedData.description || "Description à compléter",
      address: extractedData.address || "Adresse à compléter",
      floor: extractedData.floor || null,
      doorCode: extractedData.doorCode || null,
      maxGuests: extractedData.maxGuests || null,
      amenities: Array.isArray(extractedData.amenities) ? extractedData.amenities : [],
      checkInTime: extractedData.checkInTime || "15:00",
      checkOutTime: extractedData.checkOutTime || "11:00",
      petsAllowed: extractedData.petsAllowed || false,
      smokingAllowed: extractedData.smokingAllowed || false,
      partiesAllowed: extractedData.partiesAllowed || false,
      houseRules: extractedData.houseRules || "",
      parkingInfo: extractedData.parkingInfo || null,
      publicTransport: extractedData.publicTransport || null,
      nearbyShops: extractedData.nearbyShops || null,
      restaurants: extractedData.restaurants || null,
      wifiName: extractedData.wifiName || null,
      kitchenEquipment: extractedData.kitchenEquipment || null,
      // Set default host name (will be updated by user)
      hostName: "Hôte",
    };

    return propertyData;
  } catch (error: any) {
    console.error("Error analyzing Airbnb listing:", error);
    
    // Provide more specific error messages
    if (error.message) {
      // Check for API key errors
      if (error.message.includes("GEMINI_API_KEY") || error.message.includes("API key") || error.message.includes("authentication") || error.message.includes("Permission denied")) {
        throw new Error("Configuration API manquante: Veuillez ajouter GEMINI_API_KEY dans votre fichier .env. Obtenez une clé sur https://aistudio.google.com/apikey");
      }
      throw error;
    }
    
    throw new Error("Impossible d'analyser la page Airbnb. Vérifiez que l'URL est valide et accessible.");
  }
}

