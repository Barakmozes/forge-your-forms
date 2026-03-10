import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Clock, User, MessageSquare, Tag, Lock } from "lucide-react";
import { useTicketMessages } from "@/hooks/useTicketMessages";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Tables, Database } from "@/integrations/supabase/types";

type Ticket = Tables<"tickets">;
type TicketStatus = Database["public"]["Enums"]["ticket_status"];
type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  waiting: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function TicketDetailPage() {
  const { id: formId, ticketId } = useParams<{ id: string; ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const { messages, addMessage } = useTicketMessages(ticketId ?? "");

  useEffect(() => {
    if (!ticketId) return;
    supabase
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate(`/forms/${formId}`);
          return;
        }
        setTicket(data);
        setLoading(false);
      });
  }, [ticketId, formId, navigate]);

  const updateStatus = async (status: TicketStatus) => {
    if (!ticketId) return;
    const { error } = await supabase
      .from("tickets")
      .update({ status })
      .eq("id", ticketId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      setTicket((prev) => prev ? { ...prev, status } : prev);
      toast.success(`Status updated to ${status.replace("_", " ")}`);
    }
  };

  const updatePriority = async (priority: TicketPriority) => {
    if (!ticketId) return;
    const { error } = await supabase
      .from("tickets")
      .update({ priority })
      .eq("id", ticketId);

    if (error) {
      toast.error("Failed to update priority");
    } else {
      setTicket((prev) => prev ? { ...prev, priority } : prev);
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !ticket) return;
    setSending(true);

    const { error } = await addMessage({
      message: reply.trim(),
      sender_type: "agent",
      sender_name: user?.email ?? "Agent",
      sender_email: user?.email ?? undefined,
      is_internal: isInternal,
    });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setReply("");
      toast.success(isInternal ? "Internal note added" : "Reply sent");
    }
    setSending(false);
  };

  if (loading || !ticket) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading ticket...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/forms/${formId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_number}</span>
            <Badge variant="secondary" className={STATUS_COLORS[ticket.status]}>
              {ticket.status.replace("_", " ")}
            </Badge>
            <Badge variant="secondary" className={PRIORITY_COLORS[ticket.priority]}>
              {ticket.priority}
            </Badge>
          </div>
          <h1 className="text-xl font-bold mt-1">{ticket.subject}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Thread */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Conversation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "p-3 rounded-lg text-sm",
                    msg.sender_type === "agent" && !msg.is_internal
                      ? "bg-primary/5 border border-primary/20"
                      : msg.is_internal
                        ? "bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800/30"
                        : "bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">
                        {msg.sender_type === "customer"
                          ? msg.sender_name ?? msg.sender_email ?? "Customer"
                          : msg.sender_name ?? "Agent"}
                      </span>
                      {msg.is_internal && (
                        <Badge variant="outline" className="text-[9px] gap-1 text-yellow-600">
                          <Lock className="h-2.5 w-2.5" /> Internal
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))}

              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No messages yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reply Box */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={isInternal ? "Add an internal note..." : "Type your reply to the customer..."}
                rows={4}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant={isInternal ? "default" : "outline"}
                    size="sm"
                    className={cn("gap-1 text-xs", isInternal && "bg-yellow-500 hover:bg-yellow-600")}
                    onClick={() => setIsInternal(!isInternal)}
                  >
                    <Lock className="h-3 w-3" />
                    {isInternal ? "Internal Note" : "Public Reply"}
                  </Button>
                </div>
                <Button onClick={handleSendReply} disabled={sending || !reply.trim()} className="gap-2">
                  <Send className="h-4 w-4" />
                  {sending ? "Sending..." : isInternal ? "Add Note" : "Send Reply"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={ticket.status} onValueChange={(v) => updateStatus(v as TicketStatus)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select value={ticket.priority} onValueChange={(v) => updatePriority(v as TicketPriority)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ticket.category && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{ticket.category}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Submitter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{ticket.submitted_by_name ?? "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground">{ticket.submitted_by_email ?? "No email"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
              </div>
              {ticket.first_response_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>First response: {new Date(ticket.first_response_at).toLocaleString()}</span>
                </div>
              )}
              {ticket.resolved_at && (
                <div className="flex items-center gap-2 text-green-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Resolved: {new Date(ticket.resolved_at).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
