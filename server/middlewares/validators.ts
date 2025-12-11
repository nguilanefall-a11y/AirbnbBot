/**
 * Middlewares de validation pour les paramètres de requête
 * Permet de valider les formats (UUID, etc.) avant le traitement
 */

import { Request, Response, NextFunction } from "express";

/**
 * Middleware pour valider qu'un paramètre est un UUID valide
 * @param paramName - Nom du paramètre à valider
 * @returns Middleware Express
 */
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!value || !uuidRegex.test(value)) {
      return res.status(400).json({
        error: "Invalid ID format",
        message: `${paramName} must be a valid UUID`,
      });
    }

    next();
  };
};
