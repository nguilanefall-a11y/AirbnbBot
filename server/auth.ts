import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User, registerSchema, loginSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends Omit<import("@shared/schema").User, "password"> {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  // Use bcrypt for new passwords (more standard)
  return bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string) {
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

export function setupAuth(app: Express) {
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

  passport.serializeUser((user, done) => {
    console.log(`[AUTH] Session serialized for user: ${user.id}`);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        console.log(`[AUTH] Session deserialized for user: ${id}`);
        done(null, userWithoutPassword);
      } else {
        // Utilisateur n'existe plus - nettoyer la session
        console.warn(`[AUTH] User not found during deserialization: ${id} - session will be invalidated`);
        done(null, false);
      }
    } catch (error: any) {
      console.error(`[AUTH] Error deserializing user ${id}:`, error.message);
      // En cas d'erreur, invalider la session pour éviter les boucles
      done(null, false);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const data = registerSchema.parse(req.body);
      // Accepter le rôle depuis le body (host ou cleaning_agent)
      const role = req.body.role === "cleaning_agent" ? "cleaning_agent" : "host";
      
      // Vérification stricte de l'unicité de l'email
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(409).json({ 
          message: "Un compte existe déjà avec cet email",
          error: "EMAIL_ALREADY_EXISTS",
          code: "DUPLICATE_EMAIL"
        });
      }

      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
        role, // Inclure le rôle
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error: any) {
      // Gérer spécifiquement les erreurs d'email dupliqué
      if (error.message?.includes("existe déjà") || error.message?.includes("already exists")) {
        return res.status(409).json({ 
          message: "Un compte existe déjà avec cet email",
          error: "EMAIL_ALREADY_EXISTS",
          code: "DUPLICATE_EMAIL"
        });
      }
      res.status(400).json({ message: error.message || "Erreur lors de l'inscription" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    try {
      loginSchema.parse(req.body);
      passport.authenticate("local", (err: any, user: any) => {
        if (err) {
          console.error("[AUTH] Login error:", err.message);
          return next(err);
        }
        if (!user) {
          console.warn(`[AUTH] Login failed for email: ${req.body.email}`);
          return res.status(401).json({ message: "Email ou mot de passe incorrect" });
        }
        req.login(user, (err) => {
          if (err) {
            console.error(`[AUTH] Session creation failed for user ${user.id}:`, err.message);
            return next(err);
          }
          console.log(`[AUTH] Session created for user: ${user.id} (${user.email})`);
          res.json(user);
        });
      })(req, res, next);
    } catch (error: any) {
      console.error("[AUTH] Login validation error:", error.message);
      res.status(400).json({ message: error.message || "Erreur lors de la connexion" });
    }
  });

  app.post("/api/logout", (req: any, res, next) => {
    const userId = req.user?.id;
    req.logout((err: any) => {
      if (err) {
        console.error("[AUTH] Logout error:", err.message);
        return next(err);
      }
      if (userId) {
        console.log(`[AUTH] User logged out: ${userId}`);
      }
      // Détruire la session explicitement
      req.session.destroy((err: any) => {
        if (err) {
          console.error("[AUTH] Session destruction error:", err.message);
        }
        res.clearCookie('airbnb.session');
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", async (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        // Utilisateur n'existe plus - nettoyer la session
        console.warn(`[AUTH] User ${userId} not found, destroying session`);
        req.logout(() => {
          req.session.destroy(() => {});
        });
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      // Start trial if new user
      if (!user.trialStartedAt) {
        const trialDuration = 7 * 24 * 60 * 60 * 1000;
        const trialStart = new Date();
        const trialEnd = new Date(trialStart.getTime() + trialDuration);
        await storage.startTrial(userId, trialStart, trialEnd);
        user.trialStartedAt = trialStart;
        user.trialEndsAt = trialEnd;
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error(`[AUTH] Error fetching user ${req.user?.id}:`, error.message);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Non authentifié" });
  }
  next();
};
