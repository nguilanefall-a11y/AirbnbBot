import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles } from "lucide-react";
import ChatMessage from "./ChatMessage";

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, message: "Bonjour! Comment puis-je vous aider?", isBot: true, timestamp: "10:00" }
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    const newMessage = {
      id: messages.length + 1,
      message: message,
      isBot: false,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, newMessage]);
    setMessage("");
    
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        message: "Merci pour votre message! Je suis l'assistant IA et je peux vous aider avec des informations sur la propriété, le check-in, les équipements, et plus encore.",
        isBot: true,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const quickReplies = ["Check-in", "WiFi", "Parking", "Équipements"];

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Assistant Airbnb</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              IA Active
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} {...msg} />
        ))}
      </div>
      
      <div className="p-4 border-t space-y-3">
        <div className="flex flex-wrap gap-2">
          {quickReplies.map((reply) => (
            <Button
              key={reply}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setMessage(reply)}
              data-testid={`button-quick-${reply.toLowerCase()}`}
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
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            data-testid="input-chat-message"
          />
          <Button 
            size="icon"
            onClick={handleSend}
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
