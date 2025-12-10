-- Script pour vérifier et corriger les propriétés orphelines
-- Exécutez ce script dans Supabase SQL Editor

-- 1. Vérifier les propriétés sans propriétaire valide
SELECT 
  p.id,
  p.name,
  p.user_id,
  CASE WHEN u.id IS NULL THEN 'ORPHELINE' ELSE 'OK' END as status
FROM properties p
LEFT JOIN users u ON u.id = p.user_id
WHERE u.id IS NULL;

-- 2. Si des propriétés orphelines existent, les réassigner au compte principal
-- REMPLACEZ 'd4cadb35-8d62-44d3-a80e-ca44b12e3187' par l'ID de votre compte si différent
UPDATE properties
SET user_id = 'd4cadb35-8d62-44d3-a80e-ca44b12e3187'
WHERE user_id IS NULL 
   OR user_id NOT IN (SELECT id FROM users);

-- 3. Vérification finale
SELECT 
  u.email,
  COUNT(p.id) as property_count
FROM users u
LEFT JOIN properties p ON p.user_id = u.id
WHERE u.email = 'nguilane.fall@gmail.com'
GROUP BY u.id, u.email;

