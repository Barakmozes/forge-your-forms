// ============================================
// Stripe Webhook Edge Function (Agent 6)
// Handles Stripe billing events and syncs to subscriptions table.
// Deploy: supabase functions deploy stripe-webhook
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Service role client — bypasses RLS for webhook operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Stripe signature verification ---
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const parts = signature.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const sigPart = parts.find((p) => p.startsWith("v1="));

  if (!timestampPart || !sigPart) return false;

  const timestamp = timestampPart.slice(2);
  const expectedSig = sigPart.slice(3);

  // Check timestamp tolerance (5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );
  const computedSig = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSig === expectedSig;
}

// --- Stripe API helper ---
async function stripeGet(endpoint: string) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  return res.json();
}

// --- Plan resolution from Stripe price ID ---
function resolvePlanFromPrice(priceId: string): string {
  // Map price IDs to plan names. These must match STRIPE_PLANS in src/lib/stripe.ts.
  // In production, replace placeholder values with real Stripe price IDs.
  const priceMap: Record<string, string> = {
    price_pro_monthly_placeholder: "pro",
    price_pro_annual_placeholder: "pro",
    price_growth_monthly_placeholder: "growth",
    price_growth_annual_placeholder: "growth",
    price_business_monthly_placeholder: "business",
    price_business_annual_placeholder: "business",
  };
  return priceMap[priceId] ?? "pro";
}

// --- Event handlers ---

async function handleCheckoutCompleted(session: Record<string, unknown>) {
  const workspaceId = (session.metadata as Record<string, string>)?.workspace_id;
  if (!workspaceId) {
    console.error("checkout.session.completed: missing workspace_id in metadata");
    return;
  }

  const stripeCustomerId = session.customer as string;
  const stripeSubscriptionId = session.subscription as string;

  // Fetch the subscription from Stripe to get plan details
  const stripeSub = await stripeGet(`/subscriptions/${stripeSubscriptionId}`);
  const priceId = stripeSub.items?.data?.[0]?.price?.id ?? "";
  const plan = resolvePlanFromPrice(priceId);

  const { error } = await supabase.from("subscriptions").upsert(
    {
      workspace_id: workspaceId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      plan,
      status: "active",
      current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: stripeSub.cancel_at_period_end ?? false,
    },
    { onConflict: "workspace_id" }
  );

  if (error) {
    console.error("checkout.session.completed: upsert failed", error);
  } else {
    console.log(`checkout.session.completed: workspace ${workspaceId} → ${plan}`);
  }
}

async function handleInvoicePaid(invoice: Record<string, unknown>) {
  const stripeSubscriptionId = invoice.subscription as string;
  if (!stripeSubscriptionId) return;

  // Fetch subscription to get fresh period dates
  const stripeSub = await stripeGet(`/subscriptions/${stripeSubscriptionId}`);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    console.error("invoice.paid: update failed", error);
  } else {
    console.log(`invoice.paid: subscription ${stripeSubscriptionId} renewed`);
  }
}

async function handleInvoicePaymentFailed(invoice: Record<string, unknown>) {
  const stripeSubscriptionId = invoice.subscription as string;
  if (!stripeSubscriptionId) return;

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    console.error("invoice.payment_failed: update failed", error);
  } else {
    console.log(`invoice.payment_failed: subscription ${stripeSubscriptionId} → past_due`);
  }
}

async function handleSubscriptionUpdated(subscription: Record<string, unknown>) {
  const stripeSubscriptionId = subscription.id as string;
  const items = subscription.items as Record<string, unknown> | undefined;
  const itemsData = (items?.data as Array<Record<string, unknown>>) ?? [];
  const firstItem = itemsData[0] ?? {};
  const price = firstItem.price as Record<string, unknown> | undefined;
  const priceId = (price?.id as string) ?? "";
  const plan = resolvePlanFromPrice(priceId);

  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    incomplete: "incomplete",
    trialing: "trialing",
    incomplete_expired: "canceled",
    unpaid: "past_due",
  };
  const status = statusMap[subscription.status as string] ?? "active";

  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan,
      status,
      current_period_start: new Date((subscription.current_period_start as number) * 1000).toISOString(),
      current_period_end: new Date((subscription.current_period_end as number) * 1000).toISOString(),
      cancel_at_period_end: (subscription.cancel_at_period_end as boolean) ?? false,
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    console.error("customer.subscription.updated: update failed", error);
  } else {
    console.log(`customer.subscription.updated: ${stripeSubscriptionId} → ${plan} (${status})`);
  }
}

async function handleSubscriptionDeleted(subscription: Record<string, unknown>) {
  const stripeSubscriptionId = subscription.id as string;

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", cancel_at_period_end: false })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    console.error("customer.subscription.deleted: update failed", error);
  } else {
    console.log(`customer.subscription.deleted: ${stripeSubscriptionId} → canceled`);
  }
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  // Stripe webhooks are server-to-server — reject CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 405 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY) {
    console.error("Stripe secrets not configured");
    return new Response(
      JSON.stringify({ error: "Webhook not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // Verify webhook signature
  const isValid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    console.error("Webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log(`Stripe event received: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    // Return 200 even on processing errors to prevent Stripe retries for bad data
  }

  // Always return 200 for handled events
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
