// ============================================
// UpgradePrompt — inline upgrade CTA for gated modes (Agent 7)
// ============================================

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight } from "lucide-react";
import type { PlanTier } from "@/lib/stripe";

interface UpgradePromptProps {
  requiredPlan: PlanTier;
  featureName: string;
}

const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Free",
  pro: "Pro",
  growth: "Growth",
  business: "Business",
};

export default function UpgradePrompt({ requiredPlan, featureName }: UpgradePromptProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {t("upgrade.featureRequiresPlan", { feature: featureName })}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("upgrade.upgradeToAccess", { plan: PLAN_LABELS[requiredPlan] })}
          </p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/pricing")}>
          {t("upgrade.viewPlans")} <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
