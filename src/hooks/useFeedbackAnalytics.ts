import { useMemo } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { calculateNPS, getNPSBreakdown } from "@/lib/npsCalculator";

type FeedbackResponse = Tables<"feedback_responses">;

export type DateRange = "7d" | "30d" | "90d" | "all";

function getDateRangeStart(range: DateRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function useFeedbackAnalytics(responses: FeedbackResponse[], dateRange: DateRange = "all") {
  const filtered = useMemo(() => {
    const start = getDateRangeStart(dateRange);
    if (!start) return responses;
    return responses.filter((r) => new Date(r.created_at) >= start);
  }, [responses, dateRange]);

  const previousPeriod = useMemo(() => {
    const start = getDateRangeStart(dateRange);
    if (!start) return [];
    const periodMs = Date.now() - start.getTime();
    const prevStart = new Date(start.getTime() - periodMs);
    return responses.filter((r) => {
      const d = new Date(r.created_at);
      return d >= prevStart && d < start;
    });
  }, [responses, dateRange]);

  const npsScore = useMemo(() => calculateNPS(filtered), [filtered]);
  const previousNps = useMemo(() => previousPeriod.length > 0 ? calculateNPS(previousPeriod) : null, [previousPeriod]);
  const npsDelta = previousNps !== null ? npsScore - previousNps : null;
  const breakdown = useMemo(() => getNPSBreakdown(filtered), [filtered]);

  const weeklyTrend = useMemo(() => {
    if (filtered.length === 0) return [];
    const weekMap = new Map<string, FeedbackResponse[]>();
    for (const r of filtered) {
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
  }, [filtered]);

  const volumeBySentiment = useMemo(() => {
    if (filtered.length === 0) return [];
    const dayMap = new Map<string, { promoter: number; passive: number; detractor: number }>();
    for (const r of filtered) {
      const date = new Date(r.created_at).toISOString().split("T")[0];
      const entry = dayMap.get(date) ?? { promoter: 0, passive: 0, detractor: 0 };
      if (r.sentiment) entry[r.sentiment]++;
      dayMap.set(date, entry);
    }
    return [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, counts]) => ({ date, ...counts }));
  }, [filtered]);

  const categoryBreakdown = useMemo(() => {
    const catMap = new Map<string, FeedbackResponse[]>();
    for (const r of filtered) {
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
  }, [filtered]);

  const atRiskClients = useMemo(() => {
    return filtered
      .filter((r) => r.sentiment === "detractor" && !r.flagged)
      .slice(0, 20);
  }, [filtered]);

  return {
    npsScore,
    npsDelta,
    breakdown,
    weeklyTrend,
    volumeBySentiment,
    categoryBreakdown,
    atRiskClients,
    totalResponses: filtered.length,
  };
}
