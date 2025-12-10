/**
 * Gestion des tokens permanents pour la synchronisation iCal
 * Ces tokens permettent l'accès sécurisé aux calendriers sans authentification
 */

import { db } from "./db";
import { properties, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Génère un token unique et sécurisé pour la synchronisation iCal
 */
export function generateICalToken(): string {
  // Génère un token de 32 caractères alphanumériques
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Génère et stocke un token permanent pour une propriété
 * Si un token existe déjà, il est retourné
 */
export async function getOrCreatePropertyICalToken(propertyId: string): Promise<string> {
  if (!db) {
    throw new Error("Database not initialized");
  }

  // Récupérer la propriété
  const [property] = await db.select().from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);

  if (!property) {
    throw new Error("Property not found");
  }

  // Si un token existe déjà, le retourner
  if (property.icalSyncToken) {
    return property.icalSyncToken;
  }

  // Générer un nouveau token
  const token = generateICalToken();

  // Stocker le token dans la base de données
  await db.update(properties)
    .set({ icalSyncToken: token })
    .where(eq(properties.id, propertyId));

  return token;
}

/**
 * Génère et stocke un token permanent pour un utilisateur (cleaning agent)
 * Si un token existe déjà, il est retourné
 */
export async function getOrCreateUserICalToken(userId: string): Promise<string> {
  if (!db) {
    throw new Error("Database not initialized");
  }

  // Récupérer l'utilisateur
  const [user] = await db.select().from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  // Si un token existe déjà, le retourner
  if (user.icalSyncToken) {
    return user.icalSyncToken;
  }

  // Générer un nouveau token
  const token = generateICalToken();

  // Stocker le token dans la base de données
  await db.update(users)
    .set({ icalSyncToken: token })
    .where(eq(users.id, userId));

  return token;
}

/**
 * Récupère une propriété par son token iCal (accès sans authentification)
 */
export async function getPropertyByICalToken(token: string) {
  if (!db) {
    return null;
  }

  const [property] = await db.select().from(properties)
    .where(eq(properties.icalSyncToken, token))
    .limit(1);

  return property || null;
}

/**
 * Récupère un utilisateur par son token iCal (accès sans authentification)
 */
export async function getUserByICalToken(token: string) {
  if (!db) {
    return null;
  }

  const [user] = await db.select().from(users)
    .where(eq(users.icalSyncToken, token))
    .limit(1);

  return user || null;
}

/**
 * Régénère un token pour une propriété (invalide l'ancien)
 */
export async function regeneratePropertyICalToken(propertyId: string): Promise<string> {
  if (!db) {
    throw new Error("Database not initialized");
  }

  const token = generateICalToken();

  await db.update(properties)
    .set({ icalSyncToken: token })
    .where(eq(properties.id, propertyId));

  return token;
}

/**
 * Régénère un token pour un utilisateur (invalide l'ancien)
 */
export async function regenerateUserICalToken(userId: string): Promise<string> {
  if (!db) {
    throw new Error("Database not initialized");
  }

  const token = generateICalToken();

  await db.update(users)
    .set({ icalSyncToken: token })
    .where(eq(users.id, userId));

  return token;
}

