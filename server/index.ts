import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(import.meta.dirname, "..", ".env") });
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startAutoSync } from "./ical-service";
import { startSessionCleanup } from "./session-cleanup";
import { pool } from "./db";
import crypto from "crypto";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Configuration SESSION_SECRET sécurisé
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ CRITICAL: SESSION_SECRET must be set in production!");
    console.error("   Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
    process.exit(1);
  } else {
    // Générer un secret aléatoire en développement (avec warning)
    sessionSecret = crypto.randomBytes(32).toString('hex');
    console.warn("⚠️  SESSION_SECRET not set, using generated secret (change in production!)");
  }
}

// Configuration du store de sessions PostgreSQL
const PgSession = connectPgSimple(session);
let sessionStore: any = null;

if (pool) {
  try {
    sessionStore = new PgSession({
      pool: pool,
      tableName: 'sessions', // Nom de la table dans le schéma
      createTableIfMissing: true, // Créer la table si elle n'existe pas
    });
    console.log("✅ PostgreSQL session store initialized");
  } catch (error: any) {
    console.error("⚠️  Failed to initialize PostgreSQL session store:", error.message);
    console.warn("   Falling back to memory store (sessions will be lost on restart)");
  }
}

// Session middleware avec store PostgreSQL
app.use(session({
  store: sessionStore || undefined, // Utilise PostgreSQL si disponible, sinon mémoire
  secret: sessionSecret!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production" && process.env.BASE_URL?.startsWith('https'),
    httpOnly: true,
    sameSite: 'lax', // Protection CSRF, compatible avec les redirections
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    // Domain optionnel (décommenter si nécessaire)
    // domain: process.env.COOKIE_DOMAIN,
  },
  name: 'airbnb.session', // Nom du cookie (évite les conflits)
}));

// Middleware de debug pour les sessions (développement uniquement)
if (process.env.NODE_ENV === 'development') {
  app.use((req: any, res, next) => {
    if (req.path.startsWith('/api')) {
      const sessionId = req.sessionID;
      const isAuth = req.isAuthenticated();
      const userId = req.user?.id;
      
      // Log uniquement pour les requêtes authentifiées qui échouent
      if (!isAuth && req.path !== '/api/user' && req.path !== '/api/login' && req.path !== '/api/register') {
        console.log(`[SESSION DEBUG] ${req.method} ${req.path} - Auth: ${isAuth}, Session: ${sessionId?.substring(0, 10)}..., User: ${userId || 'none'}`);
      }
    }
    next();
  });
}

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Error in Express app:", err);
    res.status(status).json({ message });
    // Don't throw - just log the error to prevent server crash
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    
    // Démarrer la synchronisation automatique des calendriers iCal
    // Sync toutes les 30 minutes par défaut
    const syncInterval = parseInt(process.env.ICAL_SYNC_INTERVAL_MINUTES || '30', 10);
    startAutoSync(syncInterval);
    log(`iCal auto-sync enabled (every ${syncInterval} minutes)`);
    
    // Démarrer le nettoyage automatique des sessions expirées
    // Nettoyage toutes les heures par défaut
    const cleanupInterval = parseInt(process.env.SESSION_CLEANUP_INTERVAL_MINUTES || '60', 10);
    startSessionCleanup(cleanupInterval);
  });
})();
