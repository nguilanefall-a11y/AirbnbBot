import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Sparkles, Loader2, Bot, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatMessage from "./ChatMessage";

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState([
    { id: 1, message: "Bonjour ! 👋 Je suis l'assistant IA de l'Appartement Élégant Paris 8e - Champs-Élysées. Je peux répondre à plus de 1000 questions pré-configurées sur tous les aspects de votre séjour, et je m'adapte en temps réel à vos questions spécifiques ! WiFi, équipements, check-in, restaurants, transports, tourisme, ou tout autre sujet - n'hésitez pas à me poser n'importe quelle question !", isBot: true, timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        // Try to get error message from response
        let errorMessage = 'Failed to get response';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      
      if (!data.botMessage) {
        throw new Error('No response from AI service');
      }
      
      const botResponse = {
        id: messages.length + 2,
        message: data.botMessage,
        isBot: true,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error?.message || "Désolé, une erreur s'est produite. Veuillez réessayer.";
      const errorResponse = {
        id: messages.length + 2,
        message: `❌ ${errorMessage}`,
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
    "Où sont les restaurants à proximité ?",
    "Comment utiliser la climatisation ?",
    "Où se garer ?",
    "Où faire les courses ?",
    "Quels sont les transports en commun ?"
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="flex flex-col h-[700px] overflow-hidden shadow-2xl border-2 bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header with glassmorphism */}
        <motion.div 
          className="p-5 border-b border-border/50 bg-background/95 backdrop-blur-xl"
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
                <h3 className="font-bold text-lg">Appartement Paris 8e - Champs-Élysées</h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Bot className="w-3 h-3" />
                    Assistant IA
                  </Badge>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <motion.div 
                      className="w-2 h-2 bg-green-500 rounded-full"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    En ligne
                  </Badge>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Sparkles className="w-3 h-3" />
                    1000+ questions
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Messages area with gradient background */}
        <div className="flex-1 p-6 overflow-y-auto relative bg-gradient-to-b from-background via-background to-muted/10">
          {/* Subtle gradient decoration */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <AnimatePresence mode="popLayout">
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    duration: 0.4,
                    delay: index * 0.05,
                    ease: "easeOut"
                  }}
                >
                  <ChatMessage {...msg} />
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 mb-4"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-muted rounded-tl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">L'IA réfléchit...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Quick replies */}
        <div className="px-6 pt-4 pb-2 border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="flex flex-wrap gap-2 mb-3">
            {quickReplies.map((reply, index) => (
              <motion.div
                key={reply}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-full hover:bg-primary hover:text-primary-foreground transition-all"
                  onClick={() => {
                    setMessage(reply);
                    setTimeout(() => handleSend(), 100);
                  }}
                  disabled={isLoading}
                  data-testid={`button-quick-${reply.toLowerCase().replace(/\s+/g, '-').replace(/[?]/g, '')}`}
                >
                  {reply}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Input area with glassmorphism */}
        <motion.div 
          className="p-5 border-t border-border/50 bg-background/95 backdrop-blur-xl"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Input
                placeholder="Posez votre question sur l'appartement..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                data-testid="input-chat-message"
                className="text-base rounded-2xl border-2 transition-all duration-300 focus:scale-[1.01] focus:shadow-lg pr-12 bg-background/50 backdrop-blur-sm"
                disabled={isLoading}
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
                disabled={isLoading || !message.trim()}
                data-testid="button-send-message"
                className="rounded-2xl relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-primary to-primary/80 w-12 h-12"
              >
                {/* Shimmer effect on hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                ) : (
                  <motion.div
                    animate={message.trim() ? {
                      scale: [1, 1.2, 1],
                      rotate: [0, -10, 10, 0]
                    } : {}}
                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <Send className="w-5 h-5 relative z-10" />
                  </motion.div>
                )}
              </Button>
            </motion.div>
          </div>
          
          {/* Quick tip */}
          <motion.p 
            className="text-xs text-muted-foreground mt-3 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <MessageSquare className="w-3 h-3" />
            Plus de 1000 questions pré-configurées + adaptations en temps réel. Demandez-moi n'importe quoi !
          </motion.p>
        </motion.div>
      </Card>
    </motion.div>
  );
}
