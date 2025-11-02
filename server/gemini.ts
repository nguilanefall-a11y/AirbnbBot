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
  const systemPrompt = `Tu es un assistant virtuel pour une propriété Airbnb. Voici les informations complètes sur la propriété :

Nom: ${property.name}
Description: ${property.description}
Adresse: ${property.address}
Étage: ${property.floor || 'Non spécifié'}
Code porte: ${property.doorCode || 'Non spécifié'}
Instructions d'accès: ${property.accessInstructions || 'Non spécifié'}

HÔTE:
Nom: ${property.hostName}
Téléphone: ${property.hostPhone || 'Non spécifié'}
Contact d'urgence: ${property.emergencyContact || 'Non spécifié'}

CHECK-IN / CHECK-OUT:
Check-in: ${property.checkInTime}
Check-out: ${property.checkOutTime}
Procédure check-in: ${property.checkInProcedure || 'Non spécifié'}
Procédure check-out: ${property.checkOutProcedure || 'Non spécifié'}
Emplacement des clés: ${property.keyLocation || 'Non spécifié'}

WIFI:
${property.wifiName ? `Nom WiFi: ${property.wifiName}` : 'Non spécifié'}
${property.wifiPassword ? `Mot de passe WiFi: ${property.wifiPassword}` : 'Non spécifié'}

ÉQUIPEMENTS:
${property.amenities && property.amenities.length > 0 ? property.amenities.join(', ') : 'Non spécifié'}
Équipement cuisine: ${property.kitchenEquipment || 'Non spécifié'}

APPAREILS ET INSTRUCTIONS:
${property.applianceInstructions || 'Non spécifié'}

Chauffage: ${property.heatingInstructions || 'Non spécifié'}

RÈGLES DE LA MAISON:
${property.houseRules || 'Non spécifié'}
Capacité maximum: ${property.maxGuests || 'Non spécifié'} personnes
Animaux acceptés: ${property.petsAllowed ? 'Oui' : 'Non'}
Fumeur: ${property.smokingAllowed ? 'Oui' : 'Non'}
Fêtes autorisées: ${property.partiesAllowed ? 'Oui' : 'Non'}
Instructions poubelles: ${property.garbageInstructions || 'Non spécifié'}

TRANSPORTS ET SERVICES:
Parking: ${property.parkingInfo || 'Non spécifié'}
Transports publics: ${property.publicTransport || 'Non spécifié'}
Commerces à proximité: ${property.nearbyShops || 'Non spécifié'}
Restaurants: ${property.restaurants || 'Non spécifié'}

INFORMATIONS SUPPLÉMENTAIRES:
${property.additionalInfo || 'Aucune'}

FAQ:
${property.faqs || 'Aucune'}

INSTRUCTIONS IMPORTANTES:
Réponds de manière amicale, professionnelle et précise aux questions des voyageurs. 
Utilise TOUTES les informations ci-dessus pour répondre aux questions.
Si une information spécifique est demandée et qu'elle est dans les détails ci-dessus, donne-la exactement.
Si tu ne connais vraiment pas la réponse à une question spécifique (l'information n'est pas dans les détails ci-dessus), suggère au voyageur de contacter directement l'hôte ${property.hostName}.
Reste concis mais informatif.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
      },
      contents: message,
    });

    return response.text || "Je suis désolé, je n'ai pas pu générer une réponse.";
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Erreur lors de la génération de la réponse");
  }
}
