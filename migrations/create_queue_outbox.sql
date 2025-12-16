-- Table queue_outbox : Queue de messages à envoyer
-- Utilisée par ai_worker (INSERT) et send_worker (SELECT + UPDATE)

CREATE TABLE IF NOT EXISTS queue_outbox (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Index pour optimiser les queries du send_worker
CREATE INDEX IF NOT EXISTS idx_queue_outbox_status ON queue_outbox(status);
CREATE INDEX IF NOT EXISTS idx_queue_outbox_created_at ON queue_outbox(created_at);

-- Ajouter colonne replied_at à la table messages si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'replied_at'
    ) THEN
        ALTER TABLE messages ADD COLUMN replied_at TIMESTAMP;
        CREATE INDEX idx_messages_replied_at ON messages(replied_at);
    END IF;
END $$;

-- Commentaires pour documentation
COMMENT ON TABLE queue_outbox IS 'Queue de messages à envoyer via send_worker';
COMMENT ON COLUMN queue_outbox.status IS 'pending: en attente, sent: envoyé, failed: échec';
COMMENT ON COLUMN queue_outbox.retry_count IS 'Nombre de tentatives d''envoi échouées';

-- Afficher les tables créées
SELECT 'Table queue_outbox créée avec succès' AS status;
