import { 
  type Property, 
  type InsertProperty,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type User,
  type UpsertUser
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; password: string; firstName?: string | null; lastName?: string | null }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined>;
  updateUserSubscription(userId: string, subscriptionStatus: string): Promise<User | undefined>;
  startTrial(userId: string, trialStart: Date, trialEnd: Date): Promise<User | undefined>;
  updatePropertyCount(userId: string, count: number): Promise<User | undefined>;
  
  getProperty(id: string): Promise<Property | undefined>;
  getPropertyByAccessKey(accessKey: string): Promise<Property | undefined>;
  getAllProperties(): Promise<Property[]>;
  getPropertiesByUser(userId: string): Promise<Property[]>;
  createProperty(property: InsertProperty, userId: string): Promise<Property>;
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
  private users: Map<string, User>;
  private properties: Map<string, Property>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.properties = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    
    const defaultPropertyId = randomUUID();
    const defaultAccessKey = "demo-paris-01";
    const defaultProperty: Property = {
      id: defaultPropertyId,
      userId: null,
      accessKey: defaultAccessKey,
      name: "Appartement Lumineux Paris 11e",
      description: "Magnifique appartement spacieux dans le 11e arrondissement de Paris, pouvant accueillir jusqu'à 6 personnes",
      address: "42 Rue de la Roquette, 75011 Paris",
      floor: "4ème étage",
      doorCode: "B5678",
      accessInstructions: "Prendre l'ascenseur jusqu'au 4ème étage, appartement sur la gauche",
      checkInTime: "15:00",
      checkOutTime: "11:00",
      checkInProcedure: "Récupérer les clés dans la boîte à clés sécurisée à l'entrée de l'immeuble",
      checkOutProcedure: "Laisser l'appartement propre et rangé, remettre les clés dans la boîte à clés",
      keyLocation: "Boîte à clés sécurisée à l'entrée",
      wifiName: "Voir instructions Wi-Fi",
      wifiPassword: "Scanner le code QR",
      amenities: ["WiFi gratuit", "Cuisine équipée", "Lave-linge", "Climatisation", "Netflix", "2 canapés-lits"],
      kitchenEquipment: "Four, micro-ondes, cafetière Nespresso, bouilloire, tous les ustensiles de cuisine",
      houseRules: "Non fumeur. Respecter le calme après 22h. Maximum 6 personnes.",
      maxGuests: "6",
      petsAllowed: false,
      smokingAllowed: false,
      partiesAllowed: false,
      parkingInfo: "Parking public à proximité. Consignes à bagages disponibles dans le quartier pour déposer vos affaires.",
      publicTransport: "Métro ligne 9 à 5 min à pied. Nombreux bus dans le quartier.",
      nearbyShops: "Laveries automatiques à proximité. Nombreux bars et restaurants dans le 11e arrondissement.",
      restaurants: "Le quartier regorge de restaurants, bars et cafés branchés typiques du 11e.",
      hostName: "Fall",
      hostPhone: "+33 6 00 00 00 00",
      emergencyContact: "Contacter Fall au +33 6 00 00 00 00",
      heatingInstructions: "Chauffage central, thermostat disponible",
      garbageInstructions: "Produits ménagers dans le placard à droite du bar",
      applianceInstructions: "IMPORTANT - Wi-Fi: Le code Wi-Fi se trouve à gauche de l'entrée, il faut scanner le code QR.\n\nNetflix: Si Netflix ne fonctionne pas, il faut se reconnecter et contacter l'hôte Fall pour obtenir les codes d'accès.\n\nStores: S'il n'y a qu'un seul store qui se baisse, appuyez sur le bouton rond de la télécommande et maintenez-le enfoncé jusqu'à ce que les trois stores descendent et remontent normalement.\n\nCanapés-lits: Deux canapés se déplient facilement - le canapé bleu et celui qui est central.\n\nTableau électrique: Il se trouve dans le placard à l'entrée.",
      additionalInfo: "Linge supplémentaire: Tout le linge supplémentaire se trouve dans la chambre.\n\nProduits ménagers: Tous les produits ménagers sont rangés dans le placard à droite du bar.\n\nConsignes à bagages: Des endroits pour déposer les bagages sont disponibles dans le quartier.\n\nLaveries: Plusieurs laveries automatiques à proximité de l'appartement.",
      faqs: "Q: Où est le code Wi-Fi?\nR: À gauche de l'entrée, il faut scanner le code QR.\n\nQ: Netflix ne fonctionne pas, que faire?\nR: Reconnectez-vous et contactez l'hôte Fall pour obtenir les codes.\n\nQ: Les stores ne descendent pas tous en même temps?\nR: Appuyez sur le bouton rond de la télécommande et maintenez enfoncé jusqu'à ce que les 3 stores fonctionnent normalement.\n\nQ: Où est le linge supplémentaire?\nR: Dans la chambre.\n\nQ: Où sont les produits ménagers?\nR: Dans le placard à droite du bar.\n\nQ: Où est le tableau électrique?\nR: Dans le placard à l'entrée.\n\nQ: Quels canapés se transforment en lit?\nR: Le canapé bleu et celui qui est central se déplient facilement.",
      createdAt: new Date(),
    };
    this.properties.set(defaultPropertyId, defaultProperty);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async createUser(userData: { email: string; password: string; firstName?: string | null; lastName?: string | null }): Promise<User> {
    const userId = randomUUID();
    const now = new Date();
    const user: User = {
      id: userId,
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      trialStartedAt: null,
      trialEndsAt: null,
      activePropertyCount: "0",
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(userId, user);
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existing = this.users.get(userData.id ?? "");
    const now = new Date();
    const userId = userData.id ?? "";
    
    const user: User = {
      id: userId,
      email: userData.email ?? null,
      password: existing?.password ?? "",
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      stripeCustomerId: existing?.stripeCustomerId ?? null,
      stripeSubscriptionId: existing?.stripeSubscriptionId ?? null,
      subscriptionStatus: existing?.subscriptionStatus ?? null,
      trialStartedAt: existing?.trialStartedAt ?? null,
      trialEndsAt: existing?.trialEndsAt ?? null,
      activePropertyCount: existing?.activePropertyCount ?? "0",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    
    this.users.set(userId, user);
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updated: User = {
      ...user,
      stripeCustomerId,
      stripeSubscriptionId,
      updatedAt: new Date(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async updateUserSubscription(userId: string, subscriptionStatus: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updated: User = {
      ...user,
      subscriptionStatus,
      updatedAt: new Date(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async startTrial(userId: string, trialStart: Date, trialEnd: Date): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updated: User = {
      ...user,
      trialStartedAt: trialStart,
      trialEndsAt: trialEnd,
      subscriptionStatus: "trialing",
      updatedAt: new Date(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async updatePropertyCount(userId: string, count: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updated: User = {
      ...user,
      activePropertyCount: count.toString(),
      updatedAt: new Date(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getPropertyByAccessKey(accessKey: string): Promise<Property | undefined> {
    return Array.from(this.properties.values()).find(p => p.accessKey === accessKey);
  }

  async getAllProperties(): Promise<Property[]> {
    return Array.from(this.properties.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getPropertiesByUser(userId: string): Promise<Property[]> {
    return Array.from(this.properties.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createProperty(insertProperty: InsertProperty, userId: string): Promise<Property> {
    const id = randomUUID();
    const accessKey = Math.random().toString(36).substring(2, 14);
    const property: Property = { 
      id,
      userId,
      accessKey,
      name: insertProperty.name,
      description: insertProperty.description,
      address: insertProperty.address,
      floor: insertProperty.floor ?? null,
      doorCode: insertProperty.doorCode ?? null,
      accessInstructions: insertProperty.accessInstructions ?? null,
      checkInTime: insertProperty.checkInTime ?? "15:00",
      checkOutTime: insertProperty.checkOutTime ?? "11:00",
      checkInProcedure: insertProperty.checkInProcedure ?? null,
      checkOutProcedure: insertProperty.checkOutProcedure ?? null,
      keyLocation: insertProperty.keyLocation ?? null,
      wifiName: insertProperty.wifiName ?? null,
      wifiPassword: insertProperty.wifiPassword ?? null,
      amenities: insertProperty.amenities ?? [],
      kitchenEquipment: insertProperty.kitchenEquipment ?? null,
      houseRules: insertProperty.houseRules ?? "",
      maxGuests: insertProperty.maxGuests ?? null,
      petsAllowed: insertProperty.petsAllowed ?? false,
      smokingAllowed: insertProperty.smokingAllowed ?? false,
      partiesAllowed: insertProperty.partiesAllowed ?? false,
      parkingInfo: insertProperty.parkingInfo ?? null,
      publicTransport: insertProperty.publicTransport ?? null,
      nearbyShops: insertProperty.nearbyShops ?? null,
      restaurants: insertProperty.restaurants ?? null,
      hostName: insertProperty.hostName,
      hostPhone: insertProperty.hostPhone ?? null,
      emergencyContact: insertProperty.emergencyContact ?? null,
      heatingInstructions: insertProperty.heatingInstructions ?? null,
      garbageInstructions: insertProperty.garbageInstructions ?? null,
      applianceInstructions: insertProperty.applianceInstructions ?? null,
      additionalInfo: insertProperty.additionalInfo ?? null,
      faqs: insertProperty.faqs ?? null,
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
      id,
      conversationId: insertMessage.conversationId,
      content: insertMessage.content,
      isBot: insertMessage.isBot ?? false,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    await this.updateConversationTimestamp(insertMessage.conversationId);
    return message;
  }
}

// Use database storage if DATABASE_URL is configured, otherwise use in-memory storage
let storage: IStorage;

// Initialize storage based on DATABASE_URL
if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
  try {
    // Dynamic import to avoid errors if database module fails
    const { DatabaseStorage } = require("./db-storage");
    storage = new DatabaseStorage();
    console.log("✅ Using PostgreSQL database storage (data will persist)");
  } catch (error: any) {
    console.warn("⚠️  Failed to initialize database storage, falling back to in-memory storage:", error.message);
    storage = new MemStorage();
    console.warn("⚠️  WARNING: Data will be lost when server restarts!");
  }
} else {
  console.warn("⚠️  DATABASE_URL not configured, using in-memory storage");
  console.warn("⚠️  WARNING: Data will be lost when server restarts!");
  console.warn("⚠️  To enable persistent storage, add DATABASE_URL to your .env file");
  storage = new MemStorage();
}

export { storage };
