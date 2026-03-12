// ============================================
// usePlanLimits — central plan limits & gating hook (Agent 7)
// ============================================

import { useMemo } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsage } from "@/hooks/useUsage";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
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
    maxFeedbackForms: 1,
    maxSupportInboxes: 1,
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
  integrations: "pro",
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
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const limits = PLAN_LIMITS[plan];

  // Workspace owners bypass all plan limits and feature gates
  const isOwnerBypass = !!(user?.id && currentWorkspace?.owner_id && user.id === currentWorkspace.owner_id);

  const canAccessMode = (mode: FormMode): boolean => {
    if (isOwnerBypass) return true;
    const required = getRequiredPlanForMode(mode);
    return isPlanAtLeast(plan, required);
  };

  const canCreateForm = (mode: FormMode): boolean => {
    if (isOwnerBypass) return true;
    if (!canAccessMode(mode)) return false;
    if (limits.maxForms !== null && formCount >= limits.maxForms) return false;
    return true;
  };

  const canAcceptSubmission = (): boolean => {
    if (isOwnerBypass) return true;
    if (limits.maxSubmissionsPerMonth === null) return true;
    return submissionCount < limits.maxSubmissionsPerMonth;
  };

  const canInviteMember = (): boolean => {
    if (isOwnerBypass) return true;
    if (limits.maxMembers === null) return true;
    return memberCount < limits.maxMembers;
  };

  const canAccessFeature = (feature: string): boolean => {
    if (isOwnerBypass) return true;
    const required = FEATURE_REQUIRED_PLAN[feature];
    if (!required) return true;
    return isPlanAtLeast(plan, required);
  };

  const submissionPercentUsed = useMemo(() => {
    if (isOwnerBypass) return 0;
    if (limits.maxSubmissionsPerMonth === null) return 0;
    if (limits.maxSubmissionsPerMonth === 0) return 100;
    return Math.min(100, Math.round((submissionCount / limits.maxSubmissionsPerMonth) * 100));
  }, [isOwnerBypass, submissionCount, limits.maxSubmissionsPerMonth]);

  const isNearLimit = !isOwnerBypass && submissionPercentUsed >= 80 && submissionPercentUsed < 100;
  const isAtLimit = !isOwnerBypass && submissionPercentUsed >= 100;

  return {
    plan,
    limits,
    usage: { submissionCount, formCount, memberCount },
    isOwnerBypass,
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
