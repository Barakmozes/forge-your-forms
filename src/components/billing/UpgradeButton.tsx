// ============================================
// UpgradeButton — Contextual upgrade CTA (Agent 6)
// ============================================

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { isPlanAtLeast } from "@/lib/stripe";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/stripe";

interface UpgradeButtonProps {
  requiredPlan: PlanTier;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export default function UpgradeButton({
  requiredPlan,
  children,
  variant = "default",
  className,
  size = "default",
}: UpgradeButtonProps) {
  const { t } = useTranslation();
  const { plan, isLoading } = useSubscription();
  const navigate = useNavigate();

  if (isLoading) return null;

  // User already has the required plan or higher — render children as-is
  if (isPlanAtLeast(plan, requiredPlan)) {
    return children ? <>{children}</> : null;
  }

  const handleUpgrade = () => {
    navigate("/pricing");
  };

  return (
    <Button onClick={handleUpgrade} variant={variant} size={size} className={cn("gap-2", className)}>
      <Sparkles className="h-4 w-4" />
      {t("billing.upgradeTo", { plan: requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1) })}
    </Button>
  );
}
