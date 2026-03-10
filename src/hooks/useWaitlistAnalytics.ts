import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type WaitlistEntry = Tables<"waitlist_entries">;

interface WaitlistStats {
  total: number;
  today: number;
  thisWeek: number;
  referralRate: number;
}

interface DailySignup {
  date: string;
  count: number;
  cumulative: number;
}

interface LeaderboardEntry {
  email: string;
  name: string | null;
  referral_count: number;
  referral_code: string;
}

export function useWaitlistAnalytics(formId: string) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("waitlist_entries")
      .select("*")
      .eq("form_id", formId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setEntries(data ?? []);
        setLoading(false);
      });
  }, [formId]);

  const stats: WaitlistStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const today = entries.filter((e) => new Date(e.created_at) >= todayStart).length;
    const thisWeek = entries.filter((e) => new Date(e.created_at) >= weekStart).length;
    const referredCount = entries.filter((e) => e.referred_by).length;
    const referralRate = entries.length > 0 ? (referredCount / entries.length) * 100 : 0;

    return { total: entries.length, today, thisWeek, referralRate };
  }, [entries]);

  const dailySignups: DailySignup[] = useMemo(() => {
    if (entries.length === 0) return [];

    const dayMap = new Map<string, number>();
    for (const entry of entries) {
      const date = new Date(entry.created_at).toISOString().split("T")[0];
      dayMap.set(date, (dayMap.get(date) ?? 0) + 1);
    }

    const sorted = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let cumulative = 0;
    return sorted.map(([date, count]) => {
      cumulative += count;
      return { date, count, cumulative };
    });
  }, [entries]);

  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    return [...entries]
      .filter((e) => e.referral_count > 0)
      .sort((a, b) => b.referral_count - a.referral_count)
      .slice(0, 10)
      .map((e) => ({
        email: e.email,
        name: e.name,
        referral_count: e.referral_count,
        referral_code: e.referral_code,
      }));
  }, [entries]);

  const sourceBreakdown = useMemo(() => {
    const direct = entries.filter((e) => !e.referred_by).length;
    const referral = entries.filter((e) => e.referred_by).length;
    return { direct, referral };
  }, [entries]);

  return { stats, dailySignups, leaderboard, sourceBreakdown, loading };
}
