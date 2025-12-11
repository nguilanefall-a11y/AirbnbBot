import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import { storage } from "./storage";
import { User, registerSchema, loginSchema } from "@shared/schema";
import { comparePasswords, hashPassword } from "./auth/password-utils";
import { logger } from "./logger";

declare global {
  namespace Express {
    interface User extends Omit<import("@shared/schema").User, "password"> {}
  }
}

/**
 * Configuration des routes d'authentification
 *
 * ⚠️  NOTE : La configuration Passport elle-même est maintenant dans
 * server/auth/passportConfig.ts et est initialisée dans server/index.ts
 * AVANT l'appel à setupAuth().
 *
 * Ce fichier contient uniquement les routes d'authentification.
 */
export function setupAuth(app: Express, authLimiter?: any) {
  // La configuration Passport est maintenant gérée par initializePassport()
  // dans server/index.ts, donc on ne configure plus Passport ici

  app.post("/api/register", authLimiter || [], async (req, res, next) => {
    try {
      const data = registerSchema.parse(req.body);
      // Accepter le rôle depuis le body (host ou cleaning_agent)
      const role =
        req.body.role === "cleaning_agent" ? "cleaning_agent" : "host";

      // Vérification stricte de l'unicité de l'email
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(409).json({
          message: "Un compte existe déjà avec cet email",
          error: "EMAIL_ALREADY_EXISTS",
          code: "DUPLICATE_EMAIL",
        });
      }

      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
        role, // Inclure le rôle
      });

      // Demarrer le trial automatiquement pour les nouveaux utilisateurs
      const trialDuration = 7 * 24 * 60 * 60 * 1000; // 7 jours
      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + trialDuration);
      await storage.startTrial(user.id, trialStart, trialEnd);
      user.trialStartedAt = trialStart;
      user.trialEndsAt = trialEnd;

      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error: any) {
      // Gérer spécifiquement les erreurs d'email dupliqué
      if (
        error.message?.includes("existe déjà") ||
        error.message?.includes("already exists")
      ) {
        return res.status(409).json({
          message: "Un compte existe déjà avec cet email",
          error: "EMAIL_ALREADY_EXISTS",
          code: "DUPLICATE_EMAIL",
        });
      }
      res
        .status(400)
        .json({ message: error.message || "Erreur lors de l'inscription" });
    }
  });

  app.post("/api/login", authLimiter || [], (req, res, next) => {
    try {
      loginSchema.parse(req.body);
      passport.authenticate("local", (err: any, user: any) => {
        if (err) {
          logger.error("[AUTH] Login error:", err.message);
          return next(err);
        }
        if (!user) {
          logger.warn(`[AUTH] Login failed for email: ${req.body.email}`);
          return res
            .status(401)
            .json({ message: "Email ou mot de passe incorrect" });
        }
        req.login(user, (err) => {
          if (err) {
            logger.error(
              `[AUTH] Session creation failed for user ${user.id}:`,
              err.message
            );
            return next(err);
          }
          logger.info(
            `[AUTH] Session created for user: ${user.id} (${user.email})`
          );
          res.json(user);
        });
      })(req, res, next);
    } catch (error: any) {
      logger.error("[AUTH] Login validation error:", error.message);
      res
        .status(400)
        .json({ message: error.message || "Erreur lors de la connexion" });
    }
  });

  app.post("/api/logout", (req: any, res, next) => {
    const userId = req.user?.id;
    req.logout((err: any) => {
      if (err) {
        logger.error("[AUTH] Logout error:", err.message);
        return next(err);
      }
      if (userId) {
        logger.info(`[AUTH] User logged out: ${userId}`);
      }
      // Détruire la session explicitement
      req.session.destroy((err: any) => {
        if (err) {
          logger.error("[AUTH] Session destruction error:", err.message);
        }
        res.clearCookie("airbnb.session");
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", async (req: any, res) => {
    // Log détaillé pour debugging
    const sessionId = req.sessionID;
    const isAuth = req.isAuthenticated();
    const userId = req.user?.id;

    if (!isAuth) {
      logger.warn(
        `[AUTH] /api/user - Not authenticated. Session: ${sessionId?.substring(
          0,
          10
        )}..., User: ${userId || "none"}`
      );
      return res.status(401).json({
        message: "Non authentifié",
        sessionId: sessionId || null,
        hasSession: !!req.session,
      });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        // Utilisateur n'existe plus - nettoyer la session
        logger.warn(`[AUTH] User ${userId} not found, destroying session`);
        req.logout(() => {
          req.session.destroy(() => {});
        });
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      const { password: _, ...userWithoutPassword } = user;
      logger.info(
        `[AUTH] /api/user - Returning user: ${user.email} (${userId})`
      );
      res.json(userWithoutPassword);
    } catch (error: any) {
      logger.error(`[AUTH] Error fetching user ${userId}:`, error.message);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  // Log détaillé pour debugging
  const isAuth = req.isAuthenticated();
  const userId = req.user?.id;
  const sessionId = req.sessionID;

  if (!isAuth) {
    logger.warn(`[AUTH] Unauthenticated request to ${req.method} ${req.path}`);
    logger.warn(
      `[AUTH] Session ID: ${sessionId}, User ID: ${userId || "none"}`
    );
    logger.warn(
      `[AUTH] Session exists: ${!!req.session}, User in session: ${!!req.user}`
    );

    // Vérifier si c'est un problème de session expirée
    if (req.session && !req.user) {
      logger.warn(
        `[AUTH] Session exists but user not deserialized - possible session corruption`
      );
    }

    return res.status(401).json({
      message: "Non authentifié",
      error: "UNAUTHORIZED",
      path: req.path,
      sessionId: sessionId || null,
    });
  }

  // Log pour les requêtes authentifiées (optionnel, peut être désactivé en production)
  if (process.env.NODE_ENV === "development") {
    logger.info(
      `[AUTH] Authenticated request: ${req.method} ${req.path} by user ${userId}`
    );
  }

  next();
};
