/**
 * HostCalendar - Page Calendrier Complet pour l'Hôte
 * 
 * Affiche le calendrier Airbnb avec:
 * - Toutes les réservations
 * - Les tâches de nettoyage
 * - Les périodes bloquées
 * - Les indisponibilités des agents
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Home, 
  Calendar as CalendarIcon,
  RefreshCw,
  Plus,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarAirbnb, CalendarEvent } from "@/components/CalendarAirbnb";
import { apiRequest } from "@/lib/queryClient";

export default function HostCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const propertyFromUrl = urlParams.get("property");
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyFromUrl || "");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Update selected property when URL changes
  useEffect(() => {
    if (propertyFromUrl) {
      setSelectedPropertyId(propertyFromUrl);
    }
  }, [propertyFromUrl]);

  // Récupérer les propriétés
  const { data: properties, isLoading: loadingProperties } = useQuery({
    queryKey: ["/api/properties"],
  });

  // Récupérer le calendrier pour la propriété sélectionnée
  const { data: calendarData, isLoading: loadingCalendar, refetch } = useQuery({
    queryKey: ["/api/calendar/host", selectedPropertyId, currentMonth],
    queryFn: async () => {
      if (!selectedPropertyId) return null;
      const res = await fetch(`/api/calendar/host/${selectedPropertyId}?month=${currentMonth}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error("Failed to fetch calendar");
      return res.json();
    },
    enabled: !!selectedPropertyId,
  });

  // Mutation pour bloquer une période
  const blockPeriodMutation = useMutation({
    mutationFn: async (data: { startDate: Date; endDate: Date; reason: string }) => {
      return apiRequest("/api/calendar/block-period", {
        method: "POST",
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate.toISOString(),
          reason: data.reason,
          blockType: "personal",
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Période bloquée",
        description: "La période a été bloquée avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/host"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation pour créer une tâche de nettoyage
  const createCleaningMutation = useMutation({
    mutationFn: async (data: { date: Date; notes?: string }) => {
      return apiRequest("/api/cleaning/mark-needs-cleaning", {
        method: "POST",
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          date: data.date.toISOString(),
          notes: data.notes,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Nettoyage planifié",
        description: "La tâche de nettoyage a été créée.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/host"] });
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

  // Auto-sélectionner la première propriété
  React.useEffect(() => {
    if (properties?.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-rose-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/host">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-lg">Calendrier</h1>
                  <p className="text-xs text-muted-foreground">
                    Gérez vos disponibilités
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Property selector */}
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger className="w-[200px]">
                  <Home className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sélectionner un logement" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property: any) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={loadingCalendar}
              >
                <RefreshCw className={`w-4 h-4 ${loadingCalendar ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {!selectedPropertyId ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 flex items-center justify-center mb-6">
              <Home className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Sélectionnez un logement</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Choisissez un logement dans la liste ci-dessus pour afficher son calendrier.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CalendarAirbnb
              events={events}
              userRole="host"
              selectedPropertyId={selectedPropertyId}
              isLoading={loadingCalendar}
              onBlockPeriod={(start, end, reason) => {
                blockPeriodMutation.mutate({ startDate: start, endDate: end, reason });
              }}
              onEventClick={(event) => {
                console.log("Event clicked:", event);
              }}
            />

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <motion.div
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 border shadow-sm"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {events.filter(e => e.type === "booking").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Réservations</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 border shadow-sm"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {events.filter(e => e.type === "cleaning").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Nettoyages</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 border shadow-sm"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Filter className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {events.filter(e => e.type === "blocked").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Bloqués</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 border shadow-sm"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {events.filter(e => e.type === "unavailable").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Agents indispo.</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

