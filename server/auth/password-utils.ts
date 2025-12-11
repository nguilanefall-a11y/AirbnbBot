/**
 * Utilitaires de gestion des mots de passe
 * Source unique de vérité pour le hashing et la comparaison
 */

import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";

const scryptAsync = promisify(scrypt);

/**
 * Compare un mot de passe fourni avec un hash stocké
 * Supporte bcrypt (nouveau format) et scrypt (legacy)
 */
export async function comparePasswords(
  supplied: string,
  stored: string
): Promise<boolean> {
  // Check if it's a bcrypt hash (starts with $2)
  if (stored.startsWith("$2")) {
    return bcrypt.compare(supplied, stored);
  }

  // Legacy scrypt format (hash.salt)
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;

    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;

    if (hashedBuf.length !== suppliedBuf.length) return false;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch {
    return false;
  }
}

/**
 * Hash un nouveau mot de passe avec bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
