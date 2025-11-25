import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, Calendar, User, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import type { ContactSubmission } from "@shared/schema";

export default function Admin() {
  const { data: submissions, isLoading } = useQuery<ContactSubmission[]>({
    queryKey: ["/api/contact"],
  });

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
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Contact Submissions</CardTitle>
            <CardDescription>
              {submissions?.length ? `${submissions.length} total submissions` : "No submissions yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {submission.message}
                                </p>
                              </div>
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
      </div>
    </div>
  );
}
