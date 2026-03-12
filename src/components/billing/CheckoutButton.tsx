// ============================================
// CheckoutButton — Initiates Stripe Checkout (Agent 6)
// ============================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getPriceId, STRIPE_PLANS, STRIPE_CONFIG_VALID } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanTier, BillingInterval } from "@/lib/stripe";

interface CheckoutButtonProps {
  plan: Exclude<PlanTier, "free">;
  interval: BillingInterval;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  children?: React.ReactNode;
}

export default function CheckoutButton({
  plan,
  interval,
  className,
  variant = "default",
  children,
}: CheckoutButtonProps) {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!STRIPE_CONFIG_VALID) {
      toast({
        title: t("billing.error"),
        description: t("billing.stripeNotConfigured", "Stripe is not configured. Contact your administrator."),
        variant: "destructive",
      });
      return;
    }

    if (!currentWorkspace || !user) {
      toast({
        title: t("billing.error"),
        description: t("billing.mustBeLoggedIn"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const priceId = getPriceId(plan, interval);

      // Call Edge Function to create Stripe Checkout session
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId,
          workspaceId: currentWorkspace.id,
          customerEmail: user.email,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/checkout/cancel`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: t("billing.error"),
        description: t("billing.checkoutFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultLabel = t("billing.startPlan", { plan: STRIPE_PLANS[plan].name });

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      variant={variant}
      className={cn("gap-2", className)}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children ?? defaultLabel}
    </Button>
  );
}
