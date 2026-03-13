// ============================================
// AI Reply Suggestions Edge Function
// Generates tailored reply suggestions for support tickets
// using Claude with context from resolved tickets.
// Deploy: supabase functions deploy ai-suggest-reply
// Secrets: ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY
// ============================================

import { corsHeaders, handleCors, jsonResponse, jsonError } from "../_shared/cors.ts";
import { hashInput } from "../_shared/hash.ts";
import { supabase, authenticateUser } from "../_shared/supabase.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

// ─── System Prompt ──────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI assistant that suggests reply messages for support agents. Given a support ticket and examples of previous resolved tickets with their agent replies, generate 2-3 tailored reply suggestions.

## Output Format
Return ONLY a valid JSON object (no markdown, no explanation):
{
  "suggestions": [
    {
      "label": "<short 3-5 word label>",
      "message": "<the full reply message>",
      "reasoning": "<1 sentence explaining why this reply fits>"
    }
  ]
}

## Guidelines
- Keep replies professional, empathetic, and helpful
- Tailor suggestions to the specific ticket subject and description
- If previous replies are available, use them as style/tone reference
- Replies should be complete and ready to send (not templates with placeholders)
- Respond in the same language as the ticket`;

// ─── Main Handler ───────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate user
    const user = await authenticateUser(req);
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();
    const {
      ticket_subject,
      ticket_description,
      ticket_category,
      form_id,
      workspace_id,
      locale,
    } = body as {
      ticket_subject: string;
      ticket_description?: string;
      ticket_category?: string;
      form_id: string;
      workspace_id: string;
      locale?: string;
    };

    if (!ticket_subject || !form_id || !workspace_id) {
      return jsonError("Missing required fields: ticket_subject, form_id, workspace_id", 400);
    }

    // ─── Authorization Check ──────────────────────────────────────
    const { data: member } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();

    if (!member) {
      return jsonError("Forbidden", 403);
    }

    // ─── Cache Check ──────────────────────────────────────────────
    const cacheKey = `${workspace_id}:${form_id}:${ticket_subject}:${ticket_description ?? ""}:${ticket_category ?? ""}`;
    const inputHash = await hashInput(cacheKey);

    const { data: cached } = await supabase
      .from("ai_cache")
      .select("output")
      .eq("input_hash", inputHash)
      .eq("cache_type", "reply_suggest")
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (cached?.output) {
      return jsonResponse(cached.output);
    }

    // ─── Fetch Context: Resolved Tickets ──────────────────────────
    if (!ANTHROPIC_API_KEY) {
      return jsonError("AI service not configured", 503);
    }

    let resolvedQuery = supabase
      .from("tickets")
      .select("id, ticket_number, subject, category")
      .eq("form_id", form_id)
      .eq("status", "resolved")
      .order("resolved_at", { ascending: false })
      .limit(10);

    if (ticket_category) {
      resolvedQuery = resolvedQuery.eq("category", ticket_category);
    }

    const { data: resolvedTickets } = await resolvedQuery;

    let contextBlock = "";
    if (resolvedTickets && resolvedTickets.length > 0) {
      const ticketIds = resolvedTickets.map((t) => t.id);
      const { data: messages } = await supabase
        .from("ticket_messages")
        .select("ticket_id, message, sender_type, is_internal")
        .in("ticket_id", ticketIds)
        .eq("sender_type", "agent")
        .eq("is_internal", false)
        .order("created_at", { ascending: false });

      if (messages && messages.length > 0) {
        const seenTickets = new Set<string>();
        const examples: string[] = [];

        for (const msg of messages) {
          if (seenTickets.has(msg.ticket_id)) continue;
          seenTickets.add(msg.ticket_id);

          const ticket = resolvedTickets.find((t) => t.id === msg.ticket_id);
          if (!ticket || msg.message.length < 20) continue;

          examples.push(`Ticket "${ticket.subject}" → Agent reply: "${msg.message}"`);
          if (examples.length >= 5) break;
        }

        if (examples.length > 0) {
          contextBlock = `\n\n## Previous Resolved Tickets (for reference)\n${examples.join("\n")}`;
        }
      }
    }

    // ─── Call Anthropic API ────────────────────────────────────────
    const userMessage = `Generate reply suggestions for this support ticket:

Subject: "${ticket_subject}"
Description: "${ticket_description ?? "No description provided"}"
Category: "${ticket_category ?? "Uncategorized"}"
${locale ? `Respond in language: ${locale}` : ""}${contextBlock}`;

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
          max_tokens: 800,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      },
    );

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error:", errText);
      return jsonError("AI suggestion generation failed", 502);
    }

    const anthropicData = await anthropicResponse.json();
    const rawContent = anthropicData.content?.[0]?.text ?? "";

    let result: {
      suggestions: Array<{
        label: string;
        message: string;
        reasoning: string;
      }>;
    };

    try {
      const jsonStr = rawContent
        .replace(/^```json?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();
      result = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI suggestion output:", rawContent);
      return jsonError("AI returned invalid format", 502);
    }

    // ─── Cache Result ─────────────────────────────────────────────
    const { error: cacheError } = await supabase.from("ai_cache").insert({
      workspace_id,
      cache_type: "reply_suggest",
      input_hash: inputHash,
      output: result,
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6h TTL
    });
    if (cacheError) console.error("Cache insert failed:", cacheError);

    return jsonResponse(result);
  } catch (err) {
    console.error("ai-suggest-reply error:", err);
    return jsonError("Internal server error", 500);
  }
});
