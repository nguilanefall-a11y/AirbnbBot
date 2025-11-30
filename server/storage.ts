import { 
  type Property, 
  type InsertProperty,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type User,
  type UpsertUser,
  type MessageFeedback,
  type InsertMessageFeedback,
  type ResponseTemplate,
  type InsertResponseTemplate,
  type TeamMember,
  type InsertTeamMember,
  type Notification,
  type InsertNotification,
  type Booking,
  type InsertBooking,
  users,
  properties,
  conversations,
  messages,
  messageFeedback,
  responseTemplates,
  teamMembers,
  notifications,
  bookings,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql, count, avg } from "drizzle-orm";

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
  
  // Message Feedback operations
  createMessageFeedback(feedback: InsertMessageFeedback): Promise<MessageFeedback>;
  getFeedbackByMessage(messageId: string): Promise<MessageFeedback[]>;
  getFeedbackStats(userId: string, propertyId?: string): Promise<{ helpful: number; notHelpful: number; total: number }>;
  
  // Response Templates operations
  getResponseTemplates(userId: string, propertyId?: string): Promise<ResponseTemplate[]>;
  getResponseTemplate(id: string): Promise<ResponseTemplate | undefined>;
  createResponseTemplate(template: InsertResponseTemplate): Promise<ResponseTemplate>;
  updateResponseTemplate(id: string, updates: Partial<InsertResponseTemplate>): Promise<ResponseTemplate | undefined>;
  deleteResponseTemplate(id: string): Promise<boolean>;
  
  // Analytics operations
  getAnalytics(userId: string, propertyId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalMessages: number;
    totalConversations: number;
    messagesByDay: Array<{ date: string; count: number }>;
    messagesByLanguage: Array<{ language: string; count: number }>;
    messagesByCategory: Array<{ category: string; count: number }>;
    topQuestions: Array<{ question: string; count: number }>;
    averageResponseTime: number;
    feedbackStats: { helpful: number; notHelpful: number; total: number };
  }>;
  
  // Team operations
  getTeamMembers(teamOwnerId: string): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, updates: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: string): Promise<boolean>;
  
  // Notifications operations
  getNotifications(userId: string, isRead?: boolean): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  
  // Booking operations
  getBookingByAccessKey(accessKey: string): Promise<Booking | undefined>;
  getBookingsByProperty(propertyId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;
  getActiveBookingForProperty(propertyId: string): Promise<Booking | undefined>;
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
      name: "Appartement Élégant Paris 8e - Champs-Élysées",
      description: "Superbe appartement de standing dans le 8ème arrondissement, à deux pas des Champs-Élysées. Appartement lumineux et spacieux de 120m², entièrement rénové, avec vue sur les toits de Paris. Idéal pour 4 personnes, avec toutes les commodités modernes. Proche des plus beaux monuments de Paris (Arc de Triomphe, Place de la Concorde, Grand Palais).",
      address: "15 Avenue des Champs-Élysées, 75008 Paris",
      floor: "5ème étage avec ascenseur",
      doorCode: "A8B42",
      accessInstructions: "Entrer par la porte principale, prendre l'ascenseur jusqu'au 5ème étage. L'appartement est la porte à droite en sortant de l'ascenseur.",
      checkInTime: "15:00",
      checkOutTime: "11:00",
      checkInProcedure: "Les clés sont dans une boîte sécurisée à l'entrée de l'immeuble. Code: 2842#. Une fois les clés récupérées, monter au 5ème étage. Un guide d'accueil vous attendra dans l'appartement avec toutes les informations.",
      checkOutProcedure: "Merci de laisser l'appartement dans l'état où vous l'avez trouvé. Remettre les clés dans la boîte sécurisée à l'entrée. Les draps et serviettes peuvent être laissés dans la salle de bain. Jeter les déchets dans les poubelles prévues à cet effet.",
      keyLocation: "Boîte à clés sécurisée à l'entrée de l'immeuble - Code: 2842#",
      wifiName: "Paris8Elegant_WiFi",
      wifiPassword: "ChampsElysees2024!",
      amenities: ["WiFi ultra-rapide", "Cuisine entièrement équipée", "Lave-linge et sèche-linge", "Climatisation réversible", "Netflix Premium", "TV 4K 55 pouces", "Machine à café Nespresso", "Lave-vaisselle", "Four multifonctions", "Micro-ondes", "Bouilloire électrique", "Fer à repasser et table à repasser", "Sèche-cheveux", "Produits d'accueil (shampoing, gel douche, savon)"],
      kitchenEquipment: "Cuisine entièrement équipée avec : Four multifonctions, plaques à induction, lave-vaisselle, réfrigérateur-congélateur, micro-ondes, machine à café Nespresso (capsules fournies), bouilloire électrique, grille-pain, mixeur, robot culinaire, batterie de cuisine complète (casseroles, poêles, ustensiles), vaisselle pour 8 personnes, verres à vin, couverts en inox.",
      houseRules: "Non fumeur strictement. Respecter le calme après 22h et avant 8h. Maximum 4 personnes. Pas de fêtes ni d'événements. Les animaux ne sont pas autorisés. Merci de respecter les voisins et de maintenir l'appartement propre.",
      maxGuests: "4",
      petsAllowed: false,
      smokingAllowed: false,
      partiesAllowed: false,
      parkingInfo: "Parking public payant disponible à 100m (Parking Champs-Élysées - 2,50€/h). Parking privé disponible sur réservation (15€/jour) - contacter l'hôte à l'avance. Stationnement gratuit possible dans certaines rues adjacentes après 20h et le dimanche.",
      publicTransport: "Métro ligne 1 (Champs-Élysées - Clemenceau) à 2 min à pied. Métro ligne 8 (Concorde) à 5 min. Métro ligne 9 (Franklin D. Roosevelt) à 3 min. RER C (Invalides) à 10 min. Nombreux bus : 24, 42, 72, 84, 94. Vélib' station à 50m.",
      nearbyShops: "SUPERMARCHÉS : Monoprix Champs-Élysées (ouvert jusqu'à 23h) à 3 min, Carrefour Market à 5 min. PHARMACIES : Pharmacie des Champs-Élysées (24/7) à 2 min. BANQUES : BNP Paribas, Crédit Agricole, LCL à proximité. BUREAUX DE CHANGE : plusieurs à moins de 5 min. LAVERIES : Laverie automatique à 200m (Rue de Ponthieu). BOUTIQUES : Toutes les grandes marques sur les Champs-Élysées.",
      restaurants: "RESTAURANTS HAUT DE GAMME : L'Atelier Étoilé (français, 1 étoile Michelin) à 5 min, Le Fouquet's (brasserie historique) à 3 min, Ladurée (pâtisseries et salon de thé) à 2 min. RESTAURANTS MOYENNE GAMME : Le Relais de l'Entrecôte (steak-frites) à 4 min, L'Alsace (cuisine alsacienne) à 3 min, Café de Flore (café-restaurant) à 6 min. RESTAURANTS RAPIDES : McDonald's, KFC, Starbucks sur les Champs-Élysées. BARS : Le Bar des Champs, Harry's New York Bar (cocktails) à 5 min. BOULANGERIES : Maison Kayser, Paul, à moins de 3 min.",
      hostName: "Sophie",
      hostPhone: "+33 6 12 34 56 78",
      emergencyContact: "En cas d'urgence : Sophie au +33 6 12 34 56 78 (disponible 24/7). Concierge de l'immeuble : +33 1 42 65 78 90 (lun-ven 9h-18h). Urgences médicales : 15. Police : 17. Pompiers : 18.",
      heatingInstructions: "Chauffage central individuel avec thermostat dans le salon. Réglage : Tourner le thermostat vers la droite pour augmenter (recommandé : 20-21°C). Climatisation réversible disponible en été (télécommande dans le salon). Fenêtres double vitrage pour isolation optimale.",
      garbageInstructions: "Poubelles tri sélectif dans la cuisine : Jaune (emballages, plastiques), Vert (verre), Bleu (papier, carton), Gris (déchets organiques). Sortir les poubelles le mardi et vendredi matin avant 8h (poubelles dans la cour de l'immeuble). Les gros déchets peuvent être déposés à la déchetterie du 8ème (Rue de Ponthieu) ou contacter la mairie.",
      applianceInstructions: "WI-FI : Nom du réseau : Paris8Elegant_WiFi | Mot de passe : ChampsElysees2024! | Le routeur se trouve dans le salon, près de la TV.\n\nTV 4K : Télécommande universelle sur la table basse. Netflix Premium déjà configuré (compte hôte). Pour d'autres applications, utilisez le menu Smart TV.\n\nLAVE-LINGE : Programme rapide (30 min) pour les vêtements peu sales, programme coton (1h30) pour le linge de maison. Lessive et adoucissant dans le placard sous l'évier.\n\nSÈCHE-LINGE : Utiliser après le lave-linge. Programme automatique recommandé. Vider le filtre à peluches avant chaque utilisation.\n\nLAVE-VAISSELLE : Tablettes dans le placard sous l'évier. Programme éco pour économiser l'eau.\n\nMACHINE À CAFÉ NESPRESSO : Capsules fournies dans le placard de la cuisine. Allumer 30 secondes avant utilisation pour préchauffer.\n\nCLIMATISATION : Télécommande dans le salon. Mode automatique recommandé (température idéale : 22-23°C en été).",
      additionalInfo: "LINGE : Linge de lit supplémentaire dans l'armoire de la chambre principale. Serviettes supplémentaires dans le placard de la salle de bain.\n\nPRODUITS D'ACCUEIL : Shampoing, gel douche, savon, crème hydratante fournis dans la salle de bain. Produits de nettoyage sous l'évier de la cuisine.\n\nCONSIGNES À BAGAGES : Bag'n Store (Rue de Ponthieu) à 200m - 5€/jour. Nannybag (service en ligne) disponible pour livraison/collecte.\n\nINFORMATIONS TOURISTIQUES : Guides de Paris disponibles dans le salon. Cartes de métro gratuites. Brochures des musées et monuments à proximité.\n\nSÉCURITÉ : Appartement équipé d'un système d'alarme (code fourni à l'arrivée). Fermer toutes les fenêtres en partant. Double verrouillage de la porte d'entrée.\n\nÉLECTRICITÉ : Tableau électrique dans l'entrée (à gauche). En cas de coupure, vérifier les disjoncteurs.",
      faqs: "Q: Où est le code Wi-Fi ?\nR: Le réseau s'appelle 'Paris8Elegant_WiFi' et le mot de passe est 'ChampsElysees2024!'. Le routeur est dans le salon, près de la TV.\n\nQ: Comment utiliser la climatisation ?\nR: Utiliser la télécommande dans le salon. Mode automatique recommandé (22-23°C en été). La climatisation est réversible et fonctionne aussi en chauffage l'hiver.\n\nQ: Où sont les clés ?\nR: Dans la boîte sécurisée à l'entrée de l'immeuble. Code : 2842#. Les clés sont marquées 'Appartement 5ème étage'.\n\nQ: Où se garer ?\nR: Parking public à 100m (Parking Champs-Élysées - 2,50€/h) ou parking privé sur réservation (15€/jour). Stationnement gratuit possible dans certaines rues adjacentes après 20h et le dimanche.\n\nQ: Où faire les courses ?\nR: Monoprix Champs-Élysées à 3 min à pied (ouvert jusqu'à 23h). Carrefour Market à 5 min. Les deux proposent une large gamme de produits alimentaires et d'hygiène.\n\nQ: Où manger ?\nR: Nombreux restaurants sur les Champs-Élysées. Le Fouquet's (brasserie historique) à 3 min, Ladurée (pâtisseries et salon de thé) à 2 min, L'Atelier Étoilé (1 étoile Michelin) à 5 min. Pour un repas rapide : McDonald's, KFC, Starbucks sur les Champs-Élysées.\n\nQ: Où est la laverie ?\nR: Laverie automatique à 200m, Rue de Ponthieu. Ouverte 24/7. Prix : environ 5€ pour un lavage et 3€ pour un séchage.\n\nQ: Comment utiliser le lave-linge ?\nR: Lessive et adoucissant dans le placard sous l'évier. Programme rapide (30 min) pour les vêtements peu sales, programme coton (1h30) pour le linge de maison. Ne pas surcharger la machine.\n\nQ: Comment utiliser le sèche-linge ?\nR: Utiliser après le lave-linge. Programme automatique recommandé. Vider le filtre à peluches avant chaque utilisation. Ne pas mettre de vêtements en laine ou délicats.\n\nQ: Où sont les produits ménagers ?\nR: Sous l'évier de la cuisine, dans le placard de droite. Vous y trouverez produits vaisselle, éponges, serpillières, et produits de nettoyage.\n\nQ: Comment contacter l'hôte en cas de problème ?\nR: Sophie au +33 6 12 34 56 78 (disponible 24/7). Pour les urgences médicales : 15. Police : 17. Pompiers : 18.\n\nQ: Où jeter les poubelles ?\nR: Tri sélectif dans la cuisine : Jaune (emballages, plastiques), Vert (verre), Bleu (papier, carton), Gris (déchets organiques). Sortir les poubelles le mardi et vendredi matin avant 8h dans la cour de l'immeuble.\n\nQ: Y a-t-il un ascenseur ?\nR: Oui, ascenseur jusqu'au 5ème étage. L'appartement est accessible directement depuis l'ascenseur, porte à droite en sortant.\n\nQ: Quelle est la vue depuis l'appartement ?\nR: Vue sur les toits de Paris, orientation sud-ouest, très lumineux. Vue dégagée sans vis-à-vis direct.\n\nQ: Comment utiliser la TV 4K et Netflix ?\nR: Télécommande universelle sur la table basse. Netflix Premium déjà configuré (compte hôte). Pour d'autres applications (YouTube, Prime Video), utilisez le menu Smart TV. Si Netflix ne fonctionne pas, reconnectez-vous ou contactez l'hôte.\n\nQ: Comment utiliser la machine à café Nespresso ?\nR: Capsules fournies dans le placard de la cuisine. Allumer la machine 30 secondes avant utilisation pour préchauffer. Insérer la capsule, appuyer sur le bouton. Eau dans le réservoir à l'arrière.\n\nQ: Où est le lave-vaisselle et comment l'utiliser ?\nR: Le lave-vaisselle est intégré dans la cuisine, sous l'évier. Tablettes de lave-vaisselle dans le placard sous l'évier. Programme éco recommandé pour économiser l'eau. Rincer rapidement les assiettes avant de les mettre.\n\nQ: Comment régler le chauffage ?\nR: Chauffage central individuel avec thermostat dans le salon. Tourner le thermostat vers la droite pour augmenter (recommandé : 20-21°C). Fenêtres double vitrage pour isolation optimale.\n\nQ: Où sont les pharmacies à proximité ?\nR: Pharmacie des Champs-Élysées (24/7) à 2 min à pied. Plusieurs autres pharmacies dans le quartier, toutes à moins de 5 min.\n\nQ: Quels sont les transports en commun les plus proches ?\nR: Métro ligne 1 (Champs-Élysées - Clemenceau) à 2 min à pied. Métro ligne 8 (Concorde) à 5 min. Métro ligne 9 (Franklin D. Roosevelt) à 3 min. RER C (Invalides) à 10 min. Bus : 24, 42, 72, 84, 94. Vélib' station à 50m.\n\nQ: Où sont les banques et bureaux de change ?\nR: BNP Paribas, Crédit Agricole, LCL à proximité. Plusieurs bureaux de change à moins de 5 min sur les Champs-Élysées. Distributeurs automatiques disponibles partout.\n\nQ: Où sont les boutiques et magasins ?\nR: Toutes les grandes marques sur les Champs-Élysées : Zara, H&M, Sephora, Nike, Adidas, etc. Galeries Lafayette et Printemps à 10 min en métro.\n\nQ: Où sont les musées et monuments à proximité ?\nR: Arc de Triomphe à 5 min à pied. Place de la Concorde à 5 min. Grand Palais et Petit Palais à 8 min. Musée du Louvre à 15 min en métro. Tour Eiffel à 20 min en métro.\n\nQ: Où sont les bars et cafés ?\nR: Le Bar des Champs à 3 min, Harry's New York Bar (cocktails) à 5 min. Nombreux cafés sur les Champs-Élysées. Café de Flore à 6 min.\n\nQ: Où sont les boulangeries et pâtisseries ?\nR: Maison Kayser à 2 min, Paul à 3 min, Ladurée (pâtisseries) à 2 min. Toutes les boulangeries proposent des viennoiseries fraîches le matin.\n\nQ: Où est le linge supplémentaire ?\nR: Linge de lit supplémentaire dans l'armoire de la chambre principale. Serviettes supplémentaires dans le placard de la salle de bain.\n\nQ: Où sont les produits d'accueil (shampoing, gel douche) ?\nR: Shampoing, gel douche, savon, crème hydratante fournis dans la salle de bain. Produits de qualité, renouvelés à chaque arrivée.\n\nQ: Où sont les consignes à bagages ?\nR: Bag'n Store (Rue de Ponthieu) à 200m - 5€/jour. Nannybag (service en ligne) disponible pour livraison/collecte. Idéal si vous arrivez avant le check-in ou partez après le check-out.\n\nQ: Où sont les guides touristiques et cartes ?\nR: Guides de Paris disponibles dans le salon. Cartes de métro gratuites. Brochures des musées et monuments à proximité. Informations touristiques dans le salon.\n\nQ: Comment fonctionne le système d'alarme ?\nR: Appartement équipé d'un système d'alarme (code fourni à l'arrivée). Fermer toutes les fenêtres en partant. Double verrouillage de la porte d'entrée. Instructions complètes dans le guide d'accueil.\n\nQ: Où est le tableau électrique ?\nR: Tableau électrique dans l'entrée, à gauche. En cas de coupure, vérifier les disjoncteurs. Ne pas toucher si vous n'êtes pas sûr, contacter l'hôte.\n\nQ: Y a-t-il un fer à repasser ?\nR: Oui, fer à repasser et table à repasser disponibles dans l'armoire de la chambre. Table à repasser pliable, facile à installer.\n\nQ: Où est le sèche-cheveux ?\nR: Sèche-cheveux dans la salle de bain, dans le placard sous le lavabo. Modèle professionnel, puissance élevée.\n\nQ: Quels sont les horaires de check-in et check-out ?\nR: Check-in : à partir de 15h. Check-out : avant 11h. Si vous avez besoin d'un check-in plus tôt ou d'un check-out plus tard, contactez l'hôte à l'avance (sous réserve de disponibilité).",
      arrivalMessage: null,
      arrivalVideoUrl: null,
      lastImportedAt: null,
      icalUrl: null,
      cleaningPersonId: null,
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
    const found = Array.from(this.properties.values()).find(p => p.accessKey === accessKey);
    // Always return demo property if it's requested (for demo chat)
    if (accessKey === "demo-paris-01" && !found) {
      const defaultProperty = Array.from(this.properties.values()).find(p => p.accessKey === "demo-paris-01");
      return defaultProperty;
    }
    return found;
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
      arrivalMessage: insertProperty.arrivalMessage ?? null,
      arrivalVideoUrl: insertProperty.arrivalVideoUrl ?? null,
      lastImportedAt: insertProperty.lastImportedAt ?? null,
      icalUrl: insertProperty.icalUrl ?? null,
      cleaningPersonId: insertProperty.cleaningPersonId ?? null,
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
      language: insertMessage.language ?? null,
      category: insertMessage.category ?? null,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    await this.updateConversationTimestamp(insertMessage.conversationId);
    return message;
  }

  // Message Feedback operations (stub for MemStorage)
  async createMessageFeedback(feedback: InsertMessageFeedback): Promise<MessageFeedback> {
    throw new Error("Message feedback not supported in MemStorage. Use PostgreSQL.");
  }

  async getFeedbackByMessage(messageId: string): Promise<MessageFeedback[]> {
    return [];
  }

  async getFeedbackStats(userId: string, propertyId?: string): Promise<{ helpful: number; notHelpful: number; total: number }> {
    return { helpful: 0, notHelpful: 0, total: 0 };
  }

  // Response Templates operations (stub for MemStorage)
  async getResponseTemplates(userId: string, propertyId?: string): Promise<ResponseTemplate[]> {
    return [];
  }

  async getResponseTemplate(id: string): Promise<ResponseTemplate | undefined> {
    return undefined;
  }

  async createResponseTemplate(template: InsertResponseTemplate): Promise<ResponseTemplate> {
    throw new Error("Response templates not supported in MemStorage. Use PostgreSQL.");
  }

  async updateResponseTemplate(id: string, updates: Partial<InsertResponseTemplate>): Promise<ResponseTemplate | undefined> {
    return undefined;
  }

  async deleteResponseTemplate(id: string): Promise<boolean> {
    return false;
  }

  // Analytics operations (stub for MemStorage)
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

  // Team operations (stub for MemStorage)
  async getTeamMembers(teamOwnerId: string): Promise<TeamMember[]> {
    return [];
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    return undefined;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    throw new Error("Team members not supported in MemStorage. Use PostgreSQL.");
  }

  async updateTeamMember(id: string, updates: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    return undefined;
  }

  async deleteTeamMember(id: string): Promise<boolean> {
    return false;
  }

  // Notifications operations (stub for MemStorage)
  async getNotifications(userId: string, isRead?: boolean): Promise<Notification[]> {
    return [];
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    throw new Error("Notifications not supported in MemStorage. Use PostgreSQL.");
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    return undefined;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    // No-op for MemStorage
  }

  // Booking operations (stub for MemStorage)
  async getBookingByAccessKey(accessKey: string): Promise<Booking | undefined> {
    return undefined;
  }

  async getBookingsByProperty(propertyId: string): Promise<Booking[]> {
    return [];
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    throw new Error("Bookings not supported in MemStorage. Use PostgreSQL.");
  }

  async updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined> {
    return undefined;
  }

  async deleteBooking(id: string): Promise<boolean> {
    return false;
  }

  async getActiveBookingForProperty(propertyId: string): Promise<Booking | undefined> {
    return undefined;
  }
}

// PostgreSQL implementation using Drizzle ORM
export class PgStorage implements IStorage {
  private ensureDb() {
    if (!db) {
      throw new Error("Database not initialized. DATABASE_URL must be set.");
    }
    return db;
  }

  constructor() {
    this.ensureDb(); // Check on construction
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const database = this.ensureDb();
    const result = await database.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const database = this.ensureDb();
    const result = await database.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(userData: { email: string; password: string; firstName?: string | null; lastName?: string | null }): Promise<User> {
    const database = this.ensureDb();
    const result = await database.insert(users).values({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      activePropertyCount: "0",
    }).returning();
    return result[0];
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const existing = await this.getUserByEmail(user.email);
    if (existing) {
      const result = await this.ensureDb().update(users)
        .set({
          firstName: user.firstName ?? existing.firstName,
          lastName: user.lastName ?? existing.lastName,
          profileImageUrl: user.profileImageUrl ?? existing.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return result[0];
    } else {
      return this.createUser({
        email: user.email,
        password: "",
        firstName: user.firstName,
        lastName: user.lastName,
      });
    }
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined> {
    const result = await this.ensureDb().update(users)
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
    const result = await this.ensureDb().update(users)
      .set({
        subscriptionStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async startTrial(userId: string, trialStart: Date, trialEnd: Date): Promise<User | undefined> {
    const result = await this.ensureDb().update(users)
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
    const result = await this.ensureDb().update(users)
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
    const result = await this.ensureDb().select().from(properties).where(eq(properties.id, id)).limit(1);
    return result[0];
  }

  async getPropertyByAccessKey(accessKey: string): Promise<Property | undefined> {
    const result = await this.ensureDb().select().from(properties).where(eq(properties.accessKey, accessKey)).limit(1);
    return result[0];
  }

  async getAllProperties(): Promise<Property[]> {
    return await this.ensureDb().select().from(properties).orderBy(desc(properties.createdAt));
  }

  async getPropertiesByUser(userId: string): Promise<Property[]> {
    return await this.ensureDb().select().from(properties).where(eq(properties.userId, userId)).orderBy(desc(properties.createdAt));
  }

  async createProperty(insertProperty: InsertProperty, userId: string): Promise<Property> {
    const result = await this.ensureDb().insert(properties).values({
      ...insertProperty,
      userId,
    }).returning();
    return result[0];
  }

  async updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property | undefined> {
    const result = await this.ensureDb().update(properties)
      .set(updates)
      .where(eq(properties.id, id))
      .returning();
    return result[0];
  }

  async deleteProperty(id: string): Promise<boolean> {
    const result = await this.ensureDb().delete(properties).where(eq(properties.id, id)).returning();
    return result.length > 0;
  }

  // Conversation operations
  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await this.ensureDb().select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async getConversationsByProperty(propertyId: string): Promise<Conversation[]> {
    return await this.ensureDb().select().from(conversations)
      .where(eq(conversations.propertyId, propertyId))
      .orderBy(desc(conversations.lastMessageAt));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const result = await this.ensureDb().insert(conversations).values(insertConversation).returning();
    return result[0];
  }

  async updateConversationTimestamp(id: string): Promise<void> {
    await this.ensureDb().update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, id));
  }

  // Message operations
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await this.ensureDb().select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await this.ensureDb().insert(messages).values(insertMessage).returning();
    await this.updateConversationTimestamp(insertMessage.conversationId);
    return result[0];
  }

  // Message Feedback operations
  async createMessageFeedback(feedback: InsertMessageFeedback): Promise<MessageFeedback> {
    const result = await this.ensureDb().insert(messageFeedback).values(feedback).returning();
    return result[0];
  }

  async getFeedbackByMessage(messageId: string): Promise<MessageFeedback[]> {
    return await this.ensureDb().select().from(messageFeedback)
      .where(eq(messageFeedback.messageId, messageId))
      .orderBy(desc(messageFeedback.createdAt));
  }

  async getFeedbackStats(userId: string, propertyId?: string): Promise<{ helpful: number; notHelpful: number; total: number }> {
    const database = this.ensureDb();
    const baseQuery = database.select({ count: count(), isHelpful: messageFeedback.isHelpful })
      .from(messageFeedback)
      .innerJoin(messages, eq(messageFeedback.messageId, messages.id))
      .innerJoin(conversations, eq(messages.conversationId, conversations.id));
    
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
    const conditions: any[] = [eq(responseTemplates.userId, userId)];
    if (propertyId !== undefined) {
      if (propertyId === null) {
        conditions.push(sql`${responseTemplates.propertyId} IS NULL`);
      } else {
        conditions.push(eq(responseTemplates.propertyId, propertyId));
      }
    }
    return await this.ensureDb().select().from(responseTemplates)
      .where(and(...conditions))
      .orderBy(desc(responseTemplates.updatedAt));
  }

  async getResponseTemplate(id: string): Promise<ResponseTemplate | undefined> {
    const result = await this.ensureDb().select().from(responseTemplates)
      .where(eq(responseTemplates.id, id))
      .limit(1);
    return result[0];
  }

  async createResponseTemplate(template: InsertResponseTemplate): Promise<ResponseTemplate> {
    const result = await this.ensureDb().insert(responseTemplates).values(template).returning();
    return result[0];
  }

  async updateResponseTemplate(id: string, updates: Partial<InsertResponseTemplate>): Promise<ResponseTemplate | undefined> {
    const result = await this.ensureDb().update(responseTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(responseTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteResponseTemplate(id: string): Promise<boolean> {
    const result = await this.ensureDb().delete(responseTemplates)
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
    const database = this.ensureDb();
    
    // Get user properties
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
    
    // Build message conditions
    const messageConditions: any[] = [
      sql`${conversations.propertyId} = ANY(${sql.raw(`ARRAY[${propertyIds.map(id => `'${id}'`).join(',')}]::varchar[])`)}`
    ];
    if (startDate) messageConditions.push(gte(messages.createdAt, startDate));
    if (endDate) messageConditions.push(lte(messages.createdAt, endDate));

    // Total messages
    const totalMessagesResult = await database.select({ count: count() })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(...messageConditions));
    const totalMessages = Number(totalMessagesResult[0]?.count || 0);

    // Total conversations
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

    // Messages by day (simplified)
    const messagesByDay: Array<{ date: string; count: number }> = [];
    
    // Messages by language
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

    // Messages by category
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

    // Top questions (simplified - get first 10 non-bot messages)
    const topQuestionsResult = await database.select({
      question: messages.content,
    })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(...messageConditions, eq(messages.isBot, false)))
      .limit(10);
    const topQuestions = topQuestionsResult.map(r => ({ question: r.question, count: 1 }));

    // Feedback stats
    const feedbackStats = await this.getFeedbackStats(userId, propertyId);

    return {
      totalMessages,
      totalConversations,
      messagesByDay,
      messagesByLanguage,
      messagesByCategory,
      topQuestions,
      averageResponseTime: 0, // TODO: Calculate actual response time
      feedbackStats,
    };
  }

  // Team operations
  async getTeamMembers(teamOwnerId: string): Promise<TeamMember[]> {
    return await this.ensureDb().select().from(teamMembers)
      .where(eq(teamMembers.teamOwnerId, teamOwnerId))
      .orderBy(desc(teamMembers.createdAt));
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const result = await this.ensureDb().select().from(teamMembers)
      .where(eq(teamMembers.id, id))
      .limit(1);
    return result[0];
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const result = await this.ensureDb().insert(teamMembers).values(member).returning();
    return result[0];
  }

  async updateTeamMember(id: string, updates: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const result = await this.ensureDb().update(teamMembers)
      .set(updates)
      .where(eq(teamMembers.id, id))
      .returning();
    return result[0];
  }

  async deleteTeamMember(id: string): Promise<boolean> {
    const result = await this.ensureDb().delete(teamMembers)
      .where(eq(teamMembers.id, id))
      .returning();
    return result.length > 0;
  }

  // Notifications operations
  async getNotifications(userId: string, isRead?: boolean): Promise<Notification[]> {
    const conditions: any[] = [eq(notifications.userId, userId)];
    if (isRead !== undefined) {
      conditions.push(eq(notifications.isRead, isRead));
    }
    return await this.ensureDb().select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.sentAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await this.ensureDb().insert(notifications).values(notification).returning();
    return result[0];
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const result = await this.ensureDb().update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await this.ensureDb().update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.userId, userId));
  }

  // Booking operations
  async getBookingByAccessKey(accessKey: string): Promise<Booking | undefined> {
    const result = await this.ensureDb().select().from(bookings)
      .where(eq(bookings.accessKey, accessKey))
      .limit(1);
    return result[0];
  }

  async getBookingsByProperty(propertyId: string): Promise<Booking[]> {
    return await this.ensureDb().select().from(bookings)
      .where(eq(bookings.propertyId, propertyId))
      .orderBy(desc(bookings.checkInDate));
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const result = await this.ensureDb().insert(bookings).values(booking).returning();
    return result[0];
  }

  async updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined> {
    const result = await this.ensureDb().update(bookings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return result[0];
  }

  async deleteBooking(id: string): Promise<boolean> {
    const result = await this.ensureDb().delete(bookings)
      .where(eq(bookings.id, id))
      .returning();
    return result.length > 0;
  }

  async getActiveBookingForProperty(propertyId: string): Promise<Booking | undefined> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Find booking where check-in is within the next day or already started
    const result = await this.ensureDb().select().from(bookings)
      .where(
        and(
          eq(bookings.propertyId, propertyId),
          eq(bookings.status, 'confirmed'),
          lte(bookings.checkInDate, tomorrow), // Check-in within next day
          gte(bookings.checkOutDate, now) // Not checked out yet
        )
      )
      .orderBy(bookings.checkInDate)
      .limit(1);
    return result[0];
  }
}

// Choose storage backend dynamically based on database availability
function createStorage(): IStorage {
  if (db) {
    try {
      return new PgStorage();
    } catch (err) {
      console.warn("⚠️  Failed to initialize Postgres storage, falling back to memory:", err);
      return new MemStorage();
    }
  }
  console.warn("⚠️  DATABASE_URL not configured, using in-memory storage (data will reset on restart)");
  return new MemStorage();
}

export const storage = createStorage();
