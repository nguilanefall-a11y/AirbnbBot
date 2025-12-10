-- Corriger la table ical_sync_logs
ALTER TABLE ical_sync_logs 
ALTER COLUMN sync_status SET DEFAULT 'success';

-- Créer les tables manquantes si elles n'existent pas

-- Table message_feedback
CREATE TABLE IF NOT EXISTS message_feedback (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
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

-- Table special_requests
CREATE TABLE IF NOT EXISTS special_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
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

-- Table ical_sync_logs (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS ical_sync_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  property_id VARCHAR NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  sync_status VARCHAR NOT NULL DEFAULT 'success',
  bookings_imported VARCHAR DEFAULT '0',
  bookings_updated VARCHAR DEFAULT '0',
  error_message TEXT,
  synced_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS IDX_ical_sync_logs_property_id ON ical_sync_logs(property_id);

-- S'assurer que sync_status a une valeur par défaut
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ical_sync_logs' 
    AND column_name = 'sync_status'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE ical_sync_logs 
    ALTER COLUMN sync_status SET DEFAULT 'success';
  END IF;
END $$;

