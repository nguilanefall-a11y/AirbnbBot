import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertPropertySchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { generateChatResponse, extractAirbnbInfo } from "./gemini";

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
      return res.status(401).json({ error: "Authentication required" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Count user's existing properties
    const userProperties = await storage.getPropertiesByUser(userId);
    const propertyCount = userProperties.length;

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
  } catch (error) {
    console.error("Error checking property access:", error);
    return res.status(500).json({ error: "Failed to verify access" });
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

      // Get the demo property (Paris 11e)
      const demoProperty = await storage.getPropertyByAccessKey("demo-paris-01");
      if (!demoProperty) {
        return res.status(404).json({ error: "Demo property not found" });
      }

      // Generate AI response using demo property
      const aiResponse = await generateChatResponse(message, demoProperty);
      
      res.json({
        userMessage: message,
        botMessage: aiResponse,
      });
    } catch (error) {
      console.error("Error in demo chat:", error);
      res.status(500).json({ error: "Failed to generate response" });
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
