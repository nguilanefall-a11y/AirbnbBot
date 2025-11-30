import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MessageSquare, Send, Bot, User, Plus, Sparkles, Video, Plane, ChevronDown, ChevronUp } from "lucide-react";
import type { Property, Conversation, Message } from "@shared/schema";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { chatWebSocket } from "@/lib/websocket";
import heroImage from "@assets/stock_images/beautiful_welcoming__f0be1f33.jpg";
import { motion, AnimatePresence } from "framer-motion";

export default function Guest() {
  const { toast } = useToast();
  const [, params] = useRoute("/guest/:accessKey");
  const accessKey = params?.accessKey || "";
  
  const [selectedConversation, setSelectedConversation] = useState<string>("");
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isArrivalInfoExpanded, setIsArrivalInfoExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: property, isLoading: isLoadingProperty } = useQuery<Property>({
    queryKey: ["/api/properties/by-key", accessKey],
    enabled: !!accessKey,
  });

  // Check arrival eligibility (J-1 rule)
  const { data: arrivalEligibility } = useQuery<{
    eligible: boolean;
    reason: string;
    checkInDate: string | null;
    checkOutDate: string | null;
  }>({
    queryKey: ["/api/arrival-eligibility", property?.id],
    enabled: !!property?.id,
  });

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations/property", property?.id],
    enabled: !!property?.id,
  });

  const { data: messages } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedConversation],
    enabled: !!selectedConversation,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!property) throw new Error("Property not found");
      const res = await apiRequest("POST", "/api/conversations", { propertyId: property.id, guestName: name });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/property", property?.id] });
      setSelectedConversation(data.id);
      setIsNameDialogOpen(false);
      toast({
        title: "Conversation créée",
        description: "Vous pouvez maintenant poser vos questions",
      });
    },
  });

  useEffect(() => {
    chatWebSocket.connect();
    setIsWebSocketConnected(chatWebSocket.getConnectionStatus());

    const messageUnsubscribe = chatWebSocket.onMessage((data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", data.userMessage.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/property", property?.id] });
    });

    const errorUnsubscribe = chatWebSocket.onError((error) => {
      toast({
        title: "Erreur",
        description: error,
        variant: "destructive",
      });
    });

    const statusInterval = setInterval(() => {
      setIsWebSocketConnected(chatWebSocket.getConnectionStatus());
    }, 1000);

    return () => {
      messageUnsubscribe();
      errorUnsubscribe();
      clearInterval(statusInterval);
      chatWebSocket.disconnect();
    };
  }, [property?.id, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !selectedConversation) return;
    
    if (isWebSocketConnected) {
      chatWebSocket.sendMessage(selectedConversation, message);
      setMessage("");
    } else {
      apiRequest("POST", "/api/messages", {
        conversationId: selectedConversation,
        content: message,
        isBot: false,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConversation] });
        setMessage("");
      }).catch(() => {
        toast({
          title: "Erreur",
          description: "Impossible d'envoyer le message",
          variant: "destructive",
        });
      });
    }
  };

  const handleStartConversation = () => {
    if (!guestName.trim()) return;
    createConversationMutation.mutate(guestName);
    setGuestName("");
  };

  // Helper to extract YouTube embed URL
  const getYouTubeEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    return null;
  };

  // Helper to extract Loom embed URL
  const getLoomEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    if (url.includes('loom.com/share/')) {
      return url.replace('/share/', '/embed/');
    }
    return null;
  };

  // Check if property has arrival information configured
  const hasArrivalInfo = property?.arrivalMessage || property?.arrivalVideoUrl;
  
  // Check if guest is eligible to see arrival info (J-1 rule)
  const canShowArrivalInfo = hasArrivalInfo && arrivalEligibility?.eligible;

  // Arrival Information Component
  const ArrivalInfoSection = () => {
    if (!canShowArrivalInfo || !selectedConversation) return null;
    
    const youtubeEmbedUrl = property?.arrivalVideoUrl ? getYouTubeEmbedUrl(property.arrivalVideoUrl) : null;
    const loomEmbedUrl = property?.arrivalVideoUrl ? getLoomEmbedUrl(property.arrivalVideoUrl) : null;
    const videoEmbedUrl = youtubeEmbedUrl || loomEmbedUrl;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4"
      >
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
          <button 
            className="w-full p-4 flex items-center justify-between text-left"
            onClick={() => setIsArrivalInfoExpanded(!isArrivalInfoExpanded)}
            data-testid="button-toggle-arrival-info"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Plane className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Informations d'arrivée</h3>
                <p className="text-xs text-muted-foreground">Votre guide pour accéder au logement</p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: isArrivalInfoExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          </button>
          
          <AnimatePresence>
            {isArrivalInfoExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4">
                  {videoEmbedUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Video className="w-4 h-4 text-primary" />
                        <span>Vidéo d'accès</span>
                      </div>
                      <div className="rounded-xl overflow-hidden shadow-lg">
                        <iframe
                          className="w-full aspect-video"
                          src={videoEmbedUrl}
                          title="Vidéo d'arrivée"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      </div>
                    </div>
                  )}
                  
                  {property?.arrivalMessage && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Plane className="w-4 h-4 text-primary" />
                        <span>Instructions</span>
                      </div>
                      <div className="bg-background/80 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
                        {property.arrivalMessage}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    );
  };

  if (isLoadingProperty) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2">Propriété non trouvée</h2>
            <p className="text-muted-foreground">
              Le lien que vous avez utilisé n'est pas valide. Veuillez contacter votre hôte.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!selectedConversation && (
        <div className="fixed inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Welcome background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
        </div>
      )}

      <header className={cn(
        "sticky top-0 z-50 w-full border-b",
        !selectedConversation ? "bg-black/20 backdrop-blur-md border-white/10" : "bg-background/95 backdrop-blur"
      )}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              !selectedConversation ? "bg-white/20 backdrop-blur" : "bg-primary"
            )}>
              <MessageSquare className={cn(
                "w-6 h-6",
                !selectedConversation ? "text-white" : "text-primary-foreground"
              )} />
            </div>
            <div>
              <h1 className={cn(
                "font-bold text-lg",
                !selectedConversation && "text-white"
              )}>{property.name}</h1>
              <p className={cn(
                "text-xs",
                !selectedConversation ? "text-white/70" : "text-muted-foreground"
              )}>Assistant IA</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto p-4 h-[calc(100vh-4rem)]">
        {!selectedConversation ? (
          <div className="h-full flex items-center justify-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <Card className="p-8 max-w-md w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-white/20 shadow-2xl">
                <motion.div 
                  className="text-center mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <motion.div 
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-4 shadow-lg"
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    <Sparkles className="w-10 h-10 text-white" />
                  </motion.div>
                  <motion.h2 
                    className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    Bienvenue chez vous !
                  </motion.h2>
                  <motion.p 
                    className="text-muted-foreground text-base leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    Je suis votre assistant personnel pour {property.name}. Je suis là pour répondre à toutes vos questions et rendre votre séjour inoubliable.
                  </motion.p>
                </motion.div>

              {conversations && conversations.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Reprendre une conversation:</p>
                  {conversations.map((conv) => (
                    <Button
                      key={conv.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setSelectedConversation(conv.id)}
                      data-testid={`button-conversation-${conv.id}`}
                    >
                      <User className="w-4 h-4 mr-2" />
                      {conv.guestName}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(conv.lastMessageAt).toLocaleDateString()}
                      </span>
                    </Button>
                  ))}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full mt-4 h-12 text-base" size="lg" data-testid="button-start-conversation">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Commencer la conversation
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl text-center">Ravi de vous rencontrer ! 👋</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <p className="text-center text-muted-foreground text-sm">
                      Pour personnaliser notre échange, comment puis-je vous appeler ?
                    </p>
                    <div>
                      <Label htmlFor="guest-name">Votre prénom</Label>
                      <Input
                        id="guest-name"
                        placeholder="Ex: Marie, John, 玛丽..."
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleStartConversation()}
                        data-testid="input-guest-name"
                        className="text-base"
                      />
                    </div>
                    <Button
                      className="w-full h-11"
                      onClick={handleStartConversation}
                      disabled={createConversationMutation.isPending}
                      data-testid="button-create-conversation"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      C'est parti !
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </Card>
            </motion.div>
          </div>
        ) : (
          <motion.div 
            className="h-full flex flex-col"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Arrival Information Section */}
            <ArrivalInfoSection />
            
            {/* Chat Container */}
            <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background to-muted/20 rounded-3xl shadow-2xl overflow-hidden border border-border/50">
            {/* Header with glassmorphism effect */}
            <motion.div 
              className="p-5 border-b border-border/50 bg-background/80 backdrop-blur-xl"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-lg">{property.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Bot className="w-3 h-3" />
                        Assistant IA
                      </Badge>
                      {isWebSocketConnected && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <motion.div 
                            className="w-2 h-2 bg-green-500 rounded-full"
                            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          Temps réel
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversation("")}
                    data-testid="button-back"
                    className="rounded-xl"
                  >
                    Retour
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* Messages area with gradient background */}
            <div className="flex-1 p-6 overflow-y-auto relative">
              {/* Subtle gradient decoration */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <AnimatePresence mode="popLayout">
                  {messages?.map((msg, index) => (
                    <motion.div 
                      key={msg.id} 
                      className={cn("flex gap-3 mb-6", msg.isBot ? "justify-start" : "justify-end")}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ 
                        duration: 0.4,
                        delay: index * 0.05,
                        ease: "easeOut"
                      }}
                    >
                      {msg.isBot && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        >
                          <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                              <Bot className="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                      )}
                      <motion.div 
                        className={cn(
                          "max-w-[75%] rounded-3xl px-5 py-3 shadow-md relative",
                          msg.isBot 
                            ? "bg-gradient-to-br from-muted to-muted/80 backdrop-blur-sm" 
                            : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-primary/25"
                        )}
                        whileHover={{ 
                          scale: 1.02, 
                          y: -2,
                          transition: { duration: 0.2 } 
                        }}
                      >
                        {/* Glassmorphism effect for bot messages */}
                        {msg.isBot && (
                          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                        )}
                        
                        <p className="text-sm leading-relaxed whitespace-pre-wrap relative z-10">{msg.content}</p>
                        <span className={cn(
                          "text-xs opacity-70 mt-2 block relative z-10", 
                          msg.isBot ? "text-muted-foreground" : "text-primary-foreground/80"
                        )}>
                          {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </motion.div>
                      {!msg.isBot && (
                        <motion.div
                          initial={{ scale: 0, rotate: 180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        >
                          <Avatar className="w-10 h-10 ring-2 ring-accent/20">
                            <AvatarFallback className="bg-gradient-to-br from-accent to-accent/70">
                              <User className="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Modern input area with glassmorphism */}
            <motion.div 
              className="p-5 border-t border-border/50 bg-background/95 backdrop-blur-xl"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Posez votre question..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    data-testid="input-message"
                    className="text-base rounded-2xl border-2 transition-all duration-300 focus:scale-[1.01] focus:shadow-lg pr-12 bg-background/50 backdrop-blur-sm"
                  />
                  {message.trim() && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Sparkles className="w-3 h-3" />
                        IA prête
                      </Badge>
                    </motion.div>
                  )}
                </div>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9, rotate: -5 }}
                >
                  <Button
                    size="icon"
                    onClick={handleSend}
                    data-testid="button-send"
                    className="rounded-2xl relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-primary to-primary/80"
                  >
                    {/* Shimmer effect on hover */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                    />
                    <motion.div
                      animate={message.trim() ? {
                        scale: [1, 1.2, 1],
                        rotate: [0, -10, 10, 0]
                      } : {}}
                      transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Send className="w-4 h-4 relative z-10" />
                    </motion.div>
                  </Button>
                </motion.div>
              </div>
              
              {/* Quick tips */}
              <motion.p 
                className="text-xs text-muted-foreground mt-3 flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Sparkles className="w-3 h-3" />
                Demandez-moi n'importe quoi sur {property.name}
              </motion.p>
            </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
