import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, AlertCircle, Sparkles, Paperclip, FileText, Download } from "lucide-react";
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
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [lastDocumentId, setLastDocumentId] = useState<string | null>(null);
  const [visitorDateForFilename, setVisitorDateForFilename] = useState<string>("");
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]); // CRITICAL: Only current session messages
  const escalationMessageIdRef = useRef<string | null>(null);
  const dismissedEscalationIdRef = useRef<string | null>(null);
  const escalationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load visitor info from localStorage on mount (name/email only, NOT messages)
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

  // Use sessionMessages for display (NOT fetched from database)
  const messages = sessionMessages;

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/chat", data);
    },
    onSuccess: async (responseBlob: any) => {
      try {
        // Parse JSON response
        const response = await responseBlob.json();
        // Add visitor message to session display only
        setSessionMessages(prev => [...prev, {
          id: response.id || `temp-${Date.now()}`,
          name: response.name || name,
          email: response.email || email,
          message: response.message,
          sender: response.sender || "visitor",
          isEscalated: response.isEscalated || "false",
          createdAt: response.createdAt || new Date().toISOString(),
        }]);
        // Save visitor info for next time
        localStorage.setItem(VISITOR_INFO_KEY, JSON.stringify({ name, email }));
      } catch (error) {
        console.error("[Chat] Error parsing response:", error);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            // Get visitor's timezone and format today's date
            const visitorTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              timeZone: visitorTimezone
            });
            const todayFormatted = formatter.format(now); // MM/DD/YYYY
            const visitorDateForFilename = todayFormatted.replace(/\//g, '-'); // MM-DD-YYYY
            
            console.log("[Upload] Timezone:", visitorTimezone, "Now UTC:", now.toISOString(), "Formatted:", todayFormatted, "For filename:", visitorDateForFilename);
            
            const response = await apiRequest("POST", "/api/documents", {
              visitorEmail: email,
              visitorName: name,
              fileName: file.name,
              fileType: file.type,
              fileContent: reader.result as string,
              visitorTimezone,
              visitorDateForFilename,
            });
            const document = await response.json();
            resolve(document);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    },
    onSuccess: async (document: any) => {
      console.log("[Upload] Document uploaded successfully:", document);
      setUploadedFileName("");
      setLastDocumentId(document.id);
      setVisitorDateForFilename(document.visitorDateForFilename);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      
      // Send AI message directing to download PDF
      if (document && document.aiAnalysis) {
        console.log("[Upload] Analysis complete, directing to PDF download");
        try {
          // Send message directing user to download the PDF
          const responseBlob = await apiRequest("POST", "/api/chat", {
            email: document.visitorEmail,
            name: "Riley",
            message: `I've completed my analysis of your ${document.fileName}. Your detailed credit analysis report is ready for download. Click the download button below to view your professional report with all findings, metrics, and personalized recommendations.`,
            sender: "ai",
            isEscalated: "false",
          });
          const response = await responseBlob.json();
          console.log("[Upload] Download message sent successfully");
          
          // Add AI message to session display
          setSessionMessages(prev => [...prev, {
            id: response.id || `temp-${Date.now()}`,
            name: "Riley",
            email: document.visitorEmail,
            message: response.message || `I've completed my analysis of your ${document.fileName}. Your detailed credit analysis report is ready for download.`,
            sender: "ai",
            isEscalated: "false",
            createdAt: response.createdAt || new Date().toISOString(),
          }]);
        } catch (error) {
          console.error("[Upload] Failed to send download message:", error);
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["application/pdf", "image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image (PNG/JPG)",
          variant: "destructive",
        });
        return;
      }
      setUploadedFileName(file.name);
      uploadMutation.mutate(file);
    }
  };

  // Detect escalation and schedule 5-second delay - only show after VISITOR responds to escalation request
  useEffect(() => {
    // Find the most recent AI message that asks for escalation
    const aiMessages = messages.filter(msg => msg.sender === "ai");
    let latestEscalationRequest = null;
    
    for (let i = aiMessages.length - 1; i >= 0; i--) {
      if (aiMessages[i].isEscalated === "true") {
        latestEscalationRequest = aiMessages[i];
        console.log("Found escalation request:", latestEscalationRequest.id);
        break;
      }
    }
    
    // If no escalation request found, reset everything
    if (!latestEscalationRequest) {
      if (escalationMessageIdRef.current !== null) {
        console.log("No escalation request found, resetting timer");
        escalationMessageIdRef.current = null;
        setShouldShowEscalationButton(false);
        if (escalationTimeoutRef.current) {
          clearTimeout(escalationTimeoutRef.current);
          escalationTimeoutRef.current = null;
        }
      }
      return;
    }

    // If this escalation has been dismissed, don't show it again
    if (dismissedEscalationIdRef.current === latestEscalationRequest.id) {
      console.log("Escalation was dismissed by user, not showing again");
      setShouldShowEscalationButton(false);
      return;
    }

    // Check if there's a visitor response AFTER the escalation request
    const visitorMessages = messages.filter(msg => msg.sender === "user" || (msg.email === email && msg.sender !== "ai" && msg.sender !== "admin"));
    const visitorResponseAfterEscalation = visitorMessages.length > 0 ? visitorMessages[visitorMessages.length - 1] : null;
    
    // Check if the visitor's last message comes after the escalation request
    const escalationRequestIndex = messages.findIndex(m => m.id === latestEscalationRequest.id);
    const visitorResponseIndex = visitorResponseAfterEscalation ? messages.findIndex(m => m.id === visitorResponseAfterEscalation.id) : -1;
    
    console.log("Escalation request index:", escalationRequestIndex, "Visitor response index:", visitorResponseIndex);
    
    if (visitorResponseIndex <= escalationRequestIndex) {
      // Visitor hasn't responded yet
      console.log("Visitor hasn't responded to escalation request yet");
      if (escalationMessageIdRef.current !== null) {
        escalationMessageIdRef.current = null;
        setShouldShowEscalationButton(false);
        if (escalationTimeoutRef.current) {
          clearTimeout(escalationTimeoutRef.current);
          escalationTimeoutRef.current = null;
        }
      }
      return;
    }

    // Check if this is a NEW escalation (after visitor response) we haven't seen before
    if (escalationMessageIdRef.current !== latestEscalationRequest.id) {
      console.log("NEW escalation detected! Visitor responded. Starting 5-second timer at", new Date().toLocaleTimeString());
      
      // Clear any previous timeout
      if (escalationTimeoutRef.current) {
        clearTimeout(escalationTimeoutRef.current);
      }
      
      escalationMessageIdRef.current = latestEscalationRequest.id;
      setShouldShowEscalationButton(false); // Hide button initially
      setEscalationTime(Date.now());
      
      // Set timeout for exactly 5 seconds from now
      escalationTimeoutRef.current = setTimeout(() => {
        console.log("5 SECOND TIMER FIRED at", new Date().toLocaleTimeString() + " - showing button now");
        setShouldShowEscalationButton(true);
      }, 5000);
    }
  }, [messages, email]);
  
  // Show button if escalation detected AND 5 seconds have passed
  const showButton = shouldShowEscalationButton && !isEscalated;

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Chat Form] Submit handler called", { name, email });
    
    if (!name.trim() || !email.trim()) {
      console.log("[Chat Form] Validation failed: missing fields");
      toast({
        title: "Missing information",
        description: "Please fill in your name and email",
        variant: "destructive",
      });
      return;
    }
    
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      console.log("[Chat Form] Validation failed: invalid email format");
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address (e.g., name@example.com)",
        variant: "destructive",
      });
      return;
    }
    
    console.log("[Chat Form] Validation passed, saving to localStorage");
    localStorage.setItem(VISITOR_INFO_KEY, JSON.stringify({ name: trimmedName, email: trimmedEmail }));
    
    // CRITICAL: Set email and name state BEFORE setting isNewVisitor to false
    // This ensures the message filter can access the email when the component re-renders
    setName(trimmedName);
    setEmail(trimmedEmail);
    console.log("[Chat Form] Email and name state updated:", trimmedEmail);
    
    // Clear session messages for fresh start (previous session, if any)
    setSessionMessages([]);
    
    // Send greeting message from AI agent
    try {
      console.log("[Chat Form] Sending greeting message from Riley");
      const greetingResponseBlob = await apiRequest("POST", "/api/chat", {
        name: "Riley",
        email: "support@tncreditsolutions.com",
        message: `Hi ${trimmedName}! How can I help you today?`,
        sender: "ai",
        isEscalated: "false",
      });
      const greetingResponse = await greetingResponseBlob.json();
      console.log("[Chat Form] Greeting sent successfully");
      
      // Add greeting to session messages for display
      setSessionMessages([{
        id: greetingResponse.id || `temp-${Date.now()}`,
        name: "Riley",
        email: "support@tncreditsolutions.com",
        message: `Hi ${trimmedName}! How can I help you today?`,
        sender: "ai",
        isEscalated: "false",
        createdAt: greetingResponse.createdAt || new Date().toISOString(),
      }]);
      
      setIsNewVisitor(false);
    } catch (error: any) {
      console.error("[Chat Form] CRITICAL: Failed to send greeting:", {
        error: error?.message || String(error),
        status: error?.status,
      });
      toast({
        title: "Error",
        description: "Failed to start chat. Please refresh and try again.",
        variant: "destructive",
      });
      // Don't set isNewVisitor to false on error
    }
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
    
    // If user continues the conversation, allow new escalations to show
    // (clear the dismissed tracking so fresh escalation reasons can appear)
    if (dismissedEscalationIdRef.current !== null) {
      console.log("User continuing conversation after dismissing escalation. Allowing new escalations.");
      dismissedEscalationIdRef.current = null;
    }
    
    sendMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      message: messageToSend,
    });
  };

  const handleEscalate = async () => {
    try {
      // Send friendly escalation message from Riley
      const escalateBlob = await apiRequest("POST", "/api/chat", {
        name: "Riley",
        email: "support@tncreditsolutions.com",
        message: "Perfect! I've connected you with our specialist team. They'll review your situation and get back to you shortly with personalized guidance. Thank you for choosing TN Credit Solutions!",
        sender: "ai",
        isEscalated: "true",
      });
      const escalateResponse = await escalateBlob.json();
      
      // Add escalation message to session display
      setSessionMessages(prev => [...prev, {
        id: escalateResponse.id || `temp-${Date.now()}`,
        name: "Riley",
        email: "support@tncreditsolutions.com",
        message: "Perfect! I've connected you with our specialist team. They'll review your situation and get back to you shortly with personalized guidance. Thank you for choosing TN Credit Solutions!",
        sender: "ai",
        isEscalated: "true",
        createdAt: escalateResponse.createdAt || new Date().toISOString(),
      }]);
      
      // Reset escalation tracking
      escalationMessageIdRef.current = null;
      setEscalationTime(null);
      setShouldShowEscalationButton(false);
      setIsEscalated(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect with specialist",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!lastDocumentId) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${lastDocumentId}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `credit-analysis-${visitorDateForFilename}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error("[PDF Download] Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to download PDF",
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
                  {messages.length === 0 ? (
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
                          // Store the dismissed escalation ID so it won't show again
                          if (escalationMessageIdRef.current) {
                            dismissedEscalationIdRef.current = escalationMessageIdRef.current;
                          }
                          escalationMessageIdRef.current = null;
                          setEscalationTime(null);
                          setShouldShowEscalationButton(false);
                          if (escalationTimeoutRef.current) {
                            clearTimeout(escalationTimeoutRef.current);
                            escalationTimeoutRef.current = null;
                          }
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
                <div className="p-5 border-t border-card-border bg-gradient-to-b from-background to-card/40 space-y-3">
                  {uploadedFileName && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm text-primary flex-1 truncate">{uploadedFileName}</span>
                      <span className="text-xs text-muted-foreground">
                        {uploadMutation.isPending ? "Analyzing..." : "Done"}
                      </span>
                    </div>
                  )}
                  {lastDocumentId && !uploadedFileName && (
                    <Button
                      onClick={handleDownloadPDF}
                      size="sm"
                      variant="outline"
                      className="w-full rounded-lg flex items-center justify-center gap-2"
                      data-testid="button-download-pdf"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF Summary
                    </Button>
                  )}
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
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadMutation.isPending || isEscalated}
                      className="rounded-lg"
                      data-testid="button-upload-document"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      onChange={handleFileSelect}
                      className="hidden"
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
