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
import { storage } from "../storage";
import { comparePasswords } from "./password-utils";

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
        console.warn(
          `[PASSPORT] User not found during deserialization: ${id} - session will be invalidated`
        );
        done(null, false);
      }
    } catch (error: any) {
      console.error(
        `[PASSPORT] Database error deserializing user ${id}:`,
        error.message
      );
      console.error(`[PASSPORT] Stack trace:`, error.stack);
      // Erreur BDD temporaire : renvoyer l'erreur au lieu de false
      // Cela permet a Passport de retry au lieu de detruire la session
      done(error);
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
