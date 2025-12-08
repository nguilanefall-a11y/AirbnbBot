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
  
  // Rôle utilisateur: host (propriétaire) ou cleaning_agent (personnel de ménage)
  role: varchar("role").notNull().default("host"), // host, cleaning_agent
  
  // Pour cleaning_agent: lié à quel hôte
  parentHostId: varchar("parent_host_id").references(() => users.id, { onDelete: "set null" }),
  
  // Subscription fields
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status"), // trialing, active, canceled, past_due
  trialStartedAt: timestamp("trial_started_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  activePropertyCount: varchar("active_property_count").default("0"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_users_role").on(table.role),
  index("IDX_users_parent_host").on(table.parentHostId),
]);

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

// ========================================
// SECTION MÉNAGE INTELLIGENTE
// ========================================

// Table des assignations cleaner ↔ propriété
export const propertyAssignments = pgTable("property_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  cleanerUserId: varchar("cleaner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id, { onDelete: "cascade" }), // L'hôte qui a fait l'assignation
  isActive: boolean("is_active").default(true),
  canViewCalendar: boolean("can_view_calendar").default(true),
  canAddNotes: boolean("can_add_notes").default(true),
  canManageTasks: boolean("can_manage_tasks").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_property_assignments_property").on(table.propertyId),
  index("IDX_property_assignments_cleaner").on(table.cleanerUserId),
  index("IDX_property_assignments_host").on(table.assignedBy),
]);

// Table des notes de ménage (signalements, problèmes, observations)
export const cleaningNotes = pgTable("cleaning_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  cleaningTaskId: varchar("cleaning_task_id").references(() => cleaningTasks.id, { onDelete: "set null" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Le cleaner qui a créé la note
  
  // Type de note
  noteType: varchar("note_type").notNull().default("observation"), // observation, problem, repair_needed, missing_item, damage, suggestion
  priority: varchar("priority").notNull().default("normal"), // low, normal, high, urgent
  
  // Contenu
  title: text("title").notNull(),
  description: text("description"),
  
  // Photos (URLs)
  photos: text("photos").array().default(sql`ARRAY[]::text[]`),
  
  // Statut de résolution (pour les problèmes)
  status: varchar("status").notNull().default("open"), // open, acknowledged, in_progress, resolved, closed
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolutionNotes: text("resolution_notes"),
  
  // Visibilité
  isVisibleToHost: boolean("is_visible_to_host").default(true),
  hostReadAt: timestamp("host_read_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_cleaning_notes_property").on(table.propertyId),
  index("IDX_cleaning_notes_author").on(table.authorId),
  index("IDX_cleaning_notes_status").on(table.status),
  index("IDX_cleaning_notes_type").on(table.noteType),
]);

// Table du personnel de ménage
export const cleaningStaff = pgTable("cleaning_staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Propriétaire qui gère ce personnel
  name: text("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  accessToken: varchar("access_token").notNull().unique().default(sql`substring(md5(random()::text), 1, 16)`), // Token unique pour l'interface ménage
  isActive: boolean("is_active").default(true),
  defaultProperties: text("default_properties").array().default(sql`ARRAY[]::text[]`), // IDs des propriétés par défaut
  notificationPreferences: jsonb("notification_preferences").default(sql`'{"email": true, "sms": false, "push": true}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_cleaning_staff_user_id").on(table.userId),
  index("IDX_cleaning_staff_access_token").on(table.accessToken),
]);

// Table des tâches de ménage (liées aux réservations)
export const cleaningTasks = pgTable("cleaning_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  bookingId: varchar("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  cleaningStaffId: varchar("cleaning_staff_id").references(() => cleaningStaff.id, { onDelete: "set null" }),
  
  // Horaires
  scheduledDate: timestamp("scheduled_date").notNull(), // Date prévue du ménage
  scheduledStartTime: varchar("scheduled_start_time").notNull().default("11:00"), // Heure de début prévue
  scheduledEndTime: varchar("scheduled_end_time").default("15:00"), // Heure de fin prévue
  actualStartTime: timestamp("actual_start_time"), // Heure réelle de début
  actualEndTime: timestamp("actual_end_time"), // Heure réelle de fin
  
  // Statut
  status: varchar("status").notNull().default("pending"), // pending, confirmed, in_progress, completed, cancelled
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  
  // Demandes spéciales liées
  hasSpecialRequest: boolean("has_special_request").default(false),
  specialRequestId: varchar("special_request_id"),
  
  // Notes et instructions
  notes: text("notes"),
  checklistCompleted: jsonb("checklist_completed").default(sql`'[]'::jsonb`), // Liste des tâches cochées
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_cleaning_tasks_property_id").on(table.propertyId),
  index("IDX_cleaning_tasks_booking_id").on(table.bookingId),
  index("IDX_cleaning_tasks_staff_id").on(table.cleaningStaffId),
  index("IDX_cleaning_tasks_scheduled_date").on(table.scheduledDate),
  index("IDX_cleaning_tasks_status").on(table.status),
]);

// Table des demandes spéciales (Early Check-in / Late Check-out)
export const specialRequests = pgTable("special_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  cleaningTaskId: varchar("cleaning_task_id").references(() => cleaningTasks.id, { onDelete: "set null" }),
  
  // Type de demande
  requestType: varchar("request_type").notNull(), // early_checkin, late_checkout
  requestedTime: varchar("requested_time").notNull(), // Heure demandée (ex: "12:00")
  originalTime: varchar("original_time").notNull(), // Heure originale (ex: "15:00")
  
  // Données du voyageur
  guestName: text("guest_name"),
  guestEmail: varchar("guest_email"),
  guestMessage: text("guest_message"), // Message optionnel du voyageur
  
  // Statut de validation
  status: varchar("status").notNull().default("pending"), // pending, accepted, refused, expired
  respondedBy: varchar("responded_by").references(() => cleaningStaff.id, { onDelete: "set null" }),
  respondedAt: timestamp("responded_at"),
  responseMessage: text("response_message"), // Message de réponse automatique
  
  // Canal de communication
  sourceChannel: varchar("source_channel").notNull().default("unique_link"), // unique_link (le seul valide)
  uniqueLinkToken: varchar("unique_link_token").notNull().unique().default(sql`substring(md5(random()::text), 1, 20)`),
  
  // Notification envoyée au voyageur
  guestNotifiedAt: timestamp("guest_notified_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Date d'expiration de la demande
}, (table) => [
  index("IDX_special_requests_booking_id").on(table.bookingId),
  index("IDX_special_requests_property_id").on(table.propertyId),
  index("IDX_special_requests_status").on(table.status),
  index("IDX_special_requests_unique_link").on(table.uniqueLinkToken),
]);

// Table de synchronisation iCal (log des imports)
export const icalSyncLogs = pgTable("ical_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  syncStatus: varchar("sync_status").notNull(), // success, failed, partial
  bookingsImported: varchar("bookings_imported").default("0"),
  bookingsUpdated: varchar("bookings_updated").default("0"),
  errorMessage: text("error_message"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_ical_sync_logs_property_id").on(table.propertyId),
]);

// Schémas d'insertion
export const insertCleaningStaffSchema = createInsertSchema(cleaningStaff).omit({
  id: true,
  accessToken: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCleaningTaskSchema = createInsertSchema(cleaningTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSpecialRequestSchema = createInsertSchema(specialRequests).omit({
  id: true,
  uniqueLinkToken: true,
  createdAt: true,
});

export const insertIcalSyncLogSchema = createInsertSchema(icalSyncLogs).omit({
  id: true,
  syncedAt: true,
});

export const insertPropertyAssignmentSchema = createInsertSchema(propertyAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCleaningNoteSchema = createInsertSchema(cleaningNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  hostReadAt: true,
});

// Types
export type InsertCleaningStaff = z.infer<typeof insertCleaningStaffSchema>;
export type CleaningStaff = typeof cleaningStaff.$inferSelect;

export type InsertCleaningTask = z.infer<typeof insertCleaningTaskSchema>;
export type CleaningTask = typeof cleaningTasks.$inferSelect;

export type InsertSpecialRequest = z.infer<typeof insertSpecialRequestSchema>;
export type SpecialRequest = typeof specialRequests.$inferSelect;

export type InsertIcalSyncLog = z.infer<typeof insertIcalSyncLogSchema>;
export type IcalSyncLog = typeof icalSyncLogs.$inferSelect;

export type InsertPropertyAssignment = z.infer<typeof insertPropertyAssignmentSchema>;
export type PropertyAssignment = typeof propertyAssignments.$inferSelect;

export type InsertCleaningNote = z.infer<typeof insertCleaningNoteSchema>;
export type CleaningNote = typeof cleaningNotes.$inferSelect;

// ========================================
// CALENDRIER & INDISPONIBILITÉS
// ========================================

// Table des indisponibilités des agents de ménage (congés, vacances, etc.)
export const cleanerUnavailability = pgTable("cleaner_unavailability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cleanerUserId: varchar("cleaner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Période d'indisponibilité
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // Raison (optionnel, visible uniquement par l'agent)
  reason: text("reason"), // "Vacances", "RDV médical", etc.
  
  // Ce qui est visible par l'hôte (sans détails privés)
  publicLabel: varchar("public_label").default("Indisponible"), // Ce que l'hôte voit
  
  // Type d'indisponibilité
  unavailabilityType: varchar("unavailability_type").notNull().default("personal"), // personal, sick, vacation, other
  
  // Récurrence (optionnel)
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: varchar("recurrence_pattern"), // weekly, monthly, yearly
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_cleaner_unavailability_cleaner").on(table.cleanerUserId),
  index("IDX_cleaner_unavailability_dates").on(table.startDate, table.endDate),
]);

// Table des périodes bloquées par l'hôte (hors réservations)
export const blockedPeriods = pgTable("blocked_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  hostId: varchar("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Période bloquée
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  // Raison
  reason: text("reason"), // "Travaux", "Usage personnel", etc.
  blockType: varchar("block_type").notNull().default("personal"), // personal, maintenance, renovation, other
  
  // Visible par les agents ?
  isVisibleToCleaners: boolean("is_visible_to_cleaners").default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_blocked_periods_property").on(table.propertyId),
  index("IDX_blocked_periods_dates").on(table.startDate, table.endDate),
]);

// Schémas d'insertion
export const insertCleanerUnavailabilitySchema = createInsertSchema(cleanerUnavailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBlockedPeriodSchema = createInsertSchema(blockedPeriods).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertCleanerUnavailability = z.infer<typeof insertCleanerUnavailabilitySchema>;
export type CleanerUnavailability = typeof cleanerUnavailability.$inferSelect;

export type InsertBlockedPeriod = z.infer<typeof insertBlockedPeriodSchema>;
export type BlockedPeriod = typeof blockedPeriods.$inferSelect;
