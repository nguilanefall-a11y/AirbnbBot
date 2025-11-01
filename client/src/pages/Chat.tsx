import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MessageSquare, Send, Bot, User, Plus, Settings, Home } from "lucide-react";
import type { Property, Conversation, Message } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { chatWebSocket } from "@/lib/websocket";

export default function Chat() {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedConversation, setSelectedConversation] = useState<string>("");
  const [message, setMessage] = useState("");
  const [newGuestName, setNewGuestName] = useState("");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations/property", selectedProperty],
    enabled: !!selectedProperty,
  });

  const { data: messages } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedConversation],
    enabled: !!selectedConversation,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (guestName: string) => {
      const res = await apiRequest("POST", "/api/conversations", { propertyId: selectedProperty, guestName });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/property", selectedProperty] });
      setSelectedConversation(data.id);
      setIsNewConversationOpen(false);
      setNewGuestName("");
      toast({
        title: "Conversation créée",
        description: "Nouvelle conversation démarrée",
      });
    },
  });

  // WebSocket setup
  useEffect(() => {
    chatWebSocket.connect();
    setIsWebSocketConnected(chatWebSocket.getConnectionStatus());

    const messageUnsubscribe = chatWebSocket.onMessage((data) => {
      // Update messages cache with new messages
      queryClient.invalidateQueries({ queryKey: ["/api/messages", data.userMessage.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/property", selectedProperty] });
    });

    const errorUnsubscribe = chatWebSocket.onError((error) => {
      toast({
        title: "Erreur",
        description: error,
        variant: "destructive",
      });
    });

    // Check connection status periodically
    const statusInterval = setInterval(() => {
      setIsWebSocketConnected(chatWebSocket.getConnectionStatus());
    }, 1000);

    return () => {
      messageUnsubscribe();
      errorUnsubscribe();
      clearInterval(statusInterval);
      chatWebSocket.disconnect();
    };
  }, [selectedProperty, toast]);

  useEffect(() => {
    if (properties && properties.length > 0 && !selectedProperty) {
      setSelectedProperty(properties[0].id);
    }
  }, [properties, selectedProperty]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !selectedConversation) return;
    
    // Send via WebSocket if connected, otherwise fall back to REST
    if (isWebSocketConnected) {
      chatWebSocket.sendMessage(selectedConversation, message);
      setMessage("");
    } else {
      // Fallback to REST API
      apiRequest("POST", "/api/messages", {
        conversationId: selectedConversation,
        content: message,
        isBot: false,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedConversation] });
        setMessage("");
      }).catch((error) => {
        toast({
          title: "Erreur",
          description: "Impossible d'envoyer le message",
          variant: "destructive",
        });
      });
    }
  };

  const handleNewConversation = () => {
    if (!newGuestName.trim()) return;
    createConversationMutation.mutate(newGuestName);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Assistant Chat</span>
            </div>
            
            {properties && properties.length > 0 && (
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="w-64" data-testid="select-property">
                  <SelectValue placeholder="Sélectionner une propriété" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/admin">
              <Button variant="outline" size="sm" data-testid="button-admin">
                <Settings className="w-4 h-4 mr-2" />
                Configuration
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-home">
                <Home className="w-4 h-4 mr-2" />
                Accueil
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-6 py-6 flex gap-6 overflow-hidden">
        <div className="w-80 flex flex-col gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Conversations</h3>
              <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-new-conversation">
                    <Plus className="w-4 h-4 mr-1" />
                    Nouveau
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvelle conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="guestName">Nom du voyageur</Label>
                      <Input
                        id="guestName"
                        value={newGuestName}
                        onChange={(e) => setNewGuestName(e.target.value)}
                        placeholder="Jean Dupont"
                        onKeyPress={(e) => e.key === 'Enter' && handleNewConversation()}
                        data-testid="input-guest-name"
                      />
                    </div>
                    <Button
                      onClick={handleNewConversation}
                      className="w-full"
                      disabled={createConversationMutation.isPending}
                      data-testid="button-create-conversation"
                    >
                      Créer la conversation
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg hover-elevate transition-all",
                    selectedConversation === conv.id ? "bg-primary text-primary-foreground" : ""
                  )}
                  data-testid={`button-conversation-${conv.id}`}
                >
                  <p className="font-medium">{conv.guestName}</p>
                  <p className={cn(
                    "text-xs",
                    selectedConversation === conv.id ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {formatTime(conv.lastMessageAt)}
                  </p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    {conversations?.find(c => c.id === selectedConversation)?.guestName}
                  </h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="gap-1">
                      <Bot className="w-3 h-3" />
                      IA Active
                    </Badge>
                    {isWebSocketConnected && (
                      <Badge variant="secondary" className="gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Temps réel
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto">
                {messages?.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3 mb-4", msg.isBot ? "justify-start" : "justify-end")}>
                    {msg.isBot && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <div className="w-full h-full bg-primary flex items-center justify-center">
                          <Bot className="w-5 h-5 text-primary-foreground" />
                        </div>
                      </Avatar>
                    )}
                    
                    <div className={cn("flex flex-col max-w-[65%]", !msg.isBot && "items-end")}>
                      <div
                        className={cn(
                          "px-4 py-3 rounded-2xl",
                          msg.isBot 
                            ? "bg-muted text-foreground rounded-tl-sm" 
                            : "bg-primary text-primary-foreground rounded-tr-sm"
                        )}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 px-1">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    
                    {!msg.isBot && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-accent">
                          <User className="w-5 h-5" />
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
                    placeholder="Tapez votre message..."
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Sélectionnez ou créez une conversation</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
