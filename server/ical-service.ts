/**
 * Service de synchronisation iCal pour Airbnb
 * Gère l'import et la synchronisation des calendriers de réservation
 */

import { db } from "./db";
import { logger } from "./logger";
import {
  bookings,
  properties,
  icalSyncLogs,
  cleaningTasks,
} from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

interface ICalEvent {
  uid: string;
  summary: string;
  dtstart: Date;
  dtend: Date;
  description?: string;
}

/**
 * Parse un fichier iCal et extrait les événements
 */
export function parseICalData(icalData: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icalData.split(/\r?\n/);

  let currentEvent: Partial<ICalEvent> | null = null;
  let currentKey = "";
  let currentValue = "";

  for (const line of lines) {
    // Handle line folding (lines starting with space/tab are continuations)
    if (line.startsWith(" ") || line.startsWith("\t")) {
      currentValue += line.substring(1);
      continue;
    }

    // Process previous key-value pair
    if (currentKey && currentEvent) {
      processKeyValue(currentEvent, currentKey, currentValue);
    }

    // Parse new line
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      currentKey = "";
      currentValue = "";
      continue;
    }

    const keyPart = line.substring(0, colonIndex);
    currentValue = line.substring(colonIndex + 1);

    // Handle properties with parameters (e.g., DTSTART;VALUE=DATE:20240115)
    const semiIndex = keyPart.indexOf(";");
    currentKey = semiIndex > -1 ? keyPart.substring(0, semiIndex) : keyPart;

    if (currentKey === "BEGIN" && currentValue === "VEVENT") {
      currentEvent = {};
    } else if (currentKey === "END" && currentValue === "VEVENT") {
      if (
        currentEvent &&
        currentEvent.uid &&
        currentEvent.dtstart &&
        currentEvent.dtend
      ) {
        events.push(currentEvent as ICalEvent);
      }
      currentEvent = null;
    }
  }

  return events;
}

function processKeyValue(
  event: Partial<ICalEvent>,
  key: string,
  value: string
) {
  switch (key) {
    case "UID":
      event.uid = value;
      break;
    case "SUMMARY":
      event.summary = value;
      break;
    case "DESCRIPTION":
      event.description = decodeICalText(value);
      break;
    case "DTSTART":
      event.dtstart = parseICalDate(value);
      break;
    case "DTEND":
      event.dtend = parseICalDate(value);
      break;
  }
}

function parseICalDate(value: string): Date {
  // Format: YYYYMMDD ou YYYYMMDDTHHmmssZ
  const cleaned = value.replace(/[^0-9TZ]/g, "");

  if (cleaned.length === 8) {
    // Date only: YYYYMMDD
    const year = parseInt(cleaned.substring(0, 4));
    const month = parseInt(cleaned.substring(4, 6)) - 1;
    const day = parseInt(cleaned.substring(6, 8));
    return new Date(year, month, day);
  } else if (cleaned.length >= 15) {
    // Date and time: YYYYMMDDTHHmmss
    const year = parseInt(cleaned.substring(0, 4));
    const month = parseInt(cleaned.substring(4, 6)) - 1;
    const day = parseInt(cleaned.substring(6, 8));
    const hour = parseInt(cleaned.substring(9, 11));
    const minute = parseInt(cleaned.substring(11, 13));
    const second = parseInt(cleaned.substring(13, 15));

    if (cleaned.endsWith("Z")) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
    return new Date(year, month, day, hour, minute, second);
  }

  return new Date(value);
}

function decodeICalText(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Extraire le nom du voyageur depuis le summary ou description Airbnb
 */
function extractGuestName(event: ICalEvent): string {
  // Airbnb format: "Reserved - Guest Name" ou simplement le nom
  const summary = event.summary || "";

  if (summary.toLowerCase().includes("reserved")) {
    const match = summary.match(/reserved\s*[-–]\s*(.+)/i);
    if (match) return match[1].trim();
  }

  if (
    summary.toLowerCase().includes("blocked") ||
    summary.toLowerCase().includes("not available")
  ) {
    return "Blocked";
  }

  return summary || "Guest";
}

/**
 * Synchroniser le calendrier iCal d'une propriété
 */
export async function syncICalForProperty(propertyId: string): Promise<{
  success: boolean;
  imported: number;
  updated: number;
  error?: string;
}> {
  if (!db) {
    return {
      success: false,
      imported: 0,
      updated: 0,
      error: "Database not initialized",
    };
  }

  try {
    // Récupérer la propriété et son URL iCal
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (!property) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        error: "Property not found",
      };
    }

    if (!property.icalUrl) {
      return {
        success: false,
        imported: 0,
        updated: 0,
        error: "No iCal URL configured for this property",
      };
    }

    // Fetch le calendrier iCal
    const response = await fetch(property.icalUrl, {
      headers: {
        "User-Agent": "AirbnbBot/1.0 iCal Sync",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch iCal: ${response.status} ${response.statusText}`
      );
    }

    const icalData = await response.text();
    const events = parseICalData(icalData);

    let imported = 0;
    let updated = 0;

    for (const event of events) {
      // Skip blocked dates (no real booking)
      const guestName = extractGuestName(event);
      if (guestName === "Blocked") continue;

      // Check si la réservation existe déjà (par externalId)
      const [existing] = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.propertyId, propertyId),
            eq(bookings.externalId, event.uid)
          )
        )
        .limit(1);

      if (existing) {
        // Update existing booking
        await db
          .update(bookings)
          .set({
            guestName,
            checkInDate: event.dtstart,
            checkOutDate: event.dtend,
            notes: event.description || null,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, existing.id));
        updated++;

        // Update associated cleaning task if exists
        await updateCleaningTaskForBooking(existing.id, event.dtend);
      } else {
        // Create new booking
        const [newBooking] = await db
          .insert(bookings)
          .values({
            propertyId,
            guestName,
            checkInDate: event.dtstart,
            checkOutDate: event.dtend,
            source: "ical",
            externalId: event.uid,
            notes: event.description || null,
            status: "confirmed",
          })
          .returning();
        imported++;

        // Create cleaning task for this booking (scheduled for checkout day)
        await createCleaningTaskForBooking(
          propertyId,
          newBooking.id,
          event.dtend
        );
      }
    }

    // Update property last imported timestamp
    await db
      .update(properties)
      .set({ lastImportedAt: new Date() })
      .where(eq(properties.id, propertyId));

    // Log the sync
    await db.insert(icalSyncLogs).values({
      propertyId,
      syncStatus: "success", // Toujours spécifier explicitement
      bookingsImported: imported.toString(),
      bookingsUpdated: updated.toString(),
    });

    return { success: true, imported, updated };
  } catch (error: any) {
    logger.error("iCal sync error:", error);

    // Log the error
    if (db) {
      await db.insert(icalSyncLogs).values({
        propertyId,
        syncStatus: "failed",
        errorMessage: error.message,
        bookingsImported: "0",
        bookingsUpdated: "0",
      });
    }

    return { success: false, imported: 0, updated: 0, error: error.message };
  }
}

/**
 * Créer une tâche de ménage automatiquement pour une réservation
 */
async function createCleaningTaskForBooking(
  propertyId: string,
  bookingId: string,
  checkoutDate: Date
) {
  if (!db) return;

  // Récupérer la propriété pour avoir le personnel de ménage assigné
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);

  await db.insert(cleaningTasks).values({
    propertyId,
    bookingId,
    cleaningStaffId: property?.cleaningPersonId || null,
    scheduledDate: checkoutDate,
    scheduledStartTime: property?.checkOutTime || "11:00",
    scheduledEndTime: property?.checkInTime || "15:00",
    status: "pending",
    priority: "normal",
  });
}

/**
 * Mettre à jour la tâche de ménage si la date de checkout change
 */
async function updateCleaningTaskForBooking(
  bookingId: string,
  newCheckoutDate: Date
) {
  if (!db) return;

  await db
    .update(cleaningTasks)
    .set({
      scheduledDate: newCheckoutDate,
      updatedAt: new Date(),
    })
    .where(eq(cleaningTasks.bookingId, bookingId));
}

/**
 * Récupérer les réservations pour une plage de dates
 */
export async function getBookingsForDateRange(
  propertyId: string,
  startDate: Date,
  endDate: Date
) {
  if (!db) return [];

  return await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.propertyId, propertyId),
        gte(bookings.checkInDate, startDate),
        lte(bookings.checkOutDate, endDate)
      )
    )
    .orderBy(bookings.checkInDate);
}

/**
 * Récupérer le calendrier complet (réservations + tâches ménage) pour une propriété
 */
export async function getPropertyCalendar(propertyId: string, month: Date) {
  if (!db) return { bookings: [], cleaningTasks: [] };

  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
    23,
    59,
    59
  );

  const monthBookings = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.propertyId, propertyId),
        gte(bookings.checkOutDate, startOfMonth),
        lte(bookings.checkInDate, endOfMonth)
      )
    )
    .orderBy(bookings.checkInDate);

  const monthCleaningTasks = await db
    .select()
    .from(cleaningTasks)
    .where(
      and(
        eq(cleaningTasks.propertyId, propertyId),
        gte(cleaningTasks.scheduledDate, startOfMonth),
        lte(cleaningTasks.scheduledDate, endOfMonth)
      )
    )
    .orderBy(cleaningTasks.scheduledDate);

  return {
    bookings: monthBookings,
    cleaningTasks: monthCleaningTasks,
  };
}

// ========================================
// SYNCHRONISATION AUTOMATIQUE PÉRIODIQUE
// ========================================

let syncIntervalId: NodeJS.Timeout | null = null;

/**
 * Synchroniser automatiquement TOUS les calendriers iCal configurés
 */
export async function syncAllICalCalendars(): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  if (!db) {
    logger.info("[iCal Auto-Sync] Database not initialized, skipping...");
    return { total: 0, success: 0, failed: 0 };
  }

  logger.info("[iCal Auto-Sync] Starting automatic synchronization...");

  try {
    // Récupérer toutes les propriétés avec une URL iCal configurée
    const propertiesWithIcal = await db
      .select()
      .from(properties)
      .where(
        sql`${properties.icalUrl} IS NOT NULL AND ${properties.icalUrl} != ''`
      );

    logger.info(
      `[iCal Auto-Sync] Found ${propertiesWithIcal.length} properties with iCal configured`
    );

    let success = 0;
    let failed = 0;

    for (const property of propertiesWithIcal) {
      try {
        const result = await syncICalForProperty(property.id);
        if (result.success) {
          success++;
          logger.info(
            `[iCal Auto-Sync] ✓ ${property.name}: ${result.imported} imported, ${result.updated} updated`
          );
        } else {
          failed++;
          logger.error(`[iCal Auto-Sync] ✗ ${property.name}: ${result.error}`);
        }
      } catch (error: any) {
        failed++;
        logger.error(`[iCal Auto-Sync] ✗ ${property.name}: ${error.message}`);
      }

      // Petit délai entre chaque sync pour ne pas surcharger
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info(
      `[iCal Auto-Sync] Completed: ${success}/${propertiesWithIcal.length} successful`
    );

    return {
      total: propertiesWithIcal.length,
      success,
      failed,
    };
  } catch (error: any) {
    logger.error("[iCal Auto-Sync] Error during sync:", error.message);
    return { total: 0, success: 0, failed: 0 };
  }
}

/**
 * Démarrer la synchronisation automatique périodique
 * @param intervalMinutes Intervalle entre chaque sync (défaut: 30 minutes)
 */
export function startAutoSync(intervalMinutes: number = 30) {
  if (syncIntervalId) {
    logger.info("[iCal Auto-Sync] Auto-sync already running");
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;

  logger.info(
    `[iCal Auto-Sync] Starting auto-sync every ${intervalMinutes} minutes`
  );

  // Sync immédiatement au démarrage (avec un délai de 10 secondes pour laisser le serveur démarrer)
  setTimeout(() => {
    syncAllICalCalendars();
  }, 10000);

  // Puis sync périodiquement
  syncIntervalId = setInterval(() => {
    syncAllICalCalendars();
  }, intervalMs);
}

/**
 * Arrêter la synchronisation automatique
 */
export function stopAutoSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    logger.info("[iCal Auto-Sync] Auto-sync stopped");
  }
}

// Importer sql pour la requête IS NOT NULL
import { sql } from "drizzle-orm";
