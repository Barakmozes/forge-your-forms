// ============================================
// CheckoutSuccess — Post-checkout success page (Agent 6)
// ============================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";

export default function CheckoutSuccess() {
  const { t } = useTranslation();
  const { plan, isFree, isLoading } = useSubscription();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  // Redirect to dashboard once subscription is active or after countdown
  useEffect(() => {
    if (!isLoading && !isFree) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate("/", { replace: true });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isLoading, isFree, navigate]);

  const planLabel = !isFree
    ? t(`billing.plan${plan.charAt(0).toUpperCase() + plan.slice(1)}`)
    : "";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          {isLoading || isFree ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">{t("billing.checkoutActivating")}</p>
            </>
          ) : (
            <>
              <CheckCircle className="h-12 w-12 text-primary mx-auto" />
              <h1 className="text-2xl font-bold font-display">
                {t("billing.checkoutSuccessTitle", { plan: planLabel })}
              </h1>
              <p className="text-muted-foreground">
                {t("billing.checkoutSuccessDescription")}
              </p>
              <p className="text-xs text-muted-foreground">
                {countdown > 0 && `Redirecting in ${countdown}s...`}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
