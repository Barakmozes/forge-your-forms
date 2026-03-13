/**
 * AI integration library for FormForge (Agent 12).
 *
 * Provides typed wrappers around the ai-generate and ai-analyze Edge Functions.
 * All AI calls go through Supabase Edge Functions so the Anthropic API key
 * stays server-side.
 */

import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

// ─── Types ──────────────────────────────────────────────────────────

export interface AiFormField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  options: string[];
  validation: Record<string, unknown>;
}

export interface AiGenerateRequest {
  prompt: string;
  mode: string;
  locale: string;
  workspace_id: string;
}

export interface AiGenerateResponse {
  title: string;
  description: string;
  fields: AiFormField[];
}

export interface AiSubmissionInput {
  id: string;
  text_fields: Record<string, string>;
}

export interface AiAnalyzeRequest {
  submissions: AiSubmissionInput[];
  locale: string;
  form_id: string;
  workspace_id: string;
}

export interface AiSummary {
  topThemes: string[];
  sentimentTrend: "improving" | "declining" | "stable";
  overallSentiment: "positive" | "neutral" | "negative";
  suggestedActions: string[];
  analyzedCount: number;
  analyzedAt: string;
}

export interface SubmissionSentiment {
  submissionId: string;
  sentiment: "positive" | "neutral" | "negative";
  keywords: string[];
}

export interface AiAnalyzeResponse {
  summary: AiSummary;
  sentiments: SubmissionSentiment[];
}

export type AiSentiment = "positive" | "neutral" | "negative";

export interface AiSuggestReplyRequest {
  ticket_subject: string;
  ticket_description?: string;
  ticket_category?: string;
  form_id: string;
  workspace_id: string;
  locale?: string;
}

export interface AiReplySuggestion {
  label: string;
  message: string;
  reasoning: string;
}

export interface AiSuggestReplyResponse {
  suggestions: AiReplySuggestion[];
}

// ─── API Calls ──────────────────────────────────────────────────────

/**
 * Generate form fields from a natural language prompt.
 * Calls the `ai-generate` Edge Function.
 */
export async function generateForm(
  request: AiGenerateRequest
): Promise<AiGenerateResponse> {
  const { data, error } = await supabase.functions.invoke("ai-generate", {
    body: request,
  });

  if (error) {
    let message = "AI service is currently unavailable";
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (body?.error) message = body.error;
      } catch { /* use default */ }
    } else if (error.message) {
      message = error.message;
    }
    throw new Error(message);
  }

  if (data?.error) {
    const err = new Error(data.error);
    if (data.code === "RATE_LIMIT") {
      (err as Error & { code?: string }).code = "RATE_LIMIT";
    }
    throw err;
  }

  return data as AiGenerateResponse;
}

/**
 * Analyze form submissions for sentiment, themes, and insights.
 * Calls the `ai-analyze` Edge Function.
 */
export async function analyzeResponses(
  request: AiAnalyzeRequest
): Promise<AiAnalyzeResponse> {
  const { data, error } = await supabase.functions.invoke("ai-analyze", {
    body: request,
  });

  if (error) {
    let message = "AI service is currently unavailable";
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (body?.error) message = body.error;
      } catch { /* use default */ }
    } else if (error.message) {
      message = error.message;
    }
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as AiAnalyzeResponse;
}

/**
 * Generate AI-powered reply suggestions for a support ticket.
 * Calls the `ai-suggest-reply` Edge Function.
 */
export async function suggestReplies(
  request: AiSuggestReplyRequest
): Promise<AiSuggestReplyResponse> {
  const { data, error } = await supabase.functions.invoke("ai-suggest-reply", {
    body: request,
  });

  if (error) {
    let message = "AI service is currently unavailable";
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (body?.error) message = body.error;
      } catch { /* use default */ }
    } else if (error.message) {
      message = error.message;
    }
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as AiSuggestReplyResponse;
}
