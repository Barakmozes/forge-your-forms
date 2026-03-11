// ============================================
// PlanBadge — Shows current plan tier (Agent 6)
// ============================================

import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/stripe";

const PLAN_COLORS: Record<PlanTier, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  growth: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  business: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

interface PlanBadgeProps {
  className?: string;
  showFree?: boolean;
}

export default function PlanBadge({ className, showFree = false }: PlanBadgeProps) {
  const { t } = useTranslation();
  const { plan, isLoading } = useSubscription();

  if (isLoading) return null;
  if (plan === "free" && !showFree) return null;

  const label = t(`billing.plan${plan.charAt(0).toUpperCase() + plan.slice(1)}`);

  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", PLAN_COLORS[plan], className)}>
      {label}
    </Badge>
  );
}
