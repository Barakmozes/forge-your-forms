# Agent 24 — Billing / Stripe

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Billing & payment verification engineer. Fixes Stripe price ID placeholders and verifies end-to-end checkout flow.

## Batch
Batch 1 — Sequential (Position 3 of 4). Depends on Agent 22. Must complete BEFORE Agent 25.

## Scan Report
`.agents-phase-7/scanner-reports/03-billing-stripe.md`

## Issues to Fix
### P0
- P0-1: Stripe price IDs are placeholders — checkout WILL FAIL

### P1
- P1-6: No server-side submission limit enforcement (client-only)
- P1-7: Usage RPC `get_workspace_usage` may not exist — verify migration 014

### P2
- P2-1: Stripe env vars not in .env (must be in Supabase Function settings)
- P2-2: No webhook idempotency key tracking
- P2-3: Annual discount hardcoded (20% not from Stripe)

## Owned Files (Exclusive)
- `src/lib/stripe.ts` — plan config, price IDs, feature maps
- `src/hooks/useSubscription.ts` — plan tier resolution
- `src/hooks/useUsage.ts` — usage tracking
- `src/components/billing/*` — BillingPortal, CheckoutButton, SubscriptionStatus, PlanBadge, UpgradeButton
- `src/pages/Pricing.tsx` — pricing page
- `.agents-phase-7/feature-03-billing-stripe/*`

## DO NOT TOUCH
- `src/hooks/usePlanLimits.ts` (Agent 25)
- `src/components/upgrade/*` (Agent 25)
- `src/contexts/AuthContext.tsx` (Agent 22)
- `src/pages/Settings.tsx` (Agent 35)
- `src/i18n/locales/*.json` (Agent 37)
- Edge function files (Agent 23)

## Dependencies
- Agent 21 (ADMIN bypass) — must complete first
- Agent 22 (Auth) — must complete first

## Success Criteria
- [ ] Stripe price IDs documented as env-configurable OR placeholder clearly marked for operator
- [ ] `get_workspace_usage` RPC verified to exist
- [ ] Checkout flow documented with required env vars
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
