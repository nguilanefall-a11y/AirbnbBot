import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  timestamp: string;
}

export default function ChatMessage({ message, isBot, timestamp }: ChatMessageProps) {
  return (
    <div className={cn("flex gap-3 mb-4", isBot ? "justify-start" : "justify-end")}>
      {isBot && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <div className="w-full h-full bg-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
        </Avatar>
      )}
      
      <div className={cn("flex flex-col max-w-[65%]", !isBot && "items-end")}>
        <div
          className={cn(
            "px-4 py-3 rounded-2xl",
            isBot 
              ? "bg-muted text-foreground rounded-tl-sm" 
              : "bg-primary text-primary-foreground rounded-tr-sm"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message
              .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold**
              .replace(/\*(.*?)\*/g, '$1') // Remove *italic*
              .replace(/_(.*?)_/g, '$1') // Remove _italic_
              .replace(/~~(.*?)~~/g, '$1') // Remove ~~strikethrough~~
              .replace(/`(.*?)`/g, '$1') // Remove `code`
              .replace(/#{1,6}\s/g, '') // Remove markdown headers
            }
          </p>
        </div>
        <span className="text-xs text-muted-foreground mt-1 px-1">{timestamp}</span>
      </div>
      
      {!isBot && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-accent">
            <User className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
