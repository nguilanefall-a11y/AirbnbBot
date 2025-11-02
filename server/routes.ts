import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPropertySchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { generateChatResponse } from "./gemini";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware (from Replit Auth blueprint)
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Properties routes
  app.get("/api/properties", async (_req, res) => {
    try {
      const properties = await storage.getAllProperties();
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

  app.post("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData, userId);
      res.status(201).json(property);
    } catch (error) {
      res.status(400).json({ error: "Invalid property data" });
    }
  });

  app.patch("/api/properties/:id", async (req, res) => {
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

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProperty(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Property not found" });
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

  // Stripe subscription routes
  // Create subscription with 7-day trial
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { plan } = req.body; // 'pro' or 'business'
      
      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
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

      // Determine price based on plan
      const priceId = plan === 'business' 
        ? process.env.STRIPE_PRICE_BUSINESS_ID 
        : process.env.STRIPE_PRICE_PRO_ID;

      if (!priceId) {
        return res.status(400).json({ error: "Plan price ID not configured" });
      }

      // Create subscription with 7-day trial
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        trial_period_days: 7,
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with subscription info and trial
      await storage.updateUserStripeInfo(userId, stripeCustomerId, subscription.id);
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      await storage.updateUserPlan(userId, plan, 'trialing');

      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        trialEnd,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's subscription status
  app.get('/api/subscription-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeSubscriptionId) {
        return res.json({
          plan: user.plan,
          status: null,
          trialEndsAt: user.trialEndsAt,
        });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      res.json({
        plan: user.plan,
        status: subscription.status,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel subscription
  app.post('/api/cancel-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription" });
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      res.json({ 
        message: "Subscription will be canceled at period end",
        cancelAt: new Date(subscription.current_period_end * 1000),
      });
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: error.message });
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
