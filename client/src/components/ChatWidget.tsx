import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@shared/schema";

const VISITOR_INFO_KEY = "chat_visitor_info";
const ESCALATE_DISMISSED_KEY = "chat_escalate_dismissed";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isNewVisitor, setIsNewVisitor] = useState(true);
  const [isEscalated, setIsEscalated] = useState(false);
  const [showEscalatePrompt, setShowEscalatePrompt] = useState(false);
  const [hideEscalatePrompt, setHideEscalatePrompt] = useState(false);
  const { toast } = useToast();

  // Load visitor info and escalate dismissal state from localStorage on mount
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
    
    // Restore escalate dismissal state
    const dismissed = localStorage.getItem(ESCALATE_DISMISSED_KEY);
    if (dismissed === "true") {
      setHideEscalatePrompt(true);
    }
  }, []);

  const { data: allMessages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat"],
    refetchInterval: 2000,
  });

  // Filter messages to only show this visitor's conversation
  const messages = allMessages.filter(msg => {
    if (!email) return false;
    // Show visitor's own messages OR admin/AI replies
    return msg.email === email || msg.sender === "admin" || msg.sender === "ai" || msg.email === "support@tncreditsolutions.com";
  });

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/chat", data);
    },
    onSuccess: () => {
      // Save visitor info for next time
      localStorage.setItem(VISITOR_INFO_KEY, JSON.stringify({ name, email }));
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

  // Show escalate prompt after 1 minute of AI response, or immediately if escalated
  useEffect(() => {
    const aiMessages = allMessages.filter(msg => msg.sender === "ai");
    if (aiMessages.length === 0) return;
    
    // Check if any AI message is marked as escalated (urgent situation from Riley)
    const hasEscalated = aiMessages.some(msg => msg.isEscalated === "true");
    
    if (hasEscalated) {
      // Show immediately for urgent situations - ALWAYS show, even if previously dismissed
      setShowEscalatePrompt(true);
      setHideEscalatePrompt(false); // Reset dismissal state for new urgent escalations
    } else {
      // For non-urgent situations, only show if not already shown and not dismissed by user
      if (showEscalatePrompt || hideEscalatePrompt) return;
      
      // Otherwise delay showing escalation prompt by 1 minute (60000ms)
      const timer = setTimeout(() => setShowEscalatePrompt(true), 60000);
      return () => clearTimeout(timer);
    }
  }, [allMessages]);

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in your name and email",
        variant: "destructive",
      });
      return;
    }
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    localStorage.setItem(VISITOR_INFO_KEY, JSON.stringify({ name: trimmedName, email: trimmedEmail }));
    
    // Send greeting message from AI agent
    try {
      await apiRequest("POST", "/api/chat", {
        name: "Riley",
        email: "support@tncreditsolutions.com",
        message: `Hi ${trimmedName}! How can I help you today?`,
        sender: "ai",
        isEscalated: "false",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    } catch (error) {
      console.error("Failed to send greeting:", error);
    }
    
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

    // Clear the input immediately for better UX
    const messageToSend = message.trim();
    setMessage("");
    
    sendMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      message: messageToSend,
    });
  };

  const handleEscalate = async () => {
    try {
      // Send friendly escalation message from Riley
      await apiRequest("POST", "/api/chat", {
        name: "Riley",
        email: "support@tncreditsolutions.com",
        message: "Perfect! I've connected you with our specialist team. They'll review your situation and get back to you shortly with personalized guidance. Thank you for choosing TN Credit Solutions!",
        sender: "ai",
        isEscalated: "true",
      });
      
      setIsEscalated(true);
      setShowEscalatePrompt(false);
      setHideEscalatePrompt(true);
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect with specialist",
        variant: "destructive",
      });
    }
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
                  <p className="text-sm text-muted-foreground">Hey I'm Riley, your TN Credit Solutions support agent. I'm here to help you navigate credit restoration and tax optimization. What can I help you with today?</p>
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
                    [...messages].reverse().map((msg) => {
                      const isAdmin = msg.sender === "admin" || msg.sender === "ai" || msg.email === "support@tncreditsolutions.com";
                      return (
                        <div
                          key={msg.id}
                          data-testid={`chat-message-${msg.id}`}
                          className={`text-sm flex ${isAdmin ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-xs ${isAdmin ? "text-right" : ""}`}>
                            <div className={`p-2 rounded text-sm break-words ${
                              isAdmin
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
                      );
                    })
                  )}
                </div>

                {/* Escalate Prompt */}
                {showEscalatePrompt && !isEscalated && !hideEscalatePrompt && (
                  <div className="p-4 border-t bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/20 dark:to-primary/30 space-y-3">
                    <div className="flex items-start gap-3 relative">
                      <div className="w-8 h-8 rounded-full bg-primary/20 dark:bg-primary/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageCircle className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">Connect with a Specialist</h4>
                        <p className="text-xs text-muted-foreground mt-1">Get personalized support for your specific needs</p>
                      </div>
                      <button
                        onClick={() => {
                          setHideEscalatePrompt(true);
                          localStorage.setItem(ESCALATE_DISMISSED_KEY, "true");
                        }}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        data-testid="button-close-escalate"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Button
                      onClick={handleEscalate}
                      className="w-full"
                      data-testid="button-escalate-support"
                    >
                      Talk to a Specialist
                    </Button>
                  </div>
                )}

                {/* Message Input */}
                <div className="p-4 border-t">
                  <form onSubmit={handleSend} className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="text-sm"
                      data-testid="input-chat-message"
                      disabled={isEscalated}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={sendMutation.isPending || isEscalated}
                      data-testid="button-send-chat"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                  {isEscalated && (
                    <p className="text-xs text-muted-foreground mt-2">
                      A support specialist is reviewing your conversation
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
