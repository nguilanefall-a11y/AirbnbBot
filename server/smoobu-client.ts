/**
 * Smoobu API Client
 * Note: Ce fichier est minimal pour éviter les erreurs de compilation.
 * L'intégration Smoobu peut être complétée plus tard si nécessaire.
 */

export interface SmoobuWebhookPayload {
  data: {
    bookingId?: string | number;
    propertyId?: string | number;
    guestName?: string;
    body?: string;
    messageId?: string;
    sentAt?: string;
    channel?: string;
    language?: string;
  };
}

/**
 * Envoie un message via l'API Smoobu
 */
export async function sendSmoobuMessage(
  apiKey: string,
  params: { bookingId: string; body: string; channel?: string }
): Promise<any> {
  // TODO: Implémenter l'appel API Smoobu si nécessaire
  throw new Error("Smoobu API not implemented yet");
}

/**
 * Récupère les détails d'une réservation Smoobu
 */
export async function fetchSmoobuBooking(
  apiKey: string,
  bookingId: string | number
): Promise<any> {
  // TODO: Implémenter l'appel API Smoobu si nécessaire
  throw new Error("Smoobu API not implemented yet");
}

/**
 * Vérifie la signature d'un webhook Smoobu
 */
export function verifySmoobuWebhook(
  expectedSecret: string | undefined,
  providedSecret: string | undefined
): boolean {
  if (!expectedSecret) {
    console.warn("SMOOBU_WEBHOOK_SECRET is not configured. Webhook verification skipped.");
    return true; // Allow if no secret is configured
  }
  return expectedSecret === providedSecret;
}



