CREATE TABLE "bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"guest_name" text,
	"guest_email" text,
	"check_in_date" timestamp NOT NULL,
	"check_out_date" timestamp NOT NULL,
	"access_key" varchar DEFAULT substring(md5(random()::text), 1, 12) NOT NULL,
	"status" varchar DEFAULT 'confirmed',
	"source" varchar DEFAULT 'manual',
	"external_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_access_key_unique" UNIQUE("access_key")
);
--> statement-breakpoint
CREATE TABLE "cleaning_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"cleaning_task_id" varchar,
	"author_id" varchar NOT NULL,
	"note_type" varchar DEFAULT 'observation' NOT NULL,
	"priority" varchar DEFAULT 'normal' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"photos" text[] DEFAULT ARRAY[]::text[],
	"status" varchar DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" varchar,
	"resolution_notes" text,
	"is_visible_to_host" boolean DEFAULT true,
	"host_read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cleaning_staff" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"email" varchar,
	"phone" varchar,
	"access_token" varchar DEFAULT substring(md5(random()::text), 1, 16) NOT NULL,
	"is_active" boolean DEFAULT true,
	"default_properties" text[] DEFAULT ARRAY[]::text[],
	"notification_preferences" jsonb DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cleaning_staff_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "cleaning_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"booking_id" varchar,
	"cleaning_staff_id" varchar,
	"scheduled_date" timestamp NOT NULL,
	"scheduled_start_time" varchar DEFAULT '11:00' NOT NULL,
	"scheduled_end_time" varchar DEFAULT '15:00',
	"actual_start_time" timestamp,
	"actual_end_time" timestamp,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"priority" varchar DEFAULT 'normal',
	"has_special_request" boolean DEFAULT false,
	"special_request_id" varchar,
	"notes" text,
	"checklist_completed" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"guest_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ical_sync_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"sync_status" varchar NOT NULL,
	"bookings_imported" varchar DEFAULT '0',
	"bookings_updated" varchar DEFAULT '0',
	"error_message" text,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar NOT NULL,
	"is_helpful" boolean NOT NULL,
	"comment" text,
	"user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"content" text NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"language" varchar,
	"category" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"category" varchar NOT NULL,
	"subject" text,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"metadata" jsonb,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"access_key" varchar DEFAULT substring(md5(random()::text), 1, 12) NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"address" text NOT NULL,
	"floor" text,
	"door_code" text,
	"access_instructions" text,
	"check_in_time" text DEFAULT '15:00' NOT NULL,
	"check_out_time" text DEFAULT '11:00' NOT NULL,
	"check_in_procedure" text,
	"check_out_procedure" text,
	"key_location" text,
	"wifi_name" text,
	"wifi_password" text,
	"amenities" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"kitchen_equipment" text,
	"house_rules" text DEFAULT '' NOT NULL,
	"max_guests" text,
	"pets_allowed" boolean DEFAULT false,
	"smoking_allowed" boolean DEFAULT false,
	"parties_allowed" boolean DEFAULT false,
	"parking_info" text,
	"public_transport" text,
	"nearby_shops" text,
	"restaurants" text,
	"host_name" text NOT NULL,
	"host_phone" text,
	"emergency_contact" text,
	"heating_instructions" text,
	"garbage_instructions" text,
	"appliance_instructions" text,
	"additional_info" text,
	"faqs" text,
	"arrival_message" text,
	"arrival_video_url" text,
	"last_imported_at" timestamp,
	"ical_url" text,
	"cleaning_person_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "properties_access_key_unique" UNIQUE("access_key")
);
--> statement-breakpoint
CREATE TABLE "property_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" varchar NOT NULL,
	"cleaner_user_id" varchar NOT NULL,
	"assigned_by" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"can_view_calendar" boolean DEFAULT true,
	"can_add_notes" boolean DEFAULT true,
	"can_manage_tasks" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "response_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"property_id" varchar,
	"title" text NOT NULL,
	"keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"content" text NOT NULL,
	"category" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" varchar NOT NULL,
	"property_id" varchar NOT NULL,
	"cleaning_task_id" varchar,
	"request_type" varchar NOT NULL,
	"requested_time" varchar NOT NULL,
	"original_time" varchar NOT NULL,
	"guest_name" text,
	"guest_email" varchar,
	"guest_message" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"responded_by" varchar,
	"responded_at" timestamp,
	"response_message" text,
	"source_channel" varchar DEFAULT 'unique_link' NOT NULL,
	"unique_link_token" varchar DEFAULT substring(md5(random()::text), 1, 20) NOT NULL,
	"guest_notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "special_requests_unique_link_token_unique" UNIQUE("unique_link_token")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_owner_id" varchar NOT NULL,
	"member_id" varchar NOT NULL,
	"role" varchar DEFAULT 'member' NOT NULL,
	"property_id" varchar,
	"invited_by" varchar,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"joined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'host' NOT NULL,
	"parent_host_id" varchar,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"subscription_status" varchar,
	"trial_started_at" timestamp,
	"trial_ends_at" timestamp,
	"active_property_count" varchar DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_notes" ADD CONSTRAINT "cleaning_notes_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_notes" ADD CONSTRAINT "cleaning_notes_cleaning_task_id_cleaning_tasks_id_fk" FOREIGN KEY ("cleaning_task_id") REFERENCES "public"."cleaning_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_notes" ADD CONSTRAINT "cleaning_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_notes" ADD CONSTRAINT "cleaning_notes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_staff" ADD CONSTRAINT "cleaning_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ADD CONSTRAINT "cleaning_tasks_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ADD CONSTRAINT "cleaning_tasks_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cleaning_tasks" ADD CONSTRAINT "cleaning_tasks_cleaning_staff_id_cleaning_staff_id_fk" FOREIGN KEY ("cleaning_staff_id") REFERENCES "public"."cleaning_staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ical_sync_logs" ADD CONSTRAINT "ical_sync_logs_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_feedback" ADD CONSTRAINT "message_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_assignments" ADD CONSTRAINT "property_assignments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_assignments" ADD CONSTRAINT "property_assignments_cleaner_user_id_users_id_fk" FOREIGN KEY ("cleaner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_assignments" ADD CONSTRAINT "property_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_templates" ADD CONSTRAINT "response_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_templates" ADD CONSTRAINT "response_templates_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_requests" ADD CONSTRAINT "special_requests_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_requests" ADD CONSTRAINT "special_requests_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_requests" ADD CONSTRAINT "special_requests_cleaning_task_id_cleaning_tasks_id_fk" FOREIGN KEY ("cleaning_task_id") REFERENCES "public"."cleaning_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_requests" ADD CONSTRAINT "special_requests_responded_by_cleaning_staff_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."cleaning_staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_owner_id_users_id_fk" FOREIGN KEY ("team_owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_parent_host_id_users_id_fk" FOREIGN KEY ("parent_host_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_bookings_property_id" ON "bookings" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "IDX_bookings_check_in_date" ON "bookings" USING btree ("check_in_date");--> statement-breakpoint
CREATE INDEX "IDX_bookings_access_key" ON "bookings" USING btree ("access_key");--> statement-breakpoint
CREATE INDEX "IDX_cleaning_notes_property" ON "cleaning_notes" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "IDX_cleaning_notes_author" ON "cleaning_notes" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "IDX_cleaning_notes_status" ON "cleaning_notes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_cleaning_notes_type" ON "cleaning_notes" USING btree ("note_type");--> statement-breakpoint
CREATE INDEX "IDX_cleaning_staff_user_id" ON "cleaning_staff" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_cleaning_staff_access_token" ON "cleaning_staff" USING btree ("access_token");--> statement-breakpoint
CREATE INDEX "IDX_cleaning_tasks_property_id" ON "cleaning_tasks" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "IDX_cleaning_tasks_booking_id" ON "cleaning_tasks" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "IDX_cleaning_tasks_staff_id" ON "cleaning_tasks" USING btree ("cleaning_staff_id");--> statement-breakpoint
CREATE INDEX "IDX_cleaning_tasks_scheduled_date" ON "cleaning_tasks" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "IDX_cleaning_tasks_status" ON "cleaning_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_ical_sync_logs_property_id" ON "ical_sync_logs" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "IDX_message_feedback_message_id" ON "message_feedback" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "IDX_message_feedback_user_id" ON "message_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_notifications_is_read" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "IDX_property_assignments_property" ON "property_assignments" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "IDX_property_assignments_cleaner" ON "property_assignments" USING btree ("cleaner_user_id");--> statement-breakpoint
CREATE INDEX "IDX_property_assignments_host" ON "property_assignments" USING btree ("assigned_by");--> statement-breakpoint
CREATE INDEX "IDX_response_templates_user_id" ON "response_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_response_templates_property_id" ON "response_templates" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "IDX_special_requests_booking_id" ON "special_requests" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "IDX_special_requests_property_id" ON "special_requests" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "IDX_special_requests_status" ON "special_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_special_requests_unique_link" ON "special_requests" USING btree ("unique_link_token");--> statement-breakpoint
CREATE INDEX "IDX_team_members_team_owner_id" ON "team_members" USING btree ("team_owner_id");--> statement-breakpoint
CREATE INDEX "IDX_team_members_member_id" ON "team_members" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "IDX_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "IDX_users_parent_host" ON "users" USING btree ("parent_host_id");