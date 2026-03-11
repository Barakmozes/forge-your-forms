// ============================================
// Ticket Classification Edge Function (Agent 13)
// Auto-classifies tickets by category and priority
// using the Anthropic API (Claude).
// Deploy: supabase functions deploy classify-ticket
// Secrets: ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── System Prompt ──────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI ticket classifier for a support system. Given a ticket's subject and description, classify it.

## Output Format
Return ONLY a valid JSON object (no markdown, no explanation):
{
  "category": "<category from provided list, or best guess>",
  "priority": "<low|medium|high|urgent>",
  "confidence": <0.0-1.0>,
  "reasoning": "<1 sentence explaining classification>"
}

## Priority Guidelines
- urgent: System down, data loss, security breach, blocking all users
- high: Major feature broken, impacting many users, revenue impact
- medium: Feature partially broken, workaround exists, moderate impact
- low: Cosmetic issue, question, feature request, minor inconvenience

## Category Guidelines
- Pick the best match from the provided categories list
- If no categories provided or none match, suggest a reasonable category name`;

// ─── Hash Function ──────────────────────────────────────────────

async function hashInput(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Main Handler ───────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { subject, description, categories, form_id, workspace_id } = body as {
      subject: string;
      description: string;
      categories: string[];
      form_id: string;
      workspace_id: string;
    };

    if (!subject || !form_id || !workspace_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subject, form_id, workspace_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Cache Check ──────────────────────────────────────────────
    const cacheKey = `${subject}:${description ?? ""}:${(categories ?? []).join(",")}`;
    const inputHash = await hashInput(cacheKey);

    const { data: cached } = await supabase
      .from("ai_cache")
      .select("output")
      .eq("input_hash", inputHash)
      .eq("cache_type", "ticket_classify")
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (cached?.output) {
      return new Response(JSON.stringify(cached.output), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Call Anthropic API ───────────────────────────────────────
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categoriesList = categories?.length
      ? `Available categories: ${categories.join(", ")}`
      : "No predefined categories — suggest the best category name.";

    const userMessage = `Classify this support ticket:

Subject: "${subject}"
Description: "${description ?? "No description provided"}"

${categoriesList}`;

    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      }
    );

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI classification failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const rawContent = anthropicData.content?.[0]?.text ?? "";

    let result: {
      category: string;
      priority: string;
      confidence: number;
      reasoning: string;
    };

    try {
      const jsonStr = rawContent
        .replace(/^```json?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();
      result = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI classification output:", rawContent);
      return new Response(
        JSON.stringify({ error: "AI returned invalid format" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate priority value
    const validPriorities = ["low", "medium", "high", "urgent"];
    if (!validPriorities.includes(result.priority)) {
      result.priority = "medium";
    }

    // ─── Cache Result ─────────────────────────────────────────────
    await supabase.from("ai_cache").insert({
      workspace_id,
      cache_type: "ticket_classify",
      input_hash: inputHash,
      output: result,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("classify-ticket error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
