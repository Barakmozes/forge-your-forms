// ============================================
// AiSummaryWidget — AI insights dashboard card (Agent 12)
// Shows top themes, sentiment trend, and suggested actions.
// Gated to Business plan via FeatureGate.
// ============================================

import { useTranslation } from "react-i18next";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAiAnalysis } from "@/hooks/useAiAnalysis";
import FeatureGate from "@/components/upgrade/FeatureGate";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  Lightbulb,
  Tag,
} from "lucide-react";
import type { AiSubmissionInput } from "@/lib/ai";

interface AiSummaryWidgetProps {
  formId: string;
  /** Pre-extracted text submissions for analysis */
  submissions: AiSubmissionInput[];
}

const TREND_ICONS: Record<string, React.ElementType> = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
};

const TREND_COLORS: Record<string, string> = {
  improving: "text-green-600 dark:text-green-400",
  declining: "text-red-600 dark:text-red-400",
  stable: "text-gray-500 dark:text-gray-400",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  neutral: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  negative: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
};

export default function AiSummaryWidget({ formId, submissions }: AiSummaryWidgetProps) {
  const { t, i18n } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? "";
  const { analyze, summary, isLoading, error, lastAnalyzedAt } = useAiAnalysis(formId, workspaceId);

  const handleAnalyze = () => {
    if (submissions.length === 0 || !workspaceId) return;
    analyze(submissions, i18n.language);
  };

  return (
    <FeatureGate feature="ai-analysis" requiredPlan="business">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("ai.summary")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleAnalyze}
            disabled={isLoading || submissions.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("ai.analyzing")}
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                {t("ai.analyze")}
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {!summary && !isLoading && !error && (
            <div className="text-center py-6 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {submissions.length === 0
                  ? t("ai.noDataToAnalyze")
                  : t("ai.clickAnalyze")}
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive py-4 text-center">{error}</p>
          )}

          {summary && (
            <div className="space-y-4">
              {/* Overall Sentiment + Trend */}
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className={`${SENTIMENT_COLORS[summary.overallSentiment] ?? ""} text-xs`}
                >
                  {t(`ai.sentiment.${summary.overallSentiment}`)}
                </Badge>
                {(() => {
                  const TrendIcon = TREND_ICONS[summary.sentimentTrend] ?? Minus;
                  const trendColor = TREND_COLORS[summary.sentimentTrend] ?? "";
                  return (
                    <span className={`flex items-center gap-1 text-xs ${trendColor}`}>
                      <TrendIcon className="h-3.5 w-3.5" />
                      {t(`ai.trend.${summary.sentimentTrend}`)}
                    </span>
                  );
                })()}
                <span className="text-xs text-muted-foreground ms-auto">
                  {summary.analyzedCount} {t("ai.analyzed")}
                </span>
              </div>

              {/* Top Themes */}
              {summary.topThemes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Tag className="h-3 w-3" />
                    {t("ai.topThemes")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.topThemes.map((theme) => (
                      <Badge key={theme} variant="outline" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Actions */}
              {summary.suggestedActions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Lightbulb className="h-3 w-3" />
                    {t("ai.suggestedActions")}
                  </p>
                  <ul className="space-y-1">
                    {summary.suggestedActions.map((action, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">-</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Last Analyzed */}
              {lastAnalyzedAt && (
                <p className="text-xs text-muted-foreground pt-1">
                  {t("ai.lastAnalyzed")}: {new Date(lastAnalyzedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </FeatureGate>
  );
}
