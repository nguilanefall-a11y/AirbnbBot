import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Loader2 } from "lucide-react";
import ChatMessage from "./ChatMessage";

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, message: "Bonjour! Je suis l'assistant IA de l'Appartement Paris 11e. Comment puis-je vous aider? Vous pouvez me poser des questions sur le WiFi, les équipements, le check-in, ou n'importe quoi d'autre!", isBot: true, timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }
  ]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    
    const newMessage = {
      id: messages.length + 1,
      message: message,
      isBot: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, newMessage]);
    setMessage("");
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/demo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.message }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await res.json();
      
      const botResponse = {
        id: messages.length + 2,
        message: data.botMessage,
        isBot: true,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorResponse = {
        id: messages.length + 2,
        message: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        isBot: true,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickReplies = [
    "Comment me connecter au WiFi ?",
    "Où sont les produits de nettoyage ?",
    "Y a-t-il un canapé-lit ?",
    "Comment utiliser Netflix ?"
  ];

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
        <div>
          <h3 className="font-semibold text-lg">Assistant Airbnb IA</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" />
              IA Active
            </Badge>
            {isLoading && (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Réflexion...
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/30">
        {messages.length === 1 && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Posez votre première question pour commencer</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} {...msg} />
        ))}
        {isLoading && messages.length > 1 && (
          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin mt-1 text-muted-foreground" />
            <div className="flex gap-1">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse delay-75">●</span>
              <span className="animate-pulse delay-150">●</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t space-y-3 bg-background">
        <div className="flex flex-wrap gap-2">
          {quickReplies.map((reply) => (
            <Button
              key={reply}
              variant="outline"
              size="sm"
              className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => {
                setMessage(reply);
                setTimeout(() => handleSend(), 100);
              }}
              disabled={isLoading}
              data-testid={`button-quick-${reply.toLowerCase().replace(/\s+/g, '-').replace(/[?]/g, '')}`}
            >
              {reply}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Tapez votre message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
            disabled={isLoading}
            data-testid="input-chat-message"
            className="flex-1"
          />
          <Button 
            size="icon"
            onClick={handleSend}
            disabled={isLoading || !message.trim()}
            data-testid="button-send-message"
            className="shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
