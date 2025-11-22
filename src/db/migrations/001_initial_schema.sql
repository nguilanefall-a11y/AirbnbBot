-- Migration initiale : Création de toutes les tables

-- Table: listings
CREATE TABLE IF NOT EXISTS listings (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    airbnb_listing_id VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listings_airbnb_id ON listings(airbnb_listing_id);

-- Table: threads
CREATE TABLE IF NOT EXISTS threads (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    airbnb_thread_id VARCHAR UNIQUE NOT NULL,
    listing_id VARCHAR NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    guest_name VARCHAR,
    guest_email VARCHAR,
    last_message_at TIMESTAMP,
    last_scraped_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR DEFAULT 'open',
    thread_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_threads_airbnb_id ON threads(airbnb_thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_listing ON threads(listing_id);
CREATE INDEX IF NOT EXISTS idx_threads_last_message ON threads(last_message_at);

-- Table: messages
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    thread_id VARCHAR NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    direction VARCHAR NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL,
    airbnb_message_id VARCHAR UNIQUE,
    sender_name VARCHAR,
    is_read BOOLEAN DEFAULT FALSE,
    message_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_airbnb_id ON messages(airbnb_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);

-- Table: queue_outbox
CREATE TABLE IF NOT EXISTS queue_outbox (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    thread_id VARCHAR NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    payload_json TEXT NOT NULL,
    status VARCHAR DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON queue_outbox(status);
CREATE INDEX IF NOT EXISTS idx_outbox_thread ON queue_outbox(thread_id);
CREATE INDEX IF NOT EXISTS idx_outbox_created ON queue_outbox(created_at);

-- Table: worker_heartbeats
CREATE TABLE IF NOT EXISTS worker_heartbeats (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    worker_name VARCHAR NOT NULL,
    last_heartbeat TIMESTAMP DEFAULT NOW() NOT NULL,
    status VARCHAR DEFAULT 'running',
    worker_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_heartbeat_worker ON worker_heartbeats(worker_name);
CREATE INDEX IF NOT EXISTS idx_heartbeat_time ON worker_heartbeats(last_heartbeat);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outbox_updated_at BEFORE UPDATE ON queue_outbox
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

