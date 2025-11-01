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
import { MessageSquare, Send, Bot, User, Plus } from "lucide-react";
import type { Property, Conversation, Message } from "@shared/schema";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { chatWebSocket } from "@/lib/websocket";

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
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{property.name}</h1>
              <p className="text-xs text-muted-foreground">Assistant IA</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto p-4 h-[calc(100vh-4rem)]">
        {!selectedConversation ? (
          <div className="h-full flex items-center justify-center">
            <Card className="p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Bienvenue!</h2>
                <p className="text-muted-foreground">
                  Je suis l'assistant virtuel de {property.hostName}. Posez-moi toutes vos questions sur {property.name}.
                </p>
              </div>

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
                  <Button className="w-full mt-4" data-testid="button-start-conversation">
                    <Plus className="w-4 h-4 mr-2" />
                    Démarrer une conversation
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Commençons!</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="guest-name">Votre prénom</Label>
                      <Input
                        id="guest-name"
                        placeholder="Ex: Marie"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleStartConversation()}
                        data-testid="input-guest-name"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleStartConversation}
                      disabled={createConversationMutation.isPending}
                      data-testid="button-create-conversation"
                    >
                      Commencer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </Card>
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
              {messages?.map((msg) => (
                <div key={msg.id} className={cn("flex gap-3 mb-4", msg.isBot ? "justify-start" : "justify-end")}>
                  {msg.isBot && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2",
                    msg.isBot ? "bg-muted" : "bg-primary text-primary-foreground"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <span className={cn("text-xs opacity-70 mt-1 block", msg.isBot ? "text-muted-foreground" : "text-primary-foreground/70")}>
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {!msg.isBot && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-accent">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Tapez votre question..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  data-testid="input-message"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
