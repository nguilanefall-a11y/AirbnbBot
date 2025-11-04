import { db } from "./db";
import { 
  users, 
  properties, 
  conversations, 
  messages,
  type User,
  type Property,
  type Conversation,
  type Message,
  type InsertProperty,
  type InsertConversation,
  type InsertMessage,
  type UpsertUser
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { IStorage } from "./storage";

// Helper to ensure db is initialized
function ensureDb() {
  if (!db) {
    throw new Error("Database not initialized. DATABASE_URL must be set.");
  }
  return db;
}

/**
 * PostgreSQL database storage implementation
 * This stores all data persistently in the database
 */
export class DatabaseStorage implements IStorage {
  constructor() {
    if (!db) {
      throw new Error("Database not initialized. DATABASE_URL must be set.");
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const database = ensureDb();
    const result = await database.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const database = ensureDb();
    const result = await database.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(userData: { email: string; password: string; firstName?: string | null; lastName?: string | null }): Promise<User> {
    const database = ensureDb();
    const result = await database.insert(users).values({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
    }).returning();
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const database = ensureDb();
    // Check if user exists
    const existing = userData.id ? await this.getUser(userData.id) : null;
    
    if (existing) {
      // Update existing user
      const result = await database.update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id))
        .returning();
      return result[0];
    } else {
      // Insert new user
      const result = await database.insert(users)
        .values(userData)
        .returning();
      return result[0];
    }
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined> {
    const database = ensureDb();
    const result = await database.update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateUserSubscription(userId: string, subscriptionStatus: string): Promise<User | undefined> {
    const database = ensureDb();
    const result = await database.update(users)
      .set({
        subscriptionStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async startTrial(userId: string, trialStart: Date, trialEnd: Date): Promise<User | undefined> {
    const database = ensureDb();
    const result = await database.update(users)
      .set({
        trialStartedAt: trialStart,
        trialEndsAt: trialEnd,
        subscriptionStatus: "trialing",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updatePropertyCount(userId: string, count: number): Promise<User | undefined> {
    const database = ensureDb();
    const result = await database.update(users)
      .set({
        activePropertyCount: count.toString(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  // Property operations
  async getProperty(id: string): Promise<Property | undefined> {
    const database = ensureDb();
    const result = await database.select().from(properties).where(eq(properties.id, id)).limit(1);
    return result[0];
  }

  async getPropertyByAccessKey(accessKey: string): Promise<Property | undefined> {
    const database = ensureDb();
    const result = await database.select().from(properties)
      .where(eq(properties.accessKey, accessKey))
      .limit(1);
    return result[0];
  }

  async getAllProperties(): Promise<Property[]> {
    const database = ensureDb();
    return await database.select().from(properties).orderBy(desc(properties.createdAt));
  }

  async getPropertiesByUser(userId: string): Promise<Property[]> {
    const database = ensureDb();
    return await database.select().from(properties)
      .where(eq(properties.userId, userId))
      .orderBy(desc(properties.createdAt));
  }

  async createProperty(insertProperty: InsertProperty, userId: string): Promise<Property> {
    const database = ensureDb();
    const result = await database.insert(properties).values({
      ...insertProperty,
      userId,
    }).returning();
    return result[0];
  }

  async updateProperty(id: string, propertyData: Partial<InsertProperty>): Promise<Property | undefined> {
    const database = ensureDb();
    const result = await database.update(properties)
      .set(propertyData)
      .where(eq(properties.id, id))
      .returning();
    return result[0];
  }

  async deleteProperty(id: string): Promise<boolean> {
    const database = ensureDb();
    const result = await database.delete(properties)
      .where(eq(properties.id, id))
      .returning();
    return result.length > 0;
  }

  // Conversation operations
  async getConversation(id: string): Promise<Conversation | undefined> {
    const database = ensureDb();
    const result = await database.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async getConversationsByProperty(propertyId: string): Promise<Conversation[]> {
    const database = ensureDb();
    return await database.select().from(conversations)
      .where(eq(conversations.propertyId, propertyId))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const database = ensureDb();
    const result = await database.insert(conversations).values(conversationData).returning();
    return result[0];
  }

  async updateConversationTimestamp(id: string): Promise<void> {
    const database = ensureDb();
    await database.update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, id));
  }

  // Message operations
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    const database = ensureDb();
    return await database.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const database = ensureDb();
    const result = await database.insert(messages).values(messageData).returning();
    
    // Update conversation timestamp
    await this.updateConversationTimestamp(messageData.conversationId);
    
    return result[0];
  }
}

