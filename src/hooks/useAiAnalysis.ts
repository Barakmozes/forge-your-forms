/**
 * Hook for AI response analysis (Agent 12).
 * Wraps the analyzeResponses() API call with loading/error state.
 * Triggered on-demand (button click), not automatically.
 */

import { useState, useCallback } from "react";
import {
  analyzeResponses,
  type AiAnalyzeResponse,
  type AiSubmissionInput,
} from "@/lib/ai";

export function useAiAnalysis(formId: string, workspaceId: string) {
  const [summary, setSummary] = useState<AiAnalyzeResponse["summary"] | null>(null);
  const [sentiments, setSentiments] = useState<AiAnalyzeResponse["sentiments"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);

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

  return {
    analyze,
    summary,
    sentiments,
    isLoading,
    error,
    lastAnalyzedAt,
  };
}
