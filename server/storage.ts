import { 
  type Property, 
  type InsertProperty,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getProperty(id: string): Promise<Property | undefined>;
  getAllProperties(): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: string): Promise<boolean>;

  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByProperty(propertyId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversationTimestamp(id: string): Promise<void>;

  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class MemStorage implements IStorage {
  private properties: Map<string, Property>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;

  constructor() {
    this.properties = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    
    const defaultPropertyId = randomUUID();
    const defaultProperty: Property = {
      id: defaultPropertyId,
      name: "Appartement Lumineux à Paris",
      description: "Bel appartement de 2 chambres au cœur de Paris, parfait pour 4 personnes",
      checkInTime: "15:00",
      checkOutTime: "11:00",
      wifiName: "ParisHome_WiFi",
      wifiPassword: "paris2024",
      houseRules: "Non fumeur. Animaux non acceptés. Respecter le calme après 22h.",
      amenities: ["WiFi gratuit", "Cuisine équipée", "Lave-linge", "Climatisation", "Netflix"],
      parkingInfo: "Parking public à 200m, tarif 2€/heure",
      address: "15 Rue de Rivoli, 75001 Paris",
      hostName: "Sophie Martin",
      hostPhone: "+33 6 12 34 56 78",
      additionalInfo: "Boulangerie au coin de la rue. Métro Châtelet à 5 min à pied.",
      createdAt: new Date(),
    };
    this.properties.set(defaultPropertyId, defaultProperty);
  }

  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getAllProperties(): Promise<Property[]> {
    return Array.from(this.properties.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const property: Property = { 
      ...insertProperty, 
      id,
      createdAt: new Date()
    };
    this.properties.set(id, property);
    return property;
  }

  async updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property) return undefined;
    
    const updated = { ...property, ...updates };
    this.properties.set(id, updated);
    return updated;
  }

  async deleteProperty(id: string): Promise<boolean> {
    return this.properties.delete(id);
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsByProperty(propertyId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(c => c.propertyId === propertyId)
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const now = new Date();
    const conversation: Conversation = { 
      ...insertConversation, 
      id,
      createdAt: now,
      lastMessageAt: now
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversationTimestamp(id: string): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      conversation.lastMessageAt = new Date();
      this.conversations.set(id, conversation);
    }
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage, 
      id,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    await this.updateConversationTimestamp(insertMessage.conversationId);
    return message;
  }
}

export const storage = new MemStorage();
