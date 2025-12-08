/**
 * Interface Hôte - Gestion du Ménage
 * 
 * Fonctionnalités :
 * - Synchronisation calendrier iCal/Airbnb/Booking
 * - Gestion de l'équipe de ménage
 * - Attribution des calendriers aux agents
 * - Consultation des notes et signalements
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Users,
  Home,
  RefreshCw,
  Plus,
  Trash2,
  Link2,
  LinkIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
  Loader2,
  Mail,
  Phone,
  Building,
  ChevronRight,
  Bell,
  Copy,
  ExternalLink,
  FileText,
  Sparkles,
  Share2,
  Eye,
  EyeOff,
  CalendarDays,
  ArrowLeft,
  Check,
  X,
  Unlink,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

// Types
interface CleaningAgent {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  assignedProperties: {
    propertyId: string;
    propertyName: string;
    isActive: boolean;
  }[];
}

interface Property {
  id: string;
  name: string;
  address: string;
  icalUrl: string | null;
  lastImportedAt: string | null;
  cleaningPersonId: string | null;
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
  hostReadAt: string | null;
  property: { id: string; name: string };
  author: { id: string; firstName: string; lastName: string };
}

interface SpecialRequest {
  id: string;
  propertyId: string;
  requestType: string;
  requestedTime: string;
  originalTime: string;
  status: string;
  guestName: string | null;
  createdAt: string;
}

export default function HostCleaningManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("sync");
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isIcalDialogOpen, setIsIcalDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [icalUrl, setIcalUrl] = useState("");
  const [agentForm, setAgentForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [copiedPropertyId, setCopiedPropertyId] = useState<string | null>(null);

  // Fonction pour copier le lien d'export iCal
  const copyExportUrl = async (propertyId: string) => {
    const baseUrl = window.location.origin;
    const exportUrl = `${baseUrl}/api/calendar/${propertyId}/export.ics`;
    
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopiedPropertyId(propertyId);
      toast({ 
        title: "✅ Lien copié !",
        description: "Collez ce lien dans Airbnb > Calendrier > Importer"
      });
      setTimeout(() => setCopiedPropertyId(null), 3000);
    } catch (err) {
      toast({ 
        title: "❌ Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive"
      });
    }
  };

  // Queries
  const { data: agents, isLoading: loadingAgents } = useQuery<CleaningAgent[]>({
    queryKey: ["/api/cleaning/agents"],
  });

  const { data: properties, isLoading: loadingProperties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/cleaning/notes/unread-count"],
  });

  const { data: notes } = useQuery<CleaningNote[]>({
    queryKey: ["/api/cleaning/notes"],
  });

  const { data: specialRequests } = useQuery<SpecialRequest[]>({
    queryKey: ["/api/cleaning/special-requests"],
  });

  // Mutations
  const createAgentMutation = useMutation({
    mutationFn: async (data: typeof agentForm) => {
      await apiRequest("POST", "/api/cleaning/agents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/agents"] });
      setIsCreateAgentOpen(false);
      setAgentForm({ email: "", password: "", firstName: "", lastName: "" });
      toast({ title: "✅ Agent créé avec succès !" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      await apiRequest("DELETE", `/api/cleaning/agents/${agentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/agents"] });
      toast({ title: "Agent supprimé" });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: { propertyId: string; cleanerUserId: string }) => {
      await apiRequest("POST", "/api/cleaning/assignments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/agents"] });
      setIsAssignOpen(false);
      setSelectedAgent("");
      setSelectedPropertyId("");
      toast({ title: "✅ Calendrier partagé avec l'agent !" });
    },
  });

  const updateIcalMutation = useMutation({
    mutationFn: async ({ id, icalUrl }: { id: string; icalUrl: string }) => {
      await apiRequest("PATCH", `/api/properties/${id}/ical`, { icalUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setIsIcalDialogOpen(false);
      setSelectedProperty(null);
      setIcalUrl("");
      toast({ title: "✅ Lien iCal enregistré !" });
    },
  });

  const syncICalMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const res = await apiRequest("POST", `/api/cleaning/sync-ical/${propertyId}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "🔄 Synchronisation réussie",
        description: `${data.imported} nouvelles réservations, ${data.updated} mises à jour`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Erreur de sync", description: error.message, variant: "destructive" });
    },
  });

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "refuse" }) => {
      await apiRequest("POST", `/api/cleaning/special-requests/${id}/respond`, { action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/special-requests"] });
      toast({ title: "Réponse envoyée au voyageur" });
    },
  });

  const resolveNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await apiRequest("PATCH", `/api/cleaning/notes/${noteId}`, { status: "resolved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning/notes/unread-count"] });
      toast({ title: "✅ Note marquée comme résolue" });
    },
  });

  // Computed
  const pendingRequests = useMemo(() => 
    specialRequests?.filter(r => r.status === "pending") || [], 
    [specialRequests]
  );
  const openNotes = useMemo(() => 
    notes?.filter(n => n.status === "open") || [], 
    [notes]
  );
  const propertiesWithIcal = useMemo(() => 
    properties?.filter(p => p.icalUrl) || [], 
    [properties]
  );
  const propertiesWithoutIcal = useMemo(() => 
    properties?.filter(p => !p.icalUrl) || [], 
    [properties]
  );

  if (loadingAgents || loadingProperties) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/host">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="font-bold text-lg">Gestion du Ménage</h1>
                <p className="text-xs text-muted-foreground">
                  Calendriers, équipe & signalements
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {(unreadCount?.count || 0) > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  <Bell className="w-3 h-3 mr-1" />
                  {unreadCount?.count} note{(unreadCount?.count || 0) > 1 ? "s" : ""} non lue{(unreadCount?.count || 0) > 1 ? "s" : ""}
                </Badge>
              )}
              {pendingRequests.length > 0 && (
                <Badge className="bg-amber-500 hover:bg-amber-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {pendingRequests.length} demande{pendingRequests.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sync" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Synchronisation</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Équipe</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 relative">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Demandes</span>
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2 relative">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Notes</span>
              {openNotes.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {openNotes.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Onglet Synchronisation Calendriers */}
          <TabsContent value="sync" className="space-y-6">
            {/* Instructions */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200/50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  Comment synchroniser vos calendriers ?
                </h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs flex-shrink-0">1</span>
                    <span><strong>Airbnb:</strong> Allez dans Calendrier → Paramètres → Exporter le calendrier → Copiez le lien iCal</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs flex-shrink-0">2</span>
                    <span><strong>Booking:</strong> Paramètres → Synchronisation du calendrier → Exporter → Copiez le lien .ics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs flex-shrink-0">3</span>
                    <span>Collez le lien ci-dessous et cliquez sur Synchroniser</span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Instructions Export */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200/50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-green-600" />
                  Exporter vers Airbnb / Booking
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Pour bloquer automatiquement les dates sur Airbnb quand vous avez une réservation ailleurs :
                </p>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs flex-shrink-0">1</span>
                    <span>Cliquez sur <strong>"Export .ics"</strong> à côté du logement pour copier le lien</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs flex-shrink-0">2</span>
                    <span><strong>Airbnb:</strong> Calendrier → Paramètres → Importer un calendrier → Collez le lien</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs flex-shrink-0">3</span>
                    <span><strong>Booking:</strong> Tarifs et disponibilité → Synchronisation → Importer → Collez le lien</span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Liste des propriétés */}
            <div className="grid gap-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building className="w-5 h-5" />
                Vos logements ({properties?.length || 0})
              </h3>

              {properties?.map((property) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={cn(
                    "hover:shadow-lg transition-all cursor-pointer group",
                    property.icalUrl && "border-l-4 border-l-green-500"
                  )}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Clickable area for calendar */}
                        <Link href={`/host-calendar?property=${property.id}`} className="flex items-start gap-4 flex-1 min-w-0">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform",
                            property.icalUrl 
                              ? "bg-gradient-to-br from-green-400 to-green-600" 
                              : "bg-gradient-to-br from-gray-300 to-gray-400"
                          )}>
                            <Home className="w-7 h-7 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold group-hover:text-primary transition-colors">{property.name}</h4>
                              {property.icalUrl ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <LinkIcon className="w-3 h-3 mr-1" />
                                  Synchronisé
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  <Unlink className="w-3 h-3 mr-1" />
                                  Non configuré
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{property.address}</p>
                            
                            {property.icalUrl && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <Link2 className="w-3 h-3" />
                                <span className="truncate max-w-xs">{property.icalUrl}</span>
                                {property.lastImportedAt && (
                                  <span className="text-xs">
                                    • Dernière sync: {format(parseISO(property.lastImportedAt), "dd/MM à HH:mm")}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Hint for calendar */}
                            <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              <Calendar className="w-3 h-3" />
                              <span>Cliquez pour voir le calendrier</span>
                              <ChevronRight className="w-3 h-3" />
                            </div>
                          </div>
                        </Link>

                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedProperty(property);
                                  setIcalUrl(property.icalUrl || "");
                                }}
                              >
                                <Settings className="w-4 h-4 mr-1" />
                                {property.icalUrl ? "Modifier" : "Configurer"}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Configurer la synchronisation</DialogTitle>
                                <DialogDescription>
                                  Collez le lien iCal de votre calendrier (Airbnb, Booking, etc.)
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <Label>Lien iCal / .ics</Label>
                                  <Input
                                    placeholder="https://www.airbnb.com/calendar/ical/..."
                                    value={icalUrl}
                                    onChange={(e) => setIcalUrl(e.target.value)}
                                    className="font-mono text-sm"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Le lien doit commencer par https:// et se terminer par .ics
                                  </p>
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Annuler</Button>
                                </DialogClose>
                                <Button
                                  onClick={() => {
                                    if (selectedProperty) {
                                      updateIcalMutation.mutate({ id: selectedProperty.id, icalUrl });
                                    }
                                  }}
                                  disabled={!icalUrl || updateIcalMutation.isPending}
                                >
                                  {updateIcalMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : (
                                    <Check className="w-4 h-4 mr-2" />
                                  )}
                                  Enregistrer
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {property.icalUrl && (
                            <Button
                              size="sm"
                              onClick={() => syncICalMutation.mutate(property.id)}
                              disabled={syncICalMutation.isPending}
                            >
                              {syncICalMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4 mr-1" />
                              )}
                              Sync
                            </Button>
                          )}
                          
                          {/* Bouton Exporter vers Airbnb */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyExportUrl(property.id)}
                            className={copiedPropertyId === property.id ? "bg-green-50 border-green-300" : ""}
                          >
                            {copiedPropertyId === property.id ? (
                              <>
                                <Check className="w-4 h-4 mr-1 text-green-600" />
                                <span className="text-green-600">Copié !</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-1" />
                                Export .ics
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Onglet Équipe */}
          <TabsContent value="team" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Votre équipe de ménage</h3>
              <div className="flex gap-2">
                <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Share2 className="w-4 h-4" />
                      Partager un calendrier
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Partager un calendrier</DialogTitle>
                      <DialogDescription>
                        Sélectionnez un agent et un logement à lui partager
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Agent de ménage</Label>
                        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {agents?.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.firstName} {a.lastName} ({a.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Logement à partager</Label>
                        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un logement" />
                          </SelectTrigger>
                          <SelectContent>
                            {properties?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => createAssignmentMutation.mutate({
                          propertyId: selectedPropertyId,
                          cleanerUserId: selectedAgent,
                        })}
                        disabled={!selectedAgent || !selectedPropertyId || createAssignmentMutation.isPending}
                      >
                        {createAssignmentMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Share2 className="w-4 h-4 mr-2" />
                        )}
                        Partager le calendrier
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isCreateAgentOpen} onOpenChange={setIsCreateAgentOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Nouvel agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer un compte agent</DialogTitle>
                      <DialogDescription>
                        L'agent pourra se connecter et voir les logements que vous lui partagez
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Prénom</Label>
                          <Input
                            placeholder="Marie"
                            value={agentForm.firstName}
                            onChange={(e) => setAgentForm({ ...agentForm, firstName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Nom</Label>
                          <Input
                            placeholder="Dupont"
                            value={agentForm.lastName}
                            onChange={(e) => setAgentForm({ ...agentForm, lastName: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="agent@email.com"
                          value={agentForm.email}
                          onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Mot de passe</Label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={agentForm.password}
                          onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => createAgentMutation.mutate(agentForm)}
                        disabled={!agentForm.email || !agentForm.password || createAgentMutation.isPending}
                      >
                        {createAgentMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        Créer le compte
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {agents?.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Aucun agent</h3>
                <p className="text-muted-foreground mb-4">
                  Créez un compte pour votre équipe de ménage
                </p>
                <Button onClick={() => setIsCreateAgentOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Créer un agent
                </Button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {agents?.map((agent) => (
                  <Card key={agent.id} className="hover:shadow-lg transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-14 h-14">
                          <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-lg">
                            {(agent.firstName?.[0] || "") + (agent.lastName?.[0] || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold">
                            {agent.firstName} {agent.lastName}
                          </h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                            <Mail className="w-3 h-3" />
                            {agent.email}
                          </p>
                          
                          {agent.assignedProperties.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">
                              Aucun logement partagé
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {agent.assignedProperties.map((prop) => (
                                <Badge key={prop.propertyId} variant="secondary" className="text-xs">
                                  <Home className="w-3 h-3 mr-1" />
                                  {prop.propertyName}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm("Supprimer cet agent ?")) {
                              deleteAgentMutation.mutate(agent.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Onglet Demandes spéciales */}
          <TabsContent value="requests" className="space-y-6">
            <h3 className="font-semibold text-lg">Demandes des voyageurs</h3>
            
            {pendingRequests.length === 0 && specialRequests?.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Aucune demande</h3>
                <p className="text-muted-foreground">
                  Les demandes d'early check-in / late check-out apparaîtront ici
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRequests.length > 0 && (
                  <>
                    <h4 className="text-sm font-medium text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      En attente de réponse ({pendingRequests.length})
                    </h4>
                    {pendingRequests.map((req) => (
                      <Card key={req.id} className="border-l-4 border-l-amber-500 hover:shadow-lg transition-all">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={req.requestType === "early_checkin" ? "bg-blue-500" : "bg-purple-500"}>
                                  {req.requestType === "early_checkin" ? "⬆️ Early Check-in" : "⬇️ Late Check-out"}
                                </Badge>
                              </div>
                              <p className="text-sm">
                                <strong>{req.guestName || "Voyageur"}</strong> demande{" "}
                                <strong className="text-primary">{req.requestedTime}</strong> au lieu de{" "}
                                <span className="text-muted-foreground line-through">{req.originalTime}</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Reçue le {format(parseISO(req.createdAt), "dd/MM/yyyy à HH:mm")}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => respondToRequestMutation.mutate({ id: req.id, action: "refuse" })}
                                disabled={respondToRequestMutation.isPending}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Refuser
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={() => respondToRequestMutation.mutate({ id: req.id, action: "accept" })}
                                disabled={respondToRequestMutation.isPending}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Accepter
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}

                {specialRequests?.filter(r => r.status !== "pending").map((req) => (
                  <Card key={req.id} className="opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {req.status === "accepted" ? "✅ Acceptée" : "❌ Refusée"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {req.requestType === "early_checkin" ? "Early Check-in" : "Late Check-out"} - {req.requestedTime}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Onglet Notes */}
          <TabsContent value="notes" className="space-y-6">
            <h3 className="font-semibold text-lg">Notes de l'équipe</h3>
            
            {notes?.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Aucune note</h3>
                <p className="text-muted-foreground">
                  Les signalements de votre équipe apparaîtront ici
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {notes?.map((note) => (
                  <Card
                    key={note.id}
                    className={cn(
                      "hover:shadow-lg transition-all",
                      !note.hostReadAt && "border-l-4 border-l-primary bg-primary/5",
                      note.status === "resolved" && "opacity-60",
                      note.priority === "urgent" && "border-l-red-500",
                      note.priority === "high" && "border-l-orange-500"
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
                            {!note.hostReadAt && (
                              <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                                Nouveau
                              </Badge>
                            )}
                            {note.priority === "urgent" && <Badge variant="destructive">Urgent</Badge>}
                            {note.priority === "high" && <Badge className="bg-orange-500">Prioritaire</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            📍 {note.property?.name} • Par {note.author?.firstName} {note.author?.lastName}
                          </p>
                          {note.description && (
                            <p className="text-sm mb-2">{note.description}</p>
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
                        {note.status === "open" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveNoteMutation.mutate(note.id)}
                            disabled={resolveNoteMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Résoudre
                          </Button>
                        )}
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
