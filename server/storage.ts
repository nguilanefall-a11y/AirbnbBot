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
  getPropertyByAccessKey(accessKey: string): Promise<Property | undefined>;
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
    const defaultAccessKey = "demo-paris-01";
    const defaultProperty: Property = {
      id: defaultPropertyId,
      accessKey: defaultAccessKey,
      name: "Appartement Lumineux à Paris",
      description: "Bel appartement de 2 chambres au cœur de Paris, parfait pour 4 personnes",
      address: "15 Rue de Rivoli, 75001 Paris",
      floor: "3ème étage",
      doorCode: "A1234",
      accessInstructions: "Prendre l'ascenseur jusqu'au 3ème étage, appartement sur la droite",
      checkInTime: "15:00",
      checkOutTime: "11:00",
      checkInProcedure: "Récupérer les clés dans la boîte à clés sécurisée à l'entrée de l'immeuble",
      checkOutProcedure: "Laisser les clés sur la table de l'entrée",
      keyLocation: "Boîte à clés sécurisée code: 5678",
      wifiName: "ParisHome_WiFi",
      wifiPassword: "paris2024",
      amenities: ["WiFi gratuit", "Cuisine équipée", "Lave-linge", "Climatisation", "Netflix"],
      kitchenEquipment: "Four, micro-ondes, cafetière Nespresso, bouilloire",
      houseRules: "Non fumeur. Respecter le calme après 22h. Sortir les poubelles le mardi et vendredi.",
      maxGuests: "4",
      petsAllowed: false,
      smokingAllowed: false,
      partiesAllowed: false,
      parkingInfo: "Parking public à 200m, tarif 2€/heure ou parking Indigo à 400m",
      publicTransport: "Métro Châtelet à 5 min à pied (lignes 1, 4, 7, 11, 14)",
      nearbyShops: "Monoprix à 100m, Franprix au coin de la rue",
      restaurants: "Nombreux restaurants rue de Rivoli et rue Saint-Antoine",
      hostName: "Sophie Martin",
      hostPhone: "+33 6 12 34 56 78",
      emergencyContact: "Concierge: +33 1 23 45 67 89",
      heatingInstructions: "Chauffage central, thermostat dans le salon, température recommandée: 20°C",
      garbageInstructions: "Sortir les poubelles le mardi et vendredi soir dans le local poubelle au rez-de-chaussée",
      applianceInstructions: "Lave-linge: programme coton 40°C recommandé. Lave-vaisselle: tablettes sous l'évier",
      additionalInfo: "Boulangerie au coin de la rue. Code WiFi sur le frigo.",
      faqs: "Q: Où sont les draps supplémentaires? R: Dans l'armoire de la chambre principale.\nQ: Comment fonctionne la climatisation? R: Télécommande sur la table basse, mode AUTO recommandé.",
      createdAt: new Date(),
    };
    this.properties.set(defaultPropertyId, defaultProperty);
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

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const accessKey = Math.random().toString(36).substring(2, 14);
    const property: Property = { 
      id,
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

export const storage = new MemStorage();
