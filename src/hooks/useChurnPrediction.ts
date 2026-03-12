// ============================================
// useChurnPrediction — Churn score hooks (Agent 13)
// ============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChurnScore {
  id: string;
  workspace_id: string;
  customer_email: string;
  risk_score: number;
  risk_factors: {
    nps_average: number | null;
    nps_flag: string | null;
    ticket_count_30d: number;
    ticket_flag: string | null;
    sentiment_trend: string | null;
    last_interaction_at: string | null;
    days_since_interaction: number | null;
  };
  nps_average: number | null;
  ticket_count_30d: number;
  sentiment_trend: string | null;
  last_interaction_at: string | null;
  last_scored_at: string;
  created_at: string;
  updated_at: string;
}

export type RiskLevel = "critical" | "high" | "medium" | "low";

export function getRiskLevel(score: number): RiskLevel {
  if (score > 80) return "critical";
  if (score > 60) return "high";
  if (score > 40) return "medium";
  return "low";
}

export function getRiskColor(score: number): string {
  if (score > 80) return "text-red-600 dark:text-red-400";
  if (score > 60) return "text-orange-500 dark:text-orange-400";
  if (score > 40) return "text-yellow-500 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

export function getRiskBgColor(score: number): string {
  if (score > 80) return "bg-red-100 dark:bg-red-900/30";
  if (score > 60) return "bg-orange-100 dark:bg-orange-900/30";
  if (score > 40) return "bg-yellow-100 dark:bg-yellow-900/30";
  return "bg-green-100 dark:bg-green-900/30";
}

// ─── useAtRiskCustomers ─────────────────────────────────────────

export function useAtRiskCustomers(workspaceId: string, limit?: number) {
  const [customers, setCustomers] = useState<ChurnScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let query = supabase
      .from("churn_scores")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("risk_score", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch churn scores:", error);
      setCustomers([]);
    } else {
      setCustomers((data as ChurnScore[]) ?? []);
    }
    setLoading(false);
  }, [workspaceId, limit]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { customers, loading, refetch: fetchCustomers };
}

// ─── useCustomerRiskScore ───────────────────────────────────────

export function useCustomerRiskScore(email: string, workspaceId: string) {
  const [score, setScore] = useState<ChurnScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email || !workspaceId) {
      setLoading(false);
      return;
    }

    const fetchScore = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("churn_scores")
        .select("*")
        .eq("workspace_id", workspaceId)
        .ilike("customer_email", email)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch customer risk score:", error);
        setScore(null);
      } else {
        setScore(data as ChurnScore | null);
      }
      setLoading(false);
    };

    fetchScore();
  }, [email, workspaceId]);

  return { score, loading };
}

// ─── useCalculateChurnScores ────────────────────────────────────

export function useCalculateChurnScores(workspaceId: string) {
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<{ scored: number; message: string } | null>(null);

  const calculate = useCallback(async () => {
    if (!workspaceId || calculating) return;

    setCalculating(true);
    setResult(null);

    const { data, error } = await supabase.functions.invoke("churn-score", {
      body: { workspace_id: workspaceId },
    });

    if (error) {
      console.error("Failed to calculate churn scores:", error);
      setResult({ scored: 0, message: "Calculation failed" });
    } else {
      setResult(data as { scored: number; message: string });
    }
    setCalculating(false);
  }, [workspaceId, calculating]);

  return { calculate, calculating, result };
}
