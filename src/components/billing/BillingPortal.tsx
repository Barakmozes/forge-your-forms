// ============================================
// BillingPortal — Full billing management section (Agent 6)
// ============================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS } from "@/lib/stripe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, ExternalLink, Loader2, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanTier } from "@/lib/stripe";

const PLAN_COLORS: Record<PlanTier, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  growth: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  business: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function BillingPortal() {
  const { t } = useTranslation();
  const { subscription, plan, isLoading, isFree } = useSubscription();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [managingBilling, setManagingBilling] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin me-2" />
        {t("common.loading")}
      </div>
    );
  }

  const handleManageBilling = async () => {
    if (!currentWorkspace) return;
    setManagingBilling(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          workspaceId: currentWorkspace.id,
          returnUrl: window.location.href,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      console.error("Portal error:", err);
      toast({
        title: t("billing.error"),
        description: t("billing.portalFailed"),
        variant: "destructive",
      });
    } finally {
      setManagingBilling(false);
    }
  };

  const planLabel = t(`billing.plan${plan.charAt(0).toUpperCase() + plan.slice(1)}`);
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("billing.currentPlan")}
          </CardTitle>
          <CardDescription>{t("billing.currentPlanDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={cn("text-sm px-3 py-1", PLAN_COLORS[plan])}>
                {planLabel}
              </Badge>
              {subscription?.cancel_at_period_end && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  {t("billing.cancelingAtEnd")}
                </Badge>
              )}
              {subscription?.status === "past_due" && (
                <Badge variant="destructive">{t("billing.pastDue")}</Badge>
              )}
            </div>
            {!isFree && periodEnd && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {subscription?.cancel_at_period_end
                  ? t("billing.expiresOn", { date: periodEnd })
                  : t("billing.renewsOn", { date: periodEnd })}
              </div>
            )}
          </div>

          {!isFree && (
            <>
              <Separator />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={managingBilling}
                  className="gap-2"
                >
                  {managingBilling && <Loader2 className="h-4 w-4 animate-spin" />}
                  <ExternalLink className="h-4 w-4" />
                  {t("billing.manageSubscription")}
                </Button>
              </div>
            </>
          )}

          {isFree && (
            <>
              <Separator />
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  {t("billing.upgradePrompt")}
                </p>
                <Button onClick={() => navigate("/pricing")} className="gap-2 gradient-primary text-primary-foreground shadow-colored">
                  <Sparkles className="h-4 w-4" />
                  {t("billing.viewPlans")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison Quick View */}
      {isFree && (
        <Card>
          <CardHeader>
            <CardTitle>{t("billing.availablePlans")}</CardTitle>
            <CardDescription>{t("billing.availablePlansDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {(["pro", "growth", "business"] as const).map((tier) => {
                const tierPlan = STRIPE_PLANS[tier];
                return (
                  <div
                    key={tier}
                    className={cn(
                      "rounded-lg border p-4 transition-colors hover:border-primary/50",
                      tier === "growth" && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <div className="font-semibold">{tierPlan.name}</div>
                    <div className="mt-1">
                      <span className="text-2xl font-bold">${tierPlan.price}</span>
                      <span className="text-sm text-muted-foreground">{t("pricing.perMonth")}</span>
                    </div>
                    <Button
                      variant={tier === "growth" ? "default" : "outline"}
                      size="sm"
                      className={cn("w-full mt-3", tier === "growth" && "gradient-primary text-primary-foreground")}
                      onClick={() => navigate("/pricing")}
                    >
                      {t("billing.choosePlan")}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Summary Placeholder — Agent 7 fills this */}
      {/* === AGENT 7: UsageDashboard goes here === */}
      {/* === END AGENT 7 === */}
    </div>
  );
}
