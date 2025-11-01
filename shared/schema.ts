import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
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

export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
