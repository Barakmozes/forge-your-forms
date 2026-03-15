// ============================================
// Dispatch Webhook Edge Function (Agent 9)
// Delivers webhook payloads to registered URLs.
// Deploy: supabase functions deploy dispatch-webhook
// Secrets: SUPABASE_SERVICE_ROLE_KEY
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── URL Validation (SSRF protection) ───────────────────────────────────────

function isUrlSafe(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    // Only allow HTTPS
    if (url.protocol !== "https:") return false;
    // Block internal/private hostnames
    const hostname = url.hostname.toLowerCase();
    const blocked = [
      "localhost", "127.0.0.1", "0.0.0.0", "::1",
      "metadata.google.internal", "169.254.169.254",
    ];
    if (blocked.includes(hostname)) return false;
    // Block private IP ranges
    if (hostname.startsWith("10.") || hostname.startsWith("192.168.") || hostname.startsWith("172.")) return false;
    // Block .internal and .local domains
    if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── HMAC-SHA256 Signing ────────────────────────────────────────────────────

async function signPayload(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hashArray = Array.from(new Uint8Array(signature));
  return "sha256=" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Retry Delays (in milliseconds) ────────────────────────────────────────

const RETRY_DELAYS = [
  60 * 1000,      // 1 minute
  5 * 60 * 1000,  // 5 minutes
  30 * 60 * 1000, // 30 minutes
];

// ─── Deliver a single webhook ───────────────────────────────────────────────

interface WebhookRecord {
  id: string;
  url: string;
  secret: string;
}

interface DeliveryResult {
  webhookId: string;
  deliveryId: string;
  success: boolean;
  status: number | null;
  responseBody: string;
}

async function deliverWebhook(
  webhook: WebhookRecord,
  eventType: string,
  payload: Record<string, unknown>,
  deliveryId: string
): Promise<DeliveryResult> {
  const body = JSON.stringify({
    id: deliveryId,
    event: eventType,
    created_at: new Date().toISOString(),
    data: payload,
  });

  try {
    const signature = await signPayload(webhook.secret, body);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-FormForge-Signature": signature,
        "X-FormForge-Event": eventType,
        "X-FormForge-Delivery-Id": deliveryId,
        "User-Agent": "FormForge-Webhook/1.0",
      },
      body,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const responseBody = await response.text().catch(() => "");
    const success = response.status >= 200 && response.status < 300;

    return {
      webhookId: webhook.id,
      deliveryId,
      success,
      status: response.status,
      responseBody: responseBody.substring(0, 1000), // Truncate
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      webhookId: webhook.id,
      deliveryId,
      success: false,
      status: null,
      responseBody: message,
    };
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate — only authorized users/services may trigger webhook delivery
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

    const { workspace_id, event_type, payload } = await req.json();

    if (!workspace_id || !event_type) {
      return new Response(
        JSON.stringify({ error: "Missing workspace_id or event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the authenticated user is a member of the target workspace
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

    // Fetch active webhooks for this workspace that listen for this event
    const { data: webhooks, error: webhookError } = await supabase
      .from("webhooks")
      .select("id, url, secret, events")
      .eq("workspace_id", workspace_id)
      .eq("active", true);

    if (webhookError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch webhooks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ delivered: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to webhooks subscribed to this event
    const matching = webhooks.filter(
      (wh: { events: string[] }) => Array.isArray(wh.events) && wh.events.includes(event_type)
    );

    if (matching.length === 0) {
      return new Response(
        JSON.stringify({ delivered: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deliver to each webhook
    const results: DeliveryResult[] = [];

    for (const webhook of matching) {
      // SSRF protection: validate webhook URL
      if (!isUrlSafe(webhook.url)) {
        console.warn(`Blocked unsafe webhook URL: ${webhook.url}`);
        continue;
      }

      const deliveryId = crypto.randomUUID();
      const result = await deliverWebhook(webhook, event_type, payload, deliveryId);
      results.push(result);

      // Compute next retry time if failed
      const nextRetryAt = !result.success ? new Date(Date.now() + RETRY_DELAYS[0]).toISOString() : null;

      // Record delivery in database
      await supabase.from("webhook_deliveries").insert({
        id: deliveryId,
        webhook_id: webhook.id,
        event_type,
        payload: { event: event_type, data: payload },
        response_status: result.status,
        response_body: result.responseBody,
        attempts: 1,
        success: result.success,
        last_attempt_at: new Date().toISOString(),
        next_retry_at: nextRetryAt,
      });
    }

    const delivered = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({ delivered, failed, total: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
