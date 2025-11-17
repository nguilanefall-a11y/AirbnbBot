const SMOOBU_BASE_URL = process.env.SMOOBU_API_BASE_URL ?? "https://api.smoobu.com/v1";

type HttpMethod = "GET" | "POST";

async function smoobuRequest<T>(
  apiKey: string,
  path: string,
  method: HttpMethod = "GET",
  body?: Record<string, any>,
  signal?: AbortSignal,
): Promise<T> {
  if (!apiKey) {
    throw new Error("Missing Smoobu API key");
  }

  const url = new URL(path, SMOOBU_BASE_URL);
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Smoobu API error (${response.status} ${response.statusText}): ${errorText || "Unknown error"}`,
    );
  }

  return (await response.json().catch(() => ({}))) as T;
}

export interface SmoobuConversation {
  id: string;
  bookingId: string;
  propertyId?: string;
  guestName?: string;
  guestEmail?: string;
  channel?: string;
  language?: string;
}

export interface SmoobuMessage {
  id: string;
  bookingId: string;
  propertyId?: string;
  body: string;
  sentAt: string;
  direction: "inbound" | "outbound";
  channel?: string;
  language?: string;
}

export interface SmoobuWebhookPayload {
  event: string;
  data: {
    messageId: string;
    bookingId: string;
    propertyId?: string;
    guestName?: string;
    guestEmail?: string;
    body: string;
    channel?: string;
    language?: string;
    sentAt?: string;
  };
}

export async function fetchSmoobuMessages(
  apiKey: string,
  params?: Record<string, string>,
): Promise<{ messages: SmoobuMessage[] }> {
  const query = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";
  return smoobuRequest(apiKey, `/messages${query}`, "GET");
}

export async function fetchSmoobuBooking(
  apiKey: string,
  bookingId: string | number,
): Promise<Record<string, any>> {
  return smoobuRequest(apiKey, `/bookings/${bookingId}`, "GET");
}

export async function sendSmoobuMessage(
  apiKey: string,
  payload: {
    bookingId: string | number;
    body: string;
    channel?: string;
  },
): Promise<{ success: boolean }> {
  return smoobuRequest(apiKey, "/messages/reply", "POST", payload);
}

export function verifySmoobuWebhook(secret: string | undefined, provided?: string): boolean {
  if (!secret) return true; // If no secret configured, allow (useful for dev)
  if (!provided) return false;
  return secret === provided;
}

