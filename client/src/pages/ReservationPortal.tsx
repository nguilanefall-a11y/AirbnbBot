/**
 * Portail Unifié de Réservation
 * 
 * Page accessible via un lien unique envoyé au voyageur : /r/{accessKey}
 * Chat instantané sans demande de prénom
 */

import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  MessageSquare,
  Send,
  Bot,
  Home,
  Lock,
  Clock,
  Wifi,
  Key,
  Phone,
  Video,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import type { Property, Conversation, Message } from "@shared/schema";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { chatWebSocket } from "@/lib/websocket";
import { motion, AnimatePresence } from "framer-motion";

// Types pour l'API réservation
interface BookingInfo {
  id: string;
  propertyId: string;
  guestName: string | null;
  checkInDate: string;
  checkOutDate: string;
  status: string;
}

interface ReservationData {
  booking: BookingInfo;
  property: Property;
  arrivalInfo: {
    unlocked: boolean;
    unlocksAt: string;
    hoursUntilUnlock: number;
    message: string;
  };
  canChat: boolean;
}

// Composant Typing Indicator
const TypingIndicator = () => (
  <motion.div
    className="flex gap-3 justify-start"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
  >
    <Avatar className="w-10 h-10 ring-2 ring-primary/20">
      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
        <Bot className="w-5 h-5" />
      </AvatarFallback>
    </Avatar>
    <div className="bg-gradient-to-br from-muted to-muted/80 rounded-2xl rounded-tl-md px-5 py-3 shadow-sm">
      <div className="flex items-center gap-1.5">
        <motion.div
          className="w-2 h-2 bg-primary/60 rounded-full"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-primary/60 rounded-full"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-primary/60 rounded-full"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </div>
  </motion.div>
);

export default function ReservationPortal() {
  const { toast } = useToast();
  const [, params] = useRoute("/r/:accessKey/:section?");
  const accessKey = params?.accessKey || "";
  const section = params?.section || "accueil";

  // États
  const [activeTab, setActiveTab] = useState(section === "livre-accueil" ? "guestbook" : "chat");
  const [selectedConversation, setSelectedConversation] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Récupérer les données de la réservation
  const { data: reservationData, isLoading, error } = useQuery<ReservationData>({
    queryKey: ["/api/reservation", accessKey],
    enabled: !!accessKey,
  });

  // Récupérer les conversations
  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations/property", reservationData?.property?.id],
    enabled: !!reservationData?.property?.id,
  });

  // Récupérer les messages
  const { data: messages } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedConversation],
    enabled: !!selectedConversation,
  });

  // Créer une conversation automatiquement
  const createConversation = useMutation({
    mutationFn: async () => {
      if (!reservationData?.property) throw new Error("Property not found");
      const res = await apiRequest("POST", "/api/conversations", {
        propertyId: reservationData.property.id,
        guestName: "Voyageur",
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations/property", reservationData?.property?.id],
      });
      setSelectedConversation(data.id);
    },
  });

  // Sélectionner ou créer conversation
  useEffect(() => {
    if (!selectedConversation && conversations && conversations.length > 0) {
      setSelectedConversation(conversations[0].id);
    } else if (
      reservationData?.property?.id &&
      conversations !== undefined &&
      conversations.length === 0 &&
      !selectedConversation &&
      !createConversation.isPending
    ) {
      createConversation.mutate();
    }
  }, [conversations, selectedConversation, reservationData?.property?.id]);

  // WebSocket
  useEffect(() => {
    chatWebSocket.connect();
    const unsubscribe = chatWebSocket.onMessage(() => {
      setIsTyping(false);
      if (selectedConversation) {
        queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConversation] });
      }
    });
    return () => {
      unsubscribe();
      chatWebSocket.disconnect();
    };
  }, [selectedConversation]);

  // Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Envoyer message - Input NON-CONTRÔLÉ
  const sendMessage = () => {
    const input = inputRef.current;
    if (!input) return;

    const text = input.value.trim();
    if (!text || !selectedConversation || isSending) return;

    input.value = "";
    setIsSending(true);
    setIsTyping(true);

    chatWebSocket.sendMessage(selectedConversation, text);
    setIsSending(false);
  };

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-lg text-muted-foreground">Chargement de votre réservation...</p>
        </motion.div>
      </div>
    );
  }

  // Error
  if (error || !reservationData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-destructive/5 p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8 max-w-md text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-2">Lien invalide</h2>
            <p className="text-muted-foreground mb-4">
              Ce lien de réservation n'est pas valide ou a expiré.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  const { booking, property, arrivalInfo } = reservationData;
  const checkInDate = new Date(booking.checkInDate);
  const checkOutDate = new Date(booking.checkOutDate);

  // Section Livret d'accueil
  const GuestBookSection = () => (
    <div className="space-y-6 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 bg-gradient-to-br from-card to-primary/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Home className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{property.name}</h2>
              <p className="text-muted-foreground">{property.address}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Check-in</p>
              <p className="font-semibold">{checkInDate.toLocaleDateString("fr-FR")}</p>
              <p className="text-sm text-primary">{property.checkInTime || "15:00"}</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Check-out</p>
              <p className="font-semibold">{checkOutDate.toLocaleDateString("fr-FR")}</p>
              <p className="text-sm text-primary">{property.checkOutTime || "11:00"}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {arrivalInfo.unlocked ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {/* Code d'accès */}
          {property.doorCode && (
            <Card className="p-5 bg-gradient-to-br from-card to-green-500/5 border-l-4 border-l-green-500">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Code d'accès</p>
                  <p className="text-2xl font-bold tracking-widest">{property.doorCode}</p>
                </div>
              </div>
            </Card>
          )}

          {/* WiFi */}
          {property.wifiName && (
            <Card className="p-5 mt-4 bg-gradient-to-br from-card to-blue-500/5">
              <div className="flex items-center gap-3 mb-3">
                <Wifi className="w-6 h-6 text-blue-500" />
                <span className="font-semibold">WiFi</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Réseau</p>
                  <p className="font-medium">{property.wifiName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mot de passe</p>
                  <p className="font-medium">{property.wifiPassword}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Contact */}
          {property.hostPhone && (
            <Card className="p-5 mt-4">
              <div className="flex items-center gap-3">
                <Phone className="w-6 h-6 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Contact hôte</p>
                  <a href={`tel:${property.hostPhone}`} className="font-medium text-primary hover:underline">
                    {property.hostPhone}
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* Vidéo d'arrivée */}
          {property.arrivalVideoUrl && (
            <Card className="p-5 mt-4">
              <div className="flex items-center gap-3 mb-3">
                <Video className="w-6 h-6 text-purple-500" />
                <span className="font-semibold">Vidéo d'arrivée</span>
              </div>
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <iframe
                  src={property.arrivalVideoUrl}
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            </Card>
          )}

          {/* Procédure d'arrivée */}
          {property.checkInProcedure && (
            <Card className="p-5 mt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Instructions d'arrivée
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{property.checkInProcedure}</p>
            </Card>
          )}

          {/* Règles */}
          {property.houseRules && (
            <Card className="p-5 mt-4 border-l-4 border-l-amber-500">
              <h3 className="font-semibold mb-3">⚠️ Règles de la maison</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{property.houseRules}</p>
            </Card>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-8 text-center bg-gradient-to-br from-card to-amber-500/5">
            <Lock className="w-16 h-16 mx-auto mb-4 text-amber-500" />
            <h3 className="text-xl font-bold mb-2">Informations verrouillées</h3>
            <p className="text-muted-foreground mb-4">{arrivalInfo.message}</p>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Clock className="w-4 h-4 mr-2" />
              Disponible dans {arrivalInfo.hoursUntilUnlock}h
            </Badge>
          </Card>
        </motion.div>
      )}
    </div>
  );

  // Section Chat
  const ChatSection = () => (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(!messages || messages.length === 0) && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-primary/50" />
            <h3 className="font-medium mb-2">Bienvenue !</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Je suis votre assistant. Posez-moi vos questions !
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Code WiFi ?", "Heure check-out ?", "Parking ?"].map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    if (inputRef.current) {
                      inputRef.current.value = q;
                      sendMessage();
                    }
                  }}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages?.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex gap-3", msg.isBot ? "justify-start" : "justify-end")}
          >
            {msg.isBot && (
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white">
                  <Bot className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                msg.isBot
                  ? "bg-muted rounded-tl-md"
                  : "bg-primary text-primary-foreground rounded-tr-md"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </motion.div>
        ))}

        <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-background/50 backdrop-blur">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Écrivez votre message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={isSending || createConversation.isPending}
            className="rounded-full"
          />
          <Button
            onClick={sendMessage}
            disabled={isSending}
            size="icon"
            className="rounded-full"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold">{property.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {checkInDate.toLocaleDateString("fr-FR")} - {checkOutDate.toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <main className="container mx-auto max-w-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 m-4 sticky top-16 z-40 bg-background">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Discussion
            </TabsTrigger>
            <TabsTrigger value="guestbook" className="gap-2">
              <Home className="w-4 h-4" />
              Livret d'accueil
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-0">
            <ChatSection />
          </TabsContent>

          <TabsContent value="guestbook" className="mt-0">
            <GuestBookSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

