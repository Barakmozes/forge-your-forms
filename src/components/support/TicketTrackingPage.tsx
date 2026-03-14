import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Headphones, Search, Send, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Ticket = Tables<"tickets">;
type TicketMessage = Tables<"ticket_messages">;

interface TicketTrackingPageProps {
  formId: string;
  initialTicket?: string;
  initialEmail?: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  waiting: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function TicketTrackingPage({ formId, initialTicket, initialEmail }: TicketTrackingPageProps) {
  const { t } = useTranslation();
  const [ticketNumber, setTicketNumber] = useState(initialTicket ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<boolean | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const lookupTicket = async () => {
    if (!ticketNumber.trim() || !email.trim()) {
      toast.error(t('support.enterBothFields'));
      return;
    }

    setLoading(true);
    const { data: ticketData } = await supabase
      .from("tickets")
      .select("*")
      .eq("form_id", formId)
      .eq("ticket_number", ticketNumber.trim().toUpperCase())
      .eq("submitted_by_email", email.trim().toLowerCase())
      .maybeSingle();

    if (!ticketData) {
      setFound(false);
      setTicket(null);
      setLoading(false);
      return;
    }

    setTicket(ticketData);
    setFound(true);

    const { data: msgData } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketData.id)
      .eq("is_internal", false)
      .order("created_at", { ascending: true });

    setMessages(msgData ?? []);
    setLoading(false);
  };

  const sendReply = async () => {
    if (!reply.trim() || !ticket) return;
    setSending(true);

    const { error } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticket.id,
        sender_type: "customer" as const,
        sender_name: ticket.submitted_by_name,
        sender_email: ticket.submitted_by_email,
        message: reply.trim(),
        is_internal: false,
      });

    if (error) {
      toast.error(t('support.failedSendReply'));
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          ticket_id: ticket.id,
          sender_type: "customer",
          sender_name: ticket.submitted_by_name,
          sender_email: ticket.submitted_by_email,
          message: reply.trim(),
          is_internal: false,
          created_at: new Date().toISOString(),
        },
      ]);
      setReply("");
      toast.success(t('support.replySent'));
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="h-1 bg-primary w-full" />
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Headphones className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('support.trackYourTicket')}</h1>
            <p className="text-sm text-muted-foreground">{t('support.enterTicketAndEmail')}</p>
          </div>
        </div>

        {!ticket && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('support.ticketNumber')}</Label>
                  <Input
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    placeholder="TICK-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('support.emailAddress')}</Label>
                  <Input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <Button onClick={lookupTicket} disabled={loading} className="w-full gap-2">
                <Search className="h-4 w-4" />
                {loading ? t('support.lookingUp') : t('support.findTicket')}
              </Button>
              {found === false && (
                <p className="text-sm text-destructive text-center">
                  {t('support.noTicketFound')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {ticket && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Ticket Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-muted-foreground">{ticket.ticket_number}</span>
                      <Badge variant="secondary" className={STATUS_COLORS[ticket.status]}>
                        {ticket.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{ticket.priority}</Badge>
                    </div>
                    <h2 className="text-lg font-semibold">{ticket.subject}</h2>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setTicket(null); setFound(null); }}>
                    {t('support.back')}
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {t('support.submitted')} {new Date(ticket.created_at).toLocaleDateString()}
                  </div>
                  {ticket.category && (
                    <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Messages Thread */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">{t('support.conversation')}</h3>
                </div>

                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "p-3 rounded-lg text-sm",
                        msg.sender_type === "customer"
                          ? "bg-muted ltr:ml-4 ltr:sm:ml-8 rtl:mr-4 rtl:sm:mr-8"
                          : "bg-primary/5 border border-primary/20 ltr:mr-4 ltr:sm:mr-8 rtl:ml-4 rtl:sm:ml-8"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-xs">
                          {msg.sender_type === "customer" ? t('support.you') : msg.sender_name ?? t('support.supportAgent')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Box */}
                {ticket.status !== "closed" && ticket.status !== "resolved" && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={t('support.typeYourReply')}
                      rows={3}
                    />
                    <Button onClick={sendReply} disabled={sending || !reply.trim()} className="gap-2">
                      <Send className="h-4 w-4" />
                      {sending ? t('support.sending') : t('support.sendReply')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-12 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            {t('common.poweredBy')}
          </p>
        </div>
      </div>
    </div>
  );
}
