import type { Database } from "@/integrations/supabase/types";

type Sentiment = Database["public"]["Enums"]["feedback_sentiment"];

export function calculateSentiment(score: number): Sentiment {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

interface NpsInput {
  nps_score: number | null;
  sentiment: Sentiment | null;
}

export function calculateNPS(responses: NpsInput[]): number {
  const scored = responses.filter((r) => r.nps_score !== null);
  if (scored.length === 0) return 0;

  const promoters = scored.filter((r) => r.sentiment === "promoter").length;
  const detractors = scored.filter((r) => r.sentiment === "detractor").length;

  return Math.round(((promoters - detractors) / scored.length) * 100);
}

export function getNPSBreakdown(responses: NpsInput[]) {
  const scored = responses.filter((r) => r.nps_score !== null);
  const total = scored.length;
  if (total === 0) return { promoters: 0, passives: 0, detractors: 0, total: 0 };

  const promoters = scored.filter((r) => r.sentiment === "promoter").length;
  const passives = scored.filter((r) => r.sentiment === "passive").length;
  const detractors = scored.filter((r) => r.sentiment === "detractor").length;

  return { promoters, passives, detractors, total };
}
