/**
 * Logger centralisé pour toute l'application
 * Permet un contrôle unifié des logs en dev/prod
 */

export const logger = {
  /**
   * Logs informatifs (masqués en production)
   */
  info: (msg: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[INFO]", msg, ...args);
    }
  },

  /**
   * Avertissements (toujours affichés)
   */
  warn: (msg: string, ...args: any[]) => {
    console.warn("[WARN]", msg, ...args);
  },

  /**
   * Erreurs (toujours affichées)
   */
  error: (msg: string, ...args: any[]) => {
    console.error("[ERROR]", msg, ...args);
  },

  /**
   * Debug détaillé (uniquement si DEBUG=true)
   */
  debug: (msg: string, ...args: any[]) => {
    if (process.env.DEBUG === "true") {
      console.log("[DEBUG]", msg, ...args);
    }
  },
};
