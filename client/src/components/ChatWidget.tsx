import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@shared/schema";

const VISITOR_INFO_KEY = "chat_visitor_info";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isNewVisitor, setIsNewVisitor] = useState(true);
  const { toast } = useToast();

  // Load visitor info from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(VISITOR_INFO_KEY);
    if (stored) {
      try {
        const { name: storedName, email: storedEmail } = JSON.parse(stored);
        setName(storedName);
        setEmail(storedEmail);
        setIsNewVisitor(false);
      } catch (e) {
        // Silently fail if localStorage data is corrupted
      }
    }
  }, []);

  const { data: allMessages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat"],
    refetchInterval: 2000,
  });

  // Filter messages to only show this visitor's conversation
  const messages = allMessages.filter(msg => {
    if (!email) return false;
    return msg.email === email || msg.name === name;
  });

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/chat", data);
    },
    onSuccess: () => {
      // Save visitor info for next time
      localStorage.setItem(VISITOR_INFO_KEY, JSON.stringify({ name, email }));
      setMessage("");
      toast({
        title: "Message sent!",
        description: "Your message has been received.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in your name and email",
        variant: "destructive",
      });
      return;
    }
    localStorage.setItem(VISITOR_INFO_KEY, JSON.stringify({ name: name.trim(), email: email.trim() }));
    setIsNewVisitor(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast({
        title: "Empty message",
        description: "Please type a message",
        variant: "destructive",
      });
      return;
    }

    sendMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          data-testid="button-open-chat"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      ) : (
        <Card className="w-96 shadow-xl overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
            <h3 className="font-semibold">Contact Us</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground hover:bg-primary/80"
              data-testid="button-close-chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-col h-96">
            {/* New Visitor Form */}
            {isNewVisitor ? (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Please enter your information to start the conversation:</p>
                  <form onSubmit={handleInitialSubmit} className="space-y-3">
                    <Input
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-sm"
                      data-testid="input-chat-name"
                    />
                    <Input
                      placeholder="Your email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-sm"
                      data-testid="input-chat-email"
                    />
                    <Button type="submit" className="w-full">
                      Start Chat
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <>
                {/* Message History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Loading messages...
                    </p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Start a conversation
                    </p>
                  ) : (
                    [...messages].reverse().map((msg) => (
                      <div
                        key={msg.id}
                        data-testid={`chat-message-${msg.id}`}
                        className={`text-sm flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-xs ${msg.sender === "admin" ? "text-right" : ""}`}>
                          <div className={`p-2 rounded text-sm break-words ${
                            msg.sender === "admin"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}>
                            {msg.message}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <form onSubmit={handleSend} className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="text-sm"
                      data-testid="input-chat-message"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={sendMutation.isPending}
                      data-testid="button-send-chat"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
