import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Send,
  Clock,
  User,
  MessageSquare,
  Tag,
  Lock,
  FileText,
  X,
  Plus,
  Sparkles,
  Bot,
} from "lucide-react";
import { useTicketMessages } from "@/hooks/useTicketMessages";
import { useCannedResponses } from "@/hooks/useCannedResponses";
import { useTags } from "@/hooks/useTags";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AiCannedSuggestions from "@/components/predictions/AiCannedSuggestions";
import type { Tables, Database } from "@/integrations/supabase/types";

type Ticket = Tables<"tickets">;
type TicketStatus = Database["public"]["Enums"]["ticket_status"];
type TicketPriority = Database["public"]["Enums"]["ticket_priority"];

interface AiClassification {
  category: string;
  priority: string;
  confidence: number;
  reasoning: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  waiting:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  resolved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed:
    "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function TicketDetailPage() {
  const { t } = useTranslation();
  const { id: formId, ticketId } = useParams<{
    id: string;
    ticketId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [ticketTags, setTicketTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [workspaceMembers, setWorkspaceMembers] = useState<
    Array<{ user_id: string; email: string }>
  >([]);

  const { messages, addMessage } = useTicketMessages(ticketId ?? "");
  const { responses: cannedResponses } = useCannedResponses(
    currentWorkspace?.id ?? ""
  );
  const {
    tags: allTags,
    addTagToTicket,
    removeTagFromTicket,
  } = useTags(currentWorkspace?.id ?? "");

  // Fetch ticket
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

  // Fetch ticket tags
  useEffect(() => {
    if (!ticketId) return;
    supabase
      .from("ticket_tags")
      .select("tag_id")
      .eq("ticket_id", ticketId)
      .then(({ data }) => {
        if (data) setTicketTags(data.map((t) => t.tag_id));
      });
  }, [ticketId]);

  // Fetch workspace members for assignment dropdown
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", currentWorkspace.id)
      .then(async ({ data }) => {
        if (!data?.length) return;
        const userIds = data.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
        if (profiles) {
          setWorkspaceMembers(
            profiles.map((p) => ({ user_id: p.id, email: p.email }))
          );
        }
      });
  }, [currentWorkspace?.id]);

  const updateField = async (
    field: string,
    value: string | null
  ) => {
    if (!ticketId) return;
    const { error } = await supabase
      .from("tickets")
      .update({ [field]: value })
      .eq("id", ticketId);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('support.failedUpdate', { field }),
        variant: "destructive",
      });
    } else {
      setTicket((prev) => (prev ? { ...prev, [field]: value } : prev));
      if (field === "status") {
        toast({
          title: t('support.statusUpdated'),
          description: t('support.changedTo', { status: (value ?? "").replace("_", " ") }),
        });
      }
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
      toast({
        title: t('common.error'),
        description: t('support.failedSendMessage'),
        variant: "destructive",
      });
    } else {
      setReply("");
      toast({ title: isInternal ? t('support.internalNoteAdded') : t('support.replySent') });
    }
    setSending(false);
  };

  const handleInsertCanned = (content: string) => {
    setReply((prev) => (prev ? prev + "\n" + content : content));
  };

  const handleAddTag = async (tagId: string) => {
    if (!ticketId || ticketTags.includes(tagId)) return;
    const { error } = await addTagToTicket(ticketId, tagId);
    if (!error) {
      setTicketTags((prev) => [...prev, tagId]);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!ticketId) return;
    const { error } = await removeTagFromTicket(ticketId, tagId);
    if (!error) {
      setTicketTags((prev) => prev.filter((id) => id !== tagId));
    }
  };

  const filteredSuggestions = useMemo(() => {
    if (!tagSearch.trim()) return [];
    const query = tagSearch.toLowerCase();
    return allTags.filter(
      (t) =>
        t.name.toLowerCase().includes(query) && !ticketTags.includes(t.id)
    );
  }, [allTags, tagSearch, ticketTags]);

  if (loading || !ticket) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          {t('support.loadingTicket')}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/forms/${formId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">
              {ticket.ticket_number}
            </span>
            <Badge
              variant="secondary"
              className={STATUS_COLORS[ticket.status]}
            >
              {ticket.status.replace("_", " ")}
            </Badge>
            <Badge
              variant="secondary"
              className={PRIORITY_COLORS[ticket.priority]}
            >
              {ticket.priority}
            </Badge>
            {ticket.category && (
              <Badge variant="outline">{ticket.category}</Badge>
            )}
            {/* === AGENT 13: AI Classification === */}
            {(ticket as Ticket & { ai_classification?: AiClassification }).ai_classification && (
              <Badge variant="outline" className="gap-1 text-[10px] border-primary/40 text-primary">
                <Bot className="h-3 w-3" />
                {t("predictions.aiClassified", "AI Classified")}
              </Badge>
            )}
            {/* === END AGENT 13 === */}
          </div>
          <h1 className="text-xl font-bold mt-1">{ticket.subject}</h1>
          {ticket.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {ticket.description}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* ─── Left Panel (70%) — Thread + Reply ───────────────────────── */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> {t('support.conversation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages.map((msg) => {
                const isAgent =
                  msg.sender_type === "agent" && !msg.is_internal;
                const isInternalNote = msg.is_internal;
                const isCustomer = msg.sender_type === "customer";

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isAgent ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "p-3 rounded-lg text-sm max-w-[85%]",
                        isAgent
                          ? "bg-primary/10 border border-primary/20"
                          : isInternalNote
                            ? "bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800/30"
                            : "bg-muted"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1 gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs">
                            {isCustomer
                              ? msg.sender_name ??
                                msg.sender_email ??
                                t('support.customer')
                              : msg.sender_name ?? t('support.agent')}
                          </span>
                          {isInternalNote && (
                            <Badge
                              variant="outline"
                              className="text-[9px] gap-1 text-yellow-600"
                            >
                              <Lock className="h-2.5 w-2.5" /> {t('support.internal')}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                );
              })}

              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t('support.noMessagesYet')}
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
                placeholder={
                  isInternal
                    ? t('support.addInternalNote')
                    : t('support.typeReplyToCustomer')
                }
                rows={4}
              />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant={isInternal ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "gap-1 text-xs",
                      isInternal && "bg-yellow-500 hover:bg-yellow-600"
                    )}
                    onClick={() => setIsInternal(!isInternal)}
                  >
                    <Lock className="h-3 w-3" />
                    {isInternal ? t('support.internalNote') : t('support.publicReply')}
                  </Button>

                  {/* Canned Responses Dropdown */}
                  {cannedResponses.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1 text-xs">
                          <FileText className="h-3 w-3" />
                          {t('support.cannedResponse')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-2" align="start">
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {cannedResponses.map((cr) => (
                            <button
                              key={cr.id}
                              className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-sm transition-colors"
                              onClick={() => handleInsertCanned(cr.content)}
                            >
                              <p className="font-medium text-xs">{cr.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {cr.content}
                              </p>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <Button
                  onClick={handleSendReply}
                  disabled={sending || !reply.trim()}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sending
                    ? t('support.sending')
                    : isInternal
                      ? t('support.addNote')
                      : t('support.sendReply')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Right Sidebar (30%) ─────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('support.details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('support.status')}</Label>
                <Select
                  value={ticket.status}
                  onValueChange={(v) => updateField("status", v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t('support.open')}</SelectItem>
                    <SelectItem value="in_progress">{t('support.inProgress')}</SelectItem>
                    <SelectItem value="waiting">{t('support.waiting')}</SelectItem>
                    <SelectItem value="resolved">{t('support.resolved')}</SelectItem>
                    <SelectItem value="closed">{t('support.closed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t('support.priority')}
                </Label>
                <Select
                  value={ticket.priority}
                  onValueChange={(v) => updateField("priority", v)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('support.low')}</SelectItem>
                    <SelectItem value="medium">{t('support.medium')}</SelectItem>
                    <SelectItem value="high">{t('support.high')}</SelectItem>
                    <SelectItem value="urgent">{t('support.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t('support.category')}
                </Label>
                <Input
                  className="h-8 text-sm"
                  value={ticket.category ?? ""}
                  placeholder={t('support.enterCategory')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTicket((prev) =>
                      prev ? { ...prev, category: val || null } : prev
                    );
                  }}
                  onBlur={() =>
                    updateField("category", ticket.category || null)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t('support.assignedTo')}
                </Label>
                <Select
                  value={ticket.assigned_to ?? "unassigned"}
                  onValueChange={(v) =>
                    updateField(
                      "assigned_to",
                      v === "unassigned" ? null : v
                    )
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder={t('support.unassigned')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">{t('support.unassigned')}</SelectItem>
                    {workspaceMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Submitter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('support.submitter')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {ticket.submitted_by_name ?? t('feedback.anonymous')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.submitted_by_email ?? t('support.noEmail')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" /> {t('support.tags')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {ticketTags.map((tagId) => {
                  const tag = allTags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="gap-1 text-xs"
                      style={{
                        borderColor: tag.color ?? undefined,
                        borderWidth: 1,
                      }}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: tag.color ?? "#6366f1" }}
                      />
                      {tag.name}
                      <button
                        className="ltr:ml-0.5 rtl:mr-0.5 hover:text-destructive"
                        onClick={() => handleRemoveTag(tag.id)}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  );
                })}
              </div>

              <div className="relative">
                <Input
                  className="h-8 text-sm"
                  placeholder={t('support.searchTagsToAdd')}
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                />
                {filteredSuggestions.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-background border rounded-md shadow-md max-h-32 overflow-y-auto">
                    {filteredSuggestions.map((tag) => (
                      <button
                        key={tag.id}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                        onClick={() => {
                          handleAddTag(tag.id);
                          setTagSearch("");
                        }}
                      >
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: tag.color ?? "#6366f1",
                          }}
                        />
                        {tag.name}
                        <Plus className="h-3 w-3 ltr:ml-auto rtl:mr-auto text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* === AGENT 13: AI Suggestions === */}
          {formId && (
            <AiCannedSuggestions
              formId={formId}
              ticketCategory={ticket.category}
              ticketSubject={ticket.subject}
              onInsertResponse={handleInsertCanned}
            />
          )}
          {/* === END AGENT 13 === */}

          {/* === AGENT 13: AI Classification Details === */}
          {(ticket as Ticket & { ai_classification?: AiClassification }).ai_classification && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t("predictions.aiClassification", "AI Classification")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(() => {
                  const classification = (ticket as Ticket & { ai_classification?: AiClassification }).ai_classification;
                  if (!classification) return null;
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("predictions.suggestedCategory", "Category")}</span>
                        <Badge variant="outline">{classification.category}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("predictions.suggestedPriority", "Priority")}</span>
                        <Badge variant="secondary" className={PRIORITY_COLORS[classification.priority] ?? ""}>
                          {classification.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("predictions.confidence", "Confidence")}</span>
                        <span className="font-medium">{Math.round(classification.confidence * 100)}%</span>
                      </div>
                      {classification.reasoning && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {classification.reasoning}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 flex-1"
                          onClick={() => {
                            updateField("category", classification.category);
                            updateField("priority", classification.priority);
                          }}
                        >
                          {t("predictions.acceptSuggestion", "Accept")}
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}
          {/* === END AGENT 13 === */}

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('support.timeline')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {t('support.created')}: {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
              {ticket.first_response_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>
                    {t('support.firstResponse')}:{" "}
                    {new Date(ticket.first_response_at).toLocaleString()}
                  </span>
                </div>
              )}
              {ticket.resolved_at && (
                <div className="flex items-center gap-2 text-green-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {t('support.resolved')}:{" "}
                    {new Date(ticket.resolved_at).toLocaleString()}
                  </span>
                </div>
              )}
              {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    {t('support.updated')}:{" "}
                    {new Date(ticket.updated_at).toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
