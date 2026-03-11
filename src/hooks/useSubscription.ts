// ============================================
// useSubscription — React Query hook for billing (Agent 6)
// ============================================

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { resolvePlanTier, PLAN_FEATURES } from "@/lib/stripe";
import type { PlanTier } from "@/lib/stripe";
import type { Database } from "@/integrations/supabase/types";

export type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

async function fetchSubscription(workspaceId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useSubscription() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["subscription", workspaceId],
    queryFn: () => fetchSubscription(workspaceId!),
    enabled: !!workspaceId,
  });

  // Subscribe to realtime changes on subscriptions table
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`subscription-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["subscription", workspaceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

  const subscription = query.data ?? null;
  const plan: PlanTier = resolvePlanTier(subscription);

  const canAccess = (feature: string): boolean => {
    return PLAN_FEATURES[plan]?.includes(feature) ?? false;
  };

  return {
    subscription,
    plan,
    isLoading: query.isLoading,
    isFree: plan === "free",
    isPro: plan === "pro",
    isGrowth: plan === "growth",
    isBusiness: plan === "business",
    canAccess,
  };
}
