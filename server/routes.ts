import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertPropertySchema, insertConversationSchema, insertMessageSchema, insertMessageFeedbackSchema, insertResponseTemplateSchema, insertTeamMemberSchema, insertNotificationSchema, insertPmsIntegrationSchema } from "@shared/schema";
import { generateChatResponse, extractAirbnbInfo, extractAirbnbInfoFromText } from "./gemini";
import { scrapeAirbnbWithPlaywright } from "./airbnb-playwright";
import { listCleaningsForUser, syncAirbnbCalendars, markCleaningStatus, notifyCleaningTask } from "./cleaning-service";
import { handleSmoobuWebhook } from "./smoobu-service";
import { verifySmoobuWebhook } from "./smoobu-client";
import { sendMessageAsCoHost } from "./airbnb-cohost-playwright";

// Initialize Stripe (optional - only needed for subscription features)
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const smoobuConnectSchema = insertPmsIntegrationSchema
  .pick({
    apiKey: true,
    webhookSecret: true,
    settings: true,
    isActive: true,
  })
  .partial({
    apiKey: true,
    webhookSecret: true,
    settings: true,
    isActive: true,
  });

function extractAirbnbListingIdFromPath(path: string): string | null {
  const match = path.match(/\/rooms\/(\d+)/);
  return match ? match[1] : null;
}

function extractAirbnbListingId(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = trimmed.startsWith("http") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    const pathId = extractAirbnbListingIdFromPath(url.pathname);
    if (pathId) return pathId;
  } catch {
    // ignore URL parse errors and fall back to regex
  }

  // Fallback: try to extract numeric ID directly
  const numericMatch = trimmed.match(/\d{6,}/);
  return numericMatch ? numericMatch[0] : null;
}

/**
 * Fonction utilitaire pour gérer l'envoi de messages (sur Airbnb si nécessaire) et la génération de réponse IA
 * Utilisée à la fois par la route REST et par le WebSocket
 */
async function processUserMessage(conversationId: string, content: string): Promise<{
  userMessage: any;
  botMessage?: any;
  airbnbSent?: boolean;
  airbnbError?: string;
}> {
  // Créer le message utilisateur
  const userMessage = await storage.createMessage({
    conversationId,
    content,
    isBot: false,
  });

  // Récupérer la conversation
  const conversation = await storage.getConversation(conversationId);
  if (!conversation) {
    return { userMessage };
  }

  // Si c'est une conversation Airbnb, envoyer le message sur Airbnb
  let airbnbSent = false;
  let airbnbError: string | undefined;
  
  if (conversation.externalId && conversation.source === "airbnb-cohost") {
    const property = await storage.getProperty(conversation.propertyId);
    if (property && property.userId) {
      const user = await storage.getUser(property.userId);
      if (user?.airbnbCohostCookies) {
        try {
          console.log(`📤 Envoi message sur Airbnb (conversation: ${conversation.externalId})`);
          const sendResult = await sendMessageAsCoHost(
            conversation.externalId,
            content,
            user.airbnbCohostCookies,
          );
          
          if (sendResult.success && sendResult.messageId) {
            airbnbSent = true;
            console.log(`✅ Message envoyé sur Airbnb (ID: ${sendResult.messageId})`);
          } else {
            airbnbError = sendResult.error || "Erreur inconnue";
            console.warn("❌ Échec envoi message Airbnb:", airbnbError);
          }
        } catch (error: any) {
          airbnbError = error?.message || "Erreur lors de l'envoi";
          console.error("❌ Erreur envoi message Airbnb:", airbnbError);
        }
      } else {
        airbnbError = "Cookies co-hôte non configurés";
        console.warn("⚠️ Cookies co-hôte non configurés pour l'utilisateur");
      }
    }
  }

  // Générer une réponse IA automatique pour toutes les conversations Airbnb
  const property = await storage.getProperty(conversation.propertyId);
  if (property) {
    try {
      console.log(`🤖 Génération réponse IA pour: "${conversation.guestName}"...`);
      const aiResponse = await generateChatResponse(content, property);
      
      const botMessage = await storage.createMessage({
        conversationId,
        content: aiResponse,
        isBot: true,
      });

      console.log(`✅ Réponse IA générée: "${aiResponse.substring(0, 50)}..."`);

      // Si c'est une conversation Airbnb, envoyer aussi la réponse IA sur Airbnb
      if (conversation.externalId && conversation.source === "airbnb-cohost" && property.userId) {
        const user = await storage.getUser(property.userId);
        if (user?.airbnbCohostCookies) {
          try {
            console.log(`📤 Envoi réponse IA sur Airbnb...`);
            const sendResult = await sendMessageAsCoHost(
              conversation.externalId,
              aiResponse,
              user.airbnbCohostCookies,
            );
            
            if (sendResult.success) {
              console.log("✅ Réponse IA envoyée sur Airbnb avec succès");
            } else {
              console.error(`❌ Erreur envoi réponse IA Airbnb: ${sendResult.error}`);
            }
          } catch (error: any) {
            console.error("❌ Erreur envoi réponse IA Airbnb:", error?.message);
          }
        } else {
          console.warn("⚠️ Cookies co-hôte non configurés, réponse IA non envoyée sur Airbnb");
        }
      }

      return { userMessage, botMessage, airbnbSent, airbnbError };
    } catch (error: any) {
      console.error("❌ Erreur génération réponse IA:", error?.message);
      return { userMessage, airbnbSent, airbnbError };
    }
  }

  return { userMessage, airbnbSent, airbnbError };
}

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

  // User profile route (protected)
  app.get("/api/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return only safe, non-sensitive user data
      const safeUserData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      res.json(safeUserData);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

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

      const listingIdFromUrl = extractAirbnbListingIdFromPath(parsedUrl.pathname);

      const safe: any = {
        name: extracted.name || "Nouvelle Propriété",
        description: extracted.description || "Description à compléter",
        address: extracted.address || "Adresse à compléter",
        floor: extracted.floor || null,
        doorCode: extracted.doorCode || null,
        accessInstructions: extracted.accessInstructions || null,
        icalUrl: extracted.icalUrl || null,
        cleaningPersonId: null,
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
        smoobuListingId: listingIdFromUrl || extracted.smoobuListingId || null,
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
        icalUrl: extracted.icalUrl || null,
        cleaningPersonId: null,
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

  app.get("/api/cleanings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const cleanings = await listCleaningsForUser(userId);
      return res.json({ cleanings });
    } catch (error: any) {
      console.error("Failed to list cleanings:", error?.message || error);
      return res.status(500).json({ error: "Impossible de récupérer les tâches de ménage", details: error?.message || "Erreur inconnue" });
    }
  });

  const handleCleaningSync = async () => {
    const result = await syncAirbnbCalendars();
    return { success: true, ...result };
  };

  app.post("/api/cleanings/sync", isAuthenticated, async (req: any, res) => {
    try {
      const payload = await handleCleaningSync();
      return res.json(payload);
    } catch (error: any) {
      console.error("Manual cleaning sync failed:", error?.message || error);
      return res.status(500).json({ error: "Sync ménage impossible", details: error?.message || "Erreur inconnue" });
    }
  });

  app.post("/api/cron/cleanings/sync", async (req: any, res) => {
    try {
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret) {
        const headerSecret = Array.isArray(req.headers["x-cron-secret"]) ? req.headers["x-cron-secret"][0] : req.headers["x-cron-secret"];
        const providedSecret = headerSecret || req.body?.secret || (Array.isArray(req.query?.secret) ? req.query?.secret[0] : req.query?.secret);
        if (providedSecret !== cronSecret) {
          return res.status(401).json({ error: "Secret invalide" });
        }
      }
      const payload = await handleCleaningSync();
      return res.json(payload);
    } catch (error: any) {
      console.error("Cron cleaning sync failed:", error?.message || error);
      return res.status(500).json({ error: "Sync ménage impossible", details: error?.message || "Erreur inconnue" });
    }
  });

  app.post("/api/cleanings/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body || {};
      const allowedStatuses = new Set(["à faire", "en cours", "terminé"]);
      if (!status || typeof status !== "string" || !allowedStatuses.has(status)) {
        return res.status(400).json({ error: "Statut invalide" });
      }

      const updated = await markCleaningStatus(id, status, typeof notes === "string" ? notes : undefined);
      if (!updated) {
        return res.status(404).json({ error: "Tâche de ménage introuvable" });
      }

      return res.json({ cleaning: updated });
    } catch (error: any) {
      console.error("Failed to update cleaning status:", error?.message || error);
      return res.status(500).json({ error: "Impossible de mettre à jour le statut", details: error?.message || "Erreur inconnue" });
    }
  });

  app.post("/api/cleanings/:id/notify", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await notifyCleaningTask(id);
      await markCleaningStatus(id, "en cours");
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to notify cleaning staff:", error?.message || error);
      return res.status(500).json({ error: "Notification impossible", details: error?.message || "Erreur inconnue" });
    }
  });

  app.get("/api/cleanings/confirm", async (req, res) => {
    try {
      const cleaningId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
      if (!cleaningId || typeof cleaningId !== "string") {
        return res.status(400).send("Lien de confirmation invalide");
      }

      const cleaning = await markCleaningStatus(cleaningId, "terminé");
      if (!cleaning) {
        return res.status(404).send("Tâche de ménage introuvable ou déjà confirmée.");
      }

      return res.status(200).send("✅ Ménage confirmé, merci !");
    } catch (error: any) {
      console.error("Cleaning confirmation failed:", error?.message || error);
      return res.status(500).send("Une erreur est survenue. Veuillez contacter l'hôte.");
    }
  });

  // PMS Integrations - Smoobu
  app.get("/api/integrations/smoobu", isAuthenticated, async (req: any, res) => {
    try {
      const integration = await storage.getPmsIntegration(req.user.id, "smoobu");
      if (!integration) {
        return res.json(null);
      }

      return res.json({
        provider: integration.provider,
        isActive: integration.isActive,
        settings: integration.settings,
        webhookSecretSet: Boolean(integration.webhookSecret),
        hasApiKey: Boolean(integration.apiKey),
        updatedAt: integration.updatedAt,
      });
    } catch (error: any) {
      console.error("Failed to fetch Smoobu integration:", error?.message || error);
      return res.status(500).json({ error: "Unable to load integration" });
    }
  });

  app.post("/api/integrations/smoobu/connect", isAuthenticated, async (req: any, res) => {
    try {
      const body = req.body || {};
      const parsed = smoobuConnectSchema.parse(body);
      const existing = await storage.getPmsIntegration(req.user.id, "smoobu");
      const apiKey = parsed.apiKey || existing?.apiKey;

      if (!apiKey) {
        return res.status(400).json({ error: "apiKey is required" });
      }

      const sanitizedSettings =
        parsed.settings && typeof parsed.settings === "object"
          ? { ...(existing?.settings || {}), ...parsed.settings }
          : existing?.settings || {};

      const integration = await storage.upsertPmsIntegration({
        userId: req.user.id,
        provider: "smoobu",
        apiKey,
        webhookSecret: parsed.webhookSecret ?? existing?.webhookSecret ?? null,
        settings: sanitizedSettings,
        isActive: typeof parsed.isActive === "boolean" ? parsed.isActive : existing?.isActive ?? true,
      });

      return res.json({
        provider: integration.provider,
        isActive: integration.isActive,
        settings: integration.settings,
        webhookSecretSet: Boolean(integration.webhookSecret),
        hasApiKey: Boolean(integration.apiKey),
        updatedAt: integration.updatedAt,
      });
    } catch (error: any) {
      console.error("Failed to save Smoobu integration:", error?.message || error);
      return res.status(500).json({ error: "Unable to save integration" });
    }
  });

  app.post("/api/integrations/smoobu/webhook/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      const integration = await storage.getPmsIntegration(userId, "smoobu");
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const providedSecret =
        req.get("x-smoobu-secret") || (req.query.secret as string) || (req.body?.secret as string);
      const expectedSecret = integration.webhookSecret || process.env.SMOOBU_WEBHOOK_SECRET;

      if (!verifySmoobuWebhook(expectedSecret || undefined, providedSecret)) {
        return res.status(401).json({ error: "Invalid webhook signature" });
      }

      const result = await handleSmoobuWebhook(req.body);
      return res.json({ success: true, result });
    } catch (error: any) {
      console.error("Smoobu webhook processing failed:", error?.message || error);
      return res.status(500).json({ error: "Failed to process webhook" });
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
      
      // Si c'est un message utilisateur (pas bot), utiliser la fonction utilitaire
      if (!validatedData.isBot) {
        const result = await processUserMessage(validatedData.conversationId, validatedData.content);
        
        // Retourner le résultat avec les informations d'envoi Airbnb
        const response: any = { userMessage: result.userMessage };
        if (result.botMessage) {
          response.botMessage = result.botMessage;
        }
        if (result.airbnbSent !== undefined) {
          response.airbnbSent = result.airbnbSent;
        }
        if (result.airbnbError) {
          response.airbnbError = result.airbnbError;
        }
        
        return res.status(201).json(response);
      } else {
        // Message bot : créer directement
        const message = await storage.createMessage(validatedData);
        return res.status(201).json({ userMessage: message });
      }
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

  // Co-Host Configuration Routes
  app.get("/api/cohost/config", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Retourner seulement si configuré (sans les valeurs sensibles)
      res.json({
        configured: Boolean(user.airbnbCohostEmail || user.airbnbCohostCookies),
        hasEmail: Boolean(user.airbnbCohostEmail),
        hasCookies: Boolean(user.airbnbCohostCookies),
        lastSync: user.airbnbCohostLastSync || null,
      });
    } catch (error: any) {
      console.error("Error fetching co-host config:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch co-host config" });
    }
  });

  app.post("/api/cohost/config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { email, cookies } = req.body;

      if (!email && !cookies) {
        return res.status(400).json({ 
          error: "Email ou cookies requis" 
        });
      }

      // Mettre à jour les credentials dans la DB
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.upsertUser({
        id: userId,
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        airbnbCohostEmail: email || user.airbnbCohostEmail,
        airbnbCohostCookies: cookies || user.airbnbCohostCookies,
      });

      res.json({ 
        success: true,
        message: "Configuration co-hôte sauvegardée",
      });
    } catch (error: any) {
      console.error("Error saving co-host config:", error);
      res.status(500).json({ error: error?.message || "Failed to save co-host config" });
    }
  });

  // Co-Host Sync Routes (Légal - utilise le compte co-hôte)
  app.post("/api/sync/cohost", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { syncAllCoHostListings } = await import("./cohost-sync-service");
      
      // Récupérer les credentials depuis la DB de l'utilisateur
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const credentials = {
        email: user.airbnbCohostEmail || process.env.AIRBNB_COHOST_EMAIL,
        password: req.body.password || process.env.AIRBNB_COHOST_PASSWORD, // Password seulement depuis body (pas stocké)
        cookies: user.airbnbCohostCookies || process.env.AIRBNB_COHOST_COOKIES,
      };

      if (!credentials.cookies && (!credentials.email || !credentials.password)) {
        return res.status(400).json({ 
          error: "Configuration co-hôte requise. Veuillez configurer dans les paramètres." 
        });
      }

      const result = await syncAllCoHostListings(userId, credentials);

      // Mettre à jour la date de dernière synchronisation
      await storage.upsertUser({
        id: userId,
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        airbnbCohostLastSync: new Date(),
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error syncing co-host listings:", error);
      res.status(500).json({ error: error?.message || "Failed to sync co-host listings" });
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

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");

    ws.on("message", async (data: Buffer) => {
      try {
        const payload = JSON.parse(data.toString());
        
        if (payload.type === "chat_message") {
          const { conversationId, content } = payload;
          
          // Utiliser la fonction utilitaire pour gérer l'envoi (Airbnb si nécessaire) et la réponse IA
          const result = await processUserMessage(conversationId, content);
          
          // Envoyer les messages au client
          const response: any = {
            type: "messages",
            userMessage: result.userMessage,
          };
          
          if (result.botMessage) {
            response.botMessage = result.botMessage;
          }
          
          if (result.airbnbSent !== undefined) {
            response.airbnbSent = result.airbnbSent;
          }
          
          if (result.airbnbError) {
            response.airbnbError = result.airbnbError;
          }
          
          ws.send(JSON.stringify(response));
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
