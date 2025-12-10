-- Migration pour ajouter les tokens permanents iCal
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Ajouter la colonne ical_sync_token à la table properties
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' 
    AND column_name = 'ical_sync_token'
  ) THEN
    ALTER TABLE properties 
    ADD COLUMN ical_sync_token VARCHAR UNIQUE;
    
    -- Créer un index pour améliorer les performances
    CREATE INDEX IF NOT EXISTS IDX_properties_ical_sync_token 
    ON properties(ical_sync_token);
    
    RAISE NOTICE 'Colonne ical_sync_token ajoutée à properties';
  ELSE
    RAISE NOTICE 'Colonne ical_sync_token existe déjà dans properties';
  END IF;
END $$;

-- 2. Ajouter la colonne ical_sync_token à la table users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'ical_sync_token'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN ical_sync_token VARCHAR UNIQUE;
    
    -- Créer un index pour améliorer les performances
    CREATE INDEX IF NOT EXISTS IDX_users_ical_sync_token 
    ON users(ical_sync_token);
    
    RAISE NOTICE 'Colonne ical_sync_token ajoutée à users';
  ELSE
    RAISE NOTICE 'Colonne ical_sync_token existe déjà dans users';
  END IF;
END $$;

-- 3. Vérification finale
SELECT 
  'properties' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'ical_sync_token'
  ) THEN '✅ OK' ELSE '❌ MANQUANT' END as status
UNION ALL
SELECT 
  'users' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'ical_sync_token'
  ) THEN '✅ OK' ELSE '❌ MANQUANT' END as status;

