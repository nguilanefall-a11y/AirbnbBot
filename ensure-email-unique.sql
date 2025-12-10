-- S'assurer que l'email est unique dans la table users
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Vérifier si la contrainte unique existe déjà
DO $$ 
BEGIN
  -- Vérifier si la contrainte unique sur email existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_key' 
    AND conrelid = 'users'::regclass
  ) THEN
    -- Créer la contrainte unique si elle n'existe pas
    ALTER TABLE users 
    ADD CONSTRAINT users_email_key UNIQUE (email);
    
    RAISE NOTICE 'Contrainte unique ajoutée sur users.email';
  ELSE
    RAISE NOTICE 'Contrainte unique existe déjà sur users.email';
  END IF;
END $$;

-- 2. Vérifier s'il y a des doublons existants
SELECT 
  email, 
  COUNT(*) as count,
  array_agg(id) as user_ids
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Si des doublons existent, vous devrez les supprimer manuellement
-- en gardant le compte le plus récent ou celui avec le plus de propriétés

