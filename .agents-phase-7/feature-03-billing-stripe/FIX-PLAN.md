# Agent 24 — FIX-PLAN

## Assessment Summary (2026-03-12)

### P0-1: Stripe price IDs are placeholders — CONFIRMED
- **File**: `src/lib/stripe.ts` lines 20–42
- All 6 price IDs are literal placeholder strings: `"price_pro_monthly_placeholder"`, etc.
- Checkout WILL FAIL — Stripe API rejects invalid price IDs
- **Fix**: Replace with `import.meta.env.VITE_STRIPE_PRICE_*` references + dev fallback + validity check

### P1-6: No server-side submission limit enforcement — OUT OF SCOPE
- `usePlanLimits.ts` is owned by Agent 25 — DO NOT TOUCH
- No RLS policy blocks submissions beyond plan limit (just client-side check)
- Noted for Agent 25 handoff

### P1-7: Usage RPC `get_workspace_usage` — VERIFIED EXISTS
- **Found in**: `supabase/migrations/014_usage.sql` line 58
- **Also in**: `supabase/migrations/025_policy_hardening.sql` line 239 (re-created)
- **Signature matches**: `rpc("get_workspace_usage", { ws_id: workspaceId })` → returns `(submission_count, form_count, member_count)`
- **No migration needed**

### P2-1: Stripe env vars not documented — CONFIRMED
- Edge functions need `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` in Supabase Function settings
- Client needs `VITE_STRIPE_PRICE_*` env vars (after fix)
- **Fix**: Document in HANDOFF.md

### P2-2: No webhook idempotency — ACKNOWLEDGED
- stripe-webhook returns 200 even on error (good practice)
- No idempotency key tracking — acceptable for MVP
- **Fix**: None needed now, note for future improvement

### P2-3: Annual discount hardcoded — ACKNOWLEDGED
- `STRIPE_PLANS` has hardcoded `annualPrice` values
- `Pricing.tsx` uses `Math.round(monthly * 0.8)` — matches 20% discount
- **Fix**: None needed — display prices are independent of Stripe-side pricing

---

## Fix Plan

### Prompt 24.1 — Fix Stripe Price ID Configuration (P0)
**Files**: `src/lib/stripe.ts`, `src/components/billing/CheckoutButton.tsx`

1. In `src/lib/stripe.ts`:
   - Add env var reads: `VITE_STRIPE_PRICE_PRO_MONTHLY`, `VITE_STRIPE_PRICE_PRO_ANNUAL`, `VITE_STRIPE_PRICE_GROWTH_MONTHLY`, `VITE_STRIPE_PRICE_GROWTH_ANNUAL`, `VITE_STRIPE_PRICE_BUSINESS_MONTHLY`, `VITE_STRIPE_PRICE_BUSINESS_ANNUAL`
   - Fallback to current placeholder values with `console.warn` in dev
   - Export `STRIPE_CONFIG_VALID: boolean` — true only if all 6 env vars are set
   - Add doc comment listing all required env vars

2. In `src/components/billing/CheckoutButton.tsx`:
   - Import `STRIPE_CONFIG_VALID` from `@/lib/stripe`
   - If `!STRIPE_CONFIG_VALID`, disable button and show toast explaining Stripe not configured

### Prompt 24.2 — Verify Usage RPC (P1-7)
**Files**: None — RPC already exists

1. Confirm `useUsage.ts` call matches RPC signature — ALREADY VERIFIED
2. Note that P1-6 (server-side limits) is Agent 25's responsibility
3. No code changes needed

### Prompt 24.3 — Document Stripe Configuration (P2-1)
**Files**: `HANDOFF.md`

1. Document all VITE_STRIPE_PRICE_* env vars
2. Document Supabase Function secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
3. Document checkout flow: CheckoutButton → create-checkout edge fn → Stripe → webhook → subscriptions
4. Document error states and what to check

### Prompt 24.4 — Final Verification
1. `npm run lint`
2. `npx tsc --noEmit`
3. Update HANDOFF.md to COMPLETE
4. Update PROGRESS.md to COMPLETE
