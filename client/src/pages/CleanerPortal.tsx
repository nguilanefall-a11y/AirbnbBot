/**
 * Portail Personnel de Ménage
 * 
 * Interface accessible via un lien unique : /cleaner/{accessToken}
 * 
 * Fonctionnalités :
 * - Voir le calendrier des tâches de ménage
 * - Accepter/Refuser les demandes spéciales (Early Check-in / Late Check-out)
 * - Démarrer/Terminer les tâches
 * - Voir les check-in/check-out synchronisés via iCal
 */

import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Square,
  Home,
  User,
  Phone,
  Loader2,
  ChevronRight,
  Sparkles,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

// Types
interface CleaningTask {
  id: string;
  propertyId: string;
  bookingId: string | null;
  scheduledDate: string;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  status: string;
  priority: string;
  checklistItems: string[] | null;
  checklistCompleted: string[] | null;
  notes: string | null;
  hasSpecialRequest: boolean;
  specialRequestId: string | null;
  property: {
    name: string;
    address: string | null;
  } | null;
  specialRequest: {
    type: string;
    requestedTime: string;
    status: string;
    guestMessage: string | null;
  } | null;
}

interface CleanerData {
  staff: {
    id: string;
    name: string;
  };
  tasks: CleaningTask[];
}

export default function CleanerPortal() {
  const { toast } = useToast();
  const [, params] = useRoute("/cleaner/:accessToken");
  const accessToken = params?.accessToken || "";
  
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [refuseReason, setRefuseReason] = useState("");
  const [isRefuseDialogOpen, setIsRefuseDialogOpen] = useState(false);

  // Récupérer les données du portail
  const { data: cleanerData, isLoading, error } = useQuery<CleanerData>({
    queryKey: ["/api/cleaning-portal", accessToken],
    enabled: !!accessToken,
  });

  // Mutations
  const startTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("POST", `/api/cleaning/tasks/${taskId}/start`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-portal", accessToken] });
      toast({ title: "Tâche démarrée", description: "Bon courage !" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de démarrer la tâche", variant: "destructive" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("POST", `/api/cleaning/tasks/${taskId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-portal", accessToken] });
      toast({ title: "Tâche terminée", description: "Excellent travail ! 🎉" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de terminer la tâche", variant: "destructive" });
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("POST", `/api/cleaning-portal/${accessToken}/tasks/${taskId}/accept-request`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-portal", accessToken] });
      toast({ title: "Demande acceptée", description: "Le voyageur a été notifié" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'accepter la demande", variant: "destructive" });
    },
  });

  const refuseRequestMutation = useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/cleaning-portal/${accessToken}/tasks/${taskId}/refuse-request`, {
        reason,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-portal", accessToken] });
      setIsRefuseDialogOpen(false);
      setRefuseReason("");
      toast({ title: "Demande refusée", description: "Le voyageur a été notifié" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de refuser la demande", variant: "destructive" });
    },
  });

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-lg">Chargement du planning...</p>
        </motion.div>
      </div>
    );
  }

  // Error
  if (error || !cleanerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-destructive/5 p-4">
        <Card className="p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Accès refusé</h2>
          <p className="text-muted-foreground">
            Ce lien n'est pas valide ou a expiré. Veuillez contacter votre responsable.
          </p>
        </Card>
      </div>
    );
  }

  const { staff, tasks } = cleanerData;

  // Grouper les tâches par date
  const tasksByDate = tasks.reduce((acc, task) => {
    const date = new Date(task.scheduledDate).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {} as Record<string, CleaningTask[]>);

  // Helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">À faire</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500">En cours</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Terminé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string, hasSpecialRequest: boolean) => {
    if (hasSpecialRequest) {
      return (
        <Badge variant="destructive" className="animate-pulse">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Urgent
        </Badge>
      );
    }
    if (priority === "high") {
      return <Badge className="bg-orange-500">Prioritaire</Badge>;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold">Planning Ménage</h1>
              <p className="text-xs text-muted-foreground">Bonjour {staff.name} !</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {tasks.filter((t) => t.status === "pending").length}
            </p>
            <p className="text-xs text-muted-foreground">À faire</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">
              {tasks.filter((t) => t.status === "in_progress").length}
            </p>
            <p className="text-xs text-muted-foreground">En cours</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">
              {tasks.filter((t) => t.status === "completed").length}
            </p>
            <p className="text-xs text-muted-foreground">Terminé</p>
          </Card>
        </div>

        {/* Alertes demandes spéciales */}
        {tasks.some((t) => t.hasSpecialRequest && t.specialRequest?.status === "pending") && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-amber-500 animate-bounce" />
                <div>
                  <h3 className="font-semibold">Demandes en attente</h3>
                  <p className="text-sm text-muted-foreground">
                    Vous avez des demandes de voyageurs à traiter
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Liste des tâches par date */}
        {Object.keys(tasksByDate).length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Aucune tâche prévue</h3>
            <p className="text-muted-foreground">
              Votre planning est libre pour les 7 prochains jours
            </p>
          </Card>
        ) : (
          Object.entries(tasksByDate).map(([date, dateTasks]) => (
            <div key={date}>
              <h2 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {date}
              </h2>
              <div className="space-y-3">
                <AnimatePresence>
                  {dateTasks.map((task, idx) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Card
                        className={cn(
                          "p-4 transition-all",
                          task.hasSpecialRequest && "border-amber-500/50 bg-amber-500/5"
                        )}
                      >
                        {/* En-tête de la tâche */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{task.property?.name || "Propriété"}</h3>
                              {getStatusBadge(task.status)}
                              {getPriorityBadge(task.priority, task.hasSpecialRequest)}
                            </div>
                            {task.property?.address && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {task.property.address}
                              </p>
                            )}
                          </div>
                          {(task.scheduledStartTime || task.scheduledEndTime) && (
                            <div className="text-right">
                              <p className="text-sm font-medium flex items-center gap-1 justify-end">
                                <Clock className="w-3 h-3" />
                                {task.scheduledStartTime || "?"} - {task.scheduledEndTime || "?"}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Demande spéciale */}
                        {task.hasSpecialRequest && task.specialRequest && (
                          <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                              <span className="font-medium text-sm">
                                {task.specialRequest.type === "early_checkin"
                                  ? "Demande Early Check-in"
                                  : "Demande Late Check-out"}
                              </span>
                            </div>
                            <p className="text-sm">
                              Heure demandée : <strong>{task.specialRequest.requestedTime}</strong>
                            </p>
                            {task.specialRequest.guestMessage && (
                              <p className="text-sm text-muted-foreground mt-1">
                                "{task.specialRequest.guestMessage}"
                              </p>
                            )}

                            {/* Boutons d'action pour demande spéciale */}
                            {task.specialRequest.status === "pending" && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  className="flex-1 bg-green-500 hover:bg-green-600"
                                  onClick={() => acceptRequestMutation.mutate(task.id)}
                                  disabled={acceptRequestMutation.isPending}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Accepter
                                </Button>
                                <Dialog open={isRefuseDialogOpen && selectedTask?.id === task.id} onOpenChange={(open) => {
                                  setIsRefuseDialogOpen(open);
                                  if (open) setSelectedTask(task);
                                }}>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="flex-1 border-red-500 text-red-500">
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Refuser
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Refuser la demande</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Raison (optionnel)</Label>
                                        <Textarea
                                          placeholder="Ex: Planning trop serré entre deux ménages"
                                          value={refuseReason}
                                          onChange={(e) => setRefuseReason(e.target.value)}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <DialogClose asChild>
                                          <Button variant="outline" className="flex-1">
                                            Annuler
                                          </Button>
                                        </DialogClose>
                                        <Button
                                          variant="destructive"
                                          className="flex-1"
                                          onClick={() =>
                                            refuseRequestMutation.mutate({
                                              taskId: task.id,
                                              reason: refuseReason,
                                            })
                                          }
                                          disabled={refuseRequestMutation.isPending}
                                        >
                                          Confirmer le refus
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            )}

                            {task.specialRequest.status === "accepted" && (
                              <Badge className="mt-2 bg-green-500">✓ Accepté</Badge>
                            )}
                            {task.specialRequest.status === "refused" && (
                              <Badge className="mt-2" variant="destructive">
                                ✗ Refusé
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {task.notes && (
                          <p className="text-sm text-muted-foreground italic mb-3">📝 {task.notes}</p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {task.status === "pending" && (
                            <Button
                              className="flex-1"
                              onClick={() => startTaskMutation.mutate(task.id)}
                              disabled={startTaskMutation.isPending}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Commencer
                            </Button>
                          )}
                          {task.status === "in_progress" && (
                            <Button
                              className="flex-1 bg-green-500 hover:bg-green-600"
                              onClick={() => completeTaskMutation.mutate(task.id)}
                              disabled={completeTaskMutation.isPending}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Terminer
                            </Button>
                          )}
                          {task.status === "completed" && (
                            <div className="flex-1 text-center py-2 text-green-500 font-medium">
                              <CheckCircle2 className="w-5 h-5 inline mr-2" />
                              Terminé
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

