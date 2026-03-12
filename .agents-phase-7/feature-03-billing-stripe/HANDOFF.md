# Agent 24 — Handoff

## Status: COMPLETE ✅

## What's Done

### 24.0 — Assessment
- Confirmed P0-1: Stripe price IDs were placeholders in `src/lib/stripe.ts`
- Verified P1-7: `get_workspace_usage` RPC exists in migrations 014 + 025
- Noted P1-6 (server-side submission limits) as Agent 25's responsibility
- Created FIX-PLAN.md

### 24.1 — Fix Stripe Price ID Configuration (P0)
- **`src/lib/stripe.ts`**: Price IDs now read from `import.meta.env.VITE_STRIPE_PRICE_*` with fallback to placeholder values + `console.warn` in dev mode
- **`src/lib/stripe.ts`**: Added `STRIPE_CONFIG_VALID` boolean export — true only when all 6 env vars are set
- **`src/components/billing/CheckoutButton.tsx`**: Added `STRIPE_CONFIG_VALID` check — shows error toast if Stripe not configured

### 24.2 — Usage RPC Verification
- RPC `get_workspace_usage(ws_id UUID)` confirmed in migration 014 + 025
- Signature matches `useUsage.ts` call exactly
- `increment_usage_submission` trigger verified on `submissions` INSERT
- No code changes needed

### 24.3 — Stripe Configuration Documentation
- Full checkout flow documented below
- All required env vars listed
- Operator setup steps documented
- Known edge case documented (webhook price map)

---

## Stripe Configuration Checklist

### 1. Client-Side Environment Variables (.env)

Set these in the project `.env` file (VITE_ prefix required):

```env
# Stripe Price IDs — get from Stripe Dashboard → Products → Prices
VITE_STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_PRO_ANNUAL=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_GROWTH_MONTHLY=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_GROWTH_ANNUAL=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_BUSINESS_MONTHLY=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_BUSINESS_ANNUAL=price_xxxxxxxxxxxxx
```

Without these, `STRIPE_CONFIG_VALID` will be `false` and CheckoutButton will show an error toast.

### 2. Supabase Edge Function Secrets

Set via Supabase Dashboard → Settings → Edge Functions → Secrets, or via CLI:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-provided by Supabase to edge functions.

### 3. Stripe Dashboard Configuration

1. **Create Products**: Create Pro, Growth, Business products in Stripe Dashboard
2. **Create Prices**: For each product, create monthly and annual prices matching:
   - Pro: $29/mo, $276/yr ($23/mo)
   - Growth: $59/mo, $564/yr ($47/mo)
   - Business: $99/mo, $948/yr ($79/mo)
3. **Copy Price IDs**: Copy each `price_*` ID into the `.env` file
4. **Configure Webhook Endpoint**:
   - URL: `https://<supabase-project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
5. **Copy Webhook Signing Secret**: Copy `whsec_*` into Supabase edge function secrets

### 4. CRITICAL: Webhook Price Map Update

**`supabase/functions/stripe-webhook/index.ts`** lines 69-77 contain a `resolvePlanFromPrice()` function with hardcoded placeholder price IDs. When real Stripe price IDs are set, this map MUST be updated to match. Otherwise, the webhook will resolve all plans to "pro" (the fallback).

This file is owned by Agent 23 — the operator or Agent 23 must update the `priceMap` object.

---

## Checkout Flow (End-to-End)

```
1. User clicks CheckoutButton (Pricing or BillingPortal page)
2. CheckoutButton checks STRIPE_CONFIG_VALID → if false, shows error toast
3. CheckoutButton checks user + workspace → if missing, shows login error
4. CheckoutButton calls getPriceId(plan, interval) → reads from STRIPE_PLANS (env vars)
5. CheckoutButton invokes Supabase Edge Function: create-checkout
   Body: { priceId, workspaceId, customerEmail, successUrl, cancelUrl }
6. Edge function creates Stripe Checkout Session → returns { url }
7. User redirected to Stripe hosted checkout page
8. On payment success → Stripe fires checkout.session.completed webhook
9. stripe-webhook Edge Function receives event:
   a. Verifies signature (HMAC-SHA256)
   b. Extracts workspace_id from session.metadata
   c. Fetches subscription from Stripe API
   d. Resolves plan from price ID via resolvePlanFromPrice()
   e. Upserts subscriptions table (workspace_id, plan, status, period dates)
10. Supabase Realtime notifies client → useSubscription invalidates cache
11. User sees updated plan in UI
```

### Error States

| Error | Where | User Sees |
|-------|-------|-----------|
| Stripe not configured | CheckoutButton | Toast: "Stripe is not configured" |
| Not logged in | CheckoutButton | Toast: "Must be logged in" |
| Edge function error | CheckoutButton | Toast: "Could not start checkout" |
| Payment declined | Stripe hosted page | Stripe error message |
| Webhook signature invalid | stripe-webhook | 400 response (Stripe retries) |
| Webhook processing error | stripe-webhook | 200 response (logged, no retry storm) |
| Payment failed (renewal) | invoice.payment_failed | SubscriptionStatus banner: "Payment failed" |
| Subscription canceled | subscription.deleted | SubscriptionStatus banner: "Subscription canceled" |

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/stripe.ts` | Price IDs from env vars, `STRIPE_CONFIG_VALID` export, `getStripePriceId()` helper |
| `src/components/billing/CheckoutButton.tsx` | Added `STRIPE_CONFIG_VALID` check before checkout |

## Files NOT Modified (verified only)

| File | Status |
|------|--------|
| `src/hooks/useSubscription.ts` | No changes needed — works correctly |
| `src/hooks/useUsage.ts` | No changes needed — RPC matches migration |
| `supabase/migrations/014_usage.sql` | Verified: RPC + trigger exist |
| `supabase/functions/stripe-webhook/index.ts` | Not touched (Agent 23) — but needs price map update |

## What's Next

Agent 24 is COMPLETE. Downstream agents can proceed.

## Notes for Downstream Agents
- **Agent 25 (Plan Limits)**: P1-6 (server-side submission limit enforcement) needs attention — currently client-only
- **Agent 23 (Edge Functions)**: `resolvePlanFromPrice()` in `stripe-webhook/index.ts` has hardcoded placeholder price IDs — must be updated when real Stripe price IDs are configured
- **Agent 37 (i18n)**: Translation key `billing.stripeNotConfigured` used in CheckoutButton with English default fallback — add to locale files if desired

## Verification Results
- `npm run lint`: 0 errors, 16 pre-existing warnings
- `npx tsc --noEmit`: clean (no errors)
