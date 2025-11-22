-- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  listing_id TEXT,
  guest_name TEXT,
  last_message_ts TIMESTAMPTZ
);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  sender TEXT,
  body TEXT,
  timestamp TIMESTAMPTZ,
  raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- send_queue
CREATE TABLE IF NOT EXISTS send_queue (
  id SERIAL PRIMARY KEY,
  conversation_id TEXT,
  conversation_url TEXT,
  body TEXT,
  status TEXT DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
