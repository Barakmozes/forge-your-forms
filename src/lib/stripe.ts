// ============================================
// Stripe configuration & plan utilities (Agent 6)
// ============================================

export type PlanTier = "free" | "pro" | "growth" | "business";
export type BillingInterval = "monthly" | "annual";

export interface StripePlan {
  monthly: string;
  annual: string;
  price: number;
  annualPrice: number;
  name: string;
}

/**
 * Stripe price IDs — PLACEHOLDER values.
 * Replace with real Stripe Price IDs after creating products in the Stripe Dashboard.
 */
export const STRIPE_PLANS: Record<Exclude<PlanTier, "free">, StripePlan> = {
  pro: {
    monthly: "price_pro_monthly_placeholder",
    annual: "price_pro_annual_placeholder",
    price: 29,
    annualPrice: 23, // 20% discount
    name: "Pro",
  },
  growth: {
    monthly: "price_growth_monthly_placeholder",
    annual: "price_growth_annual_placeholder",
    price: 59,
    annualPrice: 47, // 20% discount
    name: "Growth",
  },
  business: {
    monthly: "price_business_monthly_placeholder",
    annual: "price_business_annual_placeholder",
    price: 99,
    annualPrice: 79, // 20% discount
    name: "Business",
  },
};

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
