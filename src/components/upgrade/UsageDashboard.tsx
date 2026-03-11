// ============================================
// UsageDashboard — visual usage progress bars for billing tab (Agent 7)
// ============================================

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap } from "lucide-react";
import type { PlanTier } from "@/lib/stripe";

interface UsageBarProps {
  label: string;
  used: number;
  max: number | null;
  t: (key: string) => string;
}

function UsageBar({ label, used, max, t }: UsageBarProps) {
  if (max === null) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground tabular-nums">{used} / {t("upgrade.unlimited")}</span>
        </div>
        <Progress value={0} className="h-2" />
      </div>
    );
  }

  const percent = max === 0 ? 100 : Math.min(100, Math.round((used / max) * 100));
  const colorClass = percent >= 80 ? "text-destructive" : percent >= 60 ? "text-warning" : "text-primary";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={`tabular-nums ${colorClass}`}>
          {used} / {max}
          {percent >= 80 && (
            <Badge variant="outline" className="ms-2 text-[10px] py-0">
              {percent}%
            </Badge>
          )}
        </span>
      </div>
      <Progress value={percent} className="h-2" />
    </div>
  );
}

const PLAN_COMPARE: { feature: string; free: string; pro: string; growth: string; business: string }[] = [
  { feature: "upgrade.submissions", free: "100", pro: "5,000", growth: "25,000", business: "∞" },
  { feature: "upgrade.forms", free: "3", pro: "∞", growth: "∞", business: "∞" },
  { feature: "upgrade.members", free: "1", pro: "3", growth: "10", business: "∞" },
  { feature: "upgrade.feedbackMode", free: "—", pro: "✓", growth: "✓", business: "✓" },
  { feature: "upgrade.supportMode", free: "—", pro: "—", growth: "✓", business: "✓" },
];

export default function UsageDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { plan, limits, usage, isLoading } = usePlanLimits();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("upgrade.usageTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-2 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const showUpgrade = plan !== "business";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("upgrade.usageTitle")}</CardTitle>
          {showUpgrade && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/pricing")}
            >
              <Zap className="h-3.5 w-3.5" /> {t("upgrade.upgrade")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage Bars */}
        <div className="space-y-4">
          <UsageBar
            label={t("upgrade.monthlySubmissions")}
            used={usage.submissionCount}
            max={limits.maxSubmissionsPerMonth}
            t={t}
          />
          <UsageBar
            label={t("upgrade.activeForms")}
            used={usage.formCount}
            max={limits.maxForms}
            t={t}
          />
          <UsageBar
            label={t("upgrade.teamMembers")}
            used={usage.memberCount}
            max={limits.maxMembers}
            t={t}
          />
        </div>

        {/* Plan Comparison Mini-Table */}
        {showUpgrade && (
          <>
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">{t("upgrade.planComparison")}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-start font-medium text-muted-foreground" />
                      {(["free", "pro", "growth", "business"] as PlanTier[]).map((p) => (
                        <th
                          key={p}
                          className={`pb-2 text-center font-medium ${p === plan ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                          {p === plan && (
                            <Badge variant="secondary" className="ms-1 text-[8px] py-0">
                              {t("upgrade.current")}
                            </Badge>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PLAN_COMPARE.map((row) => (
                      <tr key={row.feature} className="border-b last:border-0">
                        <td className="py-2 text-start text-muted-foreground">{t(row.feature)}</td>
                        <td className={`py-2 text-center ${plan === "free" ? "font-semibold" : ""}`}>{row.free}</td>
                        <td className={`py-2 text-center ${plan === "pro" ? "font-semibold" : ""}`}>{row.pro}</td>
                        <td className={`py-2 text-center ${plan === "growth" ? "font-semibold" : ""}`}>{row.growth}</td>
                        <td className={`py-2 text-center ${plan === "business" ? "font-semibold" : ""}`}>{row.business}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => navigate("/pricing")}
            >
              {t("upgrade.viewAllPlans")} <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
