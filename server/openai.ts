import OpenAI from "openai";
import type { Property } from "@shared/schema";

// This is using OpenAI's API - the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateChatResponse(
  message: string,
  property: Property
): Promise<string> {
  const systemPrompt = `Tu es un assistant virtuel pour une propriété Airbnb. Voici les informations sur la propriété :

Nom: ${property.name}
Description: ${property.description}
Adresse: ${property.address}
Hôte: ${property.hostName}${property.hostPhone ? ` (Téléphone: ${property.hostPhone})` : ''}

Check-in: ${property.checkInTime}
Check-out: ${property.checkOutTime}

${property.wifiName ? `WiFi: ${property.wifiName}${property.wifiPassword ? ` / Mot de passe: ${property.wifiPassword}` : ''}` : ''}

${property.amenities.length > 0 ? `Équipements: ${property.amenities.join(', ')}` : ''}

${property.parkingInfo ? `Parking: ${property.parkingInfo}` : ''}

${property.houseRules ? `Règles de la maison: ${property.houseRules}` : ''}

${property.additionalInfo ? `Informations supplémentaires: ${property.additionalInfo}` : ''}

Réponds de manière amicale et professionnelle aux questions des voyageurs. Si tu ne connais pas la réponse à une question spécifique, suggère au voyageur de contacter directement l'hôte. Reste concis mais informatif.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_completion_tokens: 500,
    });

    return response.choices[0].message.content || "Je suis désolé, je n'ai pas pu générer une réponse.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Erreur lors de la génération de la réponse");
  }
}
