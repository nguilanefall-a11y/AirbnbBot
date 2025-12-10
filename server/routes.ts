import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertPropertySchema, insertConversationSchema, insertMessageSchema, insertMessageFeedbackSchema, insertResponseTemplateSchema, insertTeamMemberSchema, insertNotificationSchema } from "@shared/schema";
import { generateChatResponse, generateChatResponseWithFallback, extractAirbnbInfo, extractAirbnbInfoFromText } from "./gemini";
import { scrapeAirbnbWithPlaywright } from "./airbnb-playwright";
import { registerCleaningRoutes } from "./cleaning-routes";

// Initialize Stripe (optional - only needed for subscription features)
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Middleware to check if user can create/modify properties
// First property is FREE, additional properties require subscription
async function ensurePropertyAccess(req: any, res: any, next: any) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      console.error("ensurePropertyAccess: No user ID in request");
      return res.status(401).json({ error: "Authentication required" });
    }

    let user;
    try {
      user = await storage.getUser(userId);
    } catch (userError: any) {
      console.error("ensurePropertyAccess: Error fetching user:", userError?.message || userError);
      return res.status(500).json({ 
        error: "Failed to verify user",
        details: userError?.message || "Database error"
      });
    }
    
    if (!user) {
      console.error("ensurePropertyAccess: User not found:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    // Count user's existing properties
    let userProperties;
    try {
      userProperties = await storage.getPropertiesByUser(userId);
    } catch (propError: any) {
      console.error("ensurePropertyAccess: Error fetching properties:", propError?.message || propError);
      // Don't block access if we can't count properties - allow the operation
      console.warn("ensurePropertyAccess: Allowing access despite property count error");
      return next();
    }
    
    const propertyCount = userProperties?.length || 0;

    // Allow if user has an active subscription or trial
    if (user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) {
      return next(); // Trial is active
    }

    if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
      return next(); // Subscription is active
    }

    // Allow first property for free (when creating)
    if (req.method === 'POST' && propertyCount === 0) {
      return next(); // First property is free!
    }

    // Allow modifications to existing properties
    if (req.method === 'PATCH' || req.method === 'DELETE') {
      return next(); // Can always modify existing properties
    }

    // Block creation of second+ property without subscription
    return res.status(403).json({ 
      error: "Subscription required",
      message: "Votre première propriété est gratuite ! Pour ajouter plus de propriétés, veuillez souscrire à un abonnement.",
      needsSubscription: true,
      currentPropertyCount: propertyCount
    });
  } catch (error: any) {
    console.error("Error checking property access:", error);
    console.error("Error stack:", error?.stack);
    return res.status(500).json({ 
      error: "Failed to verify access",
      details: error?.message || "Unknown error"
    });
  }
}

// Alias for backward compatibility
const ensureHostAccess = ensurePropertyAccess;

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Register cleaning module routes (Section Ménage Intelligente)
  registerCleaningRoutes(app);

  // Health check endpoint for Render
  app.get("/api/health", async (req, res) => {
    try {
      // Simple health check - verify DB connection by making a simple query
      const testUser = await storage.getUserByEmail("health-check-test@test.com");
      res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        database: "connected"
      });
    } catch (error: any) {
      console.error("[Health Check] Database error:", error?.message);
      res.status(503).json({ 
        status: "degraded", 
        timestamp: new Date().toISOString(),
        database: "error",
        error: error?.message
      });
    }
  });

  // Test endpoint pour vérifier les tables
  app.get("/api/test-db", async (req, res) => {
    try {
      const { pool } = await import("./db");
      if (!pool) {
        return res.status(500).json({ error: "Database pool not initialized" });
      }

      const client = await pool.connect();
      try {
        // Vérifier les tables principales
        const tables = [
          'users', 'properties', 'bookings', 'conversations', 'messages',
          'cleaning_staff', 'cleaning_tasks', 'cleaning_notes', 'property_assignments',
          'cleaner_unavailability', 'blocked_periods', 'sessions'
        ];

        const results: Record<string, boolean> = {};
        for (const table of tables) {
          try {
            const result = await client.query(
              `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
              [table]
            );
            results[table] = parseInt(result.rows[0].count) > 0;
          } catch (err: any) {
            results[table] = false;
          }
        }

        // Test d'une requête simple
        let queryTest = false;
        try {
          await client.query('SELECT COUNT(*) FROM users');
          queryTest = true;
        } catch (err: any) {
          queryTest = false;
        }

        res.json({
          status: "ok",
          tables: results,
          queryTest,
          totalTables: Object.values(results).filter(Boolean).length,
          missingTables: Object.entries(results).filter(([_, exists]) => !exists).map(([name]) => name)
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      res.status(500).json({ 
        error: "Database test failed", 
        message: error?.message,
        code: error?.code
      });
    }
  });

  // Note: /api/user route is defined in auth.ts (setupAuth)
  // This route is handled by the auth middleware

  // Properties routes - Get user's own properties (protected)
  app.get("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const properties = await storage.getPropertiesByUser(userId);
      res.json(properties);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  app.get("/api/properties/by-key/:accessKey", async (req, res) => {
    try {
      const property = await storage.getPropertyByAccessKey(req.params.accessKey);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  /**
   * GET /api/reservation/:accessKey - Portail Unifié de Réservation
   * 
   * Récupère les données complètes pour le lien unique envoyé au voyageur.
   * Gère la logique de déblocage 24h avant le check-in.
   * 
   * Retourne:
   * - booking: informations de la réservation
   * - property: informations du logement
   * - arrivalInfo: statut de déblocage avec timer
   * - canChat: si le chat est disponible
   */
  app.get("/api/reservation/:accessKey", async (req, res) => {
    try {
      const { accessKey } = req.params;
      console.log(`[API] /api/reservation/${accessKey} - Starting lookup`);
      
      // 1. Chercher d'abord dans les réservations (bookings)
      let booking = await storage.getBookingByAccessKey(accessKey);
      console.log(`[API] Booking found by accessKey:`, booking ? 'yes' : 'no');
      let property = null;
      
      if (booking) {
        // Booking trouvé - récupérer la propriété associée
        property = await storage.getProperty(booking.propertyId);
        console.log(`[API] Property found by booking.propertyId:`, property ? 'yes' : 'no');
      } else {
        // 2. Fallback: chercher par accessKey de propriété (ancien système)
        property = await storage.getPropertyByAccessKey(accessKey);
        console.log(`[API] Property found by accessKey:`, property ? 'yes' : 'no');
        
        if (property) {
          // Chercher une réservation active pour cette propriété
          booking = await storage.getActiveBookingForProperty(property.id);
          console.log(`[API] Active booking for property:`, booking ? 'yes' : 'no');
          
          // Si pas de booking, créer un booking virtuel pour la compatibilité
          if (!booking) {
            console.log(`[API] Creating virtual booking`);
            booking = {
              id: 'virtual-' + property.id,
              propertyId: property.id,
              guestName: null,
              checkInDate: new Date(), // Aujourd'hui par défaut
              checkOutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
              status: 'confirmed',
              accessKey: accessKey,
            } as any;
          }
        }
      }
      
      if (!property || !booking) {
        console.log(`[API] Reservation not found - property:`, !!property, 'booking:', !!booking);
        return res.status(404).json({ 
          error: "Réservation non trouvée",
          message: "Ce lien n'est pas valide ou a expiré. Veuillez contacter votre hôte."
        });
      }
      
      // 3. Calculer la logique de déblocage 24h avant le check-in
      const now = new Date();
      
      console.log(`[API] Raw booking.checkInDate:`, booking.checkInDate, typeof booking.checkInDate);
      console.log(`[API] Raw booking.checkOutDate:`, booking.checkOutDate, typeof booking.checkOutDate);
      
      // Gérer les dates qui peuvent être string ou Date
      let checkInDate: Date;
      let checkOutDate: Date;
      
      try {
        if (booking.checkInDate instanceof Date && !isNaN(booking.checkInDate.getTime())) {
          checkInDate = booking.checkInDate;
        } else if (typeof booking.checkInDate === 'string') {
          checkInDate = new Date(booking.checkInDate);
        } else {
          checkInDate = new Date(); // Fallback
        }
        
        if (booking.checkOutDate instanceof Date && !isNaN(booking.checkOutDate.getTime())) {
          checkOutDate = booking.checkOutDate;
        } else if (typeof booking.checkOutDate === 'string') {
          checkOutDate = new Date(booking.checkOutDate);
        } else {
          checkOutDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Fallback +7 jours
        }
        
        // Vérifier que les dates sont valides
        if (isNaN(checkInDate.getTime())) {
          console.log(`[API] Invalid checkInDate, using today`);
          checkInDate = new Date();
        }
        if (isNaN(checkOutDate.getTime())) {
          console.log(`[API] Invalid checkOutDate, using +7 days`);
          checkOutDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
      } catch (dateError) {
        console.error(`[API] Date parsing error:`, dateError);
        checkInDate = new Date();
        checkOutDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
      
      console.log(`[API] Dates parsed - checkIn: ${checkInDate}, checkOut: ${checkOutDate}`);
      
      // Parser l'heure de check-in (format "HH:MM")
      const checkInTime = property.checkInTime || "15:00";
      const [checkInHour, checkInMinute] = checkInTime.split(":").map(Number);
      
      // Date exacte du check-in avec l'heure
      const checkInDateTime = new Date(checkInDate);
      checkInDateTime.setHours(checkInHour, checkInMinute, 0, 0);
      
      // 24 heures avant le check-in
      const unlockDateTime = new Date(checkInDateTime);
      unlockDateTime.setHours(unlockDateTime.getHours() - 24);
      
      // Calculer si débloqué et temps restant
      const isUnlocked = now >= unlockDateTime && now <= checkOutDate;
      const hoursUntilUnlock = Math.max(0, Math.ceil((unlockDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
      
      let unlockMessage = "";
      if (isUnlocked) {
        unlockMessage = "Bienvenue ! Toutes les informations d'accès sont disponibles.";
      } else if (now < unlockDateTime) {
        unlockMessage = `Les informations d'arrivée seront disponibles le ${unlockDateTime.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        })} à ${unlockDateTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`;
      } else {
        unlockMessage = "Cette réservation est terminée.";
      }
      
      // 4. Retourner les données complètes
      res.json({
        booking: {
          id: booking.id,
          propertyId: booking.propertyId,
          guestName: booking.guestName,
          checkInDate: checkInDate.toISOString(),
          checkOutDate: checkOutDate.toISOString(),
          status: booking.status,
        },
        property: property,
        arrivalInfo: {
          unlocked: isUnlocked,
          unlocksAt: unlockDateTime.toISOString(),
          hoursUntilUnlock: hoursUntilUnlock,
          message: unlockMessage,
        },
        canChat: true, // Le chat est toujours disponible
      });
    } catch (error: any) {
      console.error("[API] Error fetching reservation:", error?.message || error);
      console.error("[API] Stack:", error?.stack);
      res.status(500).json({ 
        error: "Failed to fetch reservation data",
        details: process.env.NODE_ENV !== 'production' ? error?.message : undefined
      });
    }
  });

  // Check if guest is within J-1 window (for arrival info visibility)
  app.get("/api/arrival-eligibility/:propertyId", async (req, res) => {
    try {
      const { propertyId } = req.params;
      
      // Get property to verify it exists
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      // Check if there's an active booking for this property
      const activeBooking = await storage.getActiveBookingForProperty(propertyId);
      
      if (!activeBooking) {
        // No active booking - arrival info should NOT be shown (J-1 gating requires a booking)
        const hasArrivalInfo = property.arrivalMessage || property.arrivalVideoUrl;
        return res.json({ 
          eligible: false,
          reason: hasArrivalInfo ? "no_active_booking" : "no_booking_and_no_arrival_info",
          hasArrivalInfo: hasArrivalInfo,
          checkInDate: null,
          checkOutDate: null,
          message: "Les informations d'arrivée seront disponibles la veille de votre check-in."
        });
      }

      // Calculate J-1 window
      const now = new Date();
      const checkInDate = new Date(activeBooking.checkInDate);
      const checkOutDate = new Date(activeBooking.checkOutDate);
      
      // J-1 means the day before check-in (24 hours before midnight of check-in day)
      const jMinus1 = new Date(checkInDate);
      jMinus1.setDate(jMinus1.getDate() - 1);
      jMinus1.setHours(0, 0, 0, 0);

      // Eligible if current time is >= J-1 and before checkout
      const isEligible = now >= jMinus1 && now < checkOutDate;

      res.json({
        eligible: isEligible,
        reason: isEligible ? "within_j1_window" : "before_j1_window",
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        jMinus1Date: jMinus1.toISOString()
      });
    } catch (error) {
      console.error("Error checking arrival eligibility:", error);
      res.status(500).json({ error: "Failed to check arrival eligibility" });
    }
  });

  // ========================================
  // EXPORT iCAL - Génère un lien .ics pour Airbnb
  // Supporte deux modes : par ID (legacy) ou par token (permanent, sans authentification)
  // ========================================
  app.get("/api/calendar/:identifier/export.ics", async (req, res) => {
    try {
      const { identifier } = req.params;
      const { token } = req.query; // Supporte aussi ?token=xxx
      
      let property = null;
      
      // Mode 1: Token permanent (accès sans authentification, prioritaire)
      if (token && typeof token === 'string') {
        const { getPropertyByICalToken } = await import("./ical-tokens");
        property = await getPropertyByICalToken(token);
        if (!property) {
          return res.status(404).send("Invalid token or property not found");
        }
      } else {
        // Mode 2: ID direct (legacy, pour compatibilité)
        property = await storage.getProperty(identifier);
        if (!property) {
          return res.status(404).send("Property not found");
        }
      }

      // Récupérer les réservations
      const bookings = await storage.getBookingsByProperty(propertyId);

      // Helper pour formater les dates en YYYYMMDD
      const formatDate = (d: Date) => {
        if (!d || isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0].replace(/-/g, '');
      };

      // Générer le calendrier iCal
      const now = new Date();
      const nowFormatted = formatDate(now);
      
      // Filtrer et mapper les réservations valides
      const icalEvents = bookings
        .filter((booking: any) => {
          // Vérifier que les dates existent et sont valides
          if (!booking.checkInDate || !booking.checkOutDate) return false;
          const checkIn = new Date(booking.checkInDate);
          const checkOut = new Date(booking.checkOutDate);
          return !isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime());
        })
        .map((booking: any) => {
          const checkIn = new Date(booking.checkInDate);
          const checkOut = new Date(booking.checkOutDate);
          const uid = `${booking.id}@assistant-airbnb.ai`;
          
          return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${nowFormatted}T000000Z
DTSTART;VALUE=DATE:${formatDate(checkIn)}
DTEND;VALUE=DATE:${formatDate(checkOut)}
SUMMARY:${booking.guestName || 'Réservation'} - ${property.name}
DESCRIPTION:Réservation via Assistant Airbnb IA
STATUS:CONFIRMED
END:VEVENT`;
        }).join('\n');

      const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Assistant Airbnb IA//Calendrier//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${property.name}
X-WR-TIMEZONE:Europe/Paris
${icalEvents}
END:VCALENDAR`;

      // Envoyer le fichier iCal
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${property.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`);
      res.send(icalContent);
    } catch (error) {
      console.error("Error exporting iCal:", error);
      res.status(500).send("Failed to export calendar");
    }
  });

  // Endpoint pour obtenir l'URL d'export iCal PERMANENTE d'une propriété (avec token)
  app.get("/api/properties/:id/ical-export-url", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      // Vérifier que l'utilisateur est propriétaire
      if (property.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Générer ou récupérer le token permanent
      const { getOrCreatePropertyICalToken } = await import("./ical-tokens");
      const token = await getOrCreatePropertyICalToken(id);

      // Générer l'URL d'export PERMANENTE avec token
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const exportUrl = `${baseUrl}/api/calendar/${id}/export.ics?token=${token}`;

      res.json({ 
        exportUrl,
        permanentUrl: exportUrl, // Alias pour clarté
        token: token, // Token pour référence
        propertyName: property.name,
        isPermanent: true,
        neverExpires: true,
        instructions: {
          forAirbnb: "Copiez ce lien et collez-le dans Airbnb > Calendrier > Paramètres > Importer un calendrier",
          forGoogleCalendar: "Ouvrez Google Calendar > Paramètres > Ajouter un calendrier > À partir d'une URL",
          forAppleCalendar: "Fichier > Nouvel abonnement à un calendrier > Collez l'URL",
          forCleaners: "Partagez ce lien avec vos agents de ménage pour qu'ils puissent voir le calendrier des réservations"
        },
        note: "Ce lien est permanent et n'expire jamais. Il fonctionne sans authentification."
      });
    } catch (error) {
      console.error("Error getting iCal export URL:", error);
      res.status(500).json({ error: "Failed to get export URL" });
    }
  });
  
  // Endpoint pour régénérer le token iCal d'une propriété (invalide l'ancien)
  app.post("/api/properties/:id/regenerate-ical-token", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      // Vérifier que l'utilisateur est propriétaire
      if (property.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Régénérer le token
      const { regeneratePropertyICalToken } = await import("./ical-tokens");
      const newToken = await regeneratePropertyICalToken(id);

      // Générer la nouvelle URL
      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
      const exportUrl = `${baseUrl}/api/calendar/${id}/export.ics?token=${newToken}`;

      res.json({ 
        exportUrl,
        permanentUrl: exportUrl,
        token: newToken,
        propertyName: property.name,
        isPermanent: true,
        note: "L'ancien lien ne fonctionnera plus. Utilisez ce nouveau lien."
      });
    } catch (error) {
      console.error("Error regenerating iCal token:", error);
      res.status(500).json({ error: "Failed to regenerate token" });
    }
  });

  app.post("/api/properties", isAuthenticated, ensureHostAccess, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData, userId);
      
      // Update property count for subscription
      const userProperties = await storage.getPropertiesByUser(userId);
      const newCount = userProperties.length;
      await storage.updatePropertyCount(userId, newCount);
      
      // Update Stripe subscription quantity if user has an active subscription
      const user = await storage.getUser(userId);
      if (user?.stripeSubscriptionId && stripe) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (subscription.items.data.length > 0) {
            await stripe.subscriptions.update(user.stripeSubscriptionId, {
              items: [{ id: subscription.items.data[0].id, quantity: newCount }],
            });
          }
        } catch (stripeError) {
          console.error("Error updating Stripe quantity:", stripeError);
          // Don't fail the property creation if Stripe update fails
        }
      }
      
      res.status(201).json(property);
    } catch (error) {
      res.status(400).json({ error: "Invalid property data" });
    }
  });

  app.patch("/api/properties/:id", isAuthenticated, ensureHostAccess, async (req, res) => {
    try {
      const property = await storage.updateProperty(req.params.id, req.body);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, ensureHostAccess, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const deleted = await storage.deleteProperty(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      // Update property count for subscription
      const userProperties = await storage.getPropertiesByUser(userId);
      const newCount = userProperties.length;
      await storage.updatePropertyCount(userId, newCount);
      
      // Update Stripe subscription quantity if user has an active subscription
      const user = await storage.getUser(userId);
      if (user?.stripeSubscriptionId && stripe) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (subscription.items.data.length > 0) {
            if (newCount === 0) {
              // Cancel subscription if no properties left
              await stripe.subscriptions.cancel(user.stripeSubscriptionId);
              await storage.updateUserSubscription(userId, 'canceled');
            } else {
              // Update quantity
              await stripe.subscriptions.update(user.stripeSubscriptionId, {
                items: [{ id: subscription.items.data[0].id, quantity: newCount }],
              });
            }
          }
        } catch (stripeError) {
          console.error("Error updating Stripe quantity:", stripeError);
          // Don't fail the property deletion if Stripe update fails
        }
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  // Conversations routes
  app.get("/api/conversations/property/:propertyId", async (req, res) => {
    try {
      const conversations = await storage.getConversationsByProperty(req.params.propertyId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.status(201).json(conversation);
    } catch (error) {
      res.status(400).json({ error: "Invalid conversation data" });
    }
  });

  // Airbnb import route (no subscription required - only updates existing property)
  app.post("/api/import-airbnb", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL Airbnb requise" });
      }

      // Strict hostname validation to prevent SSRF
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: "URL invalide" });
      }

      const allowedHosts = [
        'airbnb.com',
        'www.airbnb.com',
        'airbnb.fr',
        'www.airbnb.fr',
        'airbnb.ca',
        'www.airbnb.ca',
        'airbnb.co.uk',
        'www.airbnb.co.uk'
      ];

      if (!allowedHosts.includes(parsedUrl.hostname.toLowerCase())) {
        return res.status(400).json({ error: "Veuillez fournir un lien Airbnb valide (airbnb.com, airbnb.fr, etc.)" });
      }

      const extractedData = await extractAirbnbInfo(url);
      res.json(extractedData);
    } catch (error: any) {
      console.error("Airbnb import error:", error);
      res.status(500).json({ 
        error: error.message || "Impossible d'importer les informations de l'annonce Airbnb"
      });
    }
  });

  // New: Import Airbnb and create a property for the authenticated user
  // Note: We don't use ensureHostAccess here to allow import even if property count check fails
  app.post("/api/properties/import-airbnb", isAuthenticated, async (req: any, res) => {
    // Set a timeout for the entire import operation (60 seconds)
    const importTimeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ 
          error: "Import timeout",
          message: "L'import a pris trop de temps. Veuillez réessayer ou utiliser la méthode manuelle (copier-coller le texte)."
        });
      }
    }, 60000); // 60 seconds timeout

    try {
      const userId = req.user.id;
      const { airbnbUrl } = req.body || {};

      if (!airbnbUrl || typeof airbnbUrl !== 'string') {
        clearTimeout(importTimeout);
        return res.status(400).json({ error: "URL Airbnb requise" });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(airbnbUrl);
      } catch {
        return res.status(400).json({ error: "URL invalide" });
      }

      const allowedHosts = [
        'airbnb.com', 'www.airbnb.com',
        'airbnb.fr', 'www.airbnb.fr',
        'airbnb.ca', 'www.airbnb.ca',
        'airbnb.co.uk', 'www.airbnb.co.uk'
      ];
      if (!allowedHosts.includes(parsedUrl.hostname.toLowerCase())) {
        return res.status(400).json({ error: "Veuillez fournir un lien Airbnb valide (airbnb.com, airbnb.fr, etc.)" });
      }

      // 1) Try DOM scraping with Playwright (if enabled)
      let extracted: any = {};
      let visibleTextForAI: string | null = null;
      
      try {
        if (process.env.PLAYWRIGHT_ENABLED === '1') {
          extracted = await scrapeAirbnbWithPlaywright(airbnbUrl);
          // Check if we got visible text for AI fallback
          if (extracted.__visibleText) {
            visibleTextForAI = extracted.__visibleText;
            delete extracted.__visibleText;
          }
        }
      } catch (e: any) {
        console.error("Playwright scraping failed:", e?.message);
        // Continue to AI fallback
      }

      // 2) If insufficient data, fallback to AI extraction
      if (!extracted?.name || !extracted?.description || !extracted?.address) {
        try {
          // Use visible text if available from Playwright, otherwise fetch HTML
          let aiExtracted: any;
          if (visibleTextForAI && visibleTextForAI.length > 500) {
            // Use text extracted by Playwright for AI analysis
            aiExtracted = await extractAirbnbInfoFromText(visibleTextForAI);
          } else {
            // Fallback to fetching HTML and extracting text
            aiExtracted = await extractAirbnbInfo(airbnbUrl);
          }
          // Merge AI extracted data with Playwright data (AI takes precedence for missing fields)
          extracted = { 
            ...extracted, 
            ...aiExtracted,
            // Keep Playwright data if it's more complete
            name: extracted.name || aiExtracted.name,
            description: extracted.description || aiExtracted.description,
            address: extracted.address || aiExtracted.address,
          };
        } catch (aiError: any) {
          console.error("AI extraction failed:", aiError?.message);
          // Continue with whatever we have from Playwright
        }
      }

      const safe: any = {
        name: extracted.name || "Nouvelle Propriété",
        description: extracted.description || "Description à compléter",
        address: extracted.address || "Adresse à compléter",
        floor: extracted.floor || null,
        doorCode: extracted.doorCode || null,
        accessInstructions: extracted.accessInstructions || null,
        checkInTime: extracted.checkInTime || '15:00',
        checkOutTime: extracted.checkOutTime || '11:00',
        checkInProcedure: extracted.checkInProcedure || null,
        checkOutProcedure: extracted.checkOutProcedure || null,
        keyLocation: extracted.keyLocation || null,
        wifiName: extracted.wifiName || null,
        wifiPassword: extracted.wifiPassword || null,
        amenities: Array.isArray(extracted.amenities) ? extracted.amenities : [],
        kitchenEquipment: extracted.kitchenEquipment || null,
        houseRules: extracted.houseRules || "",
        maxGuests: extracted.maxGuests ? String(extracted.maxGuests) : null,
        petsAllowed: Boolean(extracted.petsAllowed),
        smokingAllowed: Boolean(extracted.smokingAllowed),
        partiesAllowed: Boolean(extracted.partiesAllowed),
        parkingInfo: extracted.parkingInfo || null,
        publicTransport: extracted.publicTransport || null,
        nearbyShops: extracted.nearbyShops || null,
        restaurants: extracted.restaurants || null,
        hostName: (await storage.getUser(userId))?.firstName || 'Hôte',
        hostPhone: null,
        emergencyContact: null,
        heatingInstructions: extracted.heatingInstructions || null,
        garbageInstructions: extracted.garbageInstructions || null,
        applianceInstructions: extracted.applianceInstructions || null,
        additionalInfo: extracted.additionalInfo || null,
        faqs: extracted.faqs || null,
        lastImportedAt: new Date(),
      };

      // Validate against schema (required fields ensured above)
      const validated = insertPropertySchema.parse(safe);
      
      // Check property count before creating (but don't block if check fails)
      let propertyCount = 0;
      try {
        const userProperties = await storage.getPropertiesByUser(userId);
        propertyCount = userProperties?.length || 0;
      } catch (countError: any) {
        console.warn("Could not count properties, allowing import anyway:", countError?.message);
        // Continue anyway - allow import if property count check fails
      }
      
      // Only block if user already has a property and no subscription
      if (propertyCount > 0) {
        try {
          const user = await storage.getUser(userId);
          const hasActiveSubscription = user?.subscriptionStatus === 'active' || 
                                        user?.subscriptionStatus === 'trialing' ||
                                        (user?.trialEndsAt && new Date(user.trialEndsAt) > new Date());
          
          if (!hasActiveSubscription) {
            return res.status(403).json({ 
              error: "Subscription required",
              message: "Votre première propriété est gratuite ! Pour ajouter plus de propriétés, veuillez souscrire à un abonnement.",
              needsSubscription: true,
              currentPropertyCount: propertyCount
            });
          }
        } catch (subError: any) {
          console.warn("Could not check subscription, allowing import anyway:", subError?.message);
          // Continue anyway - allow import if subscription check fails
        }
      }
      
      const property = await storage.createProperty(validated, userId);
      clearTimeout(importTimeout);
      return res.status(201).json(property);
    } catch (error: any) {
      clearTimeout(importTimeout);
      console.error("Error importing Airbnb property:", error);
      console.error("Error stack:", error?.stack);
      
      // Don't crash the server, always return a response
      if (res.headersSent) {
        console.error("Response already sent, cannot send error response");
        return;
      }
      
      const message = error?.message || "Impossible d'importer la propriété depuis Airbnb";
      
      // Provide more specific error messages
      if (message.includes("timeout") || message.includes("Timeout")) {
        return res.status(408).json({ 
          error: "Import timeout",
          message: "L'import a pris trop de temps. Veuillez utiliser la méthode manuelle (copier-coller le texte de la page)."
        });
      }
      
      if (message.includes("browser") || message.includes("Playwright")) {
        return res.status(500).json({ 
          error: "Erreur lors du scraping",
          message: "L'import automatique a échoué. Veuillez utiliser la méthode manuelle (copier-coller le texte de la page).",
          details: message
        });
      }
      
      return res.status(400).json({ 
        error: message,
        details: error?.message || "Unknown error"
      });
    }
  });

  // New: Import from pasted text (fallback when direct fetch fails)
  app.post("/api/properties/import-airbnb-text", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { rawText } = req.body || {};
      if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 50) {
        return res.status(400).json({ error: "Texte insuffisant pour l'extraction" });
      }

      const extracted = await extractAirbnbInfoFromText(rawText);
      const safe: any = {
        name: extracted.name || "Nouvelle Propriété",
        description: extracted.description || "Description à compléter",
        address: extracted.address || "Adresse à compléter",
        floor: extracted.floor || null,
        doorCode: extracted.doorCode || null,
        accessInstructions: extracted.accessInstructions || null,
        checkInTime: extracted.checkInTime || '15:00',
        checkOutTime: extracted.checkOutTime || '11:00',
        checkInProcedure: extracted.checkInProcedure || null,
        checkOutProcedure: extracted.checkOutProcedure || null,
        keyLocation: extracted.keyLocation || null,
        wifiName: extracted.wifiName || null,
        wifiPassword: extracted.wifiPassword || null,
        amenities: Array.isArray(extracted.amenities) ? extracted.amenities : [],
        kitchenEquipment: extracted.kitchenEquipment || null,
        houseRules: extracted.houseRules || "",
        maxGuests: extracted.maxGuests ? String(extracted.maxGuests) : null,
        petsAllowed: Boolean(extracted.petsAllowed),
        smokingAllowed: Boolean(extracted.smokingAllowed),
        partiesAllowed: Boolean(extracted.partiesAllowed),
        parkingInfo: extracted.parkingInfo || null,
        publicTransport: extracted.publicTransport || null,
        nearbyShops: extracted.nearbyShops || null,
        restaurants: extracted.restaurants || null,
        hostName: (await storage.getUser(userId))?.firstName || 'Hôte',
        hostPhone: null,
        emergencyContact: null,
        heatingInstructions: extracted.heatingInstructions || null,
        garbageInstructions: extracted.garbageInstructions || null,
        applianceInstructions: extracted.applianceInstructions || null,
        additionalInfo: extracted.additionalInfo || null,
        faqs: extracted.faqs || null,
        lastImportedAt: new Date(),
      };

      const validated = insertPropertySchema.parse(safe);
      const property = await storage.createProperty(validated, userId);
      return res.status(201).json(property);
    } catch (error: any) {
      const message = error?.message || "Échec de l'import depuis le texte";
      return res.status(400).json({ error: message });
    }
  });

  // Stripe subscription routes
  // Start paid subscription after trial (29.90€ per property)
  app.post('/api/start-subscription', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: "Payment system not configured" });
      }

      const userId = req.user.id;
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user's properties count
      const userProperties = await storage.getPropertiesByUser(userId);
      const propertyCount = userProperties.length;

      if (propertyCount === 0) {
        return res.status(400).json({ error: "You must have at least one property to subscribe" });
      }

      // If user already has a subscription, retrieve it
      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        return res.json({
          subscriptionId: subscription.id,
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        });
      }

      // Create or retrieve Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email ?? undefined,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined,
          metadata: { userId },
        });
        stripeCustomerId = customer.id;
        await storage.updateUserStripeInfo(userId, stripeCustomerId, '');
      }

      // Get price ID from environment (should be set to 29.90€ per unit)
      const priceId = process.env.STRIPE_PRICE_PER_PROPERTY_ID;
      if (!priceId) {
        return res.status(400).json({ error: "Subscription price not configured. Please set STRIPE_PRICE_PER_PROPERTY_ID" });
      }

      // Create subscription with quantity = number of properties
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId, quantity: propertyCount }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with subscription info
      await storage.updateUserStripeInfo(userId, stripeCustomerId, subscription.id);
      await storage.updateUserSubscription(userId, 'active');

      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        propertyCount,
        pricePerProperty: 29.90,
        totalPrice: propertyCount * 29.90,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's subscription status
  app.get('/api/subscription-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeSubscriptionId) {
        return res.json({
          status: user.subscriptionStatus || null,
          trialEndsAt: user.trialEndsAt,
          activePropertyCount: parseInt(user.activePropertyCount || "0"),
        });
      }

      if (!stripe) {
        return res.status(503).json({ error: "Payment system not configured" });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      res.json({
        status: subscription.status,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        activePropertyCount: parseInt(user.activePropertyCount || "0"),
      });
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel subscription
  app.post('/api/cancel-subscription', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: "Payment system not configured" });
      }

      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription" });
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      res.json({ 
        message: "Subscription will be canceled at period end",
        cancelAt: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
      });
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Demo chat route - public API for testing AI on landing page
  app.post("/api/demo-chat", async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get the demo property (Paris 8e - Champs-Élysées)
      const demoProperty = await storage.getPropertyByAccessKey("demo-paris-01");
      if (!demoProperty) {
        console.error("Demo property not found with accessKey: demo-paris-01");
        return res.status(404).json({ error: "Demo property not found" });
      }

      // Check if Gemini API key is configured
      if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not configured");
        return res.status(500).json({ 
          error: "AI service is not configured. Please check GEMINI_API_KEY in .env file." 
        });
      }

      // Generate AI response using demo property
      let aiResponse;
      try {
        aiResponse = await generateChatResponse(message, demoProperty);
      } catch (geminiError: any) {
        console.error("Gemini API error:", geminiError);
        const errorMessage = geminiError?.message || "Failed to generate AI response";
        
        // Provide more specific error messages
        if (errorMessage.includes("API key") || errorMessage.includes("authentication") || errorMessage.includes("Permission denied")) {
          return res.status(500).json({ 
            error: "AI service authentication failed. Please check your GEMINI_API_KEY." 
          });
        }
        
        return res.status(500).json({ 
          error: `AI service error: ${errorMessage}` 
        });
      }
      
      if (!aiResponse || aiResponse.trim().length === 0) {
        console.error("Empty response from Gemini");
        return res.status(500).json({ 
          error: "AI service returned an empty response. Please try again." 
        });
      }
      
      res.json({
        userMessage: message,
        botMessage: aiResponse,
      });
    } catch (error: any) {
      console.error("Error in demo chat:", error);
      console.error("Error stack:", error?.stack);
      console.error("Error details:", {
        message: error?.message,
        name: error?.name,
        cause: error?.cause,
      });
      const errorMessage = error?.message || String(error) || "Failed to generate response";
      res.status(500).json({ 
        error: `Server error: ${errorMessage}` 
      });
    }
  });

  // Messages routes
  app.get("/api/messages/:conversationId", async (req, res) => {
    try {
      const messages = await storage.getMessagesByConversation(req.params.conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(validatedData);
      
      // If it's a user message, generate AI response
      if (!validatedData.isBot) {
        const conversation = await storage.getConversation(validatedData.conversationId);
        if (conversation) {
          const property = await storage.getProperty(conversation.propertyId);
          if (property) {
            const aiResponse = await generateChatResponse(validatedData.content, property);
            const botMessage = await storage.createMessage({
              conversationId: validatedData.conversationId,
              content: aiResponse,
              isBot: true,
            });
            
            // Return both messages
            return res.status(201).json({ userMessage: message, botMessage });
          }
        }
      }
      
      res.status(201).json({ userMessage: message });
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ error: "Failed to create message" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup
  // ========================================
  // NEW FEATURES ROUTES
  // ========================================

  // Analytics routes
  app.get("/api/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const propertyId = req.query.propertyId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const analytics = await storage.getAnalytics(userId, propertyId, startDate, endDate);
      res.json(analytics);
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch analytics" });
    }
  });

  // Message Feedback routes
  app.post("/api/messages/:messageId/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      const { isHelpful, comment } = req.body;

      if (typeof isHelpful !== 'boolean') {
        return res.status(400).json({ error: "isHelpful must be a boolean" });
      }

      const validated = insertMessageFeedbackSchema.parse({
        messageId,
        isHelpful,
        comment: comment || null,
        userId,
      });

      const feedback = await storage.createMessageFeedback(validated);
      res.status(201).json(feedback);
    } catch (error: any) {
      console.error("Error creating feedback:", error);
      res.status(400).json({ error: error?.message || "Failed to create feedback" });
    }
  });

  app.get("/api/feedback/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const propertyId = req.query.propertyId as string | undefined;

      const stats = await storage.getFeedbackStats(userId, propertyId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching feedback stats:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch feedback stats" });
    }
  });

  // Response Templates routes
  app.get("/api/templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const propertyId = req.query.propertyId as string | undefined;

      const templates = await storage.getResponseTemplates(userId, propertyId || undefined);
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch templates" });
    }
  });

  app.post("/api/templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertResponseTemplateSchema.parse({ ...req.body, userId });
      const template = await storage.createResponseTemplate(validated);
      res.status(201).json(template);
    } catch (error: any) {
      console.error("Error creating template:", error);
      res.status(400).json({ error: error?.message || "Failed to create template" });
    }
  });

  app.patch("/api/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getResponseTemplate(id);
      if (!template || template.userId !== req.user.id) {
        return res.status(404).json({ error: "Template not found" });
      }

      const updated = await storage.updateResponseTemplate(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating template:", error);
      res.status(400).json({ error: error?.message || "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getResponseTemplate(id);
      if (!template || template.userId !== req.user.id) {
        return res.status(404).json({ error: "Template not found" });
      }

      await storage.deleteResponseTemplate(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      res.status(400).json({ error: error?.message || "Failed to delete template" });
    }
  });

  // Export routes
  app.get("/api/conversations/export/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { propertyId } = req.params;
      const format = (req.query.format as string) || 'csv';

      // Verify property ownership
      const property = await storage.getProperty(propertyId);
      if (!property || property.userId !== userId) {
        return res.status(404).json({ error: "Property not found" });
      }

      const conversations = await storage.getConversationsByProperty(propertyId);
      const allMessages = await Promise.all(
        conversations.map(c => storage.getMessagesByConversation(c.id))
      );

      if (format === 'csv') {
        // Export CSV
        const csvRows = ['Conversation ID,Guest Name,Message ID,Is Bot,Content,Language,Category,Created At'];
        conversations.forEach((conv, idx) => {
          const messages = allMessages[idx];
          messages.forEach(msg => {
            const row = [
              conv.id,
              `"${conv.guestName.replace(/"/g, '""')}"`,
              msg.id,
              msg.isBot ? 'Yes' : 'No',
              `"${msg.content.replace(/"/g, '""')}"`,
              msg.language || '',
              msg.category || '',
              msg.createdAt.toISOString(),
            ];
            csvRows.push(row.join(','));
          });
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=conversations-${propertyId}-${Date.now()}.csv`);
        res.send(csvRows.join('\n'));
      } else if (format === 'json') {
        // Export JSON
        const exportData = conversations.map((conv, idx) => ({
          conversation: conv,
          messages: allMessages[idx],
        }));

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=conversations-${propertyId}-${Date.now()}.json`);
        res.json(exportData);
      } else {
        res.status(400).json({ error: "Invalid format. Use 'csv' or 'json'" });
      }
    } catch (error: any) {
      console.error("Error exporting conversations:", error);
      res.status(500).json({ error: error?.message || "Failed to export conversations" });
    }
  });

  // Notifications routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isRead = req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined;

      const notifications = await storage.getNotifications(userId, isRead);
      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertNotificationSchema.parse({ ...req.body, userId });
      const notification = await storage.createNotification(validated);
      res.status(201).json(notification);
    } catch (error: any) {
      console.error("Error creating notification:", error);
      res.status(400).json({ error: error?.message || "Failed to create notification" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json(notification);
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      res.status(400).json({ error: error?.message || "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.markAllNotificationsAsRead(userId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: error?.message || "Failed to mark all notifications as read" });
    }
  });

  // Team routes
  app.get("/api/team/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const members = await storage.getTeamMembers(userId);
      res.json(members);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch team members" });
    }
  });

  app.post("/api/team/members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validated = insertTeamMemberSchema.parse({ ...req.body, teamOwnerId: userId });
      const member = await storage.createTeamMember(validated);
      res.status(201).json(member);
    } catch (error: any) {
      console.error("Error creating team member:", error);
      res.status(400).json({ error: error?.message || "Failed to create team member" });
    }
  });

  app.patch("/api/team/members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const member = await storage.getTeamMember(id);
      if (!member || member.teamOwnerId !== req.user.id) {
        return res.status(404).json({ error: "Team member not found" });
      }

      const updated = await storage.updateTeamMember(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating team member:", error);
      res.status(400).json({ error: error?.message || "Failed to update team member" });
    }
  });

  app.delete("/api/team/members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const member = await storage.getTeamMember(id);
      if (!member || member.teamOwnerId !== req.user.id) {
        return res.status(404).json({ error: "Team member not found" });
      }

      await storage.deleteTeamMember(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting team member:", error);
      res.status(400).json({ error: error?.message || "Failed to delete team member" });
    }
  });

  // ========================================
  // SOS / URGENCE ROUTES
  // ========================================

  /**
   * POST /api/sos - Envoyer une alerte d'urgence
   * Accessible sans authentification (voyageurs)
   */
  app.post("/api/sos", async (req, res) => {
    try {
      const { propertyId, message, timestamp } = req.body;

      if (!propertyId) {
        return res.status(400).json({ error: "Property ID required" });
      }

      // Récupérer la propriété et le propriétaire
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      // Créer une notification urgente pour le propriétaire
      if (property.userId) {
        await storage.createNotification({
          userId: property.userId,
          type: "in_app",
          category: "urgent",
          subject: "🚨 ALERTE SOS - Urgence voyageur",
          content: `Un voyageur a déclenché une alerte SOS pour ${property.name}. Message: ${message || "Pas de détails fournis"}`,
          metadata: {
            propertyId,
            alertType: "sos",
            timestamp,
            requiresAction: true,
          },
        });
      }

      console.log(`🚨 SOS Alert for property ${property.name}: ${message}`);

      res.json({ 
        success: true, 
        message: "SOS alert sent to host",
        hostName: property.hostName,
      });
    } catch (error: any) {
      console.error("Error sending SOS:", error);
      res.status(500).json({ error: error?.message || "Failed to send SOS" });
    }
  });

  /**
   * POST /api/widget-chat - Endpoint pour le widget embeddable
   * Accessible sans authentification
   */
  app.post("/api/widget-chat", async (req, res) => {
    try {
      const { propertyId, message } = req.body;

      if (!propertyId || !message) {
        return res.status(400).json({ error: "Property ID and message required" });
      }

      const property = await storage.getProperty(propertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      // Utiliser la version avec fallback pour garantir une réponse
      const response = await generateChatResponseWithFallback(message, property);

      res.json({ response });
    } catch (error: any) {
      console.error("Widget chat error:", error);
      res.status(500).json({ 
        error: "Chat error",
        response: "Désolé, je ne peux pas répondre pour le moment. Veuillez contacter l'hôte directement."
      });
    }
  });

  /**
   * POST /api/export/conversations/pdf - Exporter les conversations en PDF
   */
  app.post("/api/export/conversations/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { propertyId, startDate, endDate } = req.body;

      // Vérifier la propriété
      if (propertyId) {
        const property = await storage.getProperty(propertyId);
        if (!property || property.userId !== userId) {
          return res.status(404).json({ error: "Property not found" });
        }
      }

      const conversations = propertyId 
        ? await storage.getConversationsByProperty(propertyId)
        : [];

      const allMessages = await Promise.all(
        conversations.map(c => storage.getMessagesByConversation(c.id))
      );

      // Générer un HTML simple pour le PDF (le client peut utiliser html2pdf.js)
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Export Conversations - AirbnbBot</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #e11d48; }
            .conversation { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
            .message { margin: 10px 0; padding: 10px; border-radius: 8px; }
            .bot { background: #f3f4f6; }
            .user { background: #fee2e2; }
            .meta { font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>📊 Export des Conversations</h1>
          <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
      `;

      conversations.forEach((conv, idx) => {
        const messages = allMessages[idx];
        html += `
          <div class="conversation">
            <h3>Conversation avec ${conv.guestName}</h3>
            <p class="meta">ID: ${conv.id} | Créée le: ${new Date(conv.createdAt).toLocaleDateString('fr-FR')}</p>
        `;
        
        messages.forEach(msg => {
          html += `
            <div class="message ${msg.isBot ? 'bot' : 'user'}">
              <strong>${msg.isBot ? '🤖 Bot' : '👤 Voyageur'}</strong>
              <p>${msg.content}</p>
              <span class="meta">${new Date(msg.createdAt).toLocaleTimeString('fr-FR')}</span>
            </div>
          `;
        });

        html += `</div>`;
      });

      html += `</body></html>`;

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename=conversations-export-${Date.now()}.html`);
      res.send(html);
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      res.status(500).json({ error: error?.message || "Failed to export" });
    }
  });

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");

    ws.on("message", async (data: Buffer) => {
      try {
        const payload = JSON.parse(data.toString());
        
        if (payload.type === "chat_message") {
          const { conversationId, content } = payload;
          
          // Save user message
          const userMessage = await storage.createMessage({
            conversationId,
            content,
            isBot: false,
          });
          
          // Get conversation and property
          const conversation = await storage.getConversation(conversationId);
          if (conversation) {
            const property = await storage.getProperty(conversation.propertyId);
            if (property) {
              // Generate AI response
              const aiResponse = await generateChatResponse(content, property);
              const botMessage = await storage.createMessage({
                conversationId,
                content: aiResponse,
                isBot: true,
              });
              
              // Send both messages back
              ws.send(JSON.stringify({
                type: "messages",
                userMessage,
                botMessage
              }));
            }
          }
        }
      } catch (error) {
        console.error("WebSocket error:", error);
        ws.send(JSON.stringify({ type: "error", message: "Failed to process message" }));
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });

  return httpServer;
}
