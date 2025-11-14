import ical from "node-ical";
import twilio from "twilio";
import { db } from "./db";
import {
  cleanings,
  cleaningPersons,
  properties,
  type Cleaning,
} from "@shared/schema";
import { asc, eq, isNotNull } from "drizzle-orm";

export interface CleaningTaskWithRelations extends Cleaning {
  propertyName: string | null;
  propertyAccessKey: string | null;
  cleanerName: string | null;
  cleanerPhone: string | null;
  cleanerWhatsapp: boolean | null;
  cleanerEmail: string | null;
}

function ensureDb() {
  if (!db) {
    throw new Error("La base de données n'est pas configurée. Ajoute SUPABASE_DB_URL à ton .env");
  }
  return db;
}

export async function listCleaningsForUser(userId: string): Promise<CleaningTaskWithRelations[]> {
  const database = ensureDb();

  const results = await database
    .select({
      id: cleanings.id,
      propertyId: cleanings.propertyId,
      dateMenage: cleanings.dateMenage,
      status: cleanings.status,
      assignedTo: cleanings.assignedTo,
      notes: cleanings.notes,
      createdAt: cleanings.createdAt,
      updatedAt: cleanings.updatedAt,
      propertyName: properties.name,
      propertyAccessKey: properties.accessKey,
      cleanerName: cleaningPersons.name,
      cleanerPhone: cleaningPersons.phone,
      cleanerWhatsapp: cleaningPersons.whatsapp,
      cleanerEmail: cleaningPersons.email,
    })
    .from(cleanings)
    .innerJoin(properties, eq(cleanings.propertyId, properties.id))
    .leftJoin(cleaningPersons, eq(cleanings.assignedTo, cleaningPersons.id))
    .where(eq(properties.userId, userId))
    .orderBy(asc(cleanings.dateMenage));

  return results.map((row) => ({
    id: row.id,
    propertyId: row.propertyId,
    dateMenage: row.dateMenage,
    status: row.status,
    assignedTo: row.assignedTo,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    propertyName: row.propertyName,
    propertyAccessKey: row.propertyAccessKey,
    cleanerName: row.cleanerName,
    cleanerPhone: row.cleanerPhone,
    cleanerWhatsapp: row.cleanerWhatsapp,
    cleanerEmail: row.cleanerEmail,
  }));
}

export async function syncAirbnbCalendars() {
  const database = ensureDb();
  const now = new Date();

  const propertiesWithCalendars = await database
    .select({
      id: properties.id,
      name: properties.name,
      icalUrl: properties.icalUrl,
      cleaningPersonId: properties.cleaningPersonId,
    })
    .from(properties)
    .where(isNotNull(properties.icalUrl));

  let createdCount = 0;
  const skipped: Array<{ propertyId: string; reason: string }> = [];

  for (const property of propertiesWithCalendars) {
    if (!property.icalUrl) {
      skipped.push({ propertyId: property.id, reason: "URL iCal manquante" });
      continue;
    }

    try {
      const events = await ical.async.fromURL(property.icalUrl);
      for (const event of Object.values(events)) {
        if (!event || event.type !== "VEVENT" || !event.end) continue;
        const endDate = new Date(event.end as string | number | Date);
        if (Number.isNaN(endDate.getTime())) continue;
        if (endDate.getTime() <= now.getTime()) continue;

        const inserted = await database
          .insert(cleanings)
          .values({
            propertyId: property.id,
            dateMenage: endDate,
            status: "à faire",
            assignedTo: property.cleaningPersonId ?? null,
            notes: typeof event.summary === "string" ? event.summary : null,
          })
          .onConflictDoNothing({
            target: [cleanings.propertyId, cleanings.dateMenage],
          })
          .returning({ id: cleanings.id });

        if (inserted.length > 0) {
          createdCount += inserted.length;
        }
      }
    } catch (error: any) {
      skipped.push({
        propertyId: property.id,
        reason: error?.message || "Erreur inconnue lors de la récupération du calendrier",
      });
    }
  }

  return { createdCount, skipped };
}

export async function markCleaningStatus(id: string, status: string, note?: string) {
  const database = ensureDb();
  const update: { status: string; notes?: string | null; updatedAt: Date } = {
    status,
    updatedAt: new Date(),
  };
  if (typeof note === "string") {
    update.notes = note;
  }

  const result = await database
    .update(cleanings)
    .set(update)
    .where(eq(cleanings.id, id))
    .returning();

  return result[0];
}

export async function notifyCleaningTask(id: string) {
  const database = ensureDb();
  const [cleaning] = await database
    .select({
      id: cleanings.id,
      dateMenage: cleanings.dateMenage,
      status: cleanings.status,
      propertyName: properties.name,
      cleanerName: cleaningPersons.name,
      cleanerPhone: cleaningPersons.phone,
      cleanerWhatsapp: cleaningPersons.whatsapp,
    })
    .from(cleanings)
    .innerJoin(properties, eq(cleanings.propertyId, properties.id))
    .leftJoin(cleaningPersons, eq(cleanings.assignedTo, cleaningPersons.id))
    .where(eq(cleanings.id, id))
    .limit(1);

  if (!cleaning) {
    throw new Error("Tâche de ménage introuvable");
  }

  if (!cleaning.cleanerPhone) {
    throw new Error("Aucun numéro de téléphone associé à cette tâche");
  }

  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const fromNumber = process.env.TWILIO_NUMBER;

  if (!sid || !token || !fromNumber) {
    throw new Error("Twilio n'est pas configuré (TWILIO_SID, TWILIO_TOKEN, TWILIO_NUMBER)");
  }

  const client = twilio(sid, token);
  const target = cleaning.cleanerWhatsapp ? `whatsapp:${cleaning.cleanerPhone}` : cleaning.cleanerPhone;

  const formattedDate = cleaning.dateMenage
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(cleaning.dateMenage)
    : "bientôt";

  const body = `Bonjour ${cleaning.cleanerName ?? ""} !\n\nMénage prévu pour ${cleaning.propertyName ?? "la propriété"} le ${formattedDate}. Merci de confirmer quand c'est terminé.`;

  await client.messages.create({
    from: cleaning.cleanerWhatsapp ? `whatsapp:${fromNumber.replace(/^whatsapp:/, "")}` : fromNumber,
    to: target,
    body,
  });

  return { success: true };
}

export async function getCleaningById(id: string) {
  const database = ensureDb();
  const [row] = await database
    .select()
    .from(cleanings)
    .where(eq(cleanings.id, id))
    .limit(1);
  return row;
}
