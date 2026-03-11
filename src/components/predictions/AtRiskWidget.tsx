// ============================================
// AtRiskWidget — Top 5 at-risk customers card (Agent 13)
// Used in dashboard overviews.
// ============================================

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAtRiskCustomers } from "@/hooks/useChurnPrediction";
import FeatureGate from "@/components/upgrade/FeatureGate";
import ChurnScoreBadge from "@/components/predictions/ChurnScoreBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Shield } from "lucide-react";

export default function AtRiskWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id ?? "";
  const { customers, loading } = useAtRiskCustomers(workspaceId, 5);

  // Only show customers with score > 40 (medium+ risk)
  const atRisk = customers.filter((c) => c.risk_score > 40);

  if (loading || atRisk.length === 0) return null;

  return (
    <FeatureGate feature="churn_prediction" requiredPlan="business" featureName={t("predictions.churnPrediction")}>
      {/* === AGENT 13: At-Risk Widget === */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {t("predictions.atRiskCustomers")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => navigate("/at-risk")}
          >
            {t("predictions.viewAll")}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {atRisk.map((customer) => (
            <div
              key={customer.id}
              className="flex items-center justify-between gap-3 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" dir="ltr">
                  {customer.customer_email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {customer.risk_factors.nps_flag === "very_low"
                    ? t("predictions.veryLowNps")
                    : customer.risk_factors.ticket_flag === "high_frequency"
                      ? t("predictions.frequentTickets")
                      : customer.risk_factors.sentiment_trend === "negative"
                        ? t("predictions.negativeSentiment")
                        : t("predictions.atRisk")}
                </p>
              </div>
              <ChurnScoreBadge score={customer.risk_score} />
            </div>
          ))}
        </CardContent>
      </Card>
      {/* === END AGENT 13 === */}
    </FeatureGate>
  );
}
