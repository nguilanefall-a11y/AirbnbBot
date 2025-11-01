import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertPropertySchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { generateChatResponse } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
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

  app.post("/api/properties", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
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
