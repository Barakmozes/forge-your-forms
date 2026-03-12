# Scan Report: Billing / Stripe
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Pages
- `src/pages/Pricing.tsx` — Public pricing page with tier comparison + CheckoutButtons
- `src/pages/Settings.tsx` — Billing tab (owner-only) renders BillingPortal + UsageDashboard

### Components
- `src/components/billing/BillingPortal.tsx` — Current plan display + manage subscription + plan comparison
- `src/components/billing/CheckoutButton.tsx` — Initiates Stripe Checkout (pro/growth/business × monthly/annual)
- `src/components/billing/SubscriptionStatus.tsx` — Warning banners (past_due, canceled)
- `src/components/billing/PlanBadge.tsx` — Colored plan badge (free=gray, pro=emerald, growth=blue, business=purple)
- `src/components/billing/UpgradeButton.tsx` — Contextual upgrade CTA (hidden if plan sufficient)

### Hooks
- `src/hooks/useSubscription.ts` — TanStack Query: fetches subscription, resolves plan tier, realtime updates
- `src/hooks/useUsage.ts` — TanStack Query: monthly usage (submissions, forms, members) via RPC

### Database Tables
- `subscriptions` — RLS: member read/write. Triggers: auto-update timestamp. Realtime: yes. Unique: workspace_id
- `usage` — RLS: member read. Triggers: increment_usage_submission (on submissions INSERT). Realtime: yes

### Edge Functions
- `create-checkout` — Creates Stripe Checkout session
- `create-portal-session` — Creates Stripe Billing Portal session
- `stripe-webhook` — Syncs Stripe events to subscriptions table

### Lib
- `src/lib/stripe.ts` — Plan config, pricing, feature maps, price ID → plan resolution

### Routes
- `/pricing` — Public, Component: Pricing
- `/settings?tab=billing` — Protected (owner), renders billing components

## 2. End-to-End Flow Status

- **Free → checkout → paid plan**: WORKS (flow: CheckoutButton → create-checkout edge fn → Stripe → stripe-webhook → subscriptions upsert)
- **Manage subscription (portal)**: WORKS (BillingPortal → create-portal-session → Stripe portal URL)
- **Subscription renewal**: WORKS (Stripe invoice.paid → stripe-webhook → status=active, period dates updated)
- **Payment failure**: WORKS (invoice.payment_failed → status=past_due → SubscriptionStatus banner)
- **Plan cancellation**: WORKS (customer.subscription.deleted → status=canceled → SubscriptionStatus banner)
- **Usage tracking**: WORKS (submission INSERT → trigger increments usage.submission_count → useUsage reads via RPC)
- **Plan comparison + upgrade CTA**: WORKS (BillingPortal shows 3 paid tiers for free users)

## 3. Business Tier Mapping

| Tier | Price (Monthly) | Price (Annual) | Enforced |
|------|----------------|----------------|----------|
| Free | $0 | $0 | Default (no subscription row) |
| Pro | $29/mo | $23/mo | YES — Stripe price ID mapping |
| Growth | $59/mo | $47/mo | YES — Stripe price ID mapping |
| Business | $99/mo | $79/mo | YES — Stripe price ID mapping |

## 4. Cross-Dependencies

- **Depends on**: Stripe (external), Supabase service role (edge functions)
- **Depended on by**: Plan Limits (04), all feature-gated features
- **Shared files**: `src/lib/stripe.ts` (plan config), `src/hooks/useSubscription.ts` (used by usePlanLimits)

## 5. i18n Status

- t() coverage: ALL strings wrapped (billing.*, upgrade.*, pricing.*, common.*)
- Hebrew translations: COMPLETE
- RTL layout: CORRECT

## 6. Parallelism Eligibility

- Independent: NO — Plan Limits (04) depends on this
- Conflicts with: usePlanLimits.ts (Agent 25)

## 7. Issues Found

### P0 — Critical
- **Stripe price IDs are placeholders**: `STRIPE_PLANS` in `lib/stripe.ts` has placeholder IDs (e.g., `price_pro_monthly`). Must be replaced with real Stripe product price IDs before production. Checkout will fail without real IDs.

### P1 — High
- **No server-side submission limit enforcement**: `canAcceptSubmission()` is client-only. No RLS policy or edge function prevents submissions beyond plan limit. File: `src/hooks/usePlanLimits.ts`
- **Usage RPC may not exist**: `get_workspace_usage` RPC called by useUsage.ts — must verify it exists in migrations. File: `src/hooks/useUsage.ts`

### P2 — Medium
- **Stripe env vars not in .env**: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET must be configured in Supabase Function settings
- **No webhook retry storm protection**: stripe-webhook returns 200 even on error (good), but no idempotency key tracking
- **Annual discount hardcoded**: 20% discount calculated in getPlanPrice(), not from Stripe

## 8. Recommended Fix Path

1. Replace placeholder Stripe price IDs in `src/lib/stripe.ts` with real values from Stripe Dashboard
2. Add server-side submission limit check (RLS policy or edge function middleware)
3. Verify `get_workspace_usage` RPC exists in migrations (migration 014)
4. Configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in Supabase project settings
