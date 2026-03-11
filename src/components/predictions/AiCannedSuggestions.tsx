// ============================================
// AiCannedSuggestions — AI-powered response suggestions (Agent 13)
// Shows suggested responses based on similar resolved tickets.
// ============================================

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import FeatureGate from "@/components/upgrade/FeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ThumbsDown, Copy, Loader2 } from "lucide-react";

interface AiCannedSuggestionsProps {
  formId: string;
  ticketCategory: string | null;
  ticketSubject: string;
  onInsertResponse: (content: string) => void;
}

interface SuggestedResponse {
  id: string;
  message: string;
  fromTicketNumber: string;
  similarity: string;
}

export default function AiCannedSuggestions({
  formId,
  ticketCategory,
  ticketSubject,
  onInsertResponse,
}: AiCannedSuggestionsProps) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<SuggestedResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!formId) return;
    fetchSuggestions();
  }, [formId, ticketCategory]);

  const fetchSuggestions = async () => {
    setLoading(true);

    // Find resolved tickets in the same form with matching category
    let query = supabase
      .from("tickets")
      .select("id, ticket_number, category")
      .eq("form_id", formId)
      .eq("status", "resolved")
      .order("resolved_at", { ascending: false })
      .limit(20);

    if (ticketCategory) {
      query = query.eq("category", ticketCategory);
    }

    const { data: resolvedTickets } = await query;

    if (!resolvedTickets || resolvedTickets.length === 0) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    // Get the last agent message from each resolved ticket
    const ticketIds = resolvedTickets.map((t) => t.id);
    const { data: messages } = await supabase
      .from("ticket_messages")
      .select("ticket_id, message, sender_type, is_internal, created_at")
      .in("ticket_id", ticketIds)
      .eq("sender_type", "agent")
      .eq("is_internal", false)
      .order("created_at", { ascending: false });

    if (!messages || messages.length === 0) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    // Get unique last agent messages per ticket
    const seenTickets = new Set<string>();
    const uniqueMessages: SuggestedResponse[] = [];

    for (const msg of messages) {
      if (seenTickets.has(msg.ticket_id)) continue;
      seenTickets.add(msg.ticket_id);

      const ticket = resolvedTickets.find((t) => t.id === msg.ticket_id);
      if (!ticket) continue;

      // Skip very short messages (likely "ok" or "thanks")
      if (msg.message.length < 20) continue;

      uniqueMessages.push({
        id: msg.ticket_id,
        message: msg.message,
        fromTicketNumber: ticket.ticket_number,
        similarity: ticket.category === ticketCategory ? "category" : "form",
      });

      if (uniqueMessages.length >= 3) break;
    }

    setSuggestions(uniqueMessages);
    setLoading(false);
  };

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  };

  const visibleSuggestions = suggestions.filter((s) => !dismissed.has(s.id));

  if (!loading && visibleSuggestions.length === 0) return null;

  return (
    <FeatureGate feature="ai_suggestions" requiredPlan="business" featureName={t("predictions.aiSuggestedResponses")}>
      {/* === AGENT 13: AI Canned Suggestions === */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("predictions.aiSuggestions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("predictions.loadingSuggestions")}
            </div>
          ) : (
            visibleSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="rounded-lg border p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {t("predictions.fromTicket")} {suggestion.fromTicketNumber}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-[10px]"
                  >
                    {suggestion.similarity === "category"
                      ? t("predictions.categoryMatch")
                      : t("predictions.formMatch")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {suggestion.message}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs h-7"
                    onClick={() => onInsertResponse(suggestion.message)}
                  >
                    <Copy className="h-3 w-3" />
                    {t("predictions.useResponse")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-xs h-7 text-muted-foreground"
                    onClick={() => handleDismiss(suggestion.id)}
                  >
                    <ThumbsDown className="h-3 w-3" />
                    {t("predictions.notHelpful")}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      {/* === END AGENT 13 === */}
    </FeatureGate>
  );
}
