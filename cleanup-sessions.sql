-- Script de nettoyage des sessions expirées
-- Exécutez ce script dans Supabase SQL Editor pour nettoyer les sessions existantes

-- 1. Supprimer toutes les sessions expirées
DELETE FROM sessions 
WHERE expire < NOW();

-- 2. Vérifier le nombre de sessions restantes
SELECT 
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE expire < NOW()) as expired_sessions,
  COUNT(*) FILTER (WHERE expire >= NOW()) as active_sessions
FROM sessions;

-- 3. (Optionnel) Supprimer toutes les sessions (pour un reset complet)
-- ATTENTION: Cela déconnectera tous les utilisateurs
-- DELETE FROM sessions;

