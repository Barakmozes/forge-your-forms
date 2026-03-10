/**
 * Centralized error logging utility.
 * Structured for later Sentry/external service plug-in.
 */

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Log an error with structured context.
 * Replace console.error internals with Sentry.captureException when ready.
 */
export function logError(error: unknown, context?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(
    `[${formatTimestamp()}] ERROR: ${message}`,
    {
      ...(context && { context }),
      ...(stack && { stack }),
    }
  );
}

/**
 * Log a warning with structured context.
 * Replace internals with Sentry.captureMessage when ready.
 */
export function logWarning(message: string, context?: ErrorContext): void {
  console.warn(
    `[${formatTimestamp()}] WARN: ${message}`,
    ...(context ? [{ context }] : [])
  );
}
