/**
 * AgentCalendar - Page Calendrier pour l'Agent de Ménage
 * 
 * Affiche:
 * - Les tâches de nettoyage assignées
 * - Les indisponibilités personnelles
 * - Vue simplifiée adaptée au rôle agent
 */

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Calendar as CalendarIcon,
  RefreshCw,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarAirbnb, CalendarEvent } from "@/components/CalendarAirbnb";
import { apiRequest } from "@/lib/queryClient";

export default function AgentCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Récupérer le calendrier de l'agent
  const { data: calendarData, isLoading, refetch } = useQuery({
    queryKey: ["/api/calendar/agent", currentMonth],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/agent?month=${currentMonth}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch calendar");
      return res.json();
    },
  });

  // Mutation pour ajouter une indisponibilité
  const addUnavailabilityMutation = useMutation({
    mutationFn: async (data: { startDate: Date; endDate: Date; reason: string; type: string }) => {
      return apiRequest("/api/calendar/unavailability", {
        method: "POST",
        body: JSON.stringify({
          startDate: data.startDate.toISOString(),
          endDate: data.endDate.toISOString(),
          reason: data.reason,
          unavailabilityType: data.type,
          publicLabel: data.type === "vacation" ? "Vacances" : 
                       data.type === "sick" ? "Maladie" : "Indisponible",
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Indisponibilité ajoutée",
        description: "Votre hôte a été informé de votre indisponibilité.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/agent"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Transformer les données en événements
  const events: CalendarEvent[] = calendarData?.events?.map((e: any) => ({
    ...e,
    startDate: new Date(e.startDate),
    endDate: new Date(e.endDate),
  })) || [];

  // Statistiques
  const pendingTasks = events.filter(e => e.type === "cleaning" && e.status === "pending").length;
  const completedTasks = events.filter(e => e.type === "cleaning" && e.status === "completed").length;
  const todayTasks = events.filter(e => {
    if (e.type !== "cleaning") return false;
    const today = new Date();
    const eventDate = new Date(e.startDate);
    return eventDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/cleaner-dashboard">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Mon Calendrier</h1>
                  <p className="text-xs text-muted-foreground">
                    Nettoyages & disponibilités
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {todayTasks > 0 && (
                <Badge className="bg-blue-500 hover:bg-blue-600">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {todayTasks} aujourd'hui
                </Badge>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <motion.div
            className="bg-white dark:bg-gray-900 rounded-2xl p-4 border shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold">{pendingTasks}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-900 rounded-2xl p-4 border shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold">{completedTasks}</p>
                <p className="text-xs text-muted-foreground">Terminés</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white dark:bg-gray-900 rounded-2xl p-4 border shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {events.filter(e => e.type === "unavailable").length}
                </p>
                <p className="text-xs text-muted-foreground">Indisponibilités</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <CalendarAirbnb
            events={events}
            userRole="cleaning_agent"
            isLoading={isLoading}
            onAddUnavailability={(start, end, reason, type) => {
              addUnavailabilityMutation.mutate({ 
                startDate: start, 
                endDate: end, 
                reason, 
                type 
              });
            }}
            onEventClick={(event) => {
              if (event.type === "cleaning") {
                toast({
                  title: event.title,
                  description: `Statut: ${event.status === "pending" ? "En attente" : 
                               event.status === "completed" ? "Terminé" : event.status}`,
                });
              }
            }}
          />
        </motion.div>

        {/* Today's tasks summary */}
        {todayTasks > 0 && (
          <motion.div
            className="mt-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Aujourd'hui
            </h3>
            <div className="space-y-3">
              {events
                .filter(e => {
                  if (e.type !== "cleaning") return false;
                  const today = new Date();
                  const eventDate = new Date(e.startDate);
                  return eventDate.toDateString() === today.toDateString();
                })
                .map(event => (
                  <div 
                    key={event.id}
                    className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold">{event.propertyName || event.title}</p>
                      <p className="text-sm text-white/80">
                        {event.scheduledStartTime || "11:00"} - {event.scheduledEndTime || "15:00"}
                      </p>
                    </div>
                    <Badge 
                      className={
                        event.status === "completed" 
                          ? "bg-green-400 text-green-900" 
                          : "bg-white/30 text-white"
                      }
                    >
                      {event.status === "completed" ? "Terminé" : "À faire"}
                    </Badge>
                  </div>
                ))
              }
            </div>
          </motion.div>
        )}

        {/* Properties assigned */}
        {calendarData?.properties?.length > 0 && (
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="text-lg font-semibold mb-4">Logements assignés</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calendarData.properties.map((property: any) => (
                <div 
                  key={property.id}
                  className="bg-white dark:bg-gray-900 rounded-xl p-4 border shadow-sm flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{property.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Check-out</p>
                    <p className="font-medium">{property.checkOutTime || "11:00"}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

