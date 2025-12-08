/**
 * Routes API pour la Section Ménage Intelligente
 * 
 * Gère :
 * - Personnel de ménage (CRUD)
 * - Tâches de ménage (calendrier)
 * - Demandes spéciales (Early Check-in / Late Check-out)
 * - Bot lien unique pour voyageurs
 * - Synchronisation iCal
 */

import type { Express, Request, Response } from "express";
import { db } from "./db";
import { 
  cleaningStaff, 
  cleaningTasks, 
  specialRequests, 
  bookings, 
  properties,
  icalSyncLogs,
  notifications,
  users,
  propertyAssignments,
  cleaningNotes,
  cleanerUnavailability,
  blockedPeriods,
  insertCleaningStaffSchema,
  insertCleaningTaskSchema,
  insertSpecialRequestSchema,
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { isAuthenticated } from "./auth";
import bcrypt from "bcrypt";
import { syncICalForProperty, getPropertyCalendar } from "./ical-service";

// Helper to ensure db is initialized
function ensureDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export function registerCleaningRoutes(app: Express) {
  
  // ========================================
  // PERSONNEL DE MÉNAGE
  // ========================================
  
  /**
   * GET /api/cleaning/staff - Liste du personnel de ménage
   */
  app.get("/api/cleaning/staff", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const database = ensureDb();
      
      const staff = await database.select().from(cleaningStaff)
        .where(eq(cleaningStaff.userId, userId))
        .orderBy(desc(cleaningStaff.createdAt));
      
      res.json(staff);
    } catch (error: any) {
      console.error("Error fetching cleaning staff:", error);
      res.status(500).json({ error: error.message || "Failed to fetch cleaning staff" });
    }
  });

  /**
   * POST /api/cleaning/staff - Créer un membre du personnel
   */
  app.post("/api/cleaning/staff", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const database = ensureDb();
      
      const validated = insertCleaningStaffSchema.parse({ ...req.body, userId });
      
      const [newStaff] = await database.insert(cleaningStaff)
        .values(validated)
        .returning();
      
      res.status(201).json(newStaff);
    } catch (error: any) {
      console.error("Error creating cleaning staff:", error);
      res.status(400).json({ error: error.message || "Failed to create cleaning staff" });
    }
  });

  /**
   * PATCH /api/cleaning/staff/:id - Modifier un membre
   */
  app.patch("/api/cleaning/staff/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const database = ensureDb();
      
      // Vérifier propriété
      const [existing] = await database.select().from(cleaningStaff)
        .where(and(eq(cleaningStaff.id, id), eq(cleaningStaff.userId, userId)))
        .limit(1);
      
      if (!existing) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      const [updated] = await database.update(cleaningStaff)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(cleaningStaff.id, id))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating cleaning staff:", error);
      res.status(400).json({ error: error.message || "Failed to update cleaning staff" });
    }
  });

  /**
   * DELETE /api/cleaning/staff/:id - Supprimer un membre
   */
  app.delete("/api/cleaning/staff/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const database = ensureDb();
      
      const [deleted] = await database.delete(cleaningStaff)
        .where(and(eq(cleaningStaff.id, id), eq(cleaningStaff.userId, userId)))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting cleaning staff:", error);
      res.status(400).json({ error: error.message || "Failed to delete cleaning staff" });
    }
  });

  // ========================================
  // TÂCHES DE MÉNAGE
  // ========================================

  /**
   * GET /api/cleaning/tasks - Liste des tâches de ménage
   * Query params: propertyId, staffId, startDate, endDate, status
   */
  app.get("/api/cleaning/tasks", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { propertyId, staffId, startDate, endDate, status } = req.query;
      const database = ensureDb();
      
      // Récupérer les propriétés de l'utilisateur
      const userProperties = await database.select().from(properties)
        .where(eq(properties.userId, userId));
      const propertyIds = userProperties.map(p => p.id);
      
      if (propertyIds.length === 0) {
        return res.json([]);
      }

      let query = database.select().from(cleaningTasks);
      const conditions: any[] = [];
      
      if (propertyId) {
        conditions.push(eq(cleaningTasks.propertyId, propertyId as string));
      } else {
        // Filtrer par propriétés de l'utilisateur
        conditions.push(sql`${cleaningTasks.propertyId} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`);
      }
      
      if (staffId) {
        conditions.push(eq(cleaningTasks.cleaningStaffId, staffId as string));
      }
      
      if (startDate) {
        conditions.push(gte(cleaningTasks.scheduledDate, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(cleaningTasks.scheduledDate, new Date(endDate as string)));
      }
      
      if (status) {
        conditions.push(eq(cleaningTasks.status, status as string));
      }
      
      const tasks = await query
        .where(and(...conditions))
        .orderBy(cleaningTasks.scheduledDate);
      
      res.json(tasks);
    } catch (error: any) {
      console.error("Error fetching cleaning tasks:", error);
      res.status(500).json({ error: error.message || "Failed to fetch cleaning tasks" });
    }
  });

  /**
   * POST /api/cleaning/tasks - Créer une tâche de ménage
   */
  app.post("/api/cleaning/tasks", isAuthenticated, async (req: any, res: Response) => {
    try {
      const database = ensureDb();
      const validated = insertCleaningTaskSchema.parse(req.body);
      
      const [newTask] = await database.insert(cleaningTasks)
        .values(validated)
        .returning();
      
      res.status(201).json(newTask);
    } catch (error: any) {
      console.error("Error creating cleaning task:", error);
      res.status(400).json({ error: error.message || "Failed to create cleaning task" });
    }
  });

  /**
   * PATCH /api/cleaning/tasks/:id - Modifier une tâche
   */
  app.patch("/api/cleaning/tasks/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const database = ensureDb();
      
      const [updated] = await database.update(cleaningTasks)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(cleaningTasks.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating cleaning task:", error);
      res.status(400).json({ error: error.message || "Failed to update cleaning task" });
    }
  });

  /**
   * POST /api/cleaning/tasks/:id/start - Démarrer une tâche
   */
  app.post("/api/cleaning/tasks/:id/start", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const database = ensureDb();
      
      const [updated] = await database.update(cleaningTasks)
        .set({ 
          status: "in_progress",
          actualStartTime: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(cleaningTasks.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error starting cleaning task:", error);
      res.status(400).json({ error: error.message || "Failed to start cleaning task" });
    }
  });

  /**
   * POST /api/cleaning/tasks/:id/complete - Terminer une tâche
   */
  app.post("/api/cleaning/tasks/:id/complete", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { checklistCompleted } = req.body;
      const database = ensureDb();
      
      const [updated] = await database.update(cleaningTasks)
        .set({ 
          status: "completed",
          actualEndTime: new Date(),
          checklistCompleted: checklistCompleted || [],
          updatedAt: new Date(),
        })
        .where(eq(cleaningTasks.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error completing cleaning task:", error);
      res.status(400).json({ error: error.message || "Failed to complete cleaning task" });
    }
  });

  // ========================================
  // DEMANDES SPÉCIALES (EARLY CHECK-IN / LATE CHECK-OUT)
  // ========================================

  /**
   * GET /api/cleaning/special-requests - Liste des demandes spéciales
   */
  app.get("/api/cleaning/special-requests", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { propertyId, status } = req.query;
      const database = ensureDb();
      
      // Récupérer les propriétés de l'utilisateur
      const userProperties = await database.select().from(properties)
        .where(eq(properties.userId, userId));
      const propertyIds = userProperties.map(p => p.id);
      
      if (propertyIds.length === 0) {
        return res.json([]);
      }

      const conditions: any[] = [];
      
      if (propertyId) {
        conditions.push(eq(specialRequests.propertyId, propertyId as string));
      } else {
        conditions.push(sql`${specialRequests.propertyId} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`);
      }
      
      if (status) {
        conditions.push(eq(specialRequests.status, status as string));
      }
      
      const requests = await database.select().from(specialRequests)
        .where(and(...conditions))
        .orderBy(desc(specialRequests.createdAt));
      
      res.json(requests);
    } catch (error: any) {
      console.error("Error fetching special requests:", error);
      res.status(500).json({ error: error.message || "Failed to fetch special requests" });
    }
  });

  /**
   * POST /api/cleaning/special-requests/:id/respond - Répondre à une demande
   * Body: { action: "accept" | "refuse", message?: string }
   */
  app.post("/api/cleaning/special-requests/:id/respond", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action, message, staffId } = req.body;
      const database = ensureDb();
      
      if (!["accept", "refuse"].includes(action)) {
        return res.status(400).json({ error: "Invalid action. Use 'accept' or 'refuse'" });
      }
      
      const newStatus = action === "accept" ? "accepted" : "refused";
      const responseMessage = action === "accept"
        ? message || "✅ Votre demande a été acceptée ! L'heure a été modifiée."
        : message || "❌ Désolé, votre demande n'a pas pu être acceptée. L'heure initiale est maintenue.";
      
      const [updated] = await database.update(specialRequests)
        .set({
          status: newStatus,
          respondedBy: staffId || null,
          respondedAt: new Date(),
          responseMessage,
          guestNotifiedAt: new Date(), // Marquer comme notifié
        })
        .where(eq(specialRequests.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Special request not found" });
      }
      
      // Si accepté, mettre à jour la tâche de ménage associée
      if (action === "accept" && updated.cleaningTaskId) {
        const newTime = updated.requestType === "early_checkin" 
          ? updated.requestedTime // Le ménage doit finir plus tôt
          : updated.requestedTime; // Le ménage peut commencer plus tard
        
        await database.update(cleaningTasks)
          .set({
            scheduledEndTime: updated.requestType === "early_checkin" ? newTime : undefined,
            scheduledStartTime: updated.requestType === "late_checkout" ? newTime : undefined,
            notes: `Demande spéciale acceptée: ${updated.requestType} à ${newTime}`,
            updatedAt: new Date(),
          })
          .where(eq(cleaningTasks.id, updated.cleaningTaskId));
      }
      
      res.json({
        request: updated,
        guestNotification: {
          sent: true,
          message: responseMessage,
        },
      });
    } catch (error: any) {
      console.error("Error responding to special request:", error);
      res.status(400).json({ error: error.message || "Failed to respond to special request" });
    }
  });

  // ========================================
  // BOT LIEN UNIQUE (Canal exclusif voyageurs)
  // ========================================

  /**
   * GET /api/guest-request/:token - Récupérer les infos de la réservation via le lien unique
   * Ce endpoint est PUBLIC (pas d'auth) - accessible via le lien envoyé au voyageur
   */
  app.get("/api/guest-request/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const database = ensureDb();
      
      // Trouver la réservation par son accessKey
      const [booking] = await database.select().from(bookings)
        .where(eq(bookings.accessKey, token))
        .limit(1);
      
      if (!booking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }
      
      // Récupérer la propriété
      const [property] = await database.select().from(properties)
        .where(eq(properties.id, booking.propertyId))
        .limit(1);
      
      if (!property) {
        return res.status(404).json({ error: "Propriété non trouvée" });
      }
      
      // Vérifier les demandes existantes
      const existingRequests = await database.select().from(specialRequests)
        .where(eq(specialRequests.bookingId, booking.id))
        .orderBy(desc(specialRequests.createdAt));
      
      res.json({
        booking: {
          id: booking.id,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          guestName: booking.guestName,
        },
        property: {
          name: property.name,
          checkInTime: property.checkInTime,
          checkOutTime: property.checkOutTime,
        },
        existingRequests: existingRequests.map(r => ({
          id: r.id,
          type: r.requestType,
          requestedTime: r.requestedTime,
          status: r.status,
          responseMessage: r.responseMessage,
          createdAt: r.createdAt,
        })),
        canRequestEarlyCheckIn: !existingRequests.some(r => r.requestType === "early_checkin" && r.status !== "refused"),
        canRequestLateCheckOut: !existingRequests.some(r => r.requestType === "late_checkout" && r.status !== "refused"),
      });
    } catch (error: any) {
      console.error("Error fetching guest request info:", error);
      res.status(500).json({ error: error.message || "Failed to fetch booking info" });
    }
  });

  /**
   * POST /api/guest-request/:token - Soumettre une demande spéciale via le lien unique
   * SEUL CANAL ACCEPTÉ pour les demandes d'horaire
   * Body: { requestType: "early_checkin" | "late_checkout", requestedTime: "HH:MM", message?: string }
   */
  app.post("/api/guest-request/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { requestType, requestedTime, message } = req.body;
      const database = ensureDb();
      
      // Validation
      if (!["early_checkin", "late_checkout"].includes(requestType)) {
        return res.status(400).json({ error: "Type de demande invalide" });
      }
      
      if (!requestedTime || !/^\d{2}:\d{2}$/.test(requestedTime)) {
        return res.status(400).json({ error: "Format d'heure invalide (HH:MM)" });
      }
      
      // Trouver la réservation
      const [booking] = await database.select().from(bookings)
        .where(eq(bookings.accessKey, token))
        .limit(1);
      
      if (!booking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }
      
      // Récupérer la propriété
      const [property] = await database.select().from(properties)
        .where(eq(properties.id, booking.propertyId))
        .limit(1);
      
      if (!property) {
        return res.status(404).json({ error: "Propriété non trouvée" });
      }
      
      // Vérifier qu'une demande similaire n'existe pas déjà en attente
      const [existingPending] = await database.select().from(specialRequests)
        .where(and(
          eq(specialRequests.bookingId, booking.id),
          eq(specialRequests.requestType, requestType),
          eq(specialRequests.status, "pending")
        ))
        .limit(1);
      
      if (existingPending) {
        return res.status(409).json({ 
          error: "Une demande similaire est déjà en attente de validation" 
        });
      }
      
      // Trouver la tâche de ménage associée
      const [cleaningTask] = await database.select().from(cleaningTasks)
        .where(eq(cleaningTasks.bookingId, booking.id))
        .limit(1);
      
      const originalTime = requestType === "early_checkin" 
        ? property.checkInTime 
        : property.checkOutTime;
      
      // Calculer l'expiration (24h avant le check-in/out)
      const relevantDate = requestType === "early_checkin" 
        ? booking.checkInDate 
        : booking.checkOutDate;
      const expiresAt = new Date(relevantDate);
      expiresAt.setHours(expiresAt.getHours() - 24);
      
      // Créer la demande spéciale
      const [newRequest] = await database.insert(specialRequests).values({
        bookingId: booking.id,
        propertyId: booking.propertyId,
        cleaningTaskId: cleaningTask?.id || null,
        requestType,
        requestedTime,
        originalTime: originalTime || "15:00",
        guestName: booking.guestName,
        guestMessage: message || null,
        status: "pending",
        sourceChannel: "unique_link", // SEUL CANAL ACCEPTÉ
        expiresAt,
      }).returning();
      
      // Mettre à jour la tâche de ménage avec l'alerte
      if (cleaningTask) {
        await database.update(cleaningTasks)
          .set({
            hasSpecialRequest: true,
            specialRequestId: newRequest.id,
            priority: "high", // Passer en priorité haute
            updatedAt: new Date(),
          })
          .where(eq(cleaningTasks.id, cleaningTask.id));
      }
      
      // Créer une notification pour le propriétaire
      if (property.userId) {
        await database.insert(notifications).values({
          userId: property.userId,
          type: "in_app",
          category: "urgent",
          subject: `🚨 Demande ${requestType === "early_checkin" ? "Early Check-in" : "Late Check-out"}`,
          content: `${booking.guestName || "Un voyageur"} demande un ${requestType === "early_checkin" ? "check-in anticipé" : "départ tardif"} à ${requestedTime} pour ${property.name}`,
          metadata: {
            propertyId: property.id,
            bookingId: booking.id,
            specialRequestId: newRequest.id,
            requestType,
            requestedTime,
          },
        });
      }
      
      res.status(201).json({
        success: true,
        message: "Votre demande a été enregistrée. Vous recevrez une réponse prochainement.",
        request: {
          id: newRequest.id,
          type: newRequest.requestType,
          requestedTime: newRequest.requestedTime,
          status: newRequest.status,
        },
      });
    } catch (error: any) {
      console.error("Error creating special request:", error);
      res.status(400).json({ error: error.message || "Failed to create special request" });
    }
  });

  /**
   * GET /api/guest-request/:token/status/:requestId - Vérifier le statut d'une demande
   */
  app.get("/api/guest-request/:token/status/:requestId", async (req: Request, res: Response) => {
    try {
      const { token, requestId } = req.params;
      const database = ensureDb();
      
      // Vérifier que le token correspond à la réservation
      const [booking] = await database.select().from(bookings)
        .where(eq(bookings.accessKey, token))
        .limit(1);
      
      if (!booking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }
      
      const [request] = await database.select().from(specialRequests)
        .where(and(
          eq(specialRequests.id, requestId),
          eq(specialRequests.bookingId, booking.id)
        ))
        .limit(1);
      
      if (!request) {
        return res.status(404).json({ error: "Demande non trouvée" });
      }
      
      res.json({
        id: request.id,
        type: request.requestType,
        requestedTime: request.requestedTime,
        originalTime: request.originalTime,
        status: request.status,
        responseMessage: request.responseMessage,
        respondedAt: request.respondedAt,
      });
    } catch (error: any) {
      console.error("Error fetching request status:", error);
      res.status(500).json({ error: error.message || "Failed to fetch request status" });
    }
  });

  // ========================================
  // INTERFACE PERSONNEL DE MÉNAGE (via token)
  // ========================================

  /**
   * GET /api/cleaning-portal/:accessToken - Interface du personnel de ménage
   * Accessible sans auth via le token unique
   */
  app.get("/api/cleaning-portal/:accessToken", async (req: Request, res: Response) => {
    try {
      const { accessToken } = req.params;
      const database = ensureDb();
      
      // Trouver le membre du personnel
      const [staff] = await database.select().from(cleaningStaff)
        .where(eq(cleaningStaff.accessToken, accessToken))
        .limit(1);
      
      if (!staff || !staff.isActive) {
        return res.status(404).json({ error: "Accès non autorisé" });
      }
      
      // Récupérer les tâches assignées (7 prochains jours)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const tasks = await database.select().from(cleaningTasks)
        .where(and(
          eq(cleaningTasks.cleaningStaffId, staff.id),
          gte(cleaningTasks.scheduledDate, today),
          lte(cleaningTasks.scheduledDate, nextWeek)
        ))
        .orderBy(cleaningTasks.scheduledDate);
      
      // Enrichir avec les infos des propriétés
      const tasksWithDetails = await Promise.all(tasks.map(async (task) => {
        const [property] = await database.select().from(properties)
          .where(eq(properties.id, task.propertyId))
          .limit(1);
        
        const [specialRequest] = task.specialRequestId 
          ? await database.select().from(specialRequests)
              .where(eq(specialRequests.id, task.specialRequestId))
              .limit(1)
          : [null];
        
        return {
          ...task,
          property: property ? {
            name: property.name,
            address: property.address,
          } : null,
          specialRequest: specialRequest ? {
            type: specialRequest.requestType,
            requestedTime: specialRequest.requestedTime,
            status: specialRequest.status,
            guestMessage: specialRequest.guestMessage,
          } : null,
        };
      }));
      
      res.json({
        staff: {
          id: staff.id,
          name: staff.name,
        },
        tasks: tasksWithDetails,
      });
    } catch (error: any) {
      console.error("Error fetching cleaning portal:", error);
      res.status(500).json({ error: error.message || "Failed to fetch portal data" });
    }
  });

  /**
   * POST /api/cleaning-portal/:accessToken/tasks/:taskId/accept-request
   * Le personnel accepte une demande spéciale
   */
  app.post("/api/cleaning-portal/:accessToken/tasks/:taskId/accept-request", async (req: Request, res: Response) => {
    try {
      const { accessToken, taskId } = req.params;
      const database = ensureDb();
      
      // Vérifier l'accès
      const [staff] = await database.select().from(cleaningStaff)
        .where(eq(cleaningStaff.accessToken, accessToken))
        .limit(1);
      
      if (!staff || !staff.isActive) {
        return res.status(404).json({ error: "Accès non autorisé" });
      }
      
      // Récupérer la tâche
      const [task] = await database.select().from(cleaningTasks)
        .where(and(
          eq(cleaningTasks.id, taskId),
          eq(cleaningTasks.cleaningStaffId, staff.id)
        ))
        .limit(1);
      
      if (!task || !task.specialRequestId) {
        return res.status(404).json({ error: "Tâche ou demande non trouvée" });
      }
      
      // Accepter la demande
      const [updatedRequest] = await database.update(specialRequests)
        .set({
          status: "accepted",
          respondedBy: staff.id,
          respondedAt: new Date(),
          responseMessage: "✅ Votre demande a été acceptée par notre équipe de ménage !",
          guestNotifiedAt: new Date(),
        })
        .where(eq(specialRequests.id, task.specialRequestId))
        .returning();
      
      // Mettre à jour la tâche
      await database.update(cleaningTasks)
        .set({
          priority: "normal",
          notes: `Demande ${updatedRequest.requestType} acceptée: ${updatedRequest.requestedTime}`,
          updatedAt: new Date(),
        })
        .where(eq(cleaningTasks.id, taskId));
      
      res.json({ success: true, message: "Demande acceptée" });
    } catch (error: any) {
      console.error("Error accepting request:", error);
      res.status(400).json({ error: error.message || "Failed to accept request" });
    }
  });

  /**
   * POST /api/cleaning-portal/:accessToken/tasks/:taskId/refuse-request
   * Le personnel refuse une demande spéciale
   */
  app.post("/api/cleaning-portal/:accessToken/tasks/:taskId/refuse-request", async (req: Request, res: Response) => {
    try {
      const { accessToken, taskId } = req.params;
      const { reason } = req.body;
      const database = ensureDb();
      
      // Vérifier l'accès
      const [staff] = await database.select().from(cleaningStaff)
        .where(eq(cleaningStaff.accessToken, accessToken))
        .limit(1);
      
      if (!staff || !staff.isActive) {
        return res.status(404).json({ error: "Accès non autorisé" });
      }
      
      // Récupérer la tâche
      const [task] = await database.select().from(cleaningTasks)
        .where(and(
          eq(cleaningTasks.id, taskId),
          eq(cleaningTasks.cleaningStaffId, staff.id)
        ))
        .limit(1);
      
      if (!task || !task.specialRequestId) {
        return res.status(404).json({ error: "Tâche ou demande non trouvée" });
      }
      
      // Refuser la demande
      const responseMessage = reason 
        ? `❌ Désolé, votre demande n'a pas pu être acceptée. Raison: ${reason}`
        : "❌ Désolé, votre demande n'a pas pu être acceptée. L'heure initiale est maintenue.";
      
      await database.update(specialRequests)
        .set({
          status: "refused",
          respondedBy: staff.id,
          respondedAt: new Date(),
          responseMessage,
          guestNotifiedAt: new Date(),
        })
        .where(eq(specialRequests.id, task.specialRequestId));
      
      // Mettre à jour la tâche
      await database.update(cleaningTasks)
        .set({
          hasSpecialRequest: false,
          specialRequestId: null,
          priority: "normal",
          updatedAt: new Date(),
        })
        .where(eq(cleaningTasks.id, taskId));
      
      res.json({ success: true, message: "Demande refusée" });
    } catch (error: any) {
      console.error("Error refusing request:", error);
      res.status(400).json({ error: error.message || "Failed to refuse request" });
    }
  });

  // ========================================
  // SYNCHRONISATION iCAL
  // ========================================

  /**
   * POST /api/cleaning/sync-ical/:propertyId - Synchroniser le calendrier iCal
   */
  app.post("/api/cleaning/sync-ical/:propertyId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { propertyId } = req.params;
      const userId = req.user.id;
      const database = ensureDb();
      
      // Vérifier que la propriété appartient à l'utilisateur
      const [property] = await database.select().from(properties)
        .where(and(
          eq(properties.id, propertyId),
          eq(properties.userId, userId)
        ))
        .limit(1);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      const result = await syncICalForProperty(propertyId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      
      res.json({
        success: true,
        imported: result.imported,
        updated: result.updated,
        message: `Synchronisation réussie: ${result.imported} nouvelles réservations, ${result.updated} mises à jour`,
      });
    } catch (error: any) {
      console.error("Error syncing iCal:", error);
      res.status(500).json({ error: error.message || "Failed to sync iCal" });
    }
  });

  /**
   * GET /api/cleaning/calendar/:propertyId - Récupérer le calendrier complet
   * Query: month (YYYY-MM)
   */
  app.get("/api/cleaning/calendar/:propertyId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { propertyId } = req.params;
      const { month } = req.query;
      const userId = req.user.id;
      const database = ensureDb();
      
      // Vérifier la propriété
      const [property] = await database.select().from(properties)
        .where(and(
          eq(properties.id, propertyId),
          eq(properties.userId, userId)
        ))
        .limit(1);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      const targetMonth = month 
        ? new Date(`${month}-01`)
        : new Date();
      
      const calendar = await getPropertyCalendar(propertyId, targetMonth);
      
      res.json({
        property: {
          id: property.id,
          name: property.name,
          icalUrl: property.icalUrl,
          lastImportedAt: property.lastImportedAt,
        },
        ...calendar,
      });
    } catch (error: any) {
      console.error("Error fetching calendar:", error);
      res.status(500).json({ error: error.message || "Failed to fetch calendar" });
    }
  });

  /**
   * PATCH /api/properties/:id/ical - Configurer l'URL iCal d'une propriété
   */
  app.patch("/api/properties/:id/ical", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { icalUrl, cleaningPersonId } = req.body;
      const userId = req.user.id;
      const database = ensureDb();
      
      // Vérifier la propriété
      const [property] = await database.select().from(properties)
        .where(and(
          eq(properties.id, id),
          eq(properties.userId, userId)
        ))
        .limit(1);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      const [updated] = await database.update(properties)
        .set({
          icalUrl: icalUrl !== undefined ? icalUrl : property.icalUrl,
          cleaningPersonId: cleaningPersonId !== undefined ? cleaningPersonId : property.cleaningPersonId,
        })
        .where(eq(properties.id, id))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating property iCal:", error);
      res.status(400).json({ error: error.message || "Failed to update property" });
    }
  });

  /**
   * GET /api/cleaning/sync-logs/:propertyId - Historique des synchronisations
   */
  app.get("/api/cleaning/sync-logs/:propertyId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const { propertyId } = req.params;
      const database = ensureDb();
      
      const logs = await database.select().from(icalSyncLogs)
        .where(eq(icalSyncLogs.propertyId, propertyId))
        .orderBy(desc(icalSyncLogs.syncedAt))
        .limit(20);
      
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching sync logs:", error);
      res.status(500).json({ error: error.message || "Failed to fetch sync logs" });
    }
  });

  // ========================================
  // GESTION DES COMPTES CLEANING AGENT
  // ========================================

  /**
   * POST /api/cleaning/agents - Créer un compte cleaning agent
   * Accessible uniquement par les hosts
   */
  app.post("/api/cleaning/agents", isAuthenticated, async (req: any, res: Response) => {
    try {
      const hostId = req.user.id;
      const { email, password, firstName, lastName, assignedProperties } = req.body;
      const database = ensureDb();

      // Vérifier que l'utilisateur est un host
      const [host] = await database.select().from(users)
        .where(eq(users.id, hostId))
        .limit(1);
      
      if (!host || host.role !== "host") {
        return res.status(403).json({ error: "Seuls les hôtes peuvent créer des agents de ménage" });
      }

      // Vérifier si l'email existe déjà
      const [existingUser] = await database.select().from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (existingUser) {
        return res.status(409).json({ error: "Un compte avec cet email existe déjà" });
      }

      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Créer le compte cleaning agent
      const [newAgent] = await database.insert(users).values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: "cleaning_agent",
        parentHostId: hostId,
      }).returning();

      // Assigner les propriétés si spécifiées
      if (assignedProperties && assignedProperties.length > 0) {
        const assignments = assignedProperties.map((propertyId: string) => ({
          propertyId,
          cleanerUserId: newAgent.id,
          assignedBy: hostId,
        }));
        await database.insert(propertyAssignments).values(assignments);
      }

      res.status(201).json({
        id: newAgent.id,
        email: newAgent.email,
        firstName: newAgent.firstName,
        lastName: newAgent.lastName,
        role: newAgent.role,
        assignedProperties: assignedProperties || [],
      });
    } catch (error: any) {
      console.error("Error creating cleaning agent:", error);
      res.status(400).json({ error: error.message || "Failed to create cleaning agent" });
    }
  });

  /**
   * GET /api/cleaning/agents - Liste des agents de ménage de l'hôte
   */
  app.get("/api/cleaning/agents", isAuthenticated, async (req: any, res: Response) => {
    try {
      const hostId = req.user.id;
      const database = ensureDb();

      const agents = await database.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt,
      }).from(users)
        .where(and(
          eq(users.parentHostId, hostId),
          eq(users.role, "cleaning_agent")
        ))
        .orderBy(desc(users.createdAt));

      // Récupérer les assignations pour chaque agent
      const agentsWithProperties = await Promise.all(agents.map(async (agent) => {
        const assignments = await database.select({
          propertyId: propertyAssignments.propertyId,
          propertyName: properties.name,
          isActive: propertyAssignments.isActive,
        }).from(propertyAssignments)
          .leftJoin(properties, eq(properties.id, propertyAssignments.propertyId))
          .where(eq(propertyAssignments.cleanerUserId, agent.id));
        
        return {
          ...agent,
          assignedProperties: assignments,
        };
      }));

      res.json(agentsWithProperties);
    } catch (error: any) {
      console.error("Error fetching cleaning agents:", error);
      res.status(500).json({ error: error.message || "Failed to fetch cleaning agents" });
    }
  });

  /**
   * DELETE /api/cleaning/agents/:id - Supprimer un agent de ménage
   */
  app.delete("/api/cleaning/agents/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const hostId = req.user.id;
      const { id } = req.params;
      const database = ensureDb();

      const [deleted] = await database.delete(users)
        .where(and(
          eq(users.id, id),
          eq(users.parentHostId, hostId),
          eq(users.role, "cleaning_agent")
        ))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Agent non trouvé" });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting cleaning agent:", error);
      res.status(400).json({ error: error.message || "Failed to delete cleaning agent" });
    }
  });

  // ========================================
  // ASSIGNATIONS PROPRIÉTÉS ↔ CLEANERS
  // ========================================

  /**
   * POST /api/cleaning/assignments - Assigner un cleaner à une propriété
   */
  app.post("/api/cleaning/assignments", isAuthenticated, async (req: any, res: Response) => {
    try {
      const hostId = req.user.id;
      const { propertyId, cleanerUserId } = req.body;
      const database = ensureDb();

      // Vérifier que la propriété appartient à l'hôte
      const [property] = await database.select().from(properties)
        .where(and(eq(properties.id, propertyId), eq(properties.userId, hostId)))
        .limit(1);
      
      if (!property) {
        return res.status(404).json({ error: "Propriété non trouvée" });
      }

      // Vérifier que le cleaner appartient à l'hôte
      const [cleaner] = await database.select().from(users)
        .where(and(
          eq(users.id, cleanerUserId),
          eq(users.parentHostId, hostId),
          eq(users.role, "cleaning_agent")
        ))
        .limit(1);
      
      if (!cleaner) {
        return res.status(404).json({ error: "Agent de ménage non trouvé" });
      }

      // Créer l'assignation
      const [assignment] = await database.insert(propertyAssignments).values({
        propertyId,
        cleanerUserId,
        assignedBy: hostId,
      }).returning();

      res.status(201).json(assignment);
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      res.status(400).json({ error: error.message || "Failed to create assignment" });
    }
  });

  /**
   * DELETE /api/cleaning/assignments/:id - Supprimer une assignation
   */
  app.delete("/api/cleaning/assignments/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const hostId = req.user.id;
      const { id } = req.params;
      const database = ensureDb();

      const [deleted] = await database.delete(propertyAssignments)
        .where(and(
          eq(propertyAssignments.id, id),
          eq(propertyAssignments.assignedBy, hostId)
        ))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Assignation non trouvée" });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      res.status(400).json({ error: error.message || "Failed to delete assignment" });
    }
  });

  // ========================================
  // NOTES DE MÉNAGE
  // ========================================

  /**
   * GET /api/cleaning/notes - Liste des notes (pour l'hôte)
   * Query: propertyId, status, noteType
   */
  app.get("/api/cleaning/notes", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { propertyId, status, noteType } = req.query;
      const database = ensureDb();

      // Récupérer le rôle de l'utilisateur
      const [user] = await database.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      let propertyIds: string[] = [];

      if (user.role === "host") {
        // L'hôte voit les notes de toutes ses propriétés
        const userProperties = await database.select().from(properties)
          .where(eq(properties.userId, userId));
        propertyIds = userProperties.map(p => p.id);
      } else if (user.role === "cleaning_agent") {
        // Le cleaner voit les notes des propriétés qui lui sont assignées
        const assignments = await database.select().from(propertyAssignments)
          .where(and(
            eq(propertyAssignments.cleanerUserId, userId),
            eq(propertyAssignments.isActive, true)
          ));
        propertyIds = assignments.map(a => a.propertyId);
      }

      if (propertyIds.length === 0) {
        return res.json([]);
      }

      const conditions: any[] = [];
      
      if (propertyId) {
        conditions.push(eq(cleaningNotes.propertyId, propertyId as string));
      } else {
        conditions.push(sql`${cleaningNotes.propertyId} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`);
      }
      
      if (status) {
        conditions.push(eq(cleaningNotes.status, status as string));
      }
      
      if (noteType) {
        conditions.push(eq(cleaningNotes.noteType, noteType as string));
      }

      const notes = await database.select({
        note: cleaningNotes,
        property: {
          id: properties.id,
          name: properties.name,
        },
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      }).from(cleaningNotes)
        .leftJoin(properties, eq(properties.id, cleaningNotes.propertyId))
        .leftJoin(users, eq(users.id, cleaningNotes.authorId))
        .where(and(...conditions))
        .orderBy(desc(cleaningNotes.createdAt));

      // Marquer comme lu par l'hôte si c'est un hôte qui consulte
      if (user.role === "host") {
        const unreadNoteIds = notes
          .filter(n => !n.note.hostReadAt)
          .map(n => n.note.id);
        
        if (unreadNoteIds.length > 0) {
          await database.update(cleaningNotes)
            .set({ hostReadAt: new Date() })
            .where(sql`${cleaningNotes.id} IN (${sql.raw(unreadNoteIds.map(id => `'${id}'`).join(','))})`);
        }
      }

      res.json(notes.map(n => ({
        ...n.note,
        property: n.property,
        author: n.author,
      })));
    } catch (error: any) {
      console.error("Error fetching cleaning notes:", error);
      res.status(500).json({ error: error.message || "Failed to fetch cleaning notes" });
    }
  });

  /**
   * POST /api/cleaning/notes - Créer une note (cleaner uniquement)
   */
  app.post("/api/cleaning/notes", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { propertyId, cleaningTaskId, noteType, priority, title, description, photos } = req.body;
      const database = ensureDb();

      // Vérifier que l'utilisateur a accès à cette propriété
      const [user] = await database.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      let hasAccess = false;

      if (user.role === "host") {
        const [property] = await database.select().from(properties)
          .where(and(eq(properties.id, propertyId), eq(properties.userId, userId)))
          .limit(1);
        hasAccess = !!property;
      } else if (user.role === "cleaning_agent") {
        const [assignment] = await database.select().from(propertyAssignments)
          .where(and(
            eq(propertyAssignments.propertyId, propertyId),
            eq(propertyAssignments.cleanerUserId, userId),
            eq(propertyAssignments.isActive, true),
            eq(propertyAssignments.canAddNotes, true)
          ))
          .limit(1);
        hasAccess = !!assignment;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: "Accès non autorisé à cette propriété" });
      }

      const [newNote] = await database.insert(cleaningNotes).values({
        propertyId,
        cleaningTaskId: cleaningTaskId || null,
        authorId: userId,
        noteType: noteType || "observation",
        priority: priority || "normal",
        title,
        description: description || null,
        photos: photos || [],
        status: "open",
      }).returning();

      // Notifier l'hôte
      const [property] = await database.select().from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);
      
      if (property?.userId) {
        await database.insert(notifications).values({
          userId: property.userId,
          type: "in_app",
          category: priority === "urgent" ? "urgent" : "daily_summary",
          subject: `📝 Nouvelle note de ménage - ${property.name}`,
          content: `${user.firstName || "Agent"} a ajouté une note: ${title}`,
          metadata: {
            propertyId,
            cleaningNoteId: newNote.id,
            noteType,
            priority,
          },
        });
      }

      res.status(201).json(newNote);
    } catch (error: any) {
      console.error("Error creating cleaning note:", error);
      res.status(400).json({ error: error.message || "Failed to create cleaning note" });
    }
  });

  /**
   * PATCH /api/cleaning/notes/:id - Mettre à jour une note
   */
  app.patch("/api/cleaning/notes/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { status, resolutionNotes } = req.body;
      const database = ensureDb();

      // Récupérer la note
      const [note] = await database.select().from(cleaningNotes)
        .where(eq(cleaningNotes.id, id))
        .limit(1);
      
      if (!note) {
        return res.status(404).json({ error: "Note non trouvée" });
      }

      // Récupérer l'utilisateur
      const [user] = await database.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // Seuls l'hôte de la propriété ou l'auteur peuvent modifier
      let canEdit = false;
      if (user?.role === "host") {
        const [property] = await database.select().from(properties)
          .where(and(eq(properties.id, note.propertyId), eq(properties.userId, userId)))
          .limit(1);
        canEdit = !!property;
      } else if (note.authorId === userId) {
        canEdit = true;
      }

      if (!canEdit) {
        return res.status(403).json({ error: "Non autorisé à modifier cette note" });
      }

      const updateData: any = { updatedAt: new Date() };
      
      if (status) {
        updateData.status = status;
        if (status === "resolved" || status === "closed") {
          updateData.resolvedAt = new Date();
          updateData.resolvedBy = userId;
        }
      }
      
      if (resolutionNotes !== undefined) {
        updateData.resolutionNotes = resolutionNotes;
      }

      const [updated] = await database.update(cleaningNotes)
        .set(updateData)
        .where(eq(cleaningNotes.id, id))
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating cleaning note:", error);
      res.status(400).json({ error: error.message || "Failed to update cleaning note" });
    }
  });

  /**
   * GET /api/cleaning/notes/unread-count - Nombre de notes non lues (pour l'hôte)
   */
  app.get("/api/cleaning/notes/unread-count", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const database = ensureDb();

      // Récupérer les propriétés de l'hôte
      const userProperties = await database.select().from(properties)
        .where(eq(properties.userId, userId));
      const propertyIds = userProperties.map(p => p.id);

      if (propertyIds.length === 0) {
        return res.json({ count: 0 });
      }

      const unreadNotes = await database.select().from(cleaningNotes)
        .where(and(
          sql`${cleaningNotes.propertyId} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`,
          sql`${cleaningNotes.hostReadAt} IS NULL`,
          eq(cleaningNotes.isVisibleToHost, true)
        ));

      res.json({ count: unreadNotes.length });
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: error.message || "Failed to fetch unread count" });
    }
  });

  // ========================================
  // PORTAIL CLEANING AGENT (Authentifié)
  // ========================================

  /**
   * GET /api/cleaning/my-properties - Propriétés assignées au cleaner connecté
   */
  app.get("/api/cleaning/my-properties", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const database = ensureDb();

      // Vérifier que c'est un cleaning agent
      const [user] = await database.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user || user.role !== "cleaning_agent") {
        return res.status(403).json({ error: "Accès réservé aux agents de ménage" });
      }

      // Récupérer les propriétés assignées
      const assignments = await database.select({
        assignment: propertyAssignments,
        property: properties,
      }).from(propertyAssignments)
        .leftJoin(properties, eq(properties.id, propertyAssignments.propertyId))
        .where(and(
          eq(propertyAssignments.cleanerUserId, userId),
          eq(propertyAssignments.isActive, true)
        ));

      res.json(assignments.map(a => ({
        ...a.property,
        permissions: {
          canViewCalendar: a.assignment.canViewCalendar,
          canAddNotes: a.assignment.canAddNotes,
          canManageTasks: a.assignment.canManageTasks,
        },
      })));
    } catch (error: any) {
      console.error("Error fetching my properties:", error);
      res.status(500).json({ error: error.message || "Failed to fetch properties" });
    }
  });

  /**
   * GET /api/cleaning/my-tasks - Tâches du cleaner connecté
   */
  app.get("/api/cleaning/my-tasks", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { startDate, endDate, status } = req.query;
      const database = ensureDb();

      // Vérifier que c'est un cleaning agent
      const [user] = await database.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user || user.role !== "cleaning_agent") {
        return res.status(403).json({ error: "Accès réservé aux agents de ménage" });
      }

      // Récupérer les propriétés assignées
      const assignments = await database.select().from(propertyAssignments)
        .where(and(
          eq(propertyAssignments.cleanerUserId, userId),
          eq(propertyAssignments.isActive, true)
        ));
      const propertyIds = assignments.map(a => a.propertyId);

      if (propertyIds.length === 0) {
        return res.json([]);
      }

      const conditions: any[] = [
        sql`${cleaningTasks.propertyId} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`
      ];

      if (startDate) {
        conditions.push(gte(cleaningTasks.scheduledDate, new Date(startDate as string)));
      }
      if (endDate) {
        conditions.push(lte(cleaningTasks.scheduledDate, new Date(endDate as string)));
      }
      if (status) {
        conditions.push(eq(cleaningTasks.status, status as string));
      }

      const tasks = await database.select({
        task: cleaningTasks,
        property: {
          id: properties.id,
          name: properties.name,
          address: properties.address,
        },
      }).from(cleaningTasks)
        .leftJoin(properties, eq(properties.id, cleaningTasks.propertyId))
        .where(and(...conditions))
        .orderBy(cleaningTasks.scheduledDate);

      res.json(tasks.map(t => ({
        ...t.task,
        property: t.property,
      })));
    } catch (error: any) {
      console.error("Error fetching my tasks:", error);
      res.status(500).json({ error: error.message || "Failed to fetch tasks" });
    }
  });

  /**
   * GET /api/cleaning/my-calendar - Calendrier du cleaner (réservations + tâches)
   */
  app.get("/api/cleaning/my-calendar", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { month } = req.query;
      const database = ensureDb();

      // Vérifier que c'est un cleaning agent
      const [user] = await database.select().from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user || user.role !== "cleaning_agent") {
        return res.status(403).json({ error: "Accès réservé aux agents de ménage" });
      }

      // Récupérer les propriétés assignées
      const assignments = await database.select().from(propertyAssignments)
        .where(and(
          eq(propertyAssignments.cleanerUserId, userId),
          eq(propertyAssignments.isActive, true),
          eq(propertyAssignments.canViewCalendar, true)
        ));
      const propertyIds = assignments.map(a => a.propertyId);

      if (propertyIds.length === 0) {
        return res.json({ bookings: [], tasks: [], properties: [] });
      }

      // Définir la plage de dates
      const targetDate = month ? new Date(`${month}-01`) : new Date();
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

      // Récupérer les réservations
      const bookingsData = await database.select({
        booking: bookings,
        property: {
          id: properties.id,
          name: properties.name,
        },
      }).from(bookings)
        .leftJoin(properties, eq(properties.id, bookings.propertyId))
        .where(and(
          sql`${bookings.propertyId} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`,
          gte(bookings.checkOutDate, startOfMonth),
          lte(bookings.checkInDate, endOfMonth)
        ));

      // Récupérer les tâches
      const tasksData = await database.select({
        task: cleaningTasks,
        property: {
          id: properties.id,
          name: properties.name,
        },
      }).from(cleaningTasks)
        .leftJoin(properties, eq(properties.id, cleaningTasks.propertyId))
        .where(and(
          sql`${cleaningTasks.propertyId} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`,
          gte(cleaningTasks.scheduledDate, startOfMonth),
          lte(cleaningTasks.scheduledDate, endOfMonth)
        ));

      // Récupérer les propriétés
      const propertiesData = await database.select().from(properties)
        .where(sql`${properties.id} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`);

      res.json({
        bookings: bookingsData.map(b => ({
          ...b.booking,
          property: b.property,
        })),
        tasks: tasksData.map(t => ({
          ...t.task,
          property: t.property,
        })),
        properties: propertiesData,
      });
    } catch (error: any) {
      console.error("Error fetching my calendar:", error);
      res.status(500).json({ error: error.message || "Failed to fetch calendar" });
    }
  });

  // ========================================
  // CALENDRIER PARTAGÉ - HÔTE & AGENT
  // ========================================

  /**
   * GET /api/calendar/host/:propertyId
   * Calendrier complet pour l'hôte (réservations + nettoyages + blocages + indispos agents)
   */
  app.get("/api/calendar/host/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const database = ensureDb();
      const { propertyId } = req.params;
      const { month } = req.query;
      const userId = req.user.id;

      // Vérifier propriété
      const [property] = await database.select().from(properties)
        .where(and(eq(properties.id, propertyId), eq(properties.userId, userId)));

      if (!property) {
        return res.status(404).json({ error: "Property not found or access denied" });
      }

      // Plage de dates
      const targetDate = month ? new Date(`${month}-01`) : new Date();
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 2, 0);

      // 1. Réservations
      const bookingsData = await database.select().from(bookings)
        .where(and(
          eq(bookings.propertyId, propertyId),
          gte(bookings.checkOutDate, startOfMonth),
          lte(bookings.checkInDate, endOfMonth)
        ));

      // 2. Tâches de nettoyage
      const tasksData = await database.select().from(cleaningTasks)
        .where(and(
          eq(cleaningTasks.propertyId, propertyId),
          gte(cleaningTasks.scheduledDate, startOfMonth),
          lte(cleaningTasks.scheduledDate, endOfMonth)
        ));

      // 3. Périodes bloquées par l'hôte
      const blockedData = await database.select().from(blockedPeriods)
        .where(and(
          eq(blockedPeriods.propertyId, propertyId),
          gte(blockedPeriods.endDate, startOfMonth),
          lte(blockedPeriods.startDate, endOfMonth)
        ));

      // 4. Indisponibilités des agents assignés à cette propriété
      const assignments = await database.select().from(propertyAssignments)
        .where(and(
          eq(propertyAssignments.propertyId, propertyId),
          eq(propertyAssignments.isActive, true)
        ));
      
      const cleanerIds = assignments.map(a => a.cleanerUserId);
      let unavailabilityData: any[] = [];
      
      if (cleanerIds.length > 0) {
        unavailabilityData = await database.select({
          unavailability: cleanerUnavailability,
          cleaner: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          }
        }).from(cleanerUnavailability)
          .leftJoin(users, eq(users.id, cleanerUnavailability.cleanerUserId))
          .where(and(
            sql`${cleanerUnavailability.cleanerUserId} IN (${sql.raw(cleanerIds.map(id => `'${id}'`).join(','))})`,
            gte(cleanerUnavailability.endDate, startOfMonth),
            lte(cleanerUnavailability.startDate, endOfMonth)
          ));
      }

      // Formater les événements pour le calendrier
      const events = [
        // Réservations
        ...bookingsData.map(b => ({
          id: b.id,
          type: "booking" as const,
          title: b.guestName || "Réservation",
          startDate: b.checkInDate,
          endDate: b.checkOutDate,
          guestName: b.guestName,
          propertyId: b.propertyId,
          status: b.status,
        })),
        // Nettoyages
        ...tasksData.map(t => ({
          id: t.id,
          type: "cleaning" as const,
          title: "Nettoyage",
          startDate: t.scheduledDate,
          endDate: t.scheduledDate,
          status: t.status,
          propertyId: t.propertyId,
          priority: t.priority,
        })),
        // Périodes bloquées
        ...blockedData.map(b => ({
          id: b.id,
          type: "blocked" as const,
          title: b.reason || "Bloqué",
          startDate: b.startDate,
          endDate: b.endDate,
          reason: b.reason,
          propertyId: b.propertyId,
        })),
        // Indisponibilités agents (vue anonymisée pour l'hôte)
        ...unavailabilityData.map(u => ({
          id: u.unavailability.id,
          type: "unavailable" as const,
          title: `${u.cleaner?.firstName || 'Agent'} - ${u.unavailability.publicLabel || 'Indisponible'}`,
          startDate: u.unavailability.startDate,
          endDate: u.unavailability.endDate,
          cleanerId: u.unavailability.cleanerUserId,
        })),
      ];

      res.json({
        property,
        events,
        month: targetDate.toISOString().slice(0, 7),
      });
    } catch (error: any) {
      console.error("Error fetching host calendar:", error);
      res.status(500).json({ error: error.message || "Failed to fetch calendar" });
    }
  });

  /**
   * GET /api/calendar/agent
   * Calendrier pour l'agent (nettoyages + ses indisponibilités)
   */
  app.get("/api/calendar/agent", isAuthenticated, async (req: any, res) => {
    try {
      const database = ensureDb();
      const userId = req.user.id;
      const { month } = req.query;

      // Vérifier que c'est un agent
      const [user] = await database.select().from(users).where(eq(users.id, userId));
      if (!user || user.role !== "cleaning_agent") {
        return res.status(403).json({ error: "Access denied - cleaning agents only" });
      }

      // Plage de dates
      const targetDate = month ? new Date(`${month}-01`) : new Date();
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 2, 0);

      // Propriétés assignées
      const assignments = await database.select().from(propertyAssignments)
        .where(and(
          eq(propertyAssignments.cleanerUserId, userId),
          eq(propertyAssignments.isActive, true)
        ));
      
      const propertyIds = assignments.map(a => a.propertyId);

      // 1. Tâches de nettoyage pour les propriétés assignées
      let tasksData: any[] = [];
      if (propertyIds.length > 0) {
        tasksData = await database.select({
          task: cleaningTasks,
          property: {
            id: properties.id,
            name: properties.name,
            address: properties.address,
          }
        }).from(cleaningTasks)
          .leftJoin(properties, eq(properties.id, cleaningTasks.propertyId))
          .where(and(
            sql`${cleaningTasks.propertyId} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`,
            gte(cleaningTasks.scheduledDate, startOfMonth),
            lte(cleaningTasks.scheduledDate, endOfMonth)
          ));
      }

      // 2. Mes indisponibilités
      const myUnavailability = await database.select().from(cleanerUnavailability)
        .where(and(
          eq(cleanerUnavailability.cleanerUserId, userId),
          gte(cleanerUnavailability.endDate, startOfMonth),
          lte(cleanerUnavailability.startDate, endOfMonth)
        ));

      // 3. Propriétés
      let propertiesData: any[] = [];
      if (propertyIds.length > 0) {
        propertiesData = await database.select({
          id: properties.id,
          name: properties.name,
          address: properties.address,
          checkInTime: properties.checkInTime,
          checkOutTime: properties.checkOutTime,
        }).from(properties)
          .where(sql`${properties.id} IN (${sql.raw(propertyIds.map(id => `'${id}'`).join(','))})`);
      }

      // Formater les événements
      const events = [
        // Nettoyages
        ...tasksData.map(t => ({
          id: t.task.id,
          type: "cleaning" as const,
          title: `Nettoyage - ${t.property?.name || 'Logement'}`,
          startDate: t.task.scheduledDate,
          endDate: t.task.scheduledDate,
          status: t.task.status,
          propertyId: t.task.propertyId,
          propertyName: t.property?.name,
          priority: t.task.priority,
          scheduledStartTime: t.task.scheduledStartTime,
          scheduledEndTime: t.task.scheduledEndTime,
        })),
        // Mes indisponibilités
        ...myUnavailability.map(u => ({
          id: u.id,
          type: "unavailable" as const,
          title: u.reason || u.publicLabel || "Indisponible",
          startDate: u.startDate,
          endDate: u.endDate,
          reason: u.reason,
          unavailabilityType: u.unavailabilityType,
        })),
      ];

      res.json({
        events,
        properties: propertiesData,
        month: targetDate.toISOString().slice(0, 7),
      });
    } catch (error: any) {
      console.error("Error fetching agent calendar:", error);
      res.status(500).json({ error: error.message || "Failed to fetch calendar" });
    }
  });

  /**
   * POST /api/calendar/block-period
   * Bloquer une période (hôte uniquement)
   */
  app.post("/api/calendar/block-period", isAuthenticated, async (req: any, res) => {
    try {
      const database = ensureDb();
      const userId = req.user.id;
      const { propertyId, startDate, endDate, reason, blockType } = req.body;

      // Vérifier propriété
      const [property] = await database.select().from(properties)
        .where(and(eq(properties.id, propertyId), eq(properties.userId, userId)));

      if (!property) {
        return res.status(404).json({ error: "Property not found or access denied" });
      }

      // Créer la période bloquée
      const [blocked] = await database.insert(blockedPeriods).values({
        propertyId,
        hostId: userId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null,
        blockType: blockType || "personal",
        isVisibleToCleaners: true,
      }).returning();

      res.status(201).json(blocked);
    } catch (error: any) {
      console.error("Error blocking period:", error);
      res.status(500).json({ error: error.message || "Failed to block period" });
    }
  });

  /**
   * DELETE /api/calendar/block-period/:id
   * Supprimer une période bloquée
   */
  app.delete("/api/calendar/block-period/:id", isAuthenticated, async (req: any, res) => {
    try {
      const database = ensureDb();
      const userId = req.user.id;
      const { id } = req.params;

      // Vérifier que l'utilisateur est le propriétaire
      const [blocked] = await database.select().from(blockedPeriods)
        .where(eq(blockedPeriods.id, id));

      if (!blocked || blocked.hostId !== userId) {
        return res.status(404).json({ error: "Blocked period not found or access denied" });
      }

      await database.delete(blockedPeriods).where(eq(blockedPeriods.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting blocked period:", error);
      res.status(500).json({ error: error.message || "Failed to delete blocked period" });
    }
  });

  /**
   * POST /api/calendar/unavailability
   * Ajouter une indisponibilité (agent de ménage)
   */
  app.post("/api/calendar/unavailability", isAuthenticated, async (req: any, res) => {
    try {
      const database = ensureDb();
      const userId = req.user.id;
      const { startDate, endDate, reason, unavailabilityType, publicLabel } = req.body;

      // Vérifier que c'est un agent
      const [user] = await database.select().from(users).where(eq(users.id, userId));
      if (!user || user.role !== "cleaning_agent") {
        return res.status(403).json({ error: "Access denied - cleaning agents only" });
      }

      // Créer l'indisponibilité
      const [unavailability] = await database.insert(cleanerUnavailability).values({
        cleanerUserId: userId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null,
        unavailabilityType: unavailabilityType || "personal",
        publicLabel: publicLabel || "Indisponible",
      }).returning();

      res.status(201).json(unavailability);
    } catch (error: any) {
      console.error("Error adding unavailability:", error);
      res.status(500).json({ error: error.message || "Failed to add unavailability" });
    }
  });

  /**
   * GET /api/calendar/my-unavailability
   * Récupérer mes indisponibilités (agent)
   */
  app.get("/api/calendar/my-unavailability", isAuthenticated, async (req: any, res) => {
    try {
      const database = ensureDb();
      const userId = req.user.id;

      const unavailabilities = await database.select().from(cleanerUnavailability)
        .where(eq(cleanerUnavailability.cleanerUserId, userId))
        .orderBy(desc(cleanerUnavailability.startDate));

      res.json(unavailabilities);
    } catch (error: any) {
      console.error("Error fetching unavailability:", error);
      res.status(500).json({ error: error.message || "Failed to fetch unavailability" });
    }
  });

  /**
   * DELETE /api/calendar/unavailability/:id
   * Supprimer une indisponibilité
   */
  app.delete("/api/calendar/unavailability/:id", isAuthenticated, async (req: any, res) => {
    try {
      const database = ensureDb();
      const userId = req.user.id;
      const { id } = req.params;

      // Vérifier que c'est bien l'indisponibilité de cet agent
      const [unavailability] = await database.select().from(cleanerUnavailability)
        .where(eq(cleanerUnavailability.id, id));

      if (!unavailability || unavailability.cleanerUserId !== userId) {
        return res.status(404).json({ error: "Unavailability not found or access denied" });
      }

      await database.delete(cleanerUnavailability).where(eq(cleanerUnavailability.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting unavailability:", error);
      res.status(500).json({ error: error.message || "Failed to delete unavailability" });
    }
  });

  /**
   * POST /api/cleaning/mark-needs-cleaning
   * Marquer une date comme "nettoyage nécessaire" après un checkout
   */
  app.post("/api/cleaning/mark-needs-cleaning", isAuthenticated, async (req: any, res) => {
    try {
      const database = ensureDb();
      const userId = req.user.id;
      const { propertyId, date, bookingId, notes, priority } = req.body;

      // Vérifier propriété
      const [property] = await database.select().from(properties)
        .where(and(eq(properties.id, propertyId), eq(properties.userId, userId)));

      if (!property) {
        return res.status(404).json({ error: "Property not found or access denied" });
      }

      // Créer la tâche de nettoyage
      const [task] = await database.insert(cleaningTasks).values({
        propertyId,
        bookingId: bookingId || null,
        scheduledDate: new Date(date),
        scheduledStartTime: property.checkOutTime || "11:00",
        scheduledEndTime: property.checkInTime || "15:00",
        status: "pending",
        priority: priority || "normal",
        notes: notes || null,
      }).returning();

      res.status(201).json(task);
    } catch (error: any) {
      console.error("Error marking needs cleaning:", error);
      res.status(500).json({ error: error.message || "Failed to create cleaning task" });
    }
  });
}

