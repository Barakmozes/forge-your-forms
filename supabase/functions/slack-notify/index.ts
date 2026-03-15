// ============================================
// Slack Notify Edge Function (Agent 10)
// Sends formatted messages to Slack via Incoming Webhook.
// Deploy: supabase functions deploy slack-notify
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Slack Block Kit Formatters ──────────────────────────────────────────────

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text: string; emoji?: boolean }>;
  fields?: Array<{ type: string; text: string }>;
}

function formatEventBlocks(
  eventType: string,
  formTitle: string,
  data: Record<string, unknown>
): SlackBlock[] {
  const blocks: SlackBlock[] = [];

  // Header
  const emojiMap: Record<string, string> = {
    "form.submission_created": ":inbox_tray:",
    "waitlist.entry_created": ":wave:",
    "feedback.response_created": ":chart_with_upwards_trend:",
    "support.ticket_created": ":ticket:",
    "support.ticket_resolved": ":white_check_mark:",
    "form.created": ":sparkles:",
  };

  const labelMap: Record<string, string> = {
    "form.submission_created": "New Form Submission",
    "waitlist.entry_created": "New Waitlist Signup",
    "feedback.response_created": "New Feedback Response",
    "support.ticket_created": "New Support Ticket",
    "support.ticket_resolved": "Ticket Resolved",
    "form.created": "New Form Created",
  };

  const emoji = emojiMap[eventType] || ":bell:";
  const label = labelMap[eventType] || eventType;

  blocks.push({
    type: "header",
    text: { type: "plain_text", text: `${emoji} ${label}`, emoji: true },
  });

  // Form context
  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: `*Form:* ${formTitle}` }],
  });

  // Event-specific fields
  const fields: Array<{ type: string; text: string }> = [];

  if (data.email) {
    fields.push({ type: "mrkdwn", text: `*Email:*\n${data.email}` });
  }
  if (data.name) {
    fields.push({ type: "mrkdwn", text: `*Name:*\n${data.name}` });
  }
  if (data.position !== undefined) {
    fields.push({ type: "mrkdwn", text: `*Position:*\n#${data.position}` });
  }
  if (data.nps_score !== undefined) {
    fields.push({ type: "mrkdwn", text: `*NPS Score:*\n${data.nps_score}/10` });
  }
  if (data.sentiment) {
    fields.push({ type: "mrkdwn", text: `*Sentiment:*\n${data.sentiment}` });
  }
  if (data.subject) {
    fields.push({ type: "mrkdwn", text: `*Subject:*\n${data.subject}` });
  }
  if (data.ticket_number) {
    fields.push({ type: "mrkdwn", text: `*Ticket:*\n${data.ticket_number}` });
  }
  if (data.priority) {
    fields.push({ type: "mrkdwn", text: `*Priority:*\n${data.priority}` });
  }

  if (fields.length > 0) {
    blocks.push({ type: "section", fields });
  }

  // Divider
  blocks.push({ type: "divider" } as SlackBlock);

  return blocks;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate — only authorized users may trigger Slack notifications
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

    const { webhook_url, event_type, form_title, data, workspace_id } = await req.json();

    if (!webhook_url || !event_type) {
      return new Response(
        JSON.stringify({ error: "Missing webhook_url or event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace membership if workspace_id is provided
    if (workspace_id) {
      const { data: member, error: memberError } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("workspace_id", workspace_id)
        .maybeSingle();

      if (memberError || !member) {
        return new Response(
          JSON.stringify({ error: "Forbidden: not a member of this workspace" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // SSRF protection: only allow Slack webhook URLs
    try {
      const parsedUrl = new URL(webhook_url);
      if (parsedUrl.hostname !== "hooks.slack.com") {
        return new Response(
          JSON.stringify({ error: "Invalid webhook URL: only hooks.slack.com is allowed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid webhook URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const blocks = formatEventBlocks(event_type, form_title ?? "Unknown Form", data ?? {});

    const slackPayload = {
      blocks,
      text: `${form_title}: ${event_type}`, // Fallback text
    };

    const response = await fetch(webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
      signal: AbortSignal.timeout(10000),
    });

    const responseText = await response.text().catch(() => "");
    const success = response.ok;

    return new Response(
      JSON.stringify({ success, status: response.status, body: responseText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
