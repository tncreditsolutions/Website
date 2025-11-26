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
  const [showEscalatePrompt, setShowEscalatePrompt] = useState(false);
  const [hideEscalatePrompt, setHideEscalatePrompt] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0); // Force re-render after 5 seconds
  const escalationDetectedAtRef = useRef<number | null>(null);
  const escalationMessageIdRef = useRef<string | null>(null);
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

  // Detect escalation and schedule 5-second delay
  useEffect(() => {
    const aiMessages = allMessages.filter(msg => msg.sender === "ai");
    if (aiMessages.length === 0) return;
    
    // Find the LAST/NEWEST escalated message (not the first)
    let escalatedMessage = null;
    for (let i = aiMessages.length - 1; i >= 0; i--) {
      if (aiMessages[i].isEscalated === "true") {
        escalatedMessage = aiMessages[i];
        break;
      }
    }
    
    if (escalatedMessage && escalationMessageIdRef.current !== escalatedMessage.id) {
      // NEW escalation detected
      console.log("New escalation detected, ID:", escalatedMessage.id);
      escalationMessageIdRef.current = escalatedMessage.id;
      escalationDetectedAtRef.current = Date.now();
      setShowEscalatePrompt(false); // Reset to ensure delay
      setHideEscalatePrompt(false); // Clear dismissal for new escalation
      
      // Schedule timer to trigger re-render after 5 seconds
      const timeoutId = setTimeout(() => {
        console.log("5 seconds passed, triggering re-render");
        setRenderTrigger(t => t + 1);
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    } else if (!escalatedMessage) {
      // No escalation - reset
      escalationMessageIdRef.current = null;
      escalationDetectedAtRef.current = null;
    }
  }, [allMessages]);
  
  // Compute whether to show button based on timestamp (5+ seconds passed)
  const shouldShowEscalateButton = () => {
    if (hideEscalatePrompt || isEscalated) return false;
    if (!escalationDetectedAtRef.current) return false;
    
    const elapsedMs = Date.now() - escalationDetectedAtRef.current;
    const shouldShow = elapsedMs >= 5000;
    
    if (shouldShow) {
      console.log("Computed shouldShow=true, elapsed:", elapsedMs);
    }
    
    return shouldShow;
  };
  
  // Trigger button visibility after 5 seconds (using renderTrigger to force computation)
  const showButton = shouldShowEscalateButton();

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
                              {msg.message}
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
                          setHideEscalatePrompt(true);
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
