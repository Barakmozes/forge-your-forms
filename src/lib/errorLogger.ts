/**
 * Centralized error logging utility with pluggable backends.
 * Supports console (dev), Supabase (production), and Sentry-ready hook.
 */

import { supabase } from "@/integrations/supabase/client";

// --- Types ---

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorReport {
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  workspaceId?: string;
  url: string;
  userAgent: string;
}

// --- Helpers ---

function formatTimestamp(): string {
  return new Date().toISOString();
}

function buildReport(error: unknown, context?: ErrorContext): ErrorReport {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  return {
    message,
    stack,
    context: {
      ...(context?.component && { component: context.component }),
      ...(context?.action && { action: context.action }),
      ...(context?.metadata && { ...context.metadata }),
    },
    timestamp: formatTimestamp(),
    userId: context?.userId,
    workspaceId: context?.workspaceId,
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
}

// --- Rate limiting to avoid flooding ---

const recentErrors = new Map<string, number>();
const ERROR_THROTTLE_MS = 5000; // Don't report same error within 5s

function isThrottled(message: string): boolean {
  const now = Date.now();
  const lastSeen = recentErrors.get(message);
  if (lastSeen && now - lastSeen < ERROR_THROTTLE_MS) {
    return true;
  }
  recentErrors.set(message, now);
  // Clean up old entries
  if (recentErrors.size > 100) {
    const cutoff = now - ERROR_THROTTLE_MS;
    for (const [key, time] of recentErrors) {
      if (time < cutoff) recentErrors.delete(key);
    }
  }
  return false;
}

// --- Console Backend (always active) ---

function logToConsole(report: ErrorReport): void {
  console.error(
    `[${report.timestamp}] ERROR: ${report.message}`,
    {
      ...(Object.keys(report.context).length > 0 && { context: report.context }),
      ...(report.stack && { stack: report.stack }),
    }
  );
}

// --- Supabase Backend (production) ---

async function logToSupabase(report: ErrorReport): Promise<void> {
  try {
    await supabase.from("error_logs").insert({
      message: report.message.slice(0, 2000),
      stack: report.stack?.slice(0, 5000),
      context: report.context,
      user_id: report.userId || null,
      workspace_id: report.workspaceId || null,
      url: report.url.slice(0, 500),
      user_agent: report.userAgent.slice(0, 500),
    });
  } catch {
    // Silently fail — don't recurse if error logging itself fails
  }
}

// --- Sentry-ready Hook ---
// To enable Sentry:
// 1. Install @sentry/react: npm install @sentry/react
// 2. Set VITE_SENTRY_DSN in .env
// 3. Initialize in main.tsx:
//    import * as Sentry from "@sentry/react";
//    Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
// 4. Replace logToSentry body with: Sentry.captureException(error);

// --- Public API ---

const isProduction = typeof import.meta !== "undefined" && import.meta.env?.PROD;

/**
 * Log an error with structured context.
 * Console in dev, Supabase in production.
 */
export function logError(error: unknown, context?: ErrorContext): void {
  const report = buildReport(error, context);

  // Always log to console
  logToConsole(report);

  // In production, also send to Supabase (throttled)
  if (isProduction && !isThrottled(report.message)) {
    logToSupabase(report);
  }
}

/**
 * Log a warning with structured context.
 */
export function logWarning(message: string, context?: ErrorContext): void {
  console.warn(
    `[${formatTimestamp()}] WARN: ${message}`,
    ...(context ? [{ context }] : [])
  );
}

/**
 * Capture and log an error (alias for logError with better ergonomics).
 */
export function captureError(error: unknown, context?: ErrorContext): void {
  logError(error, context);
}

/**
 * Initialize global error handlers.
 * Call this once in main.tsx.
 */
export function initGlobalErrorHandlers(): void {
  window.onerror = (message, source, line, col, error) => {
    logError(error || new Error(String(message)), {
      action: "window.onerror",
      metadata: { source, line, col },
    });
  };

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    logError(event.reason, {
      action: "unhandledRejection",
    });
  };
}
