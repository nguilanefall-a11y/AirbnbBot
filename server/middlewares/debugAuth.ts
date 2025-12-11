/**
 * ============================================
 * MIDDLEWARE DE DEBUG AUTHENTIFICATION
 * ============================================
 * 
 * ⚠️  CE MIDDLEWARE DOIT TOUJOURS VENIR APRÈS :
 * - passport.initialize()
 * - passport.session()
 * - verifyPassportReady
 * 
 * Il fournit des logs détaillés pour le diagnostic des problèmes d'authentification.
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Middleware de debug pour les sessions et l'authentification
 * 
 * Logs détaillés pour :
 * - Les requêtes vers /api/properties
 * - Les requêtes vers /api/user
 * - Les requêtes non authentifiées
 */
export function debugAuth(req: Request, res: Response, next: NextFunction): void {
  const reqAny = req as any;
  
  // Vérification de sécurité (ne devrait jamais arriver si verifyPassportReady est en place)
  if (typeof reqAny.isAuthenticated !== 'function') {
    console.error('[DEBUG-AUTH] ⚠️  req.isAuthenticated is not a function - Passport may not be initialized');
    return next();
  }

  // Log uniquement pour les requêtes API importantes
  if (req.path.startsWith('/api') && (req.method !== 'GET' || req.path === '/api/properties')) {
    const sessionId = reqAny.sessionID;
    const isAuth = reqAny.isAuthenticated();
    const userId = reqAny.user?.id;
    const hasCookie = !!req.headers.cookie;
    const cookieValue = req.headers.cookie?.includes('airbnb.session') ? 'present' : 'missing';
    
    // Log détaillé pour les requêtes importantes
    if (req.path === '/api/properties' || req.path === '/api/user') {
      console.log(`[DEBUG-AUTH] ${req.method} ${req.path}`);
      console.log(`  - Authenticated: ${isAuth}`);
      console.log(`  - User ID: ${userId || 'none'}`);
      console.log(`  - Session ID: ${sessionId?.substring(0, 20) || 'none'}...`);
      console.log(`  - Cookie header: ${cookieValue}`);
      console.log(`  - Has cookie: ${hasCookie}`);
    }
    
    // Log pour les requêtes non authentifiées
    if (!isAuth && req.path !== '/api/user' && req.path !== '/api/login' && req.path !== '/api/register' && req.path !== '/api/health') {
      console.warn(`[DEBUG-AUTH] ⚠️  Unauthenticated request: ${req.method} ${req.path}`);
      console.warn(`  - Cookie: ${cookieValue}`);
      console.warn(`  - Session ID: ${sessionId || 'none'}`);
      console.warn(`  - User-Agent: ${req.headers['user-agent']?.substring(0, 50)}`);
    }
  }
  
  next();
}

