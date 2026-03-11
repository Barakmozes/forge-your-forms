// ============================================
// SubscriptionStatus — Warning banner for billing issues (Agent 6)
// ============================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SubscriptionStatus() {
  const { t } = useTranslation();
  const { subscription, isLoading } = useSubscription();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || dismissed || !subscription) return null;

  const isPastDue = subscription.status === "past_due";
  const isCanceled = subscription.status === "canceled";

  if (!isPastDue && !isCanceled) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-sm",
        isPastDue && "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
        isCanceled && "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300"
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {isPastDue && t("billing.paymentFailedBanner")}
        {isCanceled && t("billing.subscriptionCanceledBanner")}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="text-current hover:bg-current/10"
        onClick={() => navigate("/settings?tab=billing")}
      >
        {isPastDue ? t("billing.updatePayment") : t("billing.resubscribe")}
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-current/10"
        aria-label={t("common.close")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
