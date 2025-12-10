-- Corriger la table ical_sync_logs pour ajouter une valeur par défaut à status
ALTER TABLE ical_sync_logs 
ALTER COLUMN sync_status SET DEFAULT 'success';

-- Si la colonne n'existe pas avec le bon nom, vérifier
DO $$ 
BEGIN
  -- Vérifier si la colonne existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ical_sync_logs' 
    AND column_name = 'sync_status'
  ) THEN
    -- Ajouter la valeur par défaut si elle n'existe pas
    ALTER TABLE ical_sync_logs 
    ALTER COLUMN sync_status SET DEFAULT 'success';
  END IF;
END $$;

