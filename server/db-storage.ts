import { db } from "./db";
import { 
  users, 
  properties, 
  conversations, 
  messages,
  messageFeedback,
  responseTemplates,
  teamMembers,
  notifications,
  type User,
  type Property,
  type Conversation,
  type Message,
  type InsertProperty,
  type InsertConversation,
  type InsertMessage,
  type UpsertUser,
  type InsertMessageFeedback,
  type InsertResponseTemplate,
  type InsertTeamMember,
  type InsertNotification,
  type MessageFeedback,
  type ResponseTemplate,
  type TeamMember,
  type Notification,
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";
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
 * NOTE: This file is kept for backward compatibility but PgStorage in storage.ts is the preferred implementation
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
        .where(eq(users.id, userData.id!))
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

  // Message Feedback operations
  async createMessageFeedback(feedback: InsertMessageFeedback): Promise<MessageFeedback> {
    const database = ensureDb();
    const result = await database.insert(messageFeedback).values(feedback).returning();
    return result[0];
  }

  async getFeedbackByMessage(messageId: string): Promise<MessageFeedback[]> {
    const database = ensureDb();
    return await database.select().from(messageFeedback)
      .where(eq(messageFeedback.messageId, messageId))
      .orderBy(desc(messageFeedback.createdAt));
  }

  async getFeedbackStats(userId: string, propertyId?: string): Promise<{ helpful: number; notHelpful: number; total: number }> {
    const database = ensureDb();
    const conditions: any[] = [];
    if (propertyId) {
      conditions.push(eq(conversations.propertyId, propertyId));
    } else {
      const userProperties = await this.getPropertiesByUser(userId);
      if (userProperties.length > 0) {
        const propertyIds = userProperties.map(p => p.id);
        if (propertyIds.length === 1) {
          conditions.push(eq(conversations.propertyId, propertyIds[0]));
        } else if (propertyIds.length > 1) {
          conditions.push(sql`${conversations.propertyId} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`);
        }
      }
    }

    const helpfulQuery = database.select({ count: count() })
      .from(messageFeedback)
      .innerJoin(messages, eq(messageFeedback.messageId, messages.id))
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(...conditions, eq(messageFeedback.isHelpful, true)));
    
    const notHelpfulQuery = database.select({ count: count() })
      .from(messageFeedback)
      .innerJoin(messages, eq(messageFeedback.messageId, messages.id))
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(...conditions, eq(messageFeedback.isHelpful, false)));
    
    const helpfulResult = await helpfulQuery;
    const notHelpfulResult = await notHelpfulQuery;
    
    const helpful = Number(helpfulResult[0]?.count || 0);
    const notHelpful = Number(notHelpfulResult[0]?.count || 0);
    
    return { helpful, notHelpful, total: helpful + notHelpful };
  }

  // Response Templates operations
  async getResponseTemplates(userId: string, propertyId?: string): Promise<ResponseTemplate[]> {
    const database = ensureDb();
    const conditions: any[] = [eq(responseTemplates.userId, userId)];
    if (propertyId !== undefined) {
      if (propertyId === null) {
        conditions.push(sql`${responseTemplates.propertyId} IS NULL`);
      } else {
        conditions.push(eq(responseTemplates.propertyId, propertyId));
      }
    }
    return await database.select().from(responseTemplates)
      .where(and(...conditions))
      .orderBy(desc(responseTemplates.updatedAt));
  }

  async getResponseTemplate(id: string): Promise<ResponseTemplate | undefined> {
    const database = ensureDb();
    const result = await database.select().from(responseTemplates)
      .where(eq(responseTemplates.id, id))
      .limit(1);
    return result[0];
  }

  async createResponseTemplate(template: InsertResponseTemplate): Promise<ResponseTemplate> {
    const database = ensureDb();
    const result = await database.insert(responseTemplates).values(template).returning();
    return result[0];
  }

  async updateResponseTemplate(id: string, updates: Partial<InsertResponseTemplate>): Promise<ResponseTemplate | undefined> {
    const database = ensureDb();
    const result = await database.update(responseTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(responseTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteResponseTemplate(id: string): Promise<boolean> {
    const database = ensureDb();
    const result = await database.delete(responseTemplates)
      .where(eq(responseTemplates.id, id))
      .returning();
    return result.length > 0;
  }

  // Analytics operations
  async getAnalytics(userId: string, propertyId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalMessages: number;
    totalConversations: number;
    messagesByDay: Array<{ date: string; count: number }>;
    messagesByLanguage: Array<{ language: string; count: number }>;
    messagesByCategory: Array<{ category: string; count: number }>;
    topQuestions: Array<{ question: string; count: number }>;
    averageResponseTime: number;
    feedbackStats: { helpful: number; notHelpful: number; total: number };
  }> {
    const database = ensureDb();
    const userProperties = await this.getPropertiesByUser(userId);
    if (userProperties.length === 0) {
      return {
        totalMessages: 0,
        totalConversations: 0,
        messagesByDay: [],
        messagesByLanguage: [],
        messagesByCategory: [],
        topQuestions: [],
        averageResponseTime: 0,
        feedbackStats: { helpful: 0, notHelpful: 0, total: 0 },
      };
    }

    const propertyIds = propertyId ? [propertyId] : userProperties.map(p => p.id);
    const messageConditions: any[] = [];
    if (propertyIds.length > 0) {
      if (propertyIds.length === 1) {
        messageConditions.push(eq(conversations.propertyId, propertyIds[0]));
      } else {
        messageConditions.push(sql`${conversations.propertyId} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`);
      }
    }
    if (startDate) messageConditions.push(gte(messages.createdAt, startDate));
    if (endDate) messageConditions.push(lte(messages.createdAt, endDate));

    const totalMessagesResult = await database.select({ count: count() })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(...messageConditions));
    const totalMessages = Number(totalMessagesResult[0]?.count || 0);

    const convConditions: any[] = [];
    if (propertyIds.length > 0) {
      if (propertyIds.length === 1) {
        convConditions.push(eq(conversations.propertyId, propertyIds[0]));
      } else {
        convConditions.push(sql`${conversations.propertyId} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`);
      }
    }
    const totalConversationsResult = await database.select({ count: count() })
      .from(conversations)
      .where(and(...convConditions));
    const totalConversations = Number(totalConversationsResult[0]?.count || 0);

    const messagesByLanguageResult = await database.select({
      language: messages.language,
      count: count(),
    })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(...messageConditions, sql`${messages.language} IS NOT NULL`))
      .groupBy(messages.language);
    const messagesByLanguage = messagesByLanguageResult.map(r => ({ 
      language: r.language || 'unknown', 
      count: Number(r.count) 
    }));

    const messagesByCategoryResult = await database.select({
      category: messages.category,
      count: count(),
    })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(...messageConditions, sql`${messages.category} IS NOT NULL`))
      .groupBy(messages.category);
    const messagesByCategory = messagesByCategoryResult.map(r => ({ 
      category: r.category || 'unknown', 
      count: Number(r.count) 
    }));

    const topQuestionsResult = await database.select({
      question: messages.content,
    })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(...messageConditions, eq(messages.isBot, false)))
      .limit(10);
    const topQuestions = topQuestionsResult.map(r => ({ question: r.question, count: 1 }));

    const feedbackStats = await this.getFeedbackStats(userId, propertyId);

    return {
      totalMessages,
      totalConversations,
      messagesByDay: [],
      messagesByLanguage,
      messagesByCategory,
      topQuestions,
      averageResponseTime: 0,
      feedbackStats,
    };
  }

  // Team operations
  async getTeamMembers(teamOwnerId: string): Promise<TeamMember[]> {
    const database = ensureDb();
    return await database.select().from(teamMembers)
      .where(eq(teamMembers.teamOwnerId, teamOwnerId))
      .orderBy(desc(teamMembers.createdAt));
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const database = ensureDb();
    const result = await database.select().from(teamMembers)
      .where(eq(teamMembers.id, id))
      .limit(1);
    return result[0];
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const database = ensureDb();
    const result = await database.insert(teamMembers).values(member).returning();
    return result[0];
  }

  async updateTeamMember(id: string, updates: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const database = ensureDb();
    const result = await database.update(teamMembers)
      .set(updates)
      .where(eq(teamMembers.id, id))
      .returning();
    return result[0];
  }

  async deleteTeamMember(id: string): Promise<boolean> {
    const database = ensureDb();
    const result = await database.delete(teamMembers)
      .where(eq(teamMembers.id, id))
      .returning();
    return result.length > 0;
  }

  // Notifications operations
  async getNotifications(userId: string, isRead?: boolean): Promise<Notification[]> {
    const database = ensureDb();
    const conditions: any[] = [eq(notifications.userId, userId)];
    if (isRead !== undefined) {
      conditions.push(eq(notifications.isRead, isRead));
    }
    return await database.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.sentAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const database = ensureDb();
    const result = await database.insert(notifications).values(notification).returning();
    return result[0];
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const database = ensureDb();
    const result = await database.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const database = ensureDb();
    await database.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.userId, userId));
  }
}
