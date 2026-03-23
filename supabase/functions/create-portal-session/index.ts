// ============================================
// Create Portal Session Edge Function
// Creates a Stripe Billing Portal session for subscription management.
// Deploy: supabase functions deploy create-portal-session
// Secrets: STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { decodeJwtPayload } from "../_shared/supabase.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Stripe API Helper ─────────────────────────────────────────────

async function stripePost(
  endpoint: string,
  params: Record<string, string>
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

// ─── Main Handler ──────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
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
      console.error("create-portal-session auth failed:", err instanceof Error ? err.message : err);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { workspaceId, returnUrl } = body as {
      workspaceId: string;
      returnUrl: string;
    };

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: workspaceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace membership and require owner role for billing operations
    const { data: member, error: memberError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("user_id", userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: "Forbidden: not a member of this workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (member.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Forbidden: only workspace owners can manage billing" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the Stripe customer ID from the subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (subError) {
      console.error("Failed to fetch subscription:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to look up subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscription?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "No billing account found for this workspace" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Billing Portal session
    const { ok, data: session } = await stripePost("/billing_portal/sessions", {
      customer: subscription.stripe_customer_id,
      return_url: returnUrl || `${req.headers.get("origin") || ""}/settings?tab=billing`,
    });

    if (!ok) {
      console.error("Failed to create portal session:", session);
      return new Response(
        JSON.stringify({ error: "Failed to create billing portal session" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-portal-session error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
