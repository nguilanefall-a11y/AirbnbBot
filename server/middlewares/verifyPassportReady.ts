/**
 * ============================================
 * MIDDLEWARE DE VÉRIFICATION PASSPORT
 * ============================================
 * 
 * ⚠️  GARDE-FOU PERMANENT
 * 
 * Ce middleware DOIT être placé APRÈS :
 * - passport.initialize()
 * - passport.session()
 * 
 * Et AVANT :
 * - Tous les middlewares qui utilisent req.isAuthenticated()
 * - Toutes les routes protégées
 * 
 * Il empêche l'application de fonctionner si Passport n'est pas correctement initialisé.
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Vérifie que Passport est correctement initialisé avant toute utilisation
 * 
 * @throws {Error} Si req.isAuthenticated n'existe pas
 */
export function verifyPassportReady(req: Request, res: Response, next: NextFunction): void {
  // Vérification critique : req.isAuthenticated doit exister
  if (typeof (req as any).isAuthenticated !== "function") {
    const error = "[CRITICAL] Passport is NOT initialized before its usage.";
    console.error(error);
    console.error("   Order should be:");
    console.error("   1. app.use(session({ ... }))");
    console.error("   2. app.use(passport.initialize())");
    console.error("   3. app.use(passport.session())");
    console.error("   4. app.use(verifyPassportReady) <- YOU ARE HERE");
    console.error("   5. app.use(debugAuth)");
    console.error("   6. Routes");
    
    // En production, retourner une erreur 500
    if (process.env.NODE_ENV === "production") {
      res.status(500).json({
        error: "PassportNotInitialized",
        message: "req.isAuthenticated() was called before Passport initialization.",
        critical: true
      });
      return;
    }
    
    // En développement, permettre de continuer mais avec un warning fort
    console.warn("⚠️  Continuing in development mode, but this is a CRITICAL error!");
  }
  
  next();
}

