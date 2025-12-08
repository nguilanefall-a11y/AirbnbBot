/**
 * Dashboard Complet pour les Agents de Ménage
 * 
 * Interface moderne avec :
 * - Calendrier visuel des ménages
 * - Liste des tâches du jour
 * - Système de notes et signalements
 * - Accès aux propriétés assignées
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Home,
  User,
  Loader2,
  Plus,
  FileText,
  Wrench,
  Package,
  Camera,
  Send,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Bell,
  Check,
  AlertCircle,
  CalendarDays,
  ClipboardList,
  MessageSquare,
  Building,
  Timer,
  Zap,
} from "lucide-react";
import { format, isToday, isTomorrow, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

// Types
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
  property?: {
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
  property?: { id: string; name: string };
  author?: { id: string; firstName: string; lastName: string };
}

interface CalendarData {
  bookings: any[];
  tasks: CleaningTask[];
  properties: PropertyAssignment[];
}

// Composant Carte Tâche
function TaskCard({ 
  task, 
  onStart, 
  onComplete, 
  isLoading 
}: { 
  task: CleaningTask; 
  onStart?: () => void; 
  onComplete?: () => void; 
  isLoading?: boolean;
}) {
  const priorityColors: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    normal: "bg-blue-500",
    low: "bg-gray-400",
  };

  const statusIcons: Record<string, JSX.Element> = {
    pending: <Clock className="w-5 h-5" />,
    in_progress: <Play className="w-5 h-5" />,
    completed: <CheckCircle2 className="w-5 h-5" />,
    cancelled: <XCircle className="w-5 h-5" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-md transition-all",
        task.hasSpecialRequest && "border-l-4 border-l-amber-500",
        task.status === "completed" && "opacity-60"
      )}
    >
      {/* Barre de priorité */}
      <div className={cn("h-1 w-full", priorityColors[task.priority] || "bg-blue-500")} />
      
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Icône statut */}
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0",
            task.status === "completed" ? "bg-green-500" :
            task.status === "in_progress" ? "bg-blue-500" :
            priorityColors[task.priority] || "bg-primary"
          )}>
            {statusIcons[task.status] || <Home className="w-6 h-6" />}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Nom de la propriété */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{task.property?.name || "Propriété"}</h3>
              {task.hasSpecialRequest && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  ⚡ Demande spéciale
                </Badge>
              )}
            </div>
            
            {/* Adresse */}
            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{task.property?.address || "Adresse non disponible"}</span>
            </p>
            
            {/* Horaires */}
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                {task.scheduledStartTime} - {task.scheduledEndTime}
              </span>
              <Badge variant="outline" className={cn(
                "text-xs",
                task.status === "completed" && "bg-green-100 text-green-700 border-green-200",
                task.status === "in_progress" && "bg-blue-100 text-blue-700 border-blue-200",
                task.status === "pending" && "bg-amber-100 text-amber-700 border-amber-200"
              )}>
                {task.status === "completed" ? "✓ Terminé" :
                 task.status === "in_progress" ? "▶ En cours" :
                 task.status === "cancelled" ? "✗ Annulé" : "○ À faire"}
              </Badge>
            </div>
            
            {/* Notes */}
            {task.notes && (
              <p className="text-xs text-muted-foreground mt-2 italic bg-muted/50 rounded-lg p-2">
                📝 {task.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          {task.status !== "completed" && task.status !== "cancelled" && (
            <div className="flex flex-col gap-2">
              {task.status === "pending" && onStart && (
                <Button
                  size="sm"
                  onClick={onStart}
                  disabled={isLoading}
                  className="gap-1"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Démarrer
                </Button>
              )}
              {task.status === "in_progress" && onComplete && (
                <Button
                  size="sm"
                  onClick={onComplete}
                  disabled={isLoading}
                  className="gap-1 bg-green-500 hover:bg-green-600"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Terminer
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Composant Calendrier Visuel
function CleaningCalendar({ 
  tasks, 
  bookings,
  currentMonth, 
  onMonthChange 
}: { 
  tasks: CleaningTask[];
  bookings: any[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Pad with days from previous/next month for complete weeks
  const startDay = monthStart.getDay();
  const endDay = monthEnd.getDay();
  
  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      const taskDate = parseISO(task.scheduledDate);
      return isSameDay(taskDate, day);
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Calendrier</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* En-têtes des jours */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grille des jours */}
        <div className="grid grid-cols-7 gap-1">
          {/* Espaces vides pour aligner avec le premier jour */}
          {Array.from({ length: (startDay + 6) % 7 }).map((_, i) => (
            <div key={`empty-start-${i}`} className="aspect-square" />
          ))}
          
          {days.map((day) => {
            const dayTasks = getTasksForDay(day);
            const hasTask = dayTasks.length > 0;
            const hasPending = dayTasks.some(t => t.status === "pending");
            const hasUrgent = dayTasks.some(t => t.priority === "urgent" || t.hasSpecialRequest);
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "aspect-square p-1 rounded-lg border text-center relative cursor-pointer transition-all hover:bg-muted",
                  isToday(day) && "border-primary border-2",
                  hasTask && "bg-primary/5",
                  hasUrgent && "bg-red-50 border-red-200"
                )}
              >
                <span className={cn(
                  "text-sm",
                  isToday(day) && "font-bold text-primary"
                )}>
                  {format(day, "d")}
                </span>
                
                {/* Indicateurs de tâches */}
                {hasTask && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayTasks.slice(0, 3).map((task, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          task.status === "completed" ? "bg-green-500" :
                          task.hasSpecialRequest ? "bg-red-500 animate-pulse" :
                          task.priority === "urgent" ? "bg-orange-500" :
                          "bg-primary"
                        )}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[8px] text-muted-foreground ml-0.5">
                        +{dayTasks.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Légende */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Ménage prévu</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Terminé</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Urgent / Demande spéciale</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Page principale
export default function CleanerDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("today");
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

  // Récupérer le calendrier
  const { data: calendarData } = useQuery<CalendarData>({
    queryKey: ["/api/cleaning/my-calendar", format(currentMonth, "yyyy-MM")],
  });

  // Récupérer les notes
  const { data: notes } = useQuery<CleaningNote[]>({
    queryKey: ["/api/cleaning/notes"],
  });

  // Mutations
  const startTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("POST", `/api/cleaning/tasks/${taskId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/my-tasks"] });
      toast({ title: "✅ Tâche démarrée !" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de démarrer la tâche", variant: "destructive" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("POST", `/api/cleaning/tasks/${taskId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/my-tasks"] });
      toast({ title: "🎉 Tâche terminée !" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de terminer la tâche", variant: "destructive" });
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/cleaning/notes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/notes"] });
      setIsNoteDialogOpen(false);
      setNoteForm({ title: "", description: "", noteType: "observation", priority: "normal" });
      toast({ title: "📝 Note créée avec succès !" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer la note", variant: "destructive" });
    },
  });

  // Filtrer les tâches
  const todayTasks = useMemo(() => 
    tasks?.filter(t => isToday(parseISO(t.scheduledDate))) || [], 
    [tasks]
  );
  const tomorrowTasks = useMemo(() => 
    tasks?.filter(t => isTomorrow(parseISO(t.scheduledDate))) || [], 
    [tasks]
  );
  const upcomingTasks = useMemo(() => 
    tasks?.filter(t => {
      const date = parseISO(t.scheduledDate);
      return date > addDays(new Date(), 1);
    }) || [], 
    [tasks]
  );
  const openNotes = useMemo(() => 
    notes?.filter(n => n.status === "open") || [], 
    [notes]
  );

  // Statistiques
  const stats = useMemo(() => ({
    totalToday: todayTasks.length,
    completedToday: todayTasks.filter(t => t.status === "completed").length,
    pendingToday: todayTasks.filter(t => t.status === "pending").length,
    inProgress: todayTasks.filter(t => t.status === "in_progress").length,
    urgentTasks: tasks?.filter(t => t.priority === "urgent" || t.hasSpecialRequest).length || 0,
  }), [todayTasks, tasks]);

  if (loadingProperties || loadingTasks) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 to-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-emerald-500 animate-spin" />
          <p className="text-lg text-muted-foreground">Chargement de votre espace...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Espace Ménage</h1>
                <p className="text-xs text-muted-foreground">
                  Bienvenue, {user?.firstName || "Agent"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {stats.urgentTasks > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {stats.urgentTasks} urgent{stats.urgentTasks > 1 ? "s" : ""}
                </Badge>
              )}
              <Badge variant="secondary">
                <Building className="w-3 h-3 mr-1" />
                {properties?.length || 0} logement{(properties?.length || 0) > 1 ? "s" : ""}
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Statistiques rapides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Aujourd'hui</p>
                  <p className="text-2xl font-bold">{stats.totalToday}</p>
                </div>
                <CalendarDays className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Terminés</p>
                  <p className="text-2xl font-bold">{stats.completedToday}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">En cours</p>
                  <p className="text-2xl font-bold">{stats.inProgress}</p>
                </div>
                <Timer className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Urgents</p>
                  <p className="text-2xl font-bold">{stats.urgentTasks}</p>
                </div>
                <Zap className="w-8 h-8 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Onglets principaux */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="today" className="gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Aujourd'hui</span>
              {stats.pendingToday > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {stats.pendingToday}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendrier</span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="gap-2">
              <Building className="w-4 h-4" />
              <span className="hidden sm:inline">Logements</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Notes</span>
              {openNotes.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {openNotes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Onglet Aujourd'hui */}
          <TabsContent value="today" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Tâches du jour */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-500" />
                    Ménages du jour
                  </h2>
                </div>
                
                {todayTasks.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Aucun ménage prévu</h3>
                    <p className="text-muted-foreground">Profitez de votre journée ! 🌴</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {todayTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onStart={() => startTaskMutation.mutate(task.id)}
                          onComplete={() => completeTaskMutation.mutate(task.id)}
                          isLoading={startTaskMutation.isPending || completeTaskMutation.isPending}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Tâches de demain */}
                {tomorrowTasks.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium mb-3 flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="w-5 h-5" />
                      Demain ({tomorrowTasks.length})
                    </h3>
                    <div className="space-y-3 opacity-80">
                      {tomorrowTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Notes ouvertes */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Notes récentes</CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsNoteDialogOpen(true)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {openNotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune note ouverte
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {openNotes.slice(0, 3).map((note) => (
                          <div
                            key={note.id}
                            className={cn(
                              "p-3 rounded-lg border text-sm",
                              note.priority === "urgent" && "border-red-200 bg-red-50",
                              note.priority === "high" && "border-orange-200 bg-orange-50"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {note.noteType === "problem" ? "⚠️" :
                               note.noteType === "damage" ? "💥" :
                               note.noteType === "repair_needed" ? "🔧" : "💡"}
                              <span className="font-medium truncate">{note.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {note.property?.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Logements rapides */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Mes logements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {properties?.slice(0, 4).map((prop) => (
                        <div
                          key={prop.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedPropertyForNote(prop.id);
                            setIsNoteDialogOpen(true);
                          }}
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Home className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{prop.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{prop.address}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Onglet Calendrier */}
          <TabsContent value="calendar">
            <CleaningCalendar
              tasks={calendarData?.tasks || tasks || []}
              bookings={calendarData?.bookings || []}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
            />
          </TabsContent>

          {/* Onglet Logements */}
          <TabsContent value="properties">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties?.map((property) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="hover:shadow-lg transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                          <Home className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold mb-1">{property.name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{property.address}</span>
                          </p>
                          <div className="flex flex-wrap gap-1">
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
                      </div>
                      
                      {property.permissions.canAddNotes && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-4 gap-2"
                          onClick={() => {
                            setSelectedPropertyForNote(property.id);
                            setIsNoteDialogOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter une note
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Onglet Notes */}
          <TabsContent value="notes">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Mes notes & signalements</h2>
              <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nouvelle note
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Ajouter une note</DialogTitle>
                    <DialogDescription>
                      Signalez un problème ou ajoutez une observation
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Logement</Label>
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
                    </div>
                    
                    <div>
                      <Label>Type de note</Label>
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
                          <SelectItem value="repair_needed">🔧 Réparation nécessaire</SelectItem>
                          <SelectItem value="missing_item">📦 Objet manquant</SelectItem>
                          <SelectItem value="damage">💥 Dégât</SelectItem>
                          <SelectItem value="suggestion">💭 Suggestion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Priorité</Label>
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
                    </div>
                    
                    <div>
                      <Label>Titre</Label>
                      <Input
                        placeholder="Ex: Ampoule grillée dans la salle de bain"
                        value={noteForm.title}
                        onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <Label>Description (optionnel)</Label>
                      <Textarea
                        placeholder="Détails supplémentaires..."
                        value={noteForm.description}
                        onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => createNoteMutation.mutate({
                        propertyId: selectedPropertyForNote,
                        ...noteForm,
                      })}
                      disabled={!selectedPropertyForNote || !noteForm.title || createNoteMutation.isPending}
                      className="w-full gap-2"
                    >
                      {createNoteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Envoyer la note
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {notes?.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Aucune note</h3>
                <p className="text-muted-foreground mb-4">Créez votre première note pour signaler un problème</p>
                <Button onClick={() => setIsNoteDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Créer une note
                </Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {notes?.map((note) => (
                  <Card
                    key={note.id}
                    className={cn(
                      "hover:shadow-lg transition-all",
                      note.status === "resolved" && "opacity-60",
                      note.priority === "urgent" && "border-l-4 border-l-red-500",
                      note.priority === "high" && "border-l-4 border-l-orange-500"
                    )}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl flex-shrink-0",
                          note.noteType === "problem" ? "bg-amber-500" :
                          note.noteType === "damage" ? "bg-red-500" :
                          note.noteType === "repair_needed" ? "bg-orange-500" :
                          note.noteType === "missing_item" ? "bg-purple-500" :
                          "bg-blue-500"
                        )}>
                          {note.noteType === "problem" ? "⚠️" :
                           note.noteType === "damage" ? "💥" :
                           note.noteType === "repair_needed" ? "🔧" :
                           note.noteType === "missing_item" ? "📦" :
                           "💡"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{note.title}</h4>
                            {note.priority === "urgent" && (
                              <Badge variant="destructive" className="text-xs">Urgent</Badge>
                            )}
                            {note.priority === "high" && (
                              <Badge className="bg-orange-500 text-xs">Prioritaire</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            📍 {note.property?.name}
                          </p>
                          {note.description && (
                            <p className="text-sm mb-3">{note.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <Badge variant="outline">
                              {note.status === "open" ? "🔵 Ouvert" :
                               note.status === "acknowledged" ? "👀 Vu" :
                               note.status === "in_progress" ? "🔄 En cours" :
                               note.status === "resolved" ? "✅ Résolu" : note.status}
                            </Badge>
                            <span>{format(parseISO(note.createdAt), "dd/MM/yyyy HH:mm")}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
