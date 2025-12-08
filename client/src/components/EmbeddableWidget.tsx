/**
 * Widget Chat Embeddable
 * Peut être intégré sur des sites externes via iframe ou script
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2,
  Sparkles,
  Minimize2,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: number;
  content: string;
  isBot: boolean;
  timestamp: string;
}

interface EmbeddableWidgetProps {
  propertyId: string;
  primaryColor?: string;
  position?: "bottom-right" | "bottom-left";
  welcomeMessage?: string;
}

export default function EmbeddableWidget({
  propertyId,
  primaryColor = "#e11d48",
  position = "bottom-right",
  welcomeMessage = "Bonjour ! 👋 Comment puis-je vous aider ?",
}: EmbeddableWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content: welcomeMessage,
      isBot: true,
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: messages.length + 1,
      content: message,
      isBot: false,
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/widget-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, message: userMessage.content }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();

      const botMessage: Message = {
        id: messages.length + 2,
        content: data.response || "Désolé, une erreur s'est produite.",
        isBot: true,
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: messages.length + 2,
        content: "❌ Désolé, je ne peux pas répondre pour le moment. Réessayez plus tard.",
        isBot: true,
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const positionClasses = position === "bottom-right" 
    ? "right-4 sm:right-6" 
    : "left-4 sm:left-6";

  return (
    <div className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50`}>
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? "auto" : "500px",
            }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
            style={{ 
              boxShadow: `0 25px 50px -12px ${primaryColor}30`,
            }}
          >
            {/* Header */}
            <div 
              className="p-4 flex items-center justify-between"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Assistant IA</h3>
                  <p className="text-xs opacity-80">En ligne</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="flex-1 p-4 overflow-y-auto h-72 bg-gray-50 dark:bg-gray-800">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-3 flex ${msg.isBot ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl ${
                          msg.isBot
                            ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-tl-sm"
                            : "text-white rounded-tr-sm"
                        }`}
                        style={!msg.isBot ? { backgroundColor: primaryColor } : {}}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <span className="text-xs opacity-60 mt-1 block">
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start mb-3">
                      <div className="bg-white dark:bg-gray-700 p-3 rounded-2xl rounded-tl-sm">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSend()}
                      placeholder="Votre message..."
                      className="flex-1 rounded-full"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={isLoading || !message.trim()}
                      className="rounded-full w-10 h-10 p-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-center text-gray-400 mt-2">
                    Propulsé par AirbnbBot
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
        style={{ 
          backgroundColor: primaryColor,
          boxShadow: `0 10px 40px ${primaryColor}50`,
        }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageSquare className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}


