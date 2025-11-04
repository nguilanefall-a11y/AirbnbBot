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
import { MessageSquare, Send, Bot, User, Plus, Sparkles } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: property, isLoading: isLoadingProperty } = useQuery<Property>({
    queryKey: ["/api/properties/by-key", accessKey],
    enabled: !!accessKey,
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
          <Card className="h-full flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{property.name}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="gap-1">
                    <Bot className="w-3 h-3" />
                    Assistant IA
                  </Badge>
                  {isWebSocketConnected && (
                    <Badge variant="secondary" className="gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Temps réel
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedConversation("")}
                data-testid="button-back"
              >
                Retour
              </Button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {messages?.map((msg, index) => (
                  <motion.div 
                    key={msg.id} 
                    className={cn("flex gap-3 mb-4", msg.isBot ? "justify-start" : "justify-end")}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ 
                      duration: 0.3,
                      delay: index * 0.05,
                      ease: "easeOut"
                    }}
                  >
                    {msg.isBot && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                    )}
                    <motion.div 
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                        msg.isBot ? "bg-muted" : "bg-primary text-primary-foreground"
                      )}
                      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <span className={cn("text-xs opacity-70 mt-1 block", msg.isBot ? "text-muted-foreground" : "text-primary-foreground/70")}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </motion.div>
                    {!msg.isBot && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-accent">
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <motion.div 
              className="p-4 border-t"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex gap-2">
                <Input
                  placeholder="Tapez votre question..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  data-testid="input-message"
                  className="transition-all duration-200 focus:scale-[1.01]"
                />
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="icon"
                    onClick={handleSend}
                    data-testid="button-send"
                    className="relative overflow-hidden"
                  >
                    <motion.div
                      animate={message.trim() ? {
                        scale: [1, 1.2, 1],
                        rotate: [0, -10, 10, 0]
                      } : {}}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Send className="w-4 h-4" />
                    </motion.div>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </Card>
        )}
      </div>
    </div>
  );
}
