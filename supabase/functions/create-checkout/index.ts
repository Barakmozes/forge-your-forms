// ============================================
// Create Checkout Edge Function
// Creates a Stripe Checkout session for subscription upgrades.
// Deploy: supabase functions deploy create-checkout
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

// ─── Allowed Price IDs (server-side allowlist) ──────────────────────────────
// Read from env vars if set, otherwise fall back to hardcoded Stripe price IDs.
// These must match the IDs in src/lib/stripe.ts and stripe-webhook/index.ts.
function getAllowedPriceIds(): Set<string> {
  const ids = [
    Deno.env.get("STRIPE_PRICE_PRO_MONTHLY")     ?? "price_1TAH5vP7upMiSmxcaxFeD3Rn",
    Deno.env.get("STRIPE_PRICE_PRO_ANNUAL")       ?? "price_1TAH5zP7upMiSmxcxCLv1YIu",
    Deno.env.get("STRIPE_PRICE_GROWTH_MONTHLY")   ?? "price_1TAH63P7upMiSmxcqTjUetpc",
    Deno.env.get("STRIPE_PRICE_GROWTH_ANNUAL")    ?? "price_1TAH66P7upMiSmxckzYCNMXF",
    Deno.env.get("STRIPE_PRICE_BUSINESS_MONTHLY") ?? "price_1TAH68P7upMiSmxcuOpvjL9e",
    Deno.env.get("STRIPE_PRICE_BUSINESS_ANNUAL")  ?? "price_1TAH6AP7upMiSmxcUrVVDJMs",
  ];
  return new Set(ids);
}

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

async function stripeGet(endpoint: string, params?: Record<string, string>) {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  const res = await fetch(`https://api.stripe.com/v1${endpoint}${query}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  return res.json();
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
    let userEmail: string | undefined;
    try {
      const token = authHeader.replace("Bearer ", "");
      const decoded = decodeJwtPayload(token);
      userId = decoded.sub;
      userEmail = decoded.email;
    } catch (err) {
      console.error("create-checkout auth failed:", err instanceof Error ? err.message : err);
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
    const { priceId, workspaceId, customerEmail, successUrl, cancelUrl } = body as {
      priceId: string;
      workspaceId: string;
      customerEmail: string;
      successUrl: string;
      cancelUrl: string;
    };

    if (!priceId || !workspaceId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: priceId, workspaceId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate price ID against allowlist (prevents arbitrary price ID injection)
    const allowedPriceIds = getAllowedPriceIds();
    if (!allowedPriceIds.has(priceId)) {
      return new Response(
        JSON.stringify({ error: "Invalid price ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace membership — any authenticated member can initiate checkout
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

    // Check if workspace already has a Stripe customer
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    // Create customer if doesn't exist
    if (!customerId) {
      const { ok, data: customer } = await stripePost("/customers", {
        email: customerEmail || userEmail || "",
        "metadata[workspace_id]": workspaceId,
        "metadata[user_id]": userId,
      });

      if (!ok) {
        console.error("Failed to create Stripe customer:", customer);
        return new Response(
          JSON.stringify({ error: "Failed to create customer" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      customerId = customer.id as string;
    }

    // If customer already has an active subscription, redirect to portal instead
    const existingSubscriptions = await stripeGet("/subscriptions", {
      customer: customerId,
      status: "active",
      limit: "1",
    });

    if (existingSubscriptions.data?.length > 0) {
      return new Response(
        JSON.stringify({ error: "Active subscription already exists. Use billing portal to manage." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Checkout Session
    const { ok, data: session } = await stripePost("/checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: successUrl || `${req.headers.get("origin") || ""}/checkout/success`,
      cancel_url: cancelUrl || `${req.headers.get("origin") || ""}/checkout/cancel`,
      "metadata[workspace_id]": workspaceId,
      "subscription_data[metadata][workspace_id]": workspaceId,
      allow_promotion_codes: "true",
    });

    if (!ok) {
      console.error("Failed to create checkout session:", session);
      return new Response(
        JSON.stringify({ error: "Failed to create checkout session" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
