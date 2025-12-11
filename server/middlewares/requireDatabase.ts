/**
 * Middleware pour vérifier que la base de données est disponible
 * Retourne une erreur 503 propre si la DB n'est pas initialisée
 */

import { Request, Response, NextFunction } from "express";
import { db } from "../db";

export function requireDatabase(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!db) {
    return res.status(503).json({
      error: "Database unavailable",
      message: "Service temporarily unavailable. Please try again later.",
    });
  }
  next();
}
