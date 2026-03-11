/**
 * Hook for AI form generation (Agent 12).
 * Wraps the generateForm() API call with loading/error state management.
 */

import { useState, useCallback } from "react";
import { generateForm, type AiGenerateResponse } from "@/lib/ai";

export function useAiGenerate() {
  const [result, setResult] = useState<AiGenerateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (prompt: string, mode: string, locale: string, workspaceId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await generateForm({
          prompt,
          mode,
          locale,
          workspace_id: workspaceId,
        });
        setResult(response);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI generation failed";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    generate,
    result,
    fields: result?.fields ?? null,
    title: result?.title ?? null,
    description: result?.description ?? null,
    isLoading,
    error,
    reset,
  };
}
