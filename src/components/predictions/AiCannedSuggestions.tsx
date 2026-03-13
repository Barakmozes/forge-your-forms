// ============================================
// AiCannedSuggestions — AI-powered response suggestions
// Uses the ai-suggest-reply edge function to generate
// tailored reply suggestions based on ticket context.
// ============================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAiSuggestReply } from "@/hooks/useAiSuggestReply";
import FeatureGate from "@/components/upgrade/FeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Sparkles, ThumbsDown, Copy, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface AiCannedSuggestionsProps {
  formId: string;
  ticketCategory: string | null;
  ticketSubject: string;
  ticketDescription?: string;
  onInsertResponse: (content: string) => void;
}

export default function AiCannedSuggestions({
  formId,
  ticketCategory,
  ticketSubject,
  ticketDescription,
  onInsertResponse,
}: AiCannedSuggestionsProps) {
  const { t, i18n } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? "";
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const { suggestions, isLoading, error, refresh } = useAiSuggestReply({
    ticketSubject,
    ticketDescription,
    ticketCategory: ticketCategory ?? undefined,
    formId,
    workspaceId,
    locale: i18n.language,
  });

  const handleDismiss = (index: number) => {
    setDismissed((prev) => new Set([...prev, index]));
  };

  const visibleSuggestions = suggestions.filter((_, i) => !dismissed.has(i));

  if (!isLoading && !error && visibleSuggestions.length === 0) return null;

  return (
    <FeatureGate feature="ai_suggestions" requiredPlan="business" featureName={t("predictions.aiSuggestedResponses")}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("predictions.aiSuggestions")}
            <InfoTooltip contentKey="tooltips.dashboards.aiSuggestionsInfo" />
          </CardTitle>
          {!isLoading && suggestions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => {
                setDismissed(new Set());
                refresh();
              }}
            >
              <RefreshCw className="h-3 w-3" />
              {t("predictions.refreshSuggestions")}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-sm gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("predictions.aiGeneratingSuggestions")}
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-sm text-destructive">{t("predictions.aiSuggestionsError")}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={refresh}
              >
                <RefreshCw className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            visibleSuggestions.map((suggestion, index) => {
              const originalIndex = suggestions.indexOf(suggestion);
              return (
                <div
                  key={originalIndex}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <p className="text-xs font-medium text-foreground">
                    {suggestion.label}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {suggestion.message}
                  </p>
                  {suggestion.reasoning && (
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronDown className="h-3 w-3" />
                        {t("predictions.suggestionReasoning")}
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <p className="text-xs text-muted-foreground mt-1 ps-4">
                          {suggestion.reasoning}
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
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
                      onClick={() => handleDismiss(originalIndex)}
                    >
                      <ThumbsDown className="h-3 w-3" />
                      {t("predictions.notHelpful")}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </FeatureGate>
  );
}
