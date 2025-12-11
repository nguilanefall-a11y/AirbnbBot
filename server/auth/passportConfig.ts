/**
 * ============================================
 * CONFIGURATION PASSPORT - FICHIER DÉDIÉ
 * ============================================
 * 
 * ⚠️  RÈGLE ABSOLUE : Ce fichier contient UNIQUEMENT :
 * - La stratégie Passport (LocalStrategy)
 * - La sérialisation utilisateur
 * - La désérialisation utilisateur
 * 
 * ❌ NE PAS ajouter d'autres middlewares ici
 * ❌ NE PAS ajouter de routes ici
 * ❌ NE PAS modifier l'ordre des fonctions
 */

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { storage } from "../storage";

const scryptAsync = promisify(scrypt);

/**
 * Comparaison de mots de passe (support bcrypt + legacy scrypt)
 */
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
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
 * Configuration de la stratégie Passport Local
 */
export function configurePassportStrategy(): void {
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          }
          const { password: _, ...userWithoutPassword } = user;
          return done(null, userWithoutPassword);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}

/**
 * Sérialisation de l'utilisateur dans la session
 * Stocke uniquement l'ID de l'utilisateur
 */
export function configurePassportSerialization(): void {
  passport.serializeUser((user: any, done) => {
    console.log(`[PASSPORT] Session serialized for user: ${user.id}`);
    done(null, user.id);
  });
}

/**
 * Désérialisation de l'utilisateur depuis la session
 * Récupère l'utilisateur complet depuis la base de données
 */
export function configurePassportDeserialization(): void {
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        console.log(`[PASSPORT] Session deserialized for user: ${id}`);
        done(null, userWithoutPassword);
      } else {
        // Utilisateur n'existe plus - nettoyer la session
        console.warn(`[PASSPORT] User not found during deserialization: ${id} - session will be invalidated`);
        done(null, false);
      }
    } catch (error: any) {
      console.error(`[PASSPORT] Error deserializing user ${id}:`, error.message);
      // En cas d'erreur, invalider la session pour éviter les boucles
      done(null, false);
    }
  });
}

/**
 * Initialisation complète de Passport
 * Appelle toutes les fonctions de configuration dans l'ordre correct
 */
export function initializePassport(): void {
  configurePassportStrategy();
  configurePassportSerialization();
  configurePassportDeserialization();
  console.log("✅ Passport configuration initialized");
}

