// ============================================
// FeatureGate — wraps gated UI with upgrade overlay (Agent 7)
// ============================================

import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { isPlanAtLeast } from "@/lib/stripe";
import type { PlanTier } from "@/lib/stripe";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaywallModal from "@/components/upgrade/PaywallModal";

interface FeatureGateProps {
  feature: string;
  requiredPlan: PlanTier;
  featureName?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function FeatureGate({
  feature,
  requiredPlan,
  featureName,
  children,
  fallback,
}: FeatureGateProps) {
  const { t } = useTranslation();
  const { plan, isLoading } = usePlanLimits();
  const [paywallOpen, setPaywallOpen] = useState(false);

  if (isLoading) return <>{children}</>;

  const hasAccess = isPlanAtLeast(plan, requiredPlan);

  if (hasAccess) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const PLAN_LABELS: Record<PlanTier, string> = {
    free: "Free",
    pro: "Pro",
    growth: "Growth",
    business: "Business",
  };

  return (
    <>
      <div className="relative rounded-lg overflow-hidden">
        <div className="pointer-events-none select-none blur-sm opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {t("upgrade.requiresPlan", { plan: PLAN_LABELS[requiredPlan] })}
            </p>
            <Button
              size="sm"
              onClick={() => setPaywallOpen(true)}
            >
              {t("upgrade.upgradeTo", { plan: PLAN_LABELS[requiredPlan] })}
            </Button>
          </div>
        </div>
      </div>
      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        requiredPlan={requiredPlan}
        featureName={featureName || feature}
      />
    </>
  );
}
