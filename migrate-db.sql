-- Migration Script pour Supabase
-- Ajoute les colonnes et tables manquantes

-- ===========================================
-- Table: bookings - Ajouter access_key
-- ===========================================
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS access_key VARCHAR UNIQUE DEFAULT substring(md5(random()::text), 1, 12);

-- ===========================================
-- Table: property_assignments - Ajouter colonnes manquantes
-- ===========================================
ALTER TABLE property_assignments 
ADD COLUMN IF NOT EXISTS can_view_calendar BOOLEAN DEFAULT true;

ALTER TABLE property_assignments 
ADD COLUMN IF NOT EXISTS can_add_notes BOOLEAN DEFAULT true;

ALTER TABLE property_assignments 
ADD COLUMN IF NOT EXISTS can_manage_tasks BOOLEAN DEFAULT true;

-- ===========================================
-- Table: cleaning_notes - Ajouter cleaning_task_id
-- ===========================================
ALTER TABLE cleaning_notes 
ADD COLUMN IF NOT EXISTS cleaning_task_id VARCHAR;

-- ===========================================
-- Table: special_requests - Ajouter response_message
-- ===========================================
ALTER TABLE special_requests 
ADD COLUMN IF NOT EXISTS response_message TEXT;

-- ===========================================
-- Table: ical_sync_logs - Ajouter sync_status
-- ===========================================
ALTER TABLE ical_sync_logs 
ADD COLUMN IF NOT EXISTS sync_status VARCHAR NOT NULL DEFAULT 'pending';

ALTER TABLE ical_sync_logs 
ADD COLUMN IF NOT EXISTS bookings_imported VARCHAR DEFAULT '0';

ALTER TABLE ical_sync_logs 
ADD COLUMN IF NOT EXISTS bookings_updated VARCHAR DEFAULT '0';

ALTER TABLE ical_sync_logs 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- ===========================================
-- Créer les index manquants
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_bookings_access_key ON bookings(access_key);
CREATE INDEX IF NOT EXISTS idx_property_assignments_property ON property_assignments(property_id);
CREATE INDEX IF NOT EXISTS idx_property_assignments_cleaner ON property_assignments(cleaner_user_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_notes_property ON cleaning_notes(property_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_notes_status ON cleaning_notes(status);

-- Vérification
SELECT 'Migration completed successfully!' as result;

