// ============================================
// SentimentBadge — inline sentiment indicator (Agent 12)
// Shows positive (green), neutral (gray), negative (red)
// ============================================

import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { AiSentiment } from "@/lib/ai";

interface SentimentBadgeProps {
  sentiment: AiSentiment;
  size?: "sm" | "default";
}

const SENTIMENT_STYLES: Record<AiSentiment, string> = {
  positive: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
  neutral: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  negative: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
};

export default function SentimentBadge({ sentiment, size = "default" }: SentimentBadgeProps) {
  const { t } = useTranslation();

  const label = t(`ai.sentiment.${sentiment}`);
  const sizeClass = size === "sm" ? "text-[10px] px-1.5 py-0" : "";

  return (
    <Badge
      variant="secondary"
      className={`${SENTIMENT_STYLES[sentiment]} ${sizeClass} font-medium`}
    >
      {label}
    </Badge>
  );
}
