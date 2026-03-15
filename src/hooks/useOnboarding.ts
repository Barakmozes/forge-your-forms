// ============================================
// useOnboarding — Onboarding state management (Agent 8)
// Checks profile.onboarding_completed and manages activation events
// ============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface UseOnboardingReturn {
  isOnboarded: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  logActivationEvent: (eventType: string, metadata?: Record<string, unknown>) => Promise<void>;
}

/**
 * Standalone activation event logger — can be called outside React components.
 * Use this for tracking events from non-hook contexts (e.g., form creation handlers).
 */
export async function trackActivationEvent(
  userId: string,
  workspaceId: string,
  eventType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await supabase.from("activation_events").insert({
    user_id: userId,
    workspace_id: workspaceId,
    event_type: eventType,
    metadata,
  });
}

export function useOnboarding(): UseOnboardingReturn {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [isOnboarded, setIsOnboarded] = useState(true); // default true to avoid flash redirect
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const checkOnboarding = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setIsOnboarded(data.onboarding_completed ?? false);
      }
      setIsLoading(false);
    };

    checkOnboarding();
  }, [user]);

  const logActivationEvent = useCallback(
    async (eventType: string, metadata: Record<string, unknown> = {}) => {
      if (!user || !currentWorkspace) return;

      await supabase.from("activation_events").insert({
        user_id: user.id,
        workspace_id: currentWorkspace.id,
        event_type: eventType,
        metadata,
      });
    },
    [user, currentWorkspace]
  );

  const markOnboardingComplete = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);

    if (error) throw error;

    setIsOnboarded(true);
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    await logActivationEvent("onboarding_completed");
    await markOnboardingComplete();
  }, [logActivationEvent, markOnboardingComplete]);

  const skipOnboarding = useCallback(async () => {
    await logActivationEvent("onboarding_completed", { skipped: true });
    await markOnboardingComplete();
  }, [logActivationEvent, markOnboardingComplete]);

  return {
    isOnboarded,
    isLoading,
    completeOnboarding,
    skipOnboarding,
    logActivationEvent,
  };
}
