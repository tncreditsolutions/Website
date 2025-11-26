import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@shared/schema";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmittedName, setHasSubmittedName] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!messageText.trim() || !visitorName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName,
          message: messageText,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");
      const newMessage = await response.json();
      setMessages([...messages, newMessage]);
      setMessageText("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSubmit = () => {
    if (visitorName.trim()) {
      setHasSubmittedName(true);
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg"
          size="icon"
          data-testid="button-open-chat"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-80 shadow-2xl flex flex-col max-h-96">
          <div className="flex items-center justify-between p-4 border-b bg-card">
            <h3 className="font-semibold">Live Chat</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsOpen(false);
                setHasSubmittedName(false);
                setVisitorName("");
              }}
              data-testid="button-close-chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && hasSubmittedName && (
              <div className="text-center text-sm text-muted-foreground py-4">
                Start the conversation below
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <div className="font-semibold text-xs text-muted-foreground mb-1">
                  {msg.visitorName}
                </div>
                <div className="bg-muted p-2 rounded-md text-sm break-words">
                  {msg.message}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t p-4 space-y-2">
            {!hasSubmittedName ? (
              <div className="space-y-2">
                <Input
                  placeholder="Your name"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  disabled={isLoading}
                  data-testid="input-visitor-name"
                />
                <Button
                  onClick={handleNameSubmit}
                  disabled={!visitorName.trim() || isLoading}
                  className="w-full"
                  data-testid="button-start-chat"
                >
                  Start Chat
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={isLoading}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !isLoading) {
                      handleSendMessage();
                    }
                  }}
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || isLoading}
                  size="icon"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
