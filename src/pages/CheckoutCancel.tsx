// ============================================
// CheckoutCancel — Post-checkout cancel page (Agent 6)
// ============================================

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function CheckoutCancel() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <XCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold font-display">
            {t("billing.checkoutCancelTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("billing.checkoutCancelDescription")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/pricing">
              <Button variant="default" className="gradient-primary text-primary-foreground shadow-colored">
                {t("billing.backToPricing")}
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline">
                {t("billing.backToDashboard")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
