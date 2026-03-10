import { useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { calculateNPS, getNPSBreakdown } from "@/lib/npsCalculator";

type FeedbackResponse = Tables<"feedback_responses">;

export function useFeedbackAnalytics(responses: FeedbackResponse[]) {
  const npsScore = useMemo(() => calculateNPS(responses), [responses]);
  const breakdown = useMemo(() => getNPSBreakdown(responses), [responses]);

  const weeklyTrend = useMemo(() => {
    if (responses.length === 0) return [];
    const weekMap = new Map<string, FeedbackResponse[]>();
    for (const r of responses) {
      const date = new Date(r.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split("T")[0];
      const arr = weekMap.get(key) ?? [];
      arr.push(r);
      weekMap.set(key, arr);
    }

    return [...weekMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, items]) => ({
        week,
        nps: calculateNPS(items),
        count: items.length,
      }));
  }, [responses]);

  const volumeBySentiment = useMemo(() => {
    if (responses.length === 0) return [];
    const dayMap = new Map<string, { promoter: number; passive: number; detractor: number }>();
    for (const r of responses) {
      const date = new Date(r.created_at).toISOString().split("T")[0];
      const entry = dayMap.get(date) ?? { promoter: 0, passive: 0, detractor: 0 };
      if (r.sentiment) entry[r.sentiment]++;
      dayMap.set(date, entry);
    }
    return [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, counts]) => ({ date, ...counts }));
  }, [responses]);

  const categoryBreakdown = useMemo(() => {
    const catMap = new Map<string, FeedbackResponse[]>();
    for (const r of responses) {
      const cat = r.category ?? "Uncategorized";
      const arr = catMap.get(cat) ?? [];
      arr.push(r);
      catMap.set(cat, arr);
    }
    return [...catMap.entries()].map(([category, items]) => ({
      category,
      nps: calculateNPS(items),
      count: items.length,
    }));
  }, [responses]);

  const atRiskClients = useMemo(() => {
    return responses
      .filter((r) => r.sentiment === "detractor" && !r.flagged)
      .slice(0, 20);
  }, [responses]);

  return {
    npsScore,
    breakdown,
    weeklyTrend,
    volumeBySentiment,
    categoryBreakdown,
    atRiskClients,
    totalResponses: responses.length,
  };
}
