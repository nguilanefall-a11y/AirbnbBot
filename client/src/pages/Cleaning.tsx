import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, RefreshCw, Send, CheckCircle2, CalendarDays, AlertTriangle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type CleaningStatus = "à faire" | "en cours" | "terminé";

const STATUS_LABELS: Record<CleaningStatus, string> = {
  "à faire": "À faire",
  "en cours": "En cours",
  terminé: "Terminé",
};

const STATUS_STYLES: Record<CleaningStatus, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  "à faire": { variant: "secondary" },
  "en cours": { variant: "default" },
  terminé: { variant: "outline", className: "border-emerald-500/40 text-emerald-600 bg-emerald-500/10" },
};

type CleaningTask = {
  id: string;
  propertyId: string;
  propertyName: string | null;
  propertyAccessKey: string | null;
  dateMenage: string;
  status: CleaningStatus;
  notes: string | null;
  cleanerName: string | null;
  cleanerPhone: string | null;
  cleanerWhatsapp: boolean | null;
};

function formatDate(dateString: string) {
  if (!dateString) return "Date à confirmer";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Date invalide";
  }
  return format(date, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
}

export default function CleaningPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cleaningsQuery = useQuery<{ cleanings: CleaningTask[] }>({
    queryKey: ["/api/cleanings"],
  });

  const cleanings = useMemo(() => cleaningsQuery.data?.cleanings ?? [], [cleaningsQuery.data]);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cleanings/sync");
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleanings"] });
      toast({
        title: "Calendriers synchronisés",
        description: `${result.createdCount || 0} tâches créées automatiquement` +
          (result.skipped?.length ? `, ${result.skipped.length} ignorées` : ""),
      });
    },
    onError: (error: any) => {
      toast({
        title: "Synchronisation impossible",
        description: error?.message || "Merci de vérifier la configuration Supabase et iCal.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CleaningStatus }) => {
      const res = await apiRequest("POST", `/api/cleanings/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleanings"] });
      toast({ title: "Statut mis à jour" });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    },
  });

  const notifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/cleanings/${id}/notify`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleanings"] });
      toast({
        title: "Notification envoyée",
        description: "Le personnel de ménage a été informé.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Notification impossible",
        description: error?.message || "Vérifie la configuration Twilio et le numéro de téléphone.",
        variant: "destructive",
      });
    },
  });

  const isLoading = cleaningsQuery.isLoading || cleaningsQuery.isRefetching;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="uppercase tracking-wide text-xs">
              Gestion des ménages
            </Badge>
            <Badge variant="default" className="bg-emerald-600">
              Automatisé Airbnb iCal
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            Organisation des ménages simplifiée
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Synchronise ton calendrier Airbnb, crée automatiquement les tâches de ménage et informe ton équipe en un clic.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => cleaningsQuery.refetch()}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualiser
          </Button>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
            Synchroniser les calendriers
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Flux automatisé
          </CardTitle>
          <CardDescription>
            1. Import automatique des départs depuis Airbnb (iCal). 2. Création instantanée des tâches. 3. Notification WhatsApp/SMS. 4. Confirmation via lien sécurisé.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-4 bg-muted/40">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Pré-requis</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li>• Ajoute l'URL iCal Airbnb dans chaque propriété.</li>
                <li>• Configure Twilio (WhatsApp ou SMS) dans ton .env.</li>
                <li>• Optionnel: ajoute un CRON (Vercel/Supabase) qui appelle <code>/api/cron/cleanings/sync</code>.</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4 bg-muted/40">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Statuts</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li><Badge className="mr-2" variant="secondary">À faire</Badge> Tâche programmée, en attente de validation.</li>
                <li><Badge className="mr-2">En cours</Badge> Notification envoyée, ménage en progression.</li>
                <li><Badge className="mr-2 border-emerald-500/40 text-emerald-600 bg-emerald-500/10" variant="outline">Terminé</Badge> Confirmé via le lien ou manuellement.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Tâches à venir</h2>
          <span className="text-sm text-muted-foreground">
            {cleanings.length} tâche{cleanings.length > 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : cleanings.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              {/* <Broom className="mx-auto h-10 w-10 text-muted-foreground" /> */}
              <h3 className="mt-4 text-lg font-semibold">Aucune tâche de ménage enregistrée</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Ajoute ton lien iCal Airbnb dans une propriété et lance une synchronisation pour remplir ce tableau automatiquement.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cleanings.map((task) => (
              <Card key={task.id} className="relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/90 to-primary/40" aria-hidden />
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">
                        {task.propertyName ?? "Propriété sans nom"}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1 text-sm">
                        <CalendarDays className="h-4 w-4" />
                        {formatDate(task.dateMenage)}
                      </CardDescription>
                    </div>
                    <Badge variant={STATUS_STYLES[task.status].variant} className={STATUS_STYLES[task.status].className}>
                      {STATUS_LABELS[task.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <span className="font-semibold text-foreground">Personnel :</span> {task.cleanerName ?? "À assigner"}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">Contact :</span>{" "}
                      {task.cleanerPhone ?? "—"}
                      {task.cleanerWhatsapp ? " (WhatsApp)" : ""}
                    </p>
                    {task.notes && (
                      <p>
                        <span className="font-semibold text-foreground">Note :</span> {task.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={task.status}
                      onValueChange={(status) => updateStatusMutation.mutate({ id: task.id, status: status as CleaningStatus })}
                    >
                      <SelectTrigger className="w-[170px]">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="à faire">À faire</SelectItem>
                        <SelectItem value="en cours">En cours</SelectItem>
                        <SelectItem value="terminé">Terminé</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      onClick={() => notifyMutation.mutate(task.id)}
                      disabled={notifyMutation.isPending}
                    >
                      {notifyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Notifier
                    </Button>

                    {task.status !== "terminé" && (
                      <Button
                        variant="ghost"
                        className="text-emerald-600 hover:text-emerald-700"
                        onClick={() => updateStatusMutation.mutate({ id: task.id, status: "terminé" })}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Marquer terminé
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {(cleaningsQuery.error || syncMutation.error || notifyMutation.error || updateStatusMutation.error) && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-3">
            <AlertTriangle className="h-4 w-4" />
            <span>Une erreur est survenue. Vérifie tes paramètres Supabase, Twilio et l'URL iCal.</span>
          </div>
        )}
      </section>
    </div>
  );
}
