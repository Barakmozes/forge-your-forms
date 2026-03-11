// ============================================
// PaywallModal — upgrade dialog when feature is gated (Agent 7)
// ============================================

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import type { PlanTier } from "@/lib/stripe";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredPlan: PlanTier;
  featureName?: string;
  description?: string;
}

const PLAN_COLORS: Record<PlanTier, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  growth: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  business: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function PaywallModal({
  open,
  onOpenChange,
  requiredPlan,
  featureName,
  description,
}: PaywallModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const planLabel = t(`billing.plan${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-display">
            {featureName
              ? t("upgrade.featureRequiresPlan", { feature: featureName })
              : t("upgrade.upgradeRequired")}
          </DialogTitle>
          <DialogDescription className="pt-1">
            {description || t("upgrade.upgradeDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">
                {t("upgrade.unlockWith")}
              </span>
              <Badge className={PLAN_COLORS[requiredPlan]}>
                {planLabel}
              </Badge>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1.5 ps-6 list-disc">
              <li>{t("upgrade.benefitUnlimited")}</li>
              <li>{t("upgrade.benefitModes")}</li>
              <li>{t("upgrade.benefitTeam")}</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full gap-2"
              onClick={() => {
                onOpenChange(false);
                navigate("/pricing");
              }}
            >
              {t("upgrade.viewPlans")} <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              {t("upgrade.maybeLater")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
