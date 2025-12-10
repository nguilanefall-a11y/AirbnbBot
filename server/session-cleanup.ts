/**
 * Nettoyage automatique des sessions expirées
 * Exécute périodiquement pour maintenir la base de données propre
 */

import { pool } from "./db";

export async function cleanupExpiredSessions(): Promise<number> {
  if (!pool) {
    console.warn("[SESSION] Database not available, skipping cleanup");
    return 0;
  }

  try {
    const client = await pool.connect();
    try {
      // Supprimer les sessions expirées
      const result = await client.query(
        `DELETE FROM sessions WHERE expire < NOW() RETURNING sid`
      );
      const count = result.rowCount || 0;
      
      if (count > 0) {
        console.log(`[SESSION] Cleaned up ${count} expired session(s)`);
      }
      
      return count;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("[SESSION] Error cleaning up sessions:", error.message);
    return 0;
  }
}

/**
 * Démarrer le nettoyage automatique périodique
 * @param intervalMinutes Intervalle en minutes (défaut: 60)
 */
export function startSessionCleanup(intervalMinutes: number = 60) {
  if (!pool) {
    console.warn("[SESSION] Database not available, session cleanup disabled");
    return;
  }

  // Nettoyer immédiatement au démarrage
  cleanupExpiredSessions();

  // Puis nettoyer périodiquement
  const intervalMs = intervalMinutes * 60 * 1000;
  setInterval(() => {
    cleanupExpiredSessions();
  }, intervalMs);

  console.log(`[SESSION] Auto-cleanup enabled (every ${intervalMinutes} minutes)`);
}

