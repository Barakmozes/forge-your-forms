// ============================================
// Stripe configuration & plan utilities (Agent 6 + Agent 24 P7 fix)
// ============================================

/**
 * Required environment variables for Stripe checkout:
 *
 * Client-side (VITE_ prefix, set in .env):
 *   VITE_STRIPE_PRICE_PRO_MONTHLY     — Stripe Price ID for Pro monthly
 *   VITE_STRIPE_PRICE_PRO_ANNUAL      — Stripe Price ID for Pro annual
 *   VITE_STRIPE_PRICE_GROWTH_MONTHLY  — Stripe Price ID for Growth monthly
 *   VITE_STRIPE_PRICE_GROWTH_ANNUAL   — Stripe Price ID for Growth annual
 *   VITE_STRIPE_PRICE_BUSINESS_MONTHLY — Stripe Price ID for Business monthly
 *   VITE_STRIPE_PRICE_BUSINESS_ANNUAL  — Stripe Price ID for Business annual
 *
 * Server-side (Supabase Edge Function secrets):
 *   STRIPE_SECRET_KEY       — Stripe secret key (sk_live_* or sk_test_*)
 *   STRIPE_WEBHOOK_SECRET   — Stripe webhook signing secret (whsec_*)
 */

export type PlanTier = "free" | "pro" | "growth" | "business";
export type BillingInterval = "monthly" | "annual";

export interface StripePlan {
  monthly: string;
  annual: string;
  price: number;
  annualPrice: number;
  name: string;
}

function getStripePriceId(envVar: string, fallback: string): string {
  const value = import.meta.env[envVar];
  if (value) return value;
  if (import.meta.env.DEV) {
    console.warn(`[Stripe] Missing env var ${envVar} — using placeholder. Checkout will fail against Stripe API.`);
  }
  return fallback;
}

export const STRIPE_PLANS: Record<Exclude<PlanTier, "free">, StripePlan> = {
  pro: {
    monthly: getStripePriceId("VITE_STRIPE_PRICE_PRO_MONTHLY", "price_1TAH5vP7upMiSmxcaxFeD3Rn"),
    annual: getStripePriceId("VITE_STRIPE_PRICE_PRO_ANNUAL", "price_1TAH5zP7upMiSmxcxCLv1YIu"),
    price: 29,
    annualPrice: 23, // 20% discount
    name: "Pro",
  },
  growth: {
    monthly: getStripePriceId("VITE_STRIPE_PRICE_GROWTH_MONTHLY", "price_1TAH63P7upMiSmxcqTjUetpc"),
    annual: getStripePriceId("VITE_STRIPE_PRICE_GROWTH_ANNUAL", "price_1TAH66P7upMiSmxckzYCNMXF"),
    price: 59,
    annualPrice: 47, // 20% discount
    name: "Growth",
  },
  business: {
    monthly: getStripePriceId("VITE_STRIPE_PRICE_BUSINESS_MONTHLY", "price_1TAH68P7upMiSmxcuOpvjL9e"),
    annual: getStripePriceId("VITE_STRIPE_PRICE_BUSINESS_ANNUAL", "price_1TAH6AP7upMiSmxcUrVVDJMs"),
    price: 99,
    annualPrice: 79, // 20% discount
    name: "Business",
  },
};

/** True only when all 6 Stripe price ID env vars are set (not using placeholders) */
export const STRIPE_CONFIG_VALID: boolean = [
  import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
  import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL,
  import.meta.env.VITE_STRIPE_PRICE_GROWTH_MONTHLY,
  import.meta.env.VITE_STRIPE_PRICE_GROWTH_ANNUAL,
  import.meta.env.VITE_STRIPE_PRICE_BUSINESS_MONTHLY,
  import.meta.env.VITE_STRIPE_PRICE_BUSINESS_ANNUAL,
].every(Boolean);

/** Feature access map — consumed by useSubscription.canAccess() and Agent 7 */
export const PLAN_FEATURES: Record<PlanTier, string[]> = {
  free: [
    "standard_mode",
    "basic_submissions",
    "single_member",
    "realtime",
  ],
  pro: [
    "standard_mode",
    "waitlist_mode",
    "feedback_mode",
    "support_mode",
    "custom_branding",
    "csv_export",
    "canned_responses",
    "referral_tracking",
    "5_members",
    "5k_submissions",
    "email_support",
    "realtime",
  ],
  growth: [
    "standard_mode",
    "waitlist_mode",
    "feedback_mode",
    "support_mode",
    "custom_branding",
    "custom_domain",
    "csv_export",
    "api_access",
    "advanced_analytics",
    "sla_tracking",
    "canned_responses",
    "referral_tracking",
    "15_members",
    "25k_submissions",
    "priority_support",
    "realtime",
  ],
  business: [
    "standard_mode",
    "waitlist_mode",
    "feedback_mode",
    "support_mode",
    "custom_branding",
    "custom_domain",
    "white_label",
    "csv_export",
    "api_access",
    "webhook_export",
    "advanced_analytics",
    "sla_tracking",
    "canned_responses",
    "referral_tracking",
    "sso",
    "dedicated_support",
    "unlimited_members",
    "unlimited_submissions",
    "realtime",
  ],
};

/** Plan tier ordering for comparison (higher = more features) */
const PLAN_ORDER: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  growth: 2,
  business: 3,
};

/** Check if planA is at least as high as planB */
export function isPlanAtLeast(planA: PlanTier, planB: PlanTier): boolean {
  return PLAN_ORDER[planA] >= PLAN_ORDER[planB];
}

/** Get the price ID for a given plan and interval */
export function getPriceId(plan: Exclude<PlanTier, "free">, interval: BillingInterval): string {
  return STRIPE_PLANS[plan][interval];
}

/** Get display price for a plan at a given interval */
export function getPlanPrice(plan: Exclude<PlanTier, "free">, interval: BillingInterval): number {
  return interval === "annual"
    ? STRIPE_PLANS[plan].annualPrice
    : STRIPE_PLANS[plan].price;
}

/** Resolve a PlanTier from a subscription row */
export function resolvePlanTier(subscription: { plan: string; status: string } | null): PlanTier {
  if (!subscription) return "free";
  if (subscription.status !== "active" && subscription.status !== "trialing") return "free";
  if (subscription.plan === "pro" || subscription.plan === "growth" || subscription.plan === "business") {
    return subscription.plan;
  }
  return "free";
}
