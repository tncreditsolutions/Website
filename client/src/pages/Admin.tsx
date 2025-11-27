import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Mail, Phone, Calendar, User, MessageSquare, X, MessageCircle, AlertCircle, FileText } from "lucide-react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContactSubmission, ChatMessage, NewsletterSubscription, Document } from "@shared/schema";

export default function Admin() {
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [selectedChatMessage, setSelectedChatMessage] = useState<ChatMessage | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [adminReplyMessage, setAdminReplyMessage] = useState("");
  const { toast } = useToast();
  
  const { data: submissions, isLoading: submissionsLoading } = useQuery<ContactSubmission[]>({
    queryKey: ["/api/contact"],
  });
  
  const { data: chatMessages, isLoading: chatLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat"],
    refetchInterval: 5000,
  });
  
  const { data: newsletterSubscriptions, isLoading: newsletterLoading } = useQuery<NewsletterSubscription[]>({
    queryKey: ["/api/newsletter"],
    refetchInterval: 5000,
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    refetchInterval: 5000,
  });

  const sendAdminReplyMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/chat", data);
    },
    onSuccess: () => {
      setAdminReplyMessage("");
      setIsReplying(false);
      setSelectedChatMessage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    },
  });

  const handleSendAdminReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyMessage.trim()) {
      toast({
        title: "Empty message",
        description: "Please type a message",
        variant: "destructive",
      });
      return;
    }
    sendAdminReplyMutation.mutate({
      name: "TN Credit Solutions",
      email: "support@tncreditsolutions.com",
      message: adminReplyMessage.trim(),
      sender: "admin",
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getServiceBadgeVariant = (service: string) => {
    if (service === "credit") return "default";
    if (service === "tax") return "secondary";
    return "outline";
  };

  const getServiceLabel = (service: string) => {
    if (service === "credit") return "Credit Services";
    if (service === "tax") return "Tax Services";
    if (service === "both") return "Both Services";
    return service;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">TN Credit Solutions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <Tabs defaultValue="submissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
            <TabsTrigger value="chat">Live Chat</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
          </TabsList>

          <TabsContent value="submissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Contact Submissions</CardTitle>
                <CardDescription>
                  {submissions?.length ? `${submissions.length} total submissions` : "No submissions yet"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissionsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading submissions...</div>
                ) : !submissions || submissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No contact submissions yet. Share your website to start receiving leads!
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact Info</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Referral</TableHead>
                            <TableHead>Message</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {submissions.map((submission) => (
                            <TableRow key={submission.id} data-testid={`row-submission-${submission.id}`}>
                              <TableCell className="text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(submission.createdAt)}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  {submission.name}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <a href={`tel:${submission.phone}`} className="text-primary hover:underline">
                                      {submission.phone}
                                    </a>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <a href={`mailto:${submission.email}`} className="text-primary hover:underline">
                                      {submission.email}
                                    </a>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getServiceBadgeVariant(submission.service)}>
                                  {getServiceLabel(submission.service)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {submission.referral || <span className="text-muted-foreground">None</span>}
                              </TableCell>
                              <TableCell className="max-w-xs">
                                {submission.message ? (
                                  <button
                                    onClick={() => setSelectedSubmission(submission)}
                                    className="flex items-start gap-2 hover-elevate p-2 rounded-md text-left w-full"
                                    data-testid={`button-view-message-${submission.id}`}
                                  >
                                    <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {submission.message}
                                    </p>
                                  </button>
                                ) : (
                                  <span className="text-sm text-muted-foreground">No message</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                      {submissions.map((submission) => (
                        <Card key={submission.id} data-testid={`card-submission-${submission.id}`}>
                          <CardContent className="pt-6 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-lg">{submission.name}</h3>
                              <Badge variant={getServiceBadgeVariant(submission.service)}>
                                {getServiceLabel(submission.service)}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <a href={`tel:${submission.phone}`} className="text-primary hover:underline">
                                  {submission.phone}
                                </a>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <a href={`mailto:${submission.email}`} className="text-primary hover:underline">
                                  {submission.email}
                                </a>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{formatDate(submission.createdAt)}</span>
                              </div>
                            </div>

                            {submission.referral && (
                              <div className="pt-2 border-t">
                                <span className="text-sm font-medium">Referred by: </span>
                                <span className="text-sm">{submission.referral}</span>
                              </div>
                            )}

                            {submission.message && (
                              <div className="pt-2 border-t">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-muted-foreground">{submission.message}</p>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            {chatLoading ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">Loading chat messages...</div>
                </CardContent>
              </Card>
            ) : !chatMessages || chatMessages.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center text-muted-foreground">
                    No chat messages yet. Visitors will appear here when they start chatting.
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {[...chatMessages].reverse().map((msg) => (
                  <Card key={msg.id} className="p-4 hover-elevate cursor-pointer" onClick={() => {
                    setSelectedChatMessage(msg);
                  }} data-testid={`card-chat-message-${msg.id}`}>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{msg.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{msg.email}</p>
                        </div>
                        <p className="text-xs text-muted-foreground flex-shrink-0">{formatDate(msg.createdAt)}</p>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{msg.message.replace(/\s*\[ESCALATE:(YES|NO)\]\s*$/, "")}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Documents</CardTitle>
                <CardDescription>
                  {documents?.length ? `${documents.length} total documents` : "No documents yet"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
                ) : !documents || documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No documents uploaded yet. Visitors can upload PDFs or images in the chat.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <Card key={doc.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{doc.fileName}</p>
                            <p className="text-xs text-muted-foreground">{doc.visitorName} ({doc.visitorEmail})</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(doc.createdAt)}</p>
                            {doc.aiAnalysis && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-xs font-semibold text-muted-foreground mb-1">AI Analysis:</p>
                                <p className="text-sm text-muted-foreground line-clamp-3">{doc.aiAnalysis}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="newsletter">
            <Card>
              <CardHeader>
                <CardTitle>Newsletter Subscriptions</CardTitle>
                <CardDescription>
                  {newsletterSubscriptions?.length ? `${newsletterSubscriptions.length} total subscribers` : "No subscribers yet"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {newsletterLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading subscriptions...</div>
                ) : !newsletterSubscriptions || newsletterSubscriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No newsletter subscribers yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {newsletterSubscriptions.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{sub.email}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(sub.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Full Message Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto" data-testid="dialog-full-message">
          <DialogHeader>
            <DialogTitle>Complete Submission Details</DialogTitle>
            <DialogDescription>View the full message and contact information</DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Name</p>
                  <p className="text-sm font-medium">{selectedSubmission.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Service</p>
                  <Badge variant={getServiceBadgeVariant(selectedSubmission.service)} className="w-fit">
                    {getServiceLabel(selectedSubmission.service)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Email</p>
                  <a href={`mailto:${selectedSubmission.email}`} className="text-sm text-primary hover:underline">
                    {selectedSubmission.email}
                  </a>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Phone</p>
                  <a href={`tel:${selectedSubmission.phone}`} className="text-sm text-primary hover:underline">
                    {selectedSubmission.phone}
                  </a>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Submitted</p>
                  <p className="text-sm">{formatDate(selectedSubmission.createdAt)}</p>
                </div>
                {selectedSubmission.referral && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Referred By</p>
                    <p className="text-sm">{selectedSubmission.referral}</p>
                  </div>
                )}
              </div>

              {selectedSubmission.message && (
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Message</p>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm whitespace-pre-wrap break-words">{selectedSubmission.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Reply Dialog */}
      <Dialog open={!!selectedChatMessage && isReplying && (selectedChatMessage.sender === "visitor" || !selectedChatMessage.sender)} onOpenChange={() => {
        setIsReplying(false);
        setSelectedChatMessage(null);
      }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-admin-reply">
          <DialogHeader>
            <DialogTitle>Reply to Chat Message</DialogTitle>
            <DialogDescription>
              Send a message to {selectedChatMessage?.name} at {selectedChatMessage?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedChatMessage && (selectedChatMessage.sender === "visitor" || !selectedChatMessage.sender) && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Their Message</p>
                <p className="text-sm whitespace-pre-wrap break-words">{selectedChatMessage.message}</p>
              </div>

              <form onSubmit={handleSendAdminReply} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Your Reply</label>
                  <Textarea
                    placeholder="Type your reply..."
                    value={adminReplyMessage}
                    onChange={(e) => setAdminReplyMessage(e.target.value)}
                    className="min-h-24"
                    data-testid="textarea-admin-reply"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setSelectedChatMessage(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={sendAdminReplyMutation.isPending}
                    data-testid="button-send-admin-reply"
                  >
                    {sendAdminReplyMutation.isPending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Messages Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Live Chat Messages</CardTitle>
            <CardDescription>
              {chatMessages?.length ? `${chatMessages.length} total messages` : "No chat messages yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chatLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
            ) : !chatMessages || chatMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No live chat messages yet. Chat will appear here when visitors use the chat widget.
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from(
                  chatMessages.reduce((acc, msg) => {
                    // Only group by visitor emails (exclude admin email)
                    if (msg.email !== "support@tncreditsolutions.com") {
                      if (!acc.has(msg.email)) {
                        acc.set(msg.email, []);
                      }
                      acc.get(msg.email)!.push(msg);
                    }
                    return acc;
                  }, new Map<string, typeof chatMessages>())
                )
                  .sort(([, a], [, b]) => {
                    const aLatest = new Date(Math.max(...a.map(m => new Date(m.createdAt).getTime())));
                    const bLatest = new Date(Math.max(...b.map(m => new Date(m.createdAt).getTime())));
                    return bLatest.getTime() - aLatest.getTime();
                  })
                  .map(([email, visitorMessages]) => {
                    // Include visitor messages AND all admin replies
                    const allMessages = [
                      ...visitorMessages,
                      ...chatMessages.filter(msg => msg.sender === "admin" || msg.email === "support@tncreditsolutions.com")
                    ];
                    
                    const firstMessage = visitorMessages[0];
                    const latestMessage = [...allMessages].sort((a, b) => 
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )[0];
                    
                    // Check if conversation is escalated
                    const isEscalated = allMessages.some(msg => msg.isEscalated === "true" || msg.sender === "escalation");
                    
                    return (
                      <Card key={email} className="hover-elevate" data-testid={`card-conversation-${email}`}>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{firstMessage.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <a href={`mailto:${email}`} className="text-sm text-primary hover:underline">
                                  {email}
                                </a>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {isEscalated && (
                                <Badge variant="destructive" className="flex items-center gap-1" data-testid={`badge-escalated-${email}`}>
                                  <AlertCircle className="w-3 h-3" />
                                  Escalated
                                </Badge>
                              )}
                              <Badge variant="outline" className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {allMessages.length} messages
                              </Badge>
                            </div>
                          </div>

                          <div className="pt-2 border-t space-y-2">
                            <div className="flex items-start gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">Latest: {formatDate(latestMessage.createdAt)}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-muted-foreground line-clamp-2">{latestMessage.message}</p>
                            </div>
                          </div>

                          <div className="pt-2 border-t">
                            <Button
                              onClick={() => setSelectedChatMessage(firstMessage)}
                              className="w-full"
                              data-testid={`button-view-conversation-${email}`}
                            >
                              View Conversation
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Chat Conversation Dialog */}
      <Dialog open={!!selectedChatMessage && !isReplying} onOpenChange={() => setSelectedChatMessage(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-full-chat-message">
          <DialogHeader>
            <DialogTitle>Conversation with {selectedChatMessage?.name}</DialogTitle>
            <DialogDescription>
              <a href={`mailto:${selectedChatMessage?.email}`} className="text-primary hover:underline">
                {selectedChatMessage?.email}
              </a>
            </DialogDescription>
          </DialogHeader>
          {selectedChatMessage && (
            <div className="space-y-4">
              {/* Full conversation thread */}
              <div className="space-y-3 max-h-96 overflow-y-auto border rounded-md p-4 bg-muted/30">
                {chatMessages
                  ?.filter(msg => msg.email === selectedChatMessage.email || msg.sender === "admin" || msg.sender === "ai" || msg.email === "support@tncreditsolutions.com")
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((msg) => {
                    const isAdmin = msg.sender === "admin" || msg.email === "support@tncreditsolutions.com";
                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs ${isAdmin ? "text-right" : ""}`}>
                          <div className={`p-3 rounded text-sm break-words ${
                            isAdmin
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border"
                          }`}>
                            {msg.message}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {(selectedChatMessage.sender === "visitor" || !selectedChatMessage.sender) && (
                <div className="border-t pt-4">
                  <Button 
                    onClick={() => {
                      setIsReplying(true);
                    }}
                    data-testid="button-open-reply-form"
                    className="w-full"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Reply to This Conversation
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Chat Dialog */}
      <Dialog open={!!selectedChatMessage && !isReplying} onOpenChange={() => setSelectedChatMessage(null)}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto" data-testid="dialog-full-chat">
          <DialogHeader>
            <DialogTitle>Chat Conversation</DialogTitle>
            <DialogDescription>
              {selectedChatMessage?.name} ({selectedChatMessage?.email})
            </DialogDescription>
          </DialogHeader>
          {selectedChatMessage && (
            <div className="space-y-4">
              {/* Full conversation thread */}
              <div className="space-y-3 max-h-96 overflow-y-auto border rounded-md p-4 bg-muted/30">
                {chatMessages
                  ?.filter(msg => msg.email === selectedChatMessage.email || msg.sender === "admin" || msg.sender === "ai" || msg.email === "support@tncreditsolutions.com")
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((msg) => {
                    const isAdmin = msg.sender === "admin" || msg.email === "support@tncreditsolutions.com";
                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs ${isAdmin ? "text-right" : ""}`}>
                          <div className={`p-3 rounded text-sm break-words ${
                            isAdmin
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border"
                          }`}>
                            {msg.message}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {(selectedChatMessage.sender === "visitor" || !selectedChatMessage.sender) && (
                <div className="border-t pt-4">
                  <Button 
                    onClick={() => {
                      setIsReplying(true);
                    }}
                    data-testid="button-open-reply-form"
                    className="w-full"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Reply to This Conversation
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
