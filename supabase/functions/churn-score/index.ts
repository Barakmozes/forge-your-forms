// ============================================
// Churn Score Calculation Edge Function (Agent 13)
// Calculates customer risk scores based on NPS,
// ticket frequency, sentiment, and engagement.
// Deploy: supabase functions deploy churn-score
// Secrets: SUPABASE_SERVICE_ROLE_KEY
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { decodeJwtPayload } from "../_shared/supabase.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Risk Score Calculation ─────────────────────────────────────

interface RiskFactors {
  nps_average: number | null;
  nps_flag: string | null;
  ticket_count_30d: number;
  ticket_flag: string | null;
  sentiment_trend: string | null;
  last_interaction_at: string | null;
  days_since_interaction: number | null;
}

function calculateRiskScore(factors: RiskFactors): number {
  let score = 50;

  // NPS factor
  if (factors.nps_average !== null) {
    if (factors.nps_average < 5) {
      score += 30;
    } else if (factors.nps_average < 7) {
      score += 15;
    } else if (factors.nps_average >= 9) {
      score -= 20;
    } else if (factors.nps_average >= 7) {
      score -= 5;
    }
  }

  // Ticket frequency factor
  if (factors.ticket_count_30d > 3) {
    score += 20;
  } else if (factors.ticket_count_30d > 1) {
    score += 5;
  }

  // Sentiment factor
  if (factors.sentiment_trend === "negative") {
    score += 15;
  } else if (factors.sentiment_trend === "positive") {
    score -= 10;
  }

  // Engagement factor
  if (factors.days_since_interaction !== null && factors.days_since_interaction > 30) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

// ─── Main Handler ───────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user via JWT decode (gateway already validated the token)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userId: string;
    try {
      const token = authHeader.replace("Bearer ", "");
      ({ sub: userId } = decodeJwtPayload(token));
    } catch (err) {
      console.error("churn-score auth failed:", err instanceof Error ? err.message : err);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { workspace_id } = body as { workspace_id: string };

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: workspace_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace membership before processing
    const { data: member, error: memberError } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("user_id", userId)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: "Forbidden: not a member of this workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // ─── Get all forms in workspace ──────────────────────────────
    const { data: forms } = await supabase
      .from("forms")
      .select("id")
      .eq("workspace_id", workspace_id);

    if (!forms || forms.length === 0) {
      return new Response(
        JSON.stringify({ scored: 0, message: "No forms found in workspace" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formIds = forms.map((f: { id: string }) => f.id);

    // ─── Collect unique customer emails ──────────────────────────
    const emailSet = new Set<string>();

    // From feedback_responses
    const { data: feedbackEmails } = await supabase
      .from("feedback_responses")
      .select("respondent_email")
      .in("form_id", formIds)
      .not("respondent_email", "is", null);

    feedbackEmails?.forEach((r: { respondent_email: string | null }) => {
      if (r.respondent_email) emailSet.add(r.respondent_email.toLowerCase());
    });

    // From tickets
    const { data: ticketEmails } = await supabase
      .from("tickets")
      .select("submitted_by_email")
      .in("form_id", formIds)
      .not("submitted_by_email", "is", null);

    ticketEmails?.forEach((t: { submitted_by_email: string | null }) => {
      if (t.submitted_by_email) emailSet.add(t.submitted_by_email.toLowerCase());
    });

    // From submissions
    const { data: submissionEmails } = await supabase
      .from("submissions")
      .select("submitted_by_email")
      .in("form_id", formIds)
      .not("submitted_by_email", "is", null);

    submissionEmails?.forEach((s: { submitted_by_email: string | null }) => {
      if (s.submitted_by_email) emailSet.add(s.submitted_by_email.toLowerCase());
    });

    const allEmails = Array.from(emailSet);

    if (allEmails.length === 0) {
      return new Response(
        JSON.stringify({ scored: 0, message: "No customer data found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Batch-fetch all data for all emails at once (eliminates N+1) ────────

    // Fetch all feedback responses for the workspace in one query
    const { data: allFeedback } = await supabase
      .from("feedback_responses")
      .select("respondent_email, nps_score, sentiment, created_at")
      .in("form_id", formIds)
      .not("respondent_email", "is", null);

    // Fetch all tickets for the workspace in one query
    const { data: allTickets } = await supabase
      .from("tickets")
      .select("submitted_by_email, created_at, status")
      .in("form_id", formIds)
      .not("submitted_by_email", "is", null);

    // Build per-email lookup maps (O(N) construction, O(1) access)
    const feedbackByEmail = new Map<string, Array<{ nps_score: number | null; sentiment: string | null; created_at: string }>>();
    allFeedback?.forEach((r: { respondent_email: string | null; nps_score: number | null; sentiment: string | null; created_at: string }) => {
      if (!r.respondent_email) return;
      const key = r.respondent_email.toLowerCase();
      if (!feedbackByEmail.has(key)) feedbackByEmail.set(key, []);
      feedbackByEmail.get(key)!.push({ nps_score: r.nps_score, sentiment: r.sentiment, created_at: r.created_at });
    });

    const ticketsByEmail = new Map<string, Array<{ created_at: string }>>();
    allTickets?.forEach((t: { submitted_by_email: string | null; created_at: string }) => {
      if (!t.submitted_by_email) return;
      const key = t.submitted_by_email.toLowerCase();
      if (!ticketsByEmail.has(key)) ticketsByEmail.set(key, []);
      ticketsByEmail.get(key)!.push({ created_at: t.created_at });
    });

    // ─── Score each customer (in-memory only, no more per-email DB queries) ──
    const scores: Array<{
      workspace_id: string;
      customer_email: string;
      risk_score: number;
      risk_factors: RiskFactors;
      nps_average: number | null;
      ticket_count_30d: number;
      sentiment_trend: string | null;
      last_interaction_at: string | null;
      last_scored_at: string;
    }> = [];

    for (const email of allEmails) {
      try {
        const feedbackRows = feedbackByEmail.get(email) ?? [];
        const ticketRows = ticketsByEmail.get(email) ?? [];

        // NPS computation
        const npsScores = feedbackRows
          .map((r) => r.nps_score)
          .filter((s): s is number => s !== null);
        const npsAverage = npsScores.length > 0
          ? npsScores.reduce((a, b) => a + b, 0) / npsScores.length
          : null;

        // Recent ticket count (last 30 days)
        const ticketCount30d = ticketRows.filter((t) => t.created_at >= thirtyDaysAgo).length;

        // Sentiment trend from recent feedback
        const recentSentiments = feedbackRows
          .filter((r) => r.created_at >= thirtyDaysAgo)
          .map((r) => r.sentiment);

        let sentimentTrend: string | null = null;
        if (recentSentiments.length > 0) {
          const detractors = recentSentiments.filter((s) => s === "detractor").length;
          const promoters = recentSentiments.filter((s) => s === "promoter").length;
          if (detractors > promoters) sentimentTrend = "negative";
          else if (promoters > detractors) sentimentTrend = "positive";
          else sentimentTrend = "neutral";
        }

        // Last interaction date (latest across feedback and tickets)
        const allDates: string[] = [
          ...feedbackRows.map((r) => r.created_at),
          ...ticketRows.map((t) => t.created_at),
        ];
        const lastInteraction = allDates.length > 0
          ? allDates.sort().reverse()[0]
          : null;

        const daysSinceInteraction = lastInteraction
          ? Math.floor((now.getTime() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        // Build risk factors (field name matches frontend ChurnScore interface)
        const factors: RiskFactors = {
          nps_average: npsAverage !== null ? Math.round(npsAverage * 100) / 100 : null,
          nps_flag: npsAverage !== null
            ? npsAverage < 5 ? "very_low" : npsAverage < 7 ? "low" : npsAverage >= 9 ? "high" : "neutral"
            : null,
          ticket_count_30d: ticketCount30d,
          ticket_flag: ticketCount30d > 3 ? "high_frequency" : ticketCount30d > 1 ? "moderate" : null,
          sentiment_trend: sentimentTrend,
          last_interaction_at: lastInteraction,   // fixed: was last_interaction, now matches frontend interface
          days_since_interaction: daysSinceInteraction,
        };

        const riskScore = calculateRiskScore(factors);

        scores.push({
          workspace_id,
          customer_email: email,
          risk_score: riskScore,
          risk_factors: factors,
          nps_average: npsAverage !== null ? Math.round(npsAverage * 100) / 100 : null,
          ticket_count_30d: ticketCount30d,
          sentiment_trend: sentimentTrend,
          last_interaction_at: lastInteraction,
          last_scored_at: now.toISOString(),
        });
      } catch (emailErr) {
        // Per-email error isolation: log and continue to next customer
        console.error(`churn-score: failed to process email ${email}:`, emailErr);
      }
    }

    // ─── Upsert scores ──────────────────────────────────────────
    if (scores.length === 0) {
      return new Response(
        JSON.stringify({ scored: 0, message: "No scores computed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: upsertError } = await supabase
      .from("churn_scores")
      .upsert(scores, { onConflict: "workspace_id,customer_email" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save churn scores" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ scored: scores.length, message: "Churn scores calculated successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("churn-score error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
