import { useToast } from "@/hooks/use-toast";
import { logError, type ErrorContext } from "@/lib/errorLogger";

interface HandleAsyncOptions {
  context?: ErrorContext;
  errorMessage?: string;
  showToast?: boolean;
}

/**
 * Hook for handling async operations with centralized error logging and toast feedback.
 *
 * Usage:
 *   const { handleAsync } = useErrorHandler();
 *   const result = await handleAsync(
 *     () => supabase.from("forms").select("*"),
 *     { context: { component: "Forms", action: "fetchForms" } }
 *   );
 */
export function useErrorHandler() {
  const { toast } = useToast();

  async function handleAsync<T>(
    operation: () => Promise<T>,
    options: HandleAsyncOptions = {}
  ): Promise<T | null> {
    const {
      context,
      errorMessage = "Something went wrong. Please try again.",
      showToast = true,
    } = options;

    try {
      return await operation();
    } catch (error) {
      logError(error, context);

      if (showToast) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }

      return null;
    }
  }

  return { handleAsync };
}
