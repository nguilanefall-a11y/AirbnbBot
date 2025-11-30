import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth + Stripe
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // Subscription fields
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status"), // trialing, active, canceled, past_due
  trialStartedAt: timestamp("trial_started_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  activePropertyCount: varchar("active_property_count").default("0"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  accessKey: varchar("access_key").notNull().unique().default(sql`substring(md5(random()::text), 1, 12)`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  
  // Localisation
  address: text("address").notNull(),
  floor: text("floor"),
  doorCode: text("door_code"),
  accessInstructions: text("access_instructions"),
  
  // Check-in / Check-out
  checkInTime: text("check_in_time").notNull().default("15:00"),
  checkOutTime: text("check_out_time").notNull().default("11:00"),
  checkInProcedure: text("check_in_procedure"),
  checkOutProcedure: text("check_out_procedure"),
  keyLocation: text("key_location"),
  
  // WiFi et connectivité
  wifiName: text("wifi_name"),
  wifiPassword: text("wifi_password"),
  
  // Équipements
  amenities: text("amenities").array().notNull().default(sql`ARRAY[]::text[]`),
  kitchenEquipment: text("kitchen_equipment"),
  
  // Règles de la maison
  houseRules: text("house_rules").notNull().default(""),
  maxGuests: text("max_guests"),
  petsAllowed: boolean("pets_allowed").default(false),
  smokingAllowed: boolean("smoking_allowed").default(false),
  partiesAllowed: boolean("parties_allowed").default(false),
  
  // Parking et transports
  parkingInfo: text("parking_info"),
  publicTransport: text("public_transport"),
  
  // Commerces et services
  nearbyShops: text("nearby_shops"),
  restaurants: text("restaurants"),
  
  // Urgences et contacts
  hostName: text("host_name").notNull(),
  hostPhone: text("host_phone"),
  emergencyContact: text("emergency_contact"),
  
  // Instructions spéciales
  heatingInstructions: text("heating_instructions"),
  garbageInstructions: text("garbage_instructions"),
  applianceInstructions: text("appliance_instructions"),
  
  // Info additionnelle
  additionalInfo: text("additional_info"),
  faqs: text("faqs"),
  
  // Module d'arrivée
  arrivalMessage: text("arrival_message"), // Message personnalisé pour l'arrivée
  arrivalVideoUrl: text("arrival_video_url"), // URL vidéo YouTube/Loom pour l'arrivée
  
  // Import metadata
  lastImportedAt: timestamp("last_imported_at"),
  icalUrl: text("ical_url"), // URL du calendrier iCal pour synchronisation
  cleaningPersonId: varchar("cleaning_person_id"), // ID de la personne responsable du ménage

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table des réservations pour synchronisation iCal et logique J-1
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),
  checkInDate: timestamp("check_in_date").notNull(), // Date d'arrivée
  checkOutDate: timestamp("check_out_date").notNull(), // Date de départ
  accessKey: varchar("access_key").notNull().unique().default(sql`substring(md5(random()::text), 1, 12)`), // Lien unique pour ce séjour
  status: varchar("status").default("confirmed"), // confirmed, cancelled, completed
  source: varchar("source").default("manual"), // manual, ical, airbnb_api
  externalId: varchar("external_id"), // ID externe (Airbnb, etc.)
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_bookings_property_id").on(table.propertyId),
  index("IDX_bookings_check_in_date").on(table.checkInDate),
  index("IDX_bookings_access_key").on(table.accessKey),
]);

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  guestName: text("guest_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  isBot: boolean("is_bot").notNull().default(false),
  language: varchar("language"), // Langue détectée du message
  category: varchar("category"), // Catégorie de la question (WiFi, Check-in, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Table pour le feedback sur les messages
export const messageFeedback = pgTable("message_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  isHelpful: boolean("is_helpful").notNull(), // true = utile, false = pas utile
  comment: text("comment"), // Commentaire optionnel
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Hôte qui a donné le feedback
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_message_feedback_message_id").on(table.messageId),
  index("IDX_message_feedback_user_id").on(table.userId),
]);

// Table pour les templates de réponses
export const responseTemplates = pgTable("response_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "cascade" }), // null = global à l'utilisateur
  title: text("title").notNull(), // Titre du template
  keywords: text("keywords").array().notNull().default(sql`ARRAY[]::text[]`), // Mots-clés pour matcher
  content: text("content").notNull(), // Contenu du template
  category: varchar("category"), // Catégorie (WiFi, Check-in, etc.)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_response_templates_user_id").on(table.userId),
  index("IDX_response_templates_property_id").on(table.propertyId),
]);

// Table pour les membres d'équipe
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamOwnerId: varchar("team_owner_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Propriétaire de l'équipe
  memberId: varchar("member_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Membre de l'équipe
  role: varchar("role").notNull().default("member"), // owner, admin, moderator, viewer
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "cascade" }), // null = toutes les propriétés
  invitedBy: varchar("invited_by").references(() => users.id, { onDelete: "set null" }),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  joinedAt: timestamp("joined_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_team_members_team_owner_id").on(table.teamOwnerId),
  index("IDX_team_members_member_id").on(table.memberId),
]);

// Table pour les notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // email, sms, push, in_app
  category: varchar("category").notNull(), // urgent, daily_summary, weekly_summary, etc.
  subject: text("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata"), // Données supplémentaires (propertyId, conversationId, etc.)
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
}, (table) => [
  index("IDX_notifications_user_id").on(table.userId),
  index("IDX_notifications_is_read").on(table.isRead),
]);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  trialStartedAt: true,
  trialEndsAt: true,
  subscriptionStatus: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  activePropertyCount: true,
  profileImageUrl: true,
});

export const registerSchema = insertUserSchema.extend({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
  trialStartedAt: true,
  trialEndsAt: true,
  subscriptionStatus: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  activePropertyCount: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  userId: true,
  accessKey: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertMessageFeedbackSchema = createInsertSchema(messageFeedback).omit({
  id: true,
  createdAt: true,
});

export const insertResponseTemplateSchema = createInsertSchema(responseTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  invitedAt: true,
  joinedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  sentAt: true,
  readAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  accessKey: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertMessageFeedback = z.infer<typeof insertMessageFeedbackSchema>;
export type MessageFeedback = typeof messageFeedback.$inferSelect;

export type InsertResponseTemplate = z.infer<typeof insertResponseTemplateSchema>;
export type ResponseTemplate = typeof responseTemplates.$inferSelect;

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
