/**
 * Section Ménage Intelligente - Page principale
 * 
 * Affiche le calendrier des réservations et tâches de ménage,
 * gère le personnel et les demandes spéciales.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Home,
  Sparkles,
  Bell,
  Settings,
  Link2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import LandingHeader from "@/components/LandingHeader";
import Footer from "@/components/Footer";

// Types
interface CleaningTask {
  id: string;
  propertyId: string;
  bookingId: string | null;
  cleaningStaffId: string | null;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: string;
  priority: string;
  hasSpecialRequest: boolean;
  specialRequestId: string | null;
  property?: { name: string; address: string };
  specialRequest?: {
    type: string;
    requestedTime: string;
    status: string;
    guestMessage?: string;
  };
}

interface SpecialRequest {
  id: string;
  bookingId: string;
  propertyId: string;
  requestType: string;
  requestedTime: string;
  originalTime: string;
  guestName: string;
  status: string;
  createdAt: string;
}

interface CleaningStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  accessToken: string;
  isActive: boolean;
}

interface Property {
  id: string;
  name: string;
  icalUrl: string | null;
  lastImportedAt: string | null;
}

export default function Cleaning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", phone: "" });

  // Fetch properties
  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Fetch cleaning tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery<CleaningTask[]>({
    queryKey: ["/api/cleaning/tasks", selectedProperty, currentMonth.toISOString()],
    queryFn: async () => {
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      let url = `/api/cleaning/tasks?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
      if (selectedProperty !== "all") {
        url += `&propertyId=${selectedProperty}`;
      }
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  // Fetch special requests
  const { data: specialRequests } = useQuery<SpecialRequest[]>({
    queryKey: ["/api/cleaning/special-requests", selectedProperty],
    queryFn: async () => {
      let url = `/api/cleaning/special-requests?status=pending`;
      if (selectedProperty !== "all") {
        url += `&propertyId=${selectedProperty}`;
      }
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
  });

  // Fetch cleaning staff
  const { data: staff } = useQuery<CleaningStaff[]>({
    queryKey: ["/api/cleaning/staff"],
  });

  // Sync iCal mutation
  const syncMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const res = await fetch(`/api/cleaning/sync-ical/${propertyId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Sync failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Synchronisation réussie",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/tasks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de synchronisation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add staff mutation
  const addStaffMutation = useMutation({
    mutationFn: async (staffData: typeof newStaff) => {
      const res = await fetch("/api/cleaning/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(staffData),
      });
      if (!res.ok) throw new Error("Failed to add staff");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Personnel ajouté", description: "Le membre du personnel a été ajouté." });
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/staff"] });
      setIsAddStaffOpen(false);
      setNewStaff({ name: "", email: "", phone: "" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'ajouter le personnel", variant: "destructive" });
    },
  });

  // Respond to special request
  const respondMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "refuse" }) => {
      const res = await fetch(`/api/cleaning/special-requests/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to respond");
      return res.json();
    },
    onSuccess: (_, { action }) => {
      toast({
        title: action === "accept" ? "Demande acceptée" : "Demande refusée",
        description: "Le voyageur a été notifié automatiquement.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/special-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/tasks"] });
    },
  });

  // Navigation du mois
  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Générer les jours du calendrier
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];
    
    // Jours vides au début
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Jours du mois
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  // Récupérer les tâches pour un jour donné
  const getTasksForDay = (day: number) => {
    if (!tasks) return [];
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.scheduledDate.startsWith(dateStr));
  };

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "pending": return "bg-yellow-500";
      case "cancelled": return "bg-gray-500";
      default: return "bg-gray-400";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent": return <Badge variant="destructive">Urgent</Badge>;
      case "high": return <Badge className="bg-orange-500">Haute</Badge>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <main className="container mx-auto px-6 py-8 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-primary" />
                Section Ménage Intelligente
              </h1>
              <p className="text-muted-foreground mt-1">
                Gérez vos tâches de ménage et demandes spéciales
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Toutes les propriétés" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les propriétés</SelectItem>
                  {properties?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedProperty !== "all" && (
                <Button
                  variant="outline"
                  onClick={() => syncMutation.mutate(selectedProperty)}
                  disabled={syncMutation.isPending}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  Sync iCal
                </Button>
              )}
            </div>
          </div>

          {/* Alertes de demandes spéciales */}
          {specialRequests && specialRequests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6"
            >
              <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="w-5 h-5" />
                    Demandes Spéciales en Attente ({specialRequests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {specialRequests.map(request => (
                      <div 
                        key={request.id} 
                        className="flex items-center justify-between p-3 bg-background rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${request.requestType === "early_checkin" ? "bg-blue-500" : "bg-purple-500"}`} />
                          <div>
                            <p className="font-medium">
                              {request.requestType === "early_checkin" ? "Early Check-in" : "Late Check-out"}: {request.requestedTime}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.guestName} • Heure originale: {request.originalTime}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => respondMutation.mutate({ id: request.id, action: "accept" })}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => respondMutation.mutate({ id: request.id, action: "refuse" })}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Main Content */}
          <Tabs defaultValue="calendar" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Calendrier
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Personnel
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Config
              </TabsTrigger>
            </TabsList>

            {/* Onglet Calendrier */}
            <TabsContent value="calendar">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={goToPrevMonth}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <CardTitle>
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </CardTitle>
                    <Button variant="outline" size="icon" onClick={goToNextMonth}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>Terminé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>En cours</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span>Prévu</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {tasksLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-1">
                      {/* En-têtes des jours */}
                      {dayNames.map(day => (
                        <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                          {day}
                        </div>
                      ))}
                      
                      {/* Jours du mois */}
                      {getDaysInMonth().map((day, index) => {
                        const dayTasks = day ? getTasksForDay(day) : [];
                        const hasUrgent = dayTasks.some(t => t.priority === "urgent" || t.hasSpecialRequest);
                        
                        return (
                          <div
                            key={index}
                            className={`min-h-[100px] p-2 border rounded-lg ${
                              day ? 'bg-background hover:bg-muted/50 cursor-pointer' : 'bg-muted/20'
                            } ${hasUrgent ? 'ring-2 ring-orange-500' : ''}`}
                          >
                            {day && (
                              <>
                                <div className="text-sm font-medium mb-1">{day}</div>
                                <div className="space-y-1">
                                  <AnimatePresence>
                                    {dayTasks.slice(0, 3).map(task => (
                                      <motion.div
                                        key={task.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="group relative"
                                      >
                                        <div className={`text-xs p-1 rounded ${getStatusColor(task.status)} text-white truncate`}>
                                          {task.scheduledStartTime}
                                          {task.hasSpecialRequest && (
                                            <AlertTriangle className="inline w-3 h-3 ml-1" />
                                          )}
                                        </div>
                                        
                                        {/* Tooltip au hover */}
                                        <div className="absolute z-50 hidden group-hover:block left-0 top-full mt-1 p-2 bg-popover border rounded-lg shadow-lg min-w-[200px]">
                                          <p className="font-medium text-sm">{task.property?.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {task.scheduledStartTime} - {task.scheduledEndTime}
                                          </p>
                                          {task.hasSpecialRequest && task.specialRequest && (
                                            <Badge variant="outline" className="mt-1 text-xs">
                                              {task.specialRequest.type === "early_checkin" ? "Early Check-in" : "Late Check-out"}: {task.specialRequest.requestedTime}
                                            </Badge>
                                          )}
                                        </div>
                                      </motion.div>
                                    ))}
                                  </AnimatePresence>
                                  {dayTasks.length > 3 && (
                                    <div className="text-xs text-muted-foreground">
                                      +{dayTasks.length - 3} autres
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Personnel */}
            <TabsContent value="staff">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Personnel de Ménage</CardTitle>
                    <CardDescription>
                      Gérez votre équipe et leurs accès
                    </CardDescription>
                  </div>
                  <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ajouter un membre</DialogTitle>
                        <DialogDescription>
                          Créez un accès pour un membre de votre équipe de ménage
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nom complet</Label>
                          <Input
                            id="name"
                            value={newStaff.name}
                            onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                            placeholder="Marie Dupont"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newStaff.email}
                            onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                            placeholder="marie@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Téléphone</Label>
                          <Input
                            id="phone"
                            value={newStaff.phone}
                            onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                            placeholder="+33 6 12 34 56 78"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddStaffOpen(false)}>
                          Annuler
                        </Button>
                        <Button 
                          onClick={() => addStaffMutation.mutate(newStaff)}
                          disabled={!newStaff.name || addStaffMutation.isPending}
                        >
                          Ajouter
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {staff && staff.length > 0 ? (
                    <div className="space-y-4">
                      {staff.map(member => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.email || member.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={member.isActive ? "default" : "secondary"}>
                              {member.isActive ? "Actif" : "Inactif"}
                            </Badge>
                            <Button variant="outline" size="sm">
                              <Link2 className="w-4 h-4 mr-2" />
                              Copier lien
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun personnel ajouté</p>
                      <p className="text-sm">Ajoutez des membres pour leur donner accès au planning</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Configuration */}
            <TabsContent value="settings">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Configuration iCal
                    </CardTitle>
                    <CardDescription>
                      Connectez vos calendriers Airbnb pour synchroniser automatiquement
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {properties && properties.length > 0 ? (
                      <div className="space-y-4">
                        {properties.map(property => (
                          <div key={property.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Home className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{property.name}</span>
                              </div>
                              <Badge variant={property.icalUrl ? "default" : "outline"}>
                                {property.icalUrl ? "Connecté" : "Non configuré"}
                              </Badge>
                            </div>
                            {property.lastImportedAt && (
                              <p className="text-xs text-muted-foreground">
                                Dernière sync: {new Date(property.lastImportedAt).toLocaleString('fr-FR')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Aucune propriété configurée</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Notifications
                    </CardTitle>
                    <CardDescription>
                      Configurez les alertes pour les demandes spéciales
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Email pour demandes urgentes</span>
                        <Badge variant="default">Activé</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>SMS pour Early Check-in</span>
                        <Badge variant="outline">Désactivé</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Notification push</span>
                        <Badge variant="default">Activé</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

