/**
 * Hook for AI response analysis (Agent 12).
 * Wraps the analyzeResponses() API call with loading/error state.
 * Supports auto-trigger on mount when enabled.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  analyzeResponses,
  type AiAnalyzeResponse,
  type AiSubmissionInput,
} from "@/lib/ai";

interface UseAiAnalysisOptions {
  autoTrigger?: boolean;
  submissions?: AiSubmissionInput[];
  locale?: string;
}

const AUTO_TRIGGER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function useAiAnalysis(
  formId: string,
  workspaceId: string,
  options?: UseAiAnalysisOptions,
) {
  const [summary, setSummary] = useState<AiAnalyzeResponse["summary"] | null>(null);
  const [sentiments, setSentiments] = useState<AiAnalyzeResponse["sentiments"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);

  const lastAutoTriggerRef = useRef<number>(0);
  const autoTriggeredRef = useRef(false);

  const analyze = useCallback(
    async (submissions: AiSubmissionInput[], locale: string) => {
      if (submissions.length === 0) {
        setError("No submissions to analyze");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await analyzeResponses({
          submissions,
          locale,
          form_id: formId,
          workspace_id: workspaceId,
        });

        setSummary(response.summary);
        setSentiments(response.sentiments);
        setLastAnalyzedAt(response.summary.analyzedAt);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Analysis failed";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [formId, workspaceId]
  );

  // Auto-trigger on mount when enabled
  useEffect(() => {
    if (!options?.autoTrigger) return;
    if (autoTriggeredRef.current) return;
    if (summary !== null) return;
    if (!options.submissions || options.submissions.length < 3) return;

    const now = Date.now();
    if (now - lastAutoTriggerRef.current < AUTO_TRIGGER_COOLDOWN_MS) return;

    autoTriggeredRef.current = true;
    lastAutoTriggerRef.current = now;
    analyze(options.submissions, options.locale ?? "en");
  }, [options?.autoTrigger, options?.submissions, options?.locale, summary, analyze]);

  return {
    analyze,
    summary,
    sentiments,
    isLoading,
    error,
    lastAnalyzedAt,
  };
}
