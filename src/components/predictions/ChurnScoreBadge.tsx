// ============================================
// ChurnScoreBadge — Inline risk score badge (Agent 13)
// ============================================

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getRiskColor, getRiskBgColor, getRiskLevel } from "@/hooks/useChurnPrediction";

interface ChurnScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export default function ChurnScoreBadge({
  score,
  showLabel = false,
  size = "sm",
}: ChurnScoreBadgeProps) {
  const { t } = useTranslation();
  const level = getRiskLevel(score);
  const colorClass = getRiskColor(score);
  const bgClass = getRiskBgColor(score);

  const levelLabels: Record<string, string> = {
    critical: t("predictions.critical", "Critical"),
    high: t("predictions.high", "High"),
    medium: t("predictions.medium", "Medium"),
    low: t("predictions.low", "Low"),
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        bgClass,
        colorClass,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <span className={cn(
        "rounded-full",
        size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
        score > 80 ? "bg-red-500" : score > 60 ? "bg-orange-500" : score > 40 ? "bg-yellow-500" : "bg-green-500"
      )} />
      {score}
      {showLabel && (
        <span className="capitalize">{levelLabels[level]}</span>
      )}
    </span>
  );
}
