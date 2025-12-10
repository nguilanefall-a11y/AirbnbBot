-- Script SQL pour créer toutes les tables dans Neon
-- Exécutez ce script dans Neon SQL Editor

-- Extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table sessions (pour Replit Auth)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- Table users (sans référence circulaire d'abord)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  role VARCHAR NOT NULL DEFAULT 'host',
  parent_host_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR,
  subscription_status VARCHAR,
  trial_started_at TIMESTAMP,
  trial_ends_at TIMESTAMP,
  active_property_count VARCHAR DEFAULT '0',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS IDX_users_role ON users(role);
CREATE INDEX IF NOT EXISTS IDX_users_parent_host ON users(parent_host_id);

-- Table properties
CREATE TABLE IF NOT EXISTS properties (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  access_key VARCHAR NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 12),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  floor TEXT,
  door_code TEXT,
  access_instructions TEXT,
  check_in_time TEXT NOT NULL DEFAULT '15:00',
  check_out_time TEXT NOT NULL DEFAULT '11:00',
  check_in_procedure TEXT,
  check_out_procedure TEXT,
  key_location TEXT,
  wifi_name TEXT,
  wifi_password TEXT,
  amenities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  kitchen_equipment TEXT,
  house_rules TEXT NOT NULL DEFAULT '',
  max_guests TEXT,
  pets_allowed BOOLEAN DEFAULT false,
  smoking_allowed BOOLEAN DEFAULT false,
  parties_allowed BOOLEAN DEFAULT false,
  parking_info TEXT,
  public_transport TEXT,
  nearby_shops TEXT,
  restaurants TEXT,
  host_name TEXT NOT NULL,
  host_phone TEXT,
  emergency_contact TEXT,
  heating_instructions TEXT,
  garbage_instructions TEXT,
  appliance_instructions TEXT,
  additional_info TEXT,
  faqs TEXT,
  arrival_message TEXT,
  arrival_video_url TEXT,
  last_imported_at TIMESTAMP,
  ical_url TEXT,
  cleaning_person_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table bookings
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_name TEXT,
  guest_email TEXT,
  check_in_date TIMESTAMP NOT NULL,
  check_out_date TIMESTAMP NOT NULL,
  access_key VARCHAR NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 12),
  status VARCHAR DEFAULT 'confirmed',
  source VARCHAR DEFAULT 'manual',
  external_id VARCHAR,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS IDX_bookings_check_in_date ON bookings(check_in_date);
CREATE INDEX IF NOT EXISTS IDX_bookings_access_key ON bookings(access_key);

-- Table conversations
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_message_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table messages
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  language VARCHAR,
  category VARCHAR,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table message_feedback
CREATE TABLE IF NOT EXISTS message_feedback (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  message_id VARCHAR NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  comment TEXT,
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_message_feedback_message_id ON message_feedback(message_id);
CREATE INDEX IF NOT EXISTS IDX_message_feedback_user_id ON message_feedback(user_id);

-- Table response_templates
CREATE TABLE IF NOT EXISTS response_templates (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id VARCHAR REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  content TEXT NOT NULL,
  category VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_response_templates_user_id ON response_templates(user_id);
CREATE INDEX IF NOT EXISTS IDX_response_templates_property_id ON response_templates(property_id);

-- Table team_members
CREATE TABLE IF NOT EXISTS team_members (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  team_owner_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'member',
  property_id VARCHAR REFERENCES properties(id) ON DELETE CASCADE,
  invited_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP DEFAULT NOW() NOT NULL,
  joined_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_team_members_team_owner_id ON team_members(team_owner_id);
CREATE INDEX IF NOT EXISTS IDX_team_members_member_id ON team_members(member_id);

-- Table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
  read_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS IDX_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS IDX_notifications_is_read ON notifications(is_read);

-- Table cleaning_staff
CREATE TABLE IF NOT EXISTS cleaning_staff (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  access_token VARCHAR NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 16),
  is_active BOOLEAN DEFAULT true,
  default_properties TEXT[] DEFAULT ARRAY[]::TEXT[],
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_cleaning_staff_user_id ON cleaning_staff(user_id);
CREATE INDEX IF NOT EXISTS IDX_cleaning_staff_access_token ON cleaning_staff(access_token);

-- Table cleaning_tasks
CREATE TABLE IF NOT EXISTS cleaning_tasks (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  booking_id VARCHAR REFERENCES bookings(id) ON DELETE SET NULL,
  cleaning_staff_id VARCHAR REFERENCES cleaning_staff(id) ON DELETE SET NULL,
  scheduled_date TIMESTAMP NOT NULL,
  scheduled_start_time VARCHAR NOT NULL DEFAULT '11:00',
  scheduled_end_time VARCHAR DEFAULT '15:00',
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  status VARCHAR NOT NULL DEFAULT 'pending',
  priority VARCHAR DEFAULT 'normal',
  has_special_request BOOLEAN DEFAULT false,
  special_request_id VARCHAR,
  notes TEXT,
  checklist_completed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_cleaning_tasks_property_id ON cleaning_tasks(property_id);
CREATE INDEX IF NOT EXISTS IDX_cleaning_tasks_booking_id ON cleaning_tasks(booking_id);
CREATE INDEX IF NOT EXISTS IDX_cleaning_tasks_staff_id ON cleaning_tasks(cleaning_staff_id);
CREATE INDEX IF NOT EXISTS IDX_cleaning_tasks_scheduled_date ON cleaning_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS IDX_cleaning_tasks_status ON cleaning_tasks(status);

-- Table special_requests
CREATE TABLE IF NOT EXISTS special_requests (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  booking_id VARCHAR NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  cleaning_task_id VARCHAR REFERENCES cleaning_tasks(id) ON DELETE SET NULL,
  request_type VARCHAR NOT NULL,
  requested_time VARCHAR NOT NULL,
  original_time VARCHAR NOT NULL,
  guest_name TEXT,
  guest_email VARCHAR,
  guest_message TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending',
  responded_by VARCHAR REFERENCES cleaning_staff(id) ON DELETE SET NULL,
  responded_at TIMESTAMP,
  response_message TEXT,
  source_channel VARCHAR NOT NULL DEFAULT 'unique_link',
  unique_link_token VARCHAR NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 20),
  guest_notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS IDX_special_requests_booking_id ON special_requests(booking_id);
CREATE INDEX IF NOT EXISTS IDX_special_requests_property_id ON special_requests(property_id);
CREATE INDEX IF NOT EXISTS IDX_special_requests_status ON special_requests(status);
CREATE INDEX IF NOT EXISTS IDX_special_requests_unique_link ON special_requests(unique_link_token);

-- Table ical_sync_logs
CREATE TABLE IF NOT EXISTS ical_sync_logs (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  sync_status VARCHAR NOT NULL DEFAULT 'success',
  bookings_imported VARCHAR DEFAULT '0',
  bookings_updated VARCHAR DEFAULT '0',
  error_message TEXT,
  synced_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_ical_sync_logs_property_id ON ical_sync_logs(property_id);

-- Table property_assignments
CREATE TABLE IF NOT EXISTS property_assignments (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  cleaner_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  can_view_calendar BOOLEAN DEFAULT true,
  can_add_notes BOOLEAN DEFAULT true,
  can_manage_tasks BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_property_assignments_property ON property_assignments(property_id);
CREATE INDEX IF NOT EXISTS IDX_property_assignments_cleaner ON property_assignments(cleaner_user_id);
CREATE INDEX IF NOT EXISTS IDX_property_assignments_host ON property_assignments(assigned_by);

-- Table cleaning_notes
CREATE TABLE IF NOT EXISTS cleaning_notes (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  cleaning_task_id VARCHAR REFERENCES cleaning_tasks(id) ON DELETE SET NULL,
  author_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_type VARCHAR NOT NULL DEFAULT 'observation',
  priority VARCHAR NOT NULL DEFAULT 'normal',
  title TEXT NOT NULL,
  description TEXT,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  status VARCHAR NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMP,
  resolved_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  is_visible_to_host BOOLEAN DEFAULT true,
  host_read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_cleaning_notes_property ON cleaning_notes(property_id);
CREATE INDEX IF NOT EXISTS IDX_cleaning_notes_author ON cleaning_notes(author_id);
CREATE INDEX IF NOT EXISTS IDX_cleaning_notes_status ON cleaning_notes(status);
CREATE INDEX IF NOT EXISTS IDX_cleaning_notes_type ON cleaning_notes(note_type);

-- Table cleaner_unavailability
CREATE TABLE IF NOT EXISTS cleaner_unavailability (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  cleaner_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  reason TEXT,
  public_label VARCHAR DEFAULT 'Indisponible',
  unavailability_type VARCHAR NOT NULL DEFAULT 'personal',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_cleaner_unavailability_cleaner ON cleaner_unavailability(cleaner_user_id);
CREATE INDEX IF NOT EXISTS IDX_cleaner_unavailability_dates ON cleaner_unavailability(start_date, end_date);

-- Table blocked_periods
CREATE TABLE IF NOT EXISTS blocked_periods (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  host_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  reason TEXT,
  block_type VARCHAR NOT NULL DEFAULT 'personal',
  is_visible_to_cleaners BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_blocked_periods_property ON blocked_periods(property_id);
CREATE INDEX IF NOT EXISTS IDX_blocked_periods_dates ON blocked_periods(start_date, end_date);

-- Message de confirmation
SELECT '✅ Toutes les tables ont été créées avec succès !' AS status;

