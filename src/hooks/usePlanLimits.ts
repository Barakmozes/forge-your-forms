// ============================================
// usePlanLimits — central plan limits & gating hook (Agent 7)
// ============================================

import { useMemo } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsage } from "@/hooks/useUsage";
import { isPlanAtLeast } from "@/lib/stripe";
import type { PlanTier } from "@/lib/stripe";
import type { Database } from "@/integrations/supabase/types";

type FormMode = Database["public"]["Enums"]["form_mode"];

export interface PlanLimits {
  maxForms: number | null;
  maxWaitlists: number | null;
  maxFeedbackForms: number | null;
  maxSupportInboxes: number | null;
  maxSubmissionsPerMonth: number | null;
  maxMembers: number | null;
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxForms: 3,
    maxWaitlists: 1,
    maxFeedbackForms: 0,
    maxSupportInboxes: 0,
    maxSubmissionsPerMonth: 100,
    maxMembers: 1,
  },
  pro: {
    maxForms: null,
    maxWaitlists: 3,
    maxFeedbackForms: 3,
    maxSupportInboxes: 0,
    maxSubmissionsPerMonth: 5000,
    maxMembers: 3,
  },
  growth: {
    maxForms: null,
    maxWaitlists: null,
    maxFeedbackForms: null,
    maxSupportInboxes: 1,
    maxSubmissionsPerMonth: 25000,
    maxMembers: 10,
  },
  business: {
    maxForms: null,
    maxWaitlists: null,
    maxFeedbackForms: null,
    maxSupportInboxes: null,
    maxSubmissionsPerMonth: null,
    maxMembers: null,
  },
};

/** Features gated to specific plan tiers */
const FEATURE_REQUIRED_PLAN: Record<string, PlanTier> = {
  kanban: "growth",
  sla: "growth",
  api: "growth",
  webhooks: "growth",
  ab_testing: "growth",
  sso: "business",
  workflows: "business",
  ai: "business",
  white_label: "business",
  custom_domain: "growth",
};

/** Get the minimum plan required for a form mode */
export function getRequiredPlanForMode(mode: FormMode): PlanTier {
  switch (mode) {
    case "feedback": return "pro";
    case "support": return "growth";
    default: return "free";
  }
}

export function usePlanLimits() {
  const { plan, isLoading: subLoading } = useSubscription();
  const { submissionCount, formCount, memberCount, isLoading: usageLoading } = useUsage();

  const limits = PLAN_LIMITS[plan];

  const canAccessMode = (mode: FormMode): boolean => {
    const required = getRequiredPlanForMode(mode);
    return isPlanAtLeast(plan, required);
  };

  const canCreateForm = (mode: FormMode): boolean => {
    if (!canAccessMode(mode)) return false;
    if (limits.maxForms !== null && formCount >= limits.maxForms) return false;
    return true;
  };

  const canAcceptSubmission = (): boolean => {
    if (limits.maxSubmissionsPerMonth === null) return true;
    return submissionCount < limits.maxSubmissionsPerMonth;
  };

  const canInviteMember = (): boolean => {
    if (limits.maxMembers === null) return true;
    return memberCount < limits.maxMembers;
  };

  const canAccessFeature = (feature: string): boolean => {
    const required = FEATURE_REQUIRED_PLAN[feature];
    if (!required) return true;
    return isPlanAtLeast(plan, required);
  };

  const submissionPercentUsed = useMemo(() => {
    if (limits.maxSubmissionsPerMonth === null) return 0;
    if (limits.maxSubmissionsPerMonth === 0) return 100;
    return Math.min(100, Math.round((submissionCount / limits.maxSubmissionsPerMonth) * 100));
  }, [submissionCount, limits.maxSubmissionsPerMonth]);

  const isNearLimit = submissionPercentUsed >= 80 && submissionPercentUsed < 100;
  const isAtLimit = submissionPercentUsed >= 100;

  return {
    plan,
    limits,
    usage: { submissionCount, formCount, memberCount },
    canCreateForm,
    canAcceptSubmission,
    canInviteMember,
    canAccessMode,
    canAccessFeature,
    submissionPercentUsed,
    isNearLimit,
    isAtLimit,
    isLoading: subLoading || usageLoading,
  };
}
