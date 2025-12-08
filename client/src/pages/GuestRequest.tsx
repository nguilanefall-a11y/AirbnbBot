/**
 * Page de Demande Spéciale Voyageur
 * 
 * Accessible via un LIEN UNIQUE envoyé au voyageur.
 * C'est le SEUL canal accepté pour les demandes d'horaire (Early Check-in / Late Check-out)
 */

import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Send, 
  Loader2,
  Home,
  Calendar,
  ArrowRight,
  Sun,
  Moon,
  MessageSquare
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BookingInfo {
  booking: {
    id: string;
    checkInDate: string;
    checkOutDate: string;
    guestName: string;
  };
  property: {
    name: string;
    checkInTime: string;
    checkOutTime: string;
  };
  existingRequests: Array<{
    id: string;
    type: string;
    requestedTime: string;
    status: string;
    responseMessage?: string;
    createdAt: string;
  }>;
  canRequestEarlyCheckIn: boolean;
  canRequestLateCheckOut: boolean;
}

export default function GuestRequest() {
  const { token } = useParams<{ token: string }>();
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [requestType, setRequestType] = useState<"early_checkin" | "late_checkout" | null>(null);
  const [requestedTime, setRequestedTime] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchBookingInfo();
  }, [token]);

  const fetchBookingInfo = async () => {
    try {
      const res = await fetch(`/api/guest-request/${token}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Lien invalide ou expiré. Veuillez contacter votre hôte.");
        } else {
          setError("Une erreur est survenue. Veuillez réessayer.");
        }
        return;
      }
      const data = await res.json();
      setBookingInfo(data);
    } catch (err) {
      setError("Impossible de charger les informations de réservation.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!requestType || !requestedTime) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/guest-request/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          requestedTime,
          message: message || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Impossible de soumettre la demande");
        return;
      }

      setSubmitted(true);
      // Refresh info to show the new request
      await fetchBookingInfo();
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Generate time options
  const getTimeOptions = (type: "early_checkin" | "late_checkout") => {
    const times: string[] = [];
    if (type === "early_checkin") {
      // Early check-in: from 8:00 to standard check-in time
      for (let h = 8; h <= 14; h++) {
        times.push(`${String(h).padStart(2, '0')}:00`);
        if (h < 14) times.push(`${String(h).padStart(2, '0')}:30`);
      }
    } else {
      // Late checkout: from standard checkout to 18:00
      for (let h = 12; h <= 18; h++) {
        times.push(`${String(h).padStart(2, '0')}:00`);
        if (h < 18) times.push(`${String(h).padStart(2, '0')}:30`);
      }
    }
    return times;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de votre réservation...</p>
        </motion.div>
      </div>
    );
  }

  if (error && !bookingInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-background to-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="max-w-md border-red-200">
            <CardContent className="pt-6 text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Oups !</h2>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!bookingInfo) return null;

  const { booking, property, existingRequests, canRequestEarlyCheckIn, canRequestLateCheckOut } = bookingInfo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-4"
          >
            <Home className="w-8 h-8" />
            <h1 className="text-2xl font-bold">{property.name}</h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-primary-foreground/80"
          >
            Bonjour {booking.guestName} ! Gérez vos horaires d'arrivée et de départ.
          </motion.p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Reservation Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Votre séjour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                    <Sun className="w-4 h-4" />
                    <span className="font-medium">Arrivée</span>
                  </div>
                  <p className="text-sm">{formatDate(booking.checkInDate)}</p>
                  <p className="text-lg font-bold">{property.checkInTime}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                    <Moon className="w-4 h-4" />
                    <span className="font-medium">Départ</span>
                  </div>
                  <p className="text-sm">{formatDate(booking.checkOutDate)}</p>
                  <p className="text-lg font-bold">{property.checkOutTime}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Existing Requests */}
        {existingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Vos demandes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {existingRequests.map(request => (
                    <div 
                      key={request.id} 
                      className={`p-4 rounded-lg border ${
                        request.status === "accepted" 
                          ? "bg-green-50 border-green-200 dark:bg-green-950/20" 
                          : request.status === "refused"
                          ? "bg-red-50 border-red-200 dark:bg-red-950/20"
                          : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {request.type === "early_checkin" ? (
                            <Sun className="w-4 h-4" />
                          ) : (
                            <Moon className="w-4 h-4" />
                          )}
                          <span className="font-medium">
                            {request.type === "early_checkin" ? "Early Check-in" : "Late Check-out"}: {request.requestedTime}
                          </span>
                        </div>
                        <Badge variant={
                          request.status === "accepted" ? "default" :
                          request.status === "refused" ? "destructive" : "secondary"
                        }>
                          {request.status === "accepted" ? "Accepté" :
                           request.status === "refused" ? "Refusé" : "En attente"}
                        </Badge>
                      </div>
                      {request.responseMessage && (
                        <p className="text-sm text-muted-foreground">
                          {request.responseMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Request Form */}
        {(canRequestEarlyCheckIn || canRequestLateCheckOut) && !submitted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Faire une demande
                </CardTitle>
                <CardDescription>
                  Demandez un changement d'horaire. Notre équipe vous répondra rapidement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Request Type */}
                <div className="space-y-3">
                  <Label>Type de demande</Label>
                  <RadioGroup
                    value={requestType || ""}
                    onValueChange={(v) => {
                      setRequestType(v as "early_checkin" | "late_checkout");
                      setRequestedTime("");
                    }}
                  >
                    {canRequestEarlyCheckIn && (
                      <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="early_checkin" id="early" />
                        <Label htmlFor="early" className="flex items-center gap-3 cursor-pointer flex-1">
                          <Sun className="w-5 h-5 text-orange-500" />
                          <div>
                            <p className="font-medium">Early Check-in</p>
                            <p className="text-sm text-muted-foreground">
                              Arriver avant {property.checkInTime}
                            </p>
                          </div>
                        </Label>
                      </div>
                    )}
                    {canRequestLateCheckOut && (
                      <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="late_checkout" id="late" />
                        <Label htmlFor="late" className="flex items-center gap-3 cursor-pointer flex-1">
                          <Moon className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="font-medium">Late Check-out</p>
                            <p className="text-sm text-muted-foreground">
                              Partir après {property.checkOutTime}
                            </p>
                          </div>
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>

                {/* Time Selection */}
                <AnimatePresence>
                  {requestType && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <Label>Heure souhaitée</Label>
                      <Select value={requestedTime} onValueChange={setRequestedTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisissez une heure" />
                        </SelectTrigger>
                        <SelectContent>
                          {getTimeOptions(requestType).map(time => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Message */}
                <AnimatePresence>
                  {requestType && requestedTime && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <Label className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Message (optionnel)
                      </Label>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Expliquez votre demande si nécessaire..."
                        rows={3}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!requestType || !requestedTime || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer ma demande
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Success Message */}
        {submitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Demande envoyée !</h2>
                <p className="text-muted-foreground mb-4">
                  Notre équipe va traiter votre demande et vous recevrez une réponse rapidement.
                </p>
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Faire une autre demande
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* No requests available */}
        {!canRequestEarlyCheckIn && !canRequestLateCheckOut && existingRequests.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Aucune demande de changement d'horaire n'est disponible pour le moment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-sm text-muted-foreground">
        <p>Propulsé par AirbnbBot</p>
      </div>
    </div>
  );
}

