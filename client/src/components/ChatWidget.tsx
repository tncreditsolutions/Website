import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, AlertCircle, Sparkles } from "lucide-react";
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
  const [escalationTime, setEscalationTime] = useState<number | null>(null);
  const [shouldShowEscalationButton, setShouldShowEscalationButton] = useState(false);
  const escalationMessageIdRef = useRef<string | null>(null);
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
    if (!email) {
      // Before email is set, no messages to show
      return false;
    }
    // Show messages from this visitor
    if (msg.email === email) return true;
    
    // Show AI messages only if no other visitor has interacted before this message
    if (msg.sender === "ai") {
      const aiMsgTime = new Date(msg.createdAt);
      
      // Check if another visitor has sent a message before this AI message
      const otherVisitorBefore = allMessages.some(m => 
        m.sender === "visitor" && 
        m.email !== email && 
        new Date(m.createdAt) < aiMsgTime
      );
      
      // If no other visitor has messaged before this AI message, show it (includes greeting)
      return !otherVisitorBefore;
    }
    
    return false;
  });

  // Check if there's an escalated AI message in this conversation
  const hasEscalation = messages.some(msg => msg.sender === "ai" && msg.isEscalated === "true");

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

  // Detect escalation and schedule 5-second delay
  useEffect(() => {
    // Only check for escalation if visitor has entered email
    if (!email || !hasEscalation) {
      return;
    }

    // If we haven't started a timer for this escalation, start one now
    if (escalationMessageIdRef.current === null) {
      console.log("Escalation detected! Starting 5-second timer");
      escalationMessageIdRef.current = "escalation-triggered";
      
      const timer = setTimeout(() => {
        console.log("5 second timer fired - showing escalation button");
        setShouldShowEscalationButton(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [email, hasEscalation]);
  
  // Show button if escalation detected AND 5 seconds have passed
  const showButton = shouldShowEscalationButton && !isEscalated;

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
      
      // Reset escalation tracking
      escalationMessageIdRef.current = null;
      setEscalationTime(null);
      setShouldShowEscalationButton(false);
      setIsEscalated(true);
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
        <Card className="w-96 shadow-2xl overflow-hidden rounded-2xl border-0">
          <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Riley</h3>
                <p className="text-xs opacity-90">TN Credit Solutions</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
              data-testid="button-close-chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-col h-96">
            {/* New Visitor Form */}
            {isNewVisitor ? (
              <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center bg-gradient-to-b from-background to-card/50">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Hey I'm Riley, your TN Credit Solutions support agent.</p>
                    <p className="text-sm text-muted-foreground">I'm here to help you with credit restoration and tax optimization. What can I help you with today?</p>
                  </div>
                  <form onSubmit={handleInitialSubmit} className="space-y-3 pt-2">
                    <Input
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-sm rounded-lg border-2 focus:ring-2"
                      data-testid="input-chat-name"
                    />
                    <Input
                      placeholder="Your email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-sm rounded-lg border-2 focus:ring-2"
                      data-testid="input-chat-email"
                    />
                    <Button type="submit" className="w-full rounded-lg font-medium">
                      Start Chat
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <>
                {/* Message History */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-background to-card/30">
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Loading messages...
                    </p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
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
                            <div className={`px-4 py-3 rounded-lg text-sm break-words font-medium ${
                              isAdmin
                                ? "bg-primary text-primary-foreground rounded-br-none shadow-md"
                                : "bg-card border border-card-border rounded-bl-none shadow-sm"
                            }`}>
                              {msg.message.replace(/\s*\[ESCALATE:(YES|NO)\]\s*$/, "")}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1.5 px-1">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Escalate Prompt */}
                {showButton && (
                  <div className="p-5 border-t border-card-border bg-gradient-to-r from-primary/8 to-primary/5 dark:from-primary/20 dark:to-primary/10 space-y-4">
                    <div className="flex items-start gap-3 relative">
                      <div className="w-9 h-9 rounded-full bg-primary/25 dark:bg-primary/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <h4 className="font-semibold text-sm text-foreground">Connect with a Specialist</h4>
                        <p className="text-xs text-muted-foreground mt-1.5">Get personalized guidance for your unique situation</p>
                      </div>
                      <button
                        onClick={() => {
                          escalationMessageIdRef.current = null;
                          setEscalationTime(null);
                          setShouldShowEscalationButton(false);
                          localStorage.setItem(ESCALATE_DISMISSED_KEY, "true");
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
                        data-testid="button-close-escalate"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Button
                      onClick={handleEscalate}
                      className="w-full rounded-lg font-medium"
                      data-testid="button-escalate-support"
                    >
                      Talk to a Specialist
                    </Button>
                  </div>
                )}

                {/* Message Input */}
                <div className="p-5 border-t border-card-border bg-gradient-to-b from-background to-card/40 space-y-2">
                  <form onSubmit={handleSend} className="flex gap-2.5">
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="text-sm rounded-lg border-2 focus:ring-2"
                      data-testid="input-chat-message"
                      disabled={isEscalated}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={sendMutation.isPending || isEscalated}
                      className="rounded-lg"
                      data-testid="button-send-chat"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                  {isEscalated && (
                    <p className="text-xs text-muted-foreground px-2 py-1.5 bg-card/50 rounded-md border border-card-border">
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
