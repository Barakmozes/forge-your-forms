// ============================================
// UsageBanner — sticky warning when near submission limit (Agent 7)
// ============================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, X } from "lucide-react";

export default function UsageBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isNearLimit, isAtLimit, usage, limits, submissionPercentUsed, isLoading } = usePlanLimits();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || dismissed || (!isNearLimit && !isAtLimit)) return null;

  const maxSubs = limits.maxSubmissionsPerMonth;
  if (maxSubs === null) return null;

  return (
    <div className={`border-b px-4 py-2.5 flex items-center gap-3 text-sm ${
      isAtLimit
        ? "bg-destructive/10 border-destructive/20 text-destructive"
        : "bg-warning/10 border-warning/20 text-warning-foreground"
    }`}>
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <span className="truncate">
          {isAtLimit
            ? t("upgrade.limitReached", { used: usage.submissionCount, max: maxSubs })
            : t("upgrade.nearLimit", { used: usage.submissionCount, max: maxSubs })}
        </span>
        <Progress
          value={submissionPercentUsed}
          className="h-1.5 w-24 shrink-0"
        />
      </div>
      <Button
        size="sm"
        variant={isAtLimit ? "destructive" : "outline"}
        className="shrink-0 h-7 text-xs"
        onClick={() => navigate("/pricing")}
      >
        {t("upgrade.upgrade")}
      </Button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
