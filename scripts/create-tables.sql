-- Script SQL pour créer toutes les tables nécessaires dans Supabase

-- Table sessions (pour express-session)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- Table users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR,
  subscription_status VARCHAR,
  trial_started_at TIMESTAMP,
  trial_ends_at TIMESTAMP,
  active_property_count VARCHAR DEFAULT '0',
  airbnb_cohost_email TEXT,
  airbnb_cohost_cookies TEXT,
  airbnb_cohost_last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table cleaning_persons
CREATE TABLE IF NOT EXISTS cleaning_persons (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp BOOLEAN DEFAULT true,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table properties
CREATE TABLE IF NOT EXISTS properties (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  access_key VARCHAR NOT NULL UNIQUE DEFAULT substring(md5(random()::text), 1, 12),
  smoobu_listing_id TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  floor TEXT,
  door_code TEXT,
  access_instructions TEXT,
  ical_url TEXT,
  cleaning_person_id VARCHAR REFERENCES cleaning_persons(id) ON DELETE SET NULL,
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
  last_imported_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table conversations
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  check_in_date TIMESTAMP WITH TIME ZONE,
  check_out_date TIMESTAMP WITH TIME ZONE,
  booking_id TEXT,
  external_id TEXT,
  source TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  last_message_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_conversations_external_source ON conversations(external_id, source);

-- Table messages
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  direction TEXT,
  sender_name TEXT,
  language VARCHAR,
  category VARCHAR,
  external_id VARCHAR,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_messages_external_id ON messages(external_id);

-- Table message_feedback
CREATE TABLE IF NOT EXISTS message_feedback (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Table cleanings
CREATE TABLE IF NOT EXISTS cleanings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date_menage TIMESTAMP NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'à faire',
  assigned_to VARCHAR REFERENCES cleaning_persons(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(property_id, date_menage)
);

CREATE INDEX IF NOT EXISTS IDX_cleanings_status ON cleanings(status);

-- Table pms_integrations
CREATE TABLE IF NOT EXISTS pms_integrations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR NOT NULL,
  api_key TEXT NOT NULL,
  webhook_secret TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);



