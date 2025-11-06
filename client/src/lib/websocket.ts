import type { Message } from "@shared/schema";

type MessageHandler = (data: { userMessage: Message; botMessage: Message }) => void;
type ErrorHandler = (error: string) => void;

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private isConnected = false;

  connect() {
    if (this.ws && this.isConnected) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = (window.location && window.location.hostname) || 'localhost';
    const port = (window.location && (window.location as any).port) || '5000';
    const host = `${hostname}:${port}`;
    const wsUrl = `${protocol}//${host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.isConnected = true;
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "messages") {
          this.messageHandlers.forEach(handler => handler(data));
        } else if (data.type === "error") {
          this.errorHandlers.forEach(handler => handler(data.message));
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.isConnected = false;
    };

    this.ws.onclose = () => {
      console.log("WebSocket disconnected");
      this.isConnected = false;
      
      // Attempt to reconnect after 3 seconds
      this.reconnectTimeout = setTimeout(() => {
        console.log("Attempting to reconnect WebSocket...");
        this.connect();
      }, 3000);
    };
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  sendMessage(conversationId: string, content: string) {
    if (!this.ws || !this.isConnected) {
      console.error("WebSocket not connected");
      return;
    }

    this.ws.send(JSON.stringify({
      type: "chat_message",
      conversationId,
      content,
    }));
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onError(handler: ErrorHandler) {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export const chatWebSocket = new ChatWebSocket();
