/**
 * Hook for AI-powered reply suggestions.
 * Wraps the suggestReplies() API call with loading/error state.
 * Auto-fetches on mount when inputs are provided.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  suggestReplies,
  type AiSuggestReplyRequest,
  type AiReplySuggestion,
} from "@/lib/ai";

interface UseAiSuggestReplyOptions {
  ticketSubject: string;
  ticketDescription?: string;
  ticketCategory?: string;
  formId: string;
  workspaceId: string;
  locale?: string;
}

export function useAiSuggestReply(options: UseAiSuggestReplyOptions) {
  const [suggestions, setSuggestions] = useState<AiReplySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedForRef = useRef<string>("");

  const fetchSuggestions = useCallback(async () => {
    if (!options.ticketSubject || !options.formId || !options.workspaceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const request: AiSuggestReplyRequest = {
        ticket_subject: options.ticketSubject,
        ticket_description: options.ticketDescription,
        ticket_category: options.ticketCategory,
        form_id: options.formId,
        workspace_id: options.workspaceId,
        locale: options.locale,
      };

      const response = await suggestReplies(request);
      setSuggestions(response.suggestions ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate suggestions";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [
    options.ticketSubject,
    options.ticketDescription,
    options.ticketCategory,
    options.formId,
    options.workspaceId,
    options.locale,
  ]);

  // Auto-fetch on mount and when key inputs change
  useEffect(() => {
    if (!options.ticketSubject || !options.formId || !options.workspaceId) return;

    const key = `${options.formId}:${options.ticketSubject}`;
    if (fetchedForRef.current === key) return;

    fetchedForRef.current = key;
    fetchSuggestions();
  }, [fetchSuggestions, options.ticketSubject, options.formId, options.workspaceId]);

  return {
    suggestions,
    isLoading,
    error,
    refresh: fetchSuggestions,
  };
}
