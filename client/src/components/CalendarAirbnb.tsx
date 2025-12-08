/**
 * CalendarAirbnb - Composant Calendrier Style Airbnb
 * 
 * Design premium inspiré du calendrier Airbnb avec:
 * - Navigation intuitive (mois/semaine)
 * - Affichage des réservations, nettoyages, blocages
 * - Sélection de plages de dates
 * - Vues adaptées aux rôles (Hôte / Agent de ménage)
 */

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Home,
  Sparkles,
  Clock,
  User,
  Ban,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types
export interface CalendarEvent {
  id: string;
  type: "booking" | "cleaning" | "blocked" | "unavailable";
  title: string;
  startDate: Date;
  endDate: Date;
  status?: string;
  guestName?: string;
  propertyId?: string;
  propertyName?: string;
  priority?: string;
  reason?: string;
  color?: string;
}

export interface CalendarProps {
  events: CalendarEvent[];
  userRole: "host" | "cleaning_agent";
  selectedPropertyId?: string;
  onDateSelect?: (startDate: Date, endDate: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onBlockPeriod?: (startDate: Date, endDate: Date, reason: string) => void;
  onAddUnavailability?: (startDate: Date, endDate: Date, reason: string, type: string) => void;
  isLoading?: boolean;
  showPropertyFilter?: boolean;
  properties?: { id: string; name: string }[];
}

// Helpers
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Adjust for Monday start
};

const isSameDay = (date1: Date, date2: Date) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const isDateInRange = (date: Date, start: Date, end: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return d >= s && d <= e;
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('fr-FR', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });
};

// Event type colors & styles
const getEventStyle = (type: CalendarEvent["type"], status?: string) => {
  switch (type) {
    case "booking":
      return {
        bg: "bg-gradient-to-r from-rose-500 to-pink-500",
        text: "text-white",
        border: "border-rose-400",
        icon: User,
        label: "Réservation"
      };
    case "cleaning":
      if (status === "completed") {
        return {
          bg: "bg-gradient-to-r from-emerald-500 to-green-500",
          text: "text-white",
          border: "border-emerald-400",
          icon: CheckCircle2,
          label: "Nettoyage terminé"
        };
      }
      if (status === "in_progress") {
        return {
          bg: "bg-gradient-to-r from-amber-500 to-yellow-500",
          text: "text-white",
          border: "border-amber-400",
          icon: Sparkles,
          label: "En cours"
        };
      }
      return {
        bg: "bg-gradient-to-r from-blue-500 to-cyan-500",
        text: "text-white",
        border: "border-blue-400",
        icon: Sparkles,
        label: "Nettoyage prévu"
      };
    case "blocked":
      return {
        bg: "bg-gradient-to-r from-gray-500 to-slate-500",
        text: "text-white",
        border: "border-gray-400",
        icon: Ban,
        label: "Bloqué"
      };
    case "unavailable":
      return {
        bg: "bg-gradient-to-r from-orange-400 to-amber-400",
        text: "text-white",
        border: "border-orange-300",
        icon: Clock,
        label: "Indisponible"
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-700",
        border: "border-gray-200",
        icon: CalendarIcon,
        label: "Événement"
      };
  }
};

export function CalendarAirbnb({
  events,
  userRole,
  selectedPropertyId,
  onDateSelect,
  onEventClick,
  onBlockPeriod,
  onAddUnavailability,
  isLoading = false,
  showPropertyFilter = false,
  properties = []
}: CalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedRange, setSelectedRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const [isSelecting, setIsSelecting] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockType, setBlockType] = useState("personal");
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Navigation
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Filter events for selected property
  const filteredEvents = useMemo(() => {
    if (!selectedPropertyId) return events;
    return events.filter(e => !e.propertyId || e.propertyId === selectedPropertyId);
  }, [events, selectedPropertyId]);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    return filteredEvents.filter(event => isDateInRange(date, event.startDate, event.endDate));
  }, [filteredEvents]);

  // Calendar grid generation
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: (Date | null)[] = [];

    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentYear, currentMonth, day));
    }

    return days;
  }, [currentMonth, currentYear]);

  // Handle date selection
  const handleDateClick = (date: Date) => {
    if (!date) return;

    if (!isSelecting) {
      setSelectedRange({ start: date, end: null });
      setIsSelecting(true);
    } else {
      if (selectedRange.start && date >= selectedRange.start) {
        setSelectedRange({ ...selectedRange, end: date });
        setIsSelecting(false);
        setShowBlockDialog(true);
      } else {
        setSelectedRange({ start: date, end: null });
      }
    }
  };

  const handleConfirmBlock = () => {
    if (selectedRange.start && selectedRange.end) {
      if (userRole === "host" && onBlockPeriod) {
        onBlockPeriod(selectedRange.start, selectedRange.end, blockReason);
      } else if (userRole === "cleaning_agent" && onAddUnavailability) {
        onAddUnavailability(selectedRange.start, selectedRange.end, blockReason, blockType);
      }
    }
    setShowBlockDialog(false);
    setSelectedRange({ start: null, end: null });
    setBlockReason("");
    setBlockType("personal");
  };

  const cancelSelection = () => {
    setSelectedRange({ start: null, end: null });
    setIsSelecting(false);
    setShowBlockDialog(false);
    setBlockReason("");
  };

  // Check if date is in selection range
  const isInSelectionRange = (date: Date) => {
    if (!selectedRange.start) return false;
    if (selectedRange.end) {
      return isDateInRange(date, selectedRange.start, selectedRange.end);
    }
    if (isSelecting && hoveredDate && hoveredDate >= selectedRange.start) {
      return isDateInRange(date, selectedRange.start, hoveredDate);
    }
    return isSameDay(date, selectedRange.start);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {userRole === "host" ? "Vue Hôte - Réservations & Blocages" : "Vue Agent - Nettoyages & Disponibilités"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="rounded-full"
            >
              Aujourd'hui
            </Button>
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousMonth}
                className="rounded-full h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
                className="rounded-full h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Selection indicator */}
        {isSelecting && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Sélectionnez la date de fin pour {userRole === "host" ? "bloquer" : "marquer indisponible"}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={cancelSelection}>
              <X className="w-4 h-4 mr-1" /> Annuler
            </Button>
          </motion.div>
        )}
      </div>

      {/* Days header */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
        {DAYS.map((day, index) => (
          <div
            key={day}
            className={cn(
              "py-3 text-center text-xs font-semibold uppercase tracking-wider",
              index >= 5 ? "text-rose-500" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          </div>
        )}

        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="min-h-[120px] bg-gray-50/50 dark:bg-gray-800/50" />;
          }

          const dayEvents = getEventsForDate(date);
          const isToday = isSameDay(date, today);
          const isPast = date < today && !isToday;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const isSelected = isInSelectionRange(date);
          const isRangeStart = selectedRange.start && isSameDay(date, selectedRange.start);
          const isRangeEnd = selectedRange.end && isSameDay(date, selectedRange.end);

          return (
            <motion.div
              key={date.toISOString()}
              className={cn(
                "min-h-[120px] border-b border-r border-gray-100 dark:border-gray-800 p-2 transition-all cursor-pointer",
                isPast && "bg-gray-50 dark:bg-gray-800/50",
                isWeekend && !isPast && "bg-rose-50/30 dark:bg-rose-900/10",
                isSelected && "bg-blue-100 dark:bg-blue-900/40",
                isRangeStart && "rounded-l-xl",
                isRangeEnd && "rounded-r-xl",
                "hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
              onClick={() => handleDateClick(date)}
              onMouseEnter={() => isSelecting && setHoveredDate(date)}
              whileHover={{ scale: 0.98 }}
              transition={{ duration: 0.1 }}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all",
                    isToday && "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg",
                    isPast && !isToday && "text-gray-400",
                    isWeekend && !isToday && !isPast && "text-rose-500",
                    !isToday && !isPast && !isWeekend && "text-gray-700 dark:text-gray-300"
                  )}
                >
                  {date.getDate()}
                </span>
                {dayEvents.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{dayEvents.length - 2}
                  </Badge>
                )}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event) => {
                  const style = getEventStyle(event.type, event.status);
                  const Icon = style.icon;
                  
                  return (
                    <motion.div
                      key={event.id}
                      className={cn(
                        "px-2 py-1 rounded-lg text-xs font-medium truncate flex items-center gap-1",
                        style.bg,
                        style.text,
                        "shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                        onEventClick?.(event);
                      }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{event.title}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-gray-500 font-medium">Légende:</span>
          
          {userRole === "host" ? (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Réservation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Nettoyage prévu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-500 to-slate-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Bloqué</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-400 to-amber-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Agent indisponible</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Nettoyage à faire</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Terminé</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-400 to-amber-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Mon indisponibilité</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Block/Unavailability Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {userRole === "host" ? (
                <>
                  <Ban className="w-5 h-5 text-gray-500" />
                  Bloquer une période
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-orange-500" />
                  Ajouter une indisponibilité
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRange.start && selectedRange.end && (
                <span className="font-medium text-gray-900 dark:text-white">
                  Du {formatDate(selectedRange.start)} au {formatDate(selectedRange.end)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {userRole === "cleaning_agent" && (
              <div className="space-y-2">
                <Label>Type d'indisponibilité</Label>
                <Select value={blockType} onValueChange={setBlockType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personnel</SelectItem>
                    <SelectItem value="vacation">Vacances</SelectItem>
                    <SelectItem value="sick">Maladie</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                {userRole === "host" ? "Raison (optionnel)" : "Note personnelle (non visible par l'hôte)"}
              </Label>
              <Textarea
                placeholder={userRole === "host" ? "Ex: Travaux, usage personnel..." : "Ex: Vacances en famille..."}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
              />
            </div>

            {userRole === "cleaning_agent" && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    L'hôte verra uniquement que vous êtes indisponible, pas les détails de votre absence.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelSelection}>
              Annuler
            </Button>
            <Button onClick={handleConfirmBlock} className="bg-gradient-to-r from-rose-500 to-pink-600">
              {userRole === "host" ? "Bloquer" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const style = getEventStyle(selectedEvent.type, selectedEvent.status);
                    const Icon = style.icon;
                    return (
                      <>
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", style.bg)}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        {selectedEvent.title}
                      </>
                    );
                  })()}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Début</Label>
                    <p className="font-medium">{formatDate(selectedEvent.startDate)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Fin</Label>
                    <p className="font-medium">{formatDate(selectedEvent.endDate)}</p>
                  </div>
                </div>

                {selectedEvent.propertyName && (
                  <div>
                    <Label className="text-xs text-gray-500">Logement</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Home className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{selectedEvent.propertyName}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.guestName && (
                  <div>
                    <Label className="text-xs text-gray-500">Voyageur</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <p className="font-medium">{selectedEvent.guestName}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.status && (
                  <div>
                    <Label className="text-xs text-gray-500">Statut</Label>
                    <Badge className="mt-1" variant={
                      selectedEvent.status === "completed" ? "default" :
                      selectedEvent.status === "in_progress" ? "secondary" : "outline"
                    }>
                      {selectedEvent.status === "completed" ? "Terminé" :
                       selectedEvent.status === "in_progress" ? "En cours" :
                       selectedEvent.status === "pending" ? "En attente" :
                       selectedEvent.status}
                    </Badge>
                  </div>
                )}

                {selectedEvent.reason && (
                  <div>
                    <Label className="text-xs text-gray-500">Notes</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedEvent.reason}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CalendarAirbnb;

