/**
 * Dashboard pour les Agents de Ménage
 * Accessible après connexion avec un compte cleaning_agent
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Calendar,
  Home,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Plus,
  Play,
  Check,
  MapPin,
  Phone,
  Loader2,
  MessageSquare,
  Camera,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow, addDays, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";

interface CleaningTask {
  id: string;
  propertyId: string;
  bookingId: string | null;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: string;
  priority: string;
  hasSpecialRequest: boolean;
  notes: string | null;
  property: {
    id: string;
    name: string;
    address: string;
  };
}

interface PropertyAssignment {
  id: string;
  name: string;
  address: string;
  permissions: {
    canViewCalendar: boolean;
    canAddNotes: boolean;
    canManageTasks: boolean;
  };
}

interface CleaningNote {
  id: string;
  propertyId: string;
  noteType: string;
  priority: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  property: { id: string; name: string };
  author: { id: string; firstName: string; lastName: string };
}

export default function CleaningAgentDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("tasks");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedPropertyForNote, setSelectedPropertyForNote] = useState("");
  const [noteForm, setNoteForm] = useState({
    title: "",
    description: "",
    noteType: "observation",
    priority: "normal",
  });

  // Récupérer les propriétés assignées
  const { data: properties, isLoading: loadingProperties } = useQuery<PropertyAssignment[]>({
    queryKey: ["/api/cleaning/my-properties"],
  });

  // Récupérer les tâches
  const { data: tasks, isLoading: loadingTasks } = useQuery<CleaningTask[]>({
    queryKey: ["/api/cleaning/my-tasks"],
  });

  // Récupérer le calendrier du mois
  const { data: calendarData } = useQuery({
    queryKey: ["/api/cleaning/my-calendar", selectedMonth],
  });

  // Récupérer les notes
  const { data: notes } = useQuery<CleaningNote[]>({
    queryKey: ["/api/cleaning/notes"],
  });

  // Démarrer une tâche
  const startTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("POST", `/api/cleaning/tasks/${taskId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/my-tasks"] });
      toast({ title: "Tâche démarrée !" });
    },
  });

  // Terminer une tâche
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("POST", `/api/cleaning/tasks/${taskId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/my-tasks"] });
      toast({ title: "Tâche terminée !" });
    },
  });

  // Créer une note
  const createNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/cleaning/notes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/notes"] });
      setIsNoteDialogOpen(false);
      setNoteForm({ title: "", description: "", noteType: "observation", priority: "normal" });
      toast({ title: "Note créée avec succès !" });
    },
  });

  // Filtrer les tâches par statut
  const todayTasks = tasks?.filter(t => isToday(new Date(t.scheduledDate))) || [];
  const tomorrowTasks = tasks?.filter(t => isTomorrow(new Date(t.scheduledDate))) || [];
  const upcomingTasks = tasks?.filter(t => {
    const date = new Date(t.scheduledDate);
    return date > addDays(new Date(), 1);
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "pending": return "bg-amber-500";
      case "cancelled": return "bg-gray-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Terminé";
      case "in_progress": return "En cours";
      case "pending": return "À faire";
      case "cancelled": return "Annulé";
      default: return status;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent": return <Badge variant="destructive">Urgent</Badge>;
      case "high": return <Badge className="bg-orange-500">Prioritaire</Badge>;
      default: return null;
    }
  };

  if (loadingProperties || loadingTasks) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Tableau de bord Ménage</h1>
              <p className="text-sm text-muted-foreground">
                Bienvenue, {user?.firstName || "Agent"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {properties?.length || 0} logements assignés
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="tasks" className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Tâches</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendrier</span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-1">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Logements</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
          </TabsList>

          {/* Onglet Tâches */}
          <TabsContent value="tasks">
            <div className="space-y-6">
              {/* Tâches du jour */}
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Aujourd'hui
                  {todayTasks.length > 0 && (
                    <Badge variant="secondary">{todayTasks.length}</Badge>
                  )}
                </h2>
                {todayTasks.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune tâche aujourd'hui</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {todayTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStart={() => startTaskMutation.mutate(task.id)}
                        onComplete={() => completeTaskMutation.mutate(task.id)}
                        isStarting={startTaskMutation.isPending}
                        isCompleting={completeTaskMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Tâches de demain */}
              {tomorrowTasks.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-muted-foreground" />
                    Demain
                    <Badge variant="outline">{tomorrowTasks.length}</Badge>
                  </h2>
                  <div className="space-y-3">
                    {tomorrowTasks.map((task) => (
                      <TaskCard key={task.id} task={task} preview />
                    ))}
                  </div>
                </div>
              )}

              {/* Tâches à venir */}
              {upcomingTasks.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    À venir
                    <Badge variant="outline">{upcomingTasks.length}</Badge>
                  </h2>
                  <div className="space-y-3">
                    {upcomingTasks.slice(0, 5).map((task) => (
                      <TaskCard key={task.id} task={task} preview />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Onglet Calendrier */}
          <TabsContent value="calendar">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Calendrier</h2>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-auto"
                />
              </div>
              
              <div className="space-y-4">
                {calendarData?.bookings?.map((booking: any) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{booking.property?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(booking.checkInDate), "dd MMM", { locale: fr })} → {format(new Date(booking.checkOutDate), "dd MMM", { locale: fr })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.guestName || "Invité"}
                      </p>
                    </div>
                    <Badge variant="secondary">Réservation</Badge>
                  </div>
                ))}
                
                {calendarData?.tasks?.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg border-l-4 border-primary"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{task.property?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(task.scheduledDate), "dd MMMM", { locale: fr })}
                      </p>
                      <p className="text-xs">
                        {task.scheduledStartTime} - {task.scheduledEndTime}
                      </p>
                    </div>
                    <Badge className={getStatusColor(task.status)}>
                      {getStatusLabel(task.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Onglet Logements */}
          <TabsContent value="properties">
            <div className="space-y-4">
              {properties?.map((property) => (
                <Card key={property.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Home className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{property.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {property.address}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {property.permissions.canViewCalendar && (
                          <Badge variant="outline" className="text-xs">📅 Calendrier</Badge>
                        )}
                        {property.permissions.canAddNotes && (
                          <Badge variant="outline" className="text-xs">📝 Notes</Badge>
                        )}
                        {property.permissions.canManageTasks && (
                          <Badge variant="outline" className="text-xs">✅ Tâches</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPropertyForNote(property.id);
                        setIsNoteDialogOpen(true);
                      }}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Onglet Notes */}
          <TabsContent value="notes">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Mes notes</h2>
                <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Nouvelle note
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une note</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select
                        value={selectedPropertyForNote}
                        onValueChange={setSelectedPropertyForNote}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un logement" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties?.filter(p => p.permissions.canAddNotes).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={noteForm.noteType}
                        onValueChange={(v) => setNoteForm({ ...noteForm, noteType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="observation">💡 Observation</SelectItem>
                          <SelectItem value="problem">⚠️ Problème</SelectItem>
                          <SelectItem value="repair_needed">🔧 Réparation</SelectItem>
                          <SelectItem value="missing_item">📦 Objet manquant</SelectItem>
                          <SelectItem value="damage">💥 Dégât</SelectItem>
                          <SelectItem value="suggestion">💭 Suggestion</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={noteForm.priority}
                        onValueChange={(v) => setNoteForm({ ...noteForm, priority: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">🟢 Faible</SelectItem>
                          <SelectItem value="normal">🟡 Normal</SelectItem>
                          <SelectItem value="high">🟠 Prioritaire</SelectItem>
                          <SelectItem value="urgent">🔴 Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Input
                        placeholder="Titre de la note"
                        value={noteForm.title}
                        onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                      />
                      
                      <Textarea
                        placeholder="Description détaillée..."
                        value={noteForm.description}
                        onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
                        rows={4}
                      />
                      
                      <Button
                        onClick={() => createNoteMutation.mutate({
                          propertyId: selectedPropertyForNote,
                          ...noteForm,
                        })}
                        disabled={!selectedPropertyForNote || !noteForm.title || createNoteMutation.isPending}
                        className="w-full"
                      >
                        {createNoteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <FileText className="w-4 h-4 mr-2" />
                        )}
                        Créer la note
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {notes?.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucune note pour le moment</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {notes?.map((note) => (
                    <Card key={note.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                          note.noteType === "problem" ? "bg-amber-500" :
                          note.noteType === "damage" ? "bg-red-500" :
                          note.noteType === "repair_needed" ? "bg-orange-500" :
                          "bg-blue-500"
                        )}>
                          {note.noteType === "problem" ? "⚠️" :
                           note.noteType === "damage" ? "💥" :
                           note.noteType === "repair_needed" ? "🔧" :
                           note.noteType === "missing_item" ? "📦" :
                           "💡"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{note.title}</h4>
                            {getPriorityBadge(note.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {note.property?.name}
                          </p>
                          {note.description && (
                            <p className="text-sm">{note.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {note.status === "open" ? "🔵 Ouvert" :
                               note.status === "resolved" ? "✅ Résolu" : note.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(note.createdAt), "dd/MM/yyyy HH:mm")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Composant TaskCard
function TaskCard({
  task,
  onStart,
  onComplete,
  isStarting,
  isCompleting,
  preview = false,
}: {
  task: CleaningTask;
  onStart?: () => void;
  onComplete?: () => void;
  isStarting?: boolean;
  isCompleting?: boolean;
  preview?: boolean;
}) {
  return (
    <Card className={cn(
      "p-4 hover:shadow-lg transition-all",
      task.hasSpecialRequest && "border-l-4 border-l-amber-500",
      task.status === "completed" && "opacity-60"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0",
          task.status === "completed" ? "bg-green-500" :
          task.status === "in_progress" ? "bg-blue-500" :
          task.priority === "urgent" ? "bg-red-500" :
          task.priority === "high" ? "bg-orange-500" :
          "bg-primary"
        )}>
          {task.status === "completed" ? (
            <Check className="w-6 h-6" />
          ) : task.status === "in_progress" ? (
            <Play className="w-6 h-6" />
          ) : (
            <Home className="w-6 h-6" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{task.property?.name}</h3>
            {task.hasSpecialRequest && (
              <Badge variant="destructive" className="text-xs">
                ⚡ Demande spéciale
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {task.property?.address}
          </p>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {task.scheduledStartTime} - {task.scheduledEndTime}
            </span>
            {!preview && (
              <Badge variant="outline" className={cn(
                "text-xs",
                task.status === "completed" && "bg-green-100 text-green-700",
                task.status === "in_progress" && "bg-blue-100 text-blue-700"
              )}>
                {task.status === "completed" ? "✓ Terminé" :
                 task.status === "in_progress" ? "▶ En cours" :
                 "○ À faire"}
              </Badge>
            )}
          </div>
          {task.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              📝 {task.notes}
            </p>
          )}
        </div>

        {!preview && task.status !== "completed" && (
          <div className="flex flex-col gap-2">
            {task.status === "pending" && onStart && (
              <Button
                size="sm"
                onClick={onStart}
                disabled={isStarting}
              >
                {isStarting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1" />
                    Démarrer
                  </>
                )}
              </Button>
            )}
            {task.status === "in_progress" && onComplete && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onComplete}
                disabled={isCompleting}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {isCompleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Terminer
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {preview && (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
    </Card>
  );
}

