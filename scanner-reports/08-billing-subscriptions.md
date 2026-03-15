# Feature 08: Billing & Subscriptions - Scan Report

> Scanned: 2026-03-15
> Scanner: Claude Opus 4.6
> Feature: Billing & Subscriptions (Stripe Integration)
> Status: **Functional with Critical Security Gaps**

---

## 1. Touchpoints

### Pages
| Page | File | Purpose |
|------|------|---------|
| Pricing | `src/pages/Pricing.tsx` | Public pricing page with 4-tier comparison |
| Settings (Billing tab) | `src/pages/Settings.tsx:304-311` | Owner-only billing management |
| Checkout Success | `src/pages/CheckoutSuccess.tsx` | Post-checkout confirmation + redirect |
| Checkout Cancel | `src/pages/CheckoutCancel.tsx` | Cancelled checkout landing |

### Components
| Component | File | Purpose |
|-----------|------|---------|
| CheckoutButton | `src/components/billing/CheckoutButton.tsx` | Initiates Stripe Checkout via edge function |
| BillingPortal | `src/components/billing/BillingPortal.tsx` | Current plan display + manage billing link |
| PlanBadge | `src/components/billing/PlanBadge.tsx` | Plan tier badge in Navbar |
| UpgradeButton | `src/components/billing/UpgradeButton.tsx` | Contextual upgrade CTA |
| SubscriptionStatus | `src/components/billing/SubscriptionStatus.tsx` | Warning banner for past_due/canceled |
| FeatureGate | `src/components/upgrade/FeatureGate.tsx` | UI overlay for gated features |
| PaywallModal | `src/components/upgrade/PaywallModal.tsx` | Upgrade dialog with plan prompt |
| UpgradePrompt | `src/components/upgrade/UpgradePrompt.tsx` | Inline upgrade CTA card |
| UsageDashboard | `src/components/upgrade/UsageDashboard.tsx` | Usage progress bars in billing tab |
| UsageBanner | `src/components/upgrade/UsageBanner.tsx` | Sticky warning near submission limit |
| PoweredByEnforcer | `src/components/branding/PoweredByEnforcer.tsx` | Forces "Powered by" on free plan |

### Hooks
| Hook | File | Purpose |
|------|------|---------|
| useSubscription | `src/hooks/useSubscription.ts` | React Query hook for subscription data + realtime |
| usePlanLimits | `src/hooks/usePlanLimits.ts` | Central plan limits, gating, and usage checks |
| useUsage | `src/hooks/useUsage.ts` | Workspace usage counters via RPC |

### Lib/Config
| File | Purpose |
|------|---------|
| `src/lib/stripe.ts` | Plan definitions, price IDs, feature access map, utilities |

### Database Tables
| Table | Migration | Purpose |
|-------|-----------|---------|
| `subscriptions` | `013_subscriptions.sql` | One-per-workspace subscription record |
| `usage` | `014_usage.sql` | Monthly usage counters per workspace |

### Edge Functions
| Function | File | Purpose |
|----------|------|---------|
| create-checkout | `supabase/functions/create-checkout/index.ts` | Creates Stripe Checkout session |
| stripe-webhook | `supabase/functions/stripe-webhook/index.ts` | Processes Stripe billing events |
| create-portal-session | `supabase/functions/create-portal-session/index.ts` | Creates Stripe Billing Portal session |

### Routes (App.tsx)
| Path | Component | Auth |
|------|-----------|------|
| `/pricing` | `Pricing` | Public |
| `/billing` | Redirect to `/settings?tab=billing` | Protected |
| `/checkout/success` | `CheckoutSuccess` | Protected |
| `/checkout/cancel` | `CheckoutCancel` | Public |

---

## 2. E2E Flows

### Flow 1: View Pricing
**Steps**: User navigates to `/pricing` -> sees 4 tiers (Free/Pro/Growth/Business) -> toggles monthly/annual -> views comparison table + FAQ
**Verdict**: PASS
**Evidence**: `src/pages/Pricing.tsx` renders all 4 tiers with correct pricing ($0/$29/$59/$99), annual 20% discount toggle, feature comparison table, and FAQ section. Currently subscribed plan shows "Current Plan" badge (line 311-313).
**Gaps**: None significant.

### Flow 2: Subscribe (Checkout)
**Steps**: Authenticated user clicks plan CTA on `/pricing` -> `CheckoutButton` calls `create-checkout` edge function -> edge function creates Stripe customer (if new) -> creates Checkout Session -> user redirected to Stripe hosted checkout -> completes payment -> redirected to `/checkout/success`
**Verdict**: PASS with security gaps (see Issues)
**Evidence**: `CheckoutButton.tsx` calls `supabase.functions.invoke("create-checkout")` with priceId, workspaceId, customerEmail. Edge function authenticates via JWT (line 61-79), creates Stripe customer with metadata (line 115-129), checks for existing active subscription (line 133-143), creates Checkout Session (line 147-157).
**Gaps**:
- P0: No workspace membership verification in `create-checkout` (any authenticated user can initiate checkout for any workspace_id)
- P0: No server-side price ID validation (client sends any priceId, server passes it directly to Stripe)
- P1: No idempotency key on Stripe API calls

### Flow 3: Webhook Processing
**Steps**: Stripe sends webhook -> `stripe-webhook` verifies HMAC signature -> parses event type -> updates `subscriptions` table accordingly
**Verdict**: PASS
**Evidence**: `stripe-webhook/index.ts` implements signature verification (lines 18-55) with HMAC-SHA256, 5-minute timestamp tolerance. Handles 5 event types: `checkout.session.completed` (upsert subscription), `invoice.paid` (renew period), `invoice.payment_failed` (set past_due), `customer.subscription.updated` (sync plan/status), `customer.subscription.deleted` (mark canceled).
**Gaps**:
- P1: Signature comparison uses string equality (`===`) instead of constant-time comparison (line 54), vulnerable to timing attacks
- P1: Returns 200 even on processing errors (line 276), which prevents Stripe retries for legitimate failures
- P2: Price-to-plan mapping is hardcoded and duplicated between client and server

### Flow 4: Manage Subscription (Billing Portal)
**Steps**: Owner goes to Settings -> Billing tab -> clicks "Manage Subscription" -> `create-portal-session` creates Stripe portal session -> user redirected to Stripe portal -> can update payment, cancel, change plan
**Verdict**: PASS with security gap
**Evidence**: `BillingPortal.tsx` calls `create-portal-session` (line 51). Edge function authenticates via JWT (line 53-71), looks up stripe_customer_id from subscriptions table (line 94-98), creates portal session (line 116-118).
**Gaps**:
- P0: No workspace membership verification -- any authenticated user can create a portal session for any workspace by guessing/knowing the workspaceId
- P2: Portal session return URL is user-controlled (line 118), though this is low risk since Stripe validates portal URLs

### Flow 5: Cancel Subscription
**Steps**: User opens Billing Portal (Stripe-hosted) -> cancels subscription -> Stripe fires `customer.subscription.updated` (cancel_at_period_end=true) then later `customer.subscription.deleted` -> webhook updates DB
**Verdict**: PASS
**Evidence**: `handleSubscriptionDeleted` (line 195-207) sets status to "canceled". `handleSubscriptionUpdated` (line 157-192) handles all status transitions including cancellation pending. `SubscriptionStatus.tsx` shows warning banners for past_due and canceled states.
**Gaps**: None significant -- Stripe portal handles the UX.

### Flow 6: Usage Limits Enforcement
**Steps**: Usage tracked via DB triggers on submissions -> `useUsage` hook fetches via RPC -> `usePlanLimits` computes gating -> `canCreateForm`, `canAcceptSubmission`, `canInviteMember`, `canAccessMode`, `canAccessFeature` gate UI actions -> `UsageBanner` warns near limit -> `FeatureGate` blocks gated features
**Verdict**: PARTIAL PASS -- client-side only
**Evidence**: `014_usage.sql` has trigger `on_submission_increment_usage` that counts submissions per workspace per month. `usePlanLimits.ts` defines limits per plan and exposes gating functions. `FeatureGate.tsx`, `PaywallModal.tsx`, `UpgradePrompt.tsx` provide UI enforcement. `Forms.tsx` gates form creation (line 105). `FormDashboard.tsx` gates mode access (lines 71-76).
**Gaps**:
- P0: **No server-side enforcement** of usage limits -- all gating is client-side only. Public form submission endpoints (RLS allows anonymous INSERT) have no limit checks. A user on the free plan can receive unlimited submissions because the DB trigger increments the counter but nothing blocks the INSERT.
- P0: `canAcceptSubmission()` is defined in `usePlanLimits.ts` (line 108) but is **never called** in any public-facing form submission flow. It only appears in test mocks.
- P1: `isOwnerBypass` at `usePlanLimits.ts:93` bypasses ALL limits for workspace owners, completely defeating the purpose of billing tiers during development/testing. This should be removed before production.

### Flow 7: Feature Gating
**Steps**: Components wrapped in `FeatureGate` -> checks plan tier -> shows blurred overlay + upgrade button if insufficient -> `PaywallModal` offers upgrade path to `/pricing`
**Verdict**: PASS (UI-level only)
**Evidence**: `FeatureGate.tsx` wraps features like AI Form Generator (Forms.tsx:275), webhooks, integrations, SSO, white-label. Uses `isPlanAtLeast()` for tier comparison. `usePlanLimits.ts` has `FEATURE_REQUIRED_PLAN` mapping (line 61-73) for granular feature gating.
**Gaps**:
- P1: Feature gating is entirely client-side; edge functions for gated features (AI, workflows, webhooks) do not verify the caller's plan tier
- P1: `isOwnerBypass` in `FeatureGate.tsx:36` allows workspace owners to access all features regardless of plan

---

## 3. Cross-Dependencies

| Dependency | Direction | Impact |
|------------|-----------|--------|
| AuthContext | Billing -> Auth | JWT required for edge function calls |
| WorkspaceContext | Billing -> Workspace | Subscription is workspace-scoped |
| Supabase Realtime | Billing -> Realtime | Subscription changes push to UI instantly |
| TanStack React Query | Billing -> Query | useSubscription and useUsage use React Query |
| Forms creation | Plan Limits -> Forms | canCreateForm gates new form creation |
| Mode access | Plan Limits -> All modes | canAccessMode gates feedback/support modes |
| Feature access | Plan Limits -> Features | canAccessFeature gates AI, webhooks, SSO, etc. |
| Branding | Plan -> Public forms | PoweredByEnforcer forces branding on free plan |
| Members | Plan Limits -> Members | canInviteMember gates team invitations |
| send-email | Billing -> Email | payment_confirmation and payment_failed templates exist |

---

## 4. Parallelism Assessment

| Test Area | Parallelizable | Dependencies |
|-----------|---------------|--------------|
| Pricing page rendering | Yes | None (public page) |
| Checkout flow | No | Requires auth + workspace + Stripe sandbox |
| Webhook processing | Yes (unit testable) | Stripe signature mocking |
| Plan limits logic | Yes | Pure function tests |
| Feature gating UI | Yes | Mock usePlanLimits |
| Usage tracking | Partially | DB trigger requires form+submission |
| Billing portal | No | Requires active subscription |

---

## 5. Business Tier Mapping

### Free Tier
| Capability | Limit | Enforcement Point |
|------------|-------|-------------------|
| Forms | 3 | `usePlanLimits.ts:27` (client-side only) |
| Submissions/month | 100 | `usePlanLimits.ts:31` (client-side only, NOT enforced server-side) |
| Members | 1 | `usePlanLimits.ts:32` (client-side only) |
| Modes | standard only | `getRequiredPlanForMode()` (client-side only) |
| Branding | Forced "Powered by" | `PoweredByEnforcer.tsx:20` (client-side only) |
| Waitlists | 1 | `usePlanLimits.ts:28` (client-side only, but waitlist mode is free) |

### Pro Tier ($29/mo)
| Capability | Limit | Enforcement Point |
|------------|-------|-------------------|
| Forms | Unlimited | `usePlanLimits.ts:36` |
| Submissions/month | 5,000 | `usePlanLimits.ts:39` (client-side only) |
| Members | 3 | `usePlanLimits.ts:40` |
| Modes | all 4 | `PLAN_FEATURES` |
| Support Inboxes | **0** | `usePlanLimits.ts:38` -- **BUG: contradicts pricing page** |

### Growth Tier ($59/mo)
| Capability | Limit | Enforcement Point |
|------------|-------|-------------------|
| Forms | Unlimited | `usePlanLimits.ts:43` |
| Submissions/month | 25,000 | `usePlanLimits.ts:48` |
| Members | 10 | `usePlanLimits.ts:49` |
| Support Inboxes | 1 | `usePlanLimits.ts:47` |
| API, Webhooks, Custom Domain, SLA, Analytics | Included | `FEATURE_REQUIRED_PLAN` |

### Business Tier ($99/mo)
| Capability | Limit | Enforcement Point |
|------------|-------|-------------------|
| Everything | Unlimited | `usePlanLimits.ts:51-57` |
| SSO, White Label, Workflows, AI | Included | `FEATURE_REQUIRED_PLAN` |

---

## 6. Auth & RBAC Audit

| Action | Who Can Do It | Enforcement |
|--------|---------------|-------------|
| View billing tab | Workspace owners | `Settings.tsx:216` (`isOwner` check for tab visibility) |
| Initiate checkout | Any authenticated user | `CheckoutButton.tsx:48` (checks user exists) |
| Manage billing portal | Any authenticated user | **No ownership check in edge function** |
| View subscription | Workspace members | RLS: `subscriptions_select_member` policy |
| Update subscription | Webhook (service role) or members | RLS: `subscriptions_update_member` policy |
| View usage | Workspace members | RLS: `usage_select` policy |

**Critical RBAC Gaps:**
1. `create-checkout` edge function does not verify workspace membership -- any JWT-authenticated user can create a checkout for any workspace
2. `create-portal-session` edge function does not verify workspace membership -- any JWT-authenticated user can access the billing portal for any workspace's Stripe customer
3. The billing tab is hidden from non-owners in the UI, but the edge functions are directly invocable

---

## 7. API Security Audit

### Stripe Webhook Security
| Check | Status | Evidence |
|-------|--------|----------|
| Signature verification | PASS | `stripe-webhook/index.ts:18-55` -- HMAC-SHA256 with timestamp |
| Timestamp tolerance | PASS | 5-minute window (line 34) |
| Constant-time comparison | **FAIL** | Line 54 uses `===` instead of `crypto.timingSafeEqual()` |
| CORS disabled | PASS | Returns 405 for OPTIONS (line 214) |
| Service role for DB ops | PASS | Uses SUPABASE_SERVICE_ROLE_KEY (line 14) |
| Idempotency | PARTIAL | Upsert on workspace_id (line 108) prevents duplicates for checkout, but no general idempotency key |

### Checkout Session Security
| Check | Status | Evidence |
|-------|--------|----------|
| User authentication | PASS | JWT verified via `supabase.auth.getUser()` (line 69-78) |
| Workspace authorization | **FAIL** | No membership check -- any user can checkout for any workspace |
| Price ID validation | **FAIL** | Client-provided `priceId` passed directly to Stripe API (line 150) |
| Existing subscription check | PASS | Checks Stripe for active subscriptions (line 133-143) |
| CORS | Permissive | `Access-Control-Allow-Origin: *` (line 17) |

### Portal Session Security
| Check | Status | Evidence |
|-------|--------|----------|
| User authentication | PASS | JWT verified (line 53-71) |
| Workspace authorization | **FAIL** | No membership check for workspace_id |
| Customer lookup | PASS | Looks up stripe_customer_id from DB (line 94-98) |

### Hardcoded Secrets
| Check | Status | Evidence |
|-------|--------|----------|
| No secrets in client code | PASS | Only env var names and comments reference secret keys |
| Secrets in edge functions | PASS | All via `Deno.env.get()` |
| Price IDs in code | WARN | Fallback price IDs hardcoded in `stripe.ts:43-58` and duplicated in `stripe-webhook:69-77` |

---

## 8. Edge Function / Serverless Audit

### create-checkout
| Aspect | Assessment |
|--------|------------|
| Auth | JWT only -- no workspace authorization |
| Input validation | Checks priceId and workspaceId are present, but does not validate priceId against allowed values |
| Error handling | Good -- returns appropriate HTTP status codes with JSON errors |
| Idempotency | Partial -- checks existing subscriptions but no request-level idempotency |
| Deployment | Manual via `supabase functions deploy` |

### stripe-webhook
| Aspect | Assessment |
|--------|------------|
| Auth | Stripe signature verification (HMAC-SHA256) |
| Event handling | 5 event types handled with individual handler functions |
| Error resilience | Returns 200 even on failures to prevent Stripe retry storms |
| Price mapping | Hardcoded price-to-plan map must be manually synced with client config |
| Deployment | Manual via `supabase functions deploy` |

### create-portal-session
| Aspect | Assessment |
|--------|------------|
| Auth | JWT only -- no workspace authorization |
| Input validation | Checks workspaceId is present |
| Error handling | Good |
| Deployment | Manual via `supabase functions deploy` |

---

## 9. Test Coverage Analysis

### Unit Tests Present
| Test File | Coverage | Quality |
|-----------|----------|---------|
| `src/test/lib/stripe.test.ts` | `resolvePlanTier`, `isPlanAtLeast`, `getPriceId`, `getPlanPrice`, `PLAN_FEATURES` | Good -- 26 test cases |
| `src/test/hooks/usePlanLimits.test.ts` | `getRequiredPlanForMode`, `isPlanAtLeast` gating | Good -- 11 test cases |
| `src/test/hooks/useSubscription.test.ts` | Hook behavior with mocked Supabase | Good -- 7 test cases including realtime |
| `src/test/hooks/useUsage.test.ts` | Usage RPC with mocked Supabase | Good -- 5 test cases |
| `src/test/components/FeatureGate.test.tsx` | Gating UI rendering | Good -- 6 test cases |

### Test Gaps
| Missing Test | Priority | Impact |
|--------------|----------|--------|
| CheckoutButton integration test | P1 | No test for checkout flow initiation |
| BillingPortal integration test | P1 | No test for portal session creation |
| Webhook handler unit tests | P0 | No test for signature verification or event handlers |
| Edge function integration tests | P0 | No test for create-checkout or create-portal-session |
| UsageDashboard rendering test | P2 | No test for usage display |
| SubscriptionStatus banner test | P2 | No test for past_due/canceled banners |
| End-to-end checkout flow | P1 | No automated e2e test |

### Test Quality Notes
- `stripe.test.ts:61-62` expects `"price_pro_monthly_placeholder"` but actual code uses real Stripe price IDs like `"price_1TAH5vP7upMiSmxcaxFeD3Rn"` -- **test will fail** against current code
- Tests use proper mocking patterns with `vi.hoisted`
- No tests for the `isOwnerBypass` behavior

---

## 10. Code Architecture & Quality

### Strengths
1. **Clean separation of concerns**: Plan config (`stripe.ts`), subscription state (`useSubscription`), limit logic (`usePlanLimits`), usage data (`useUsage`), UI components (FeatureGate, PaywallModal, etc.)
2. **Realtime subscription updates**: `useSubscription` listens for DB changes via Supabase Realtime, ensuring UI reflects webhook-driven subscription changes immediately
3. **React Query integration**: Subscription and usage data properly cached and invalidated
4. **Comprehensive feature gating map**: `PLAN_FEATURES` and `FEATURE_REQUIRED_PLAN` provide fine-grained control
5. **Well-structured edge functions**: Clean separation of Stripe API helpers, event handlers, and main request handler
6. **Internationalization**: All billing UI strings properly i18n'd via react-i18next

### Weaknesses
1. **Price ID duplication**: Price-to-plan mapping exists in both `src/lib/stripe.ts` (client) and `supabase/functions/stripe-webhook/index.ts` (server) -- must be manually kept in sync
2. **No Stripe SDK usage**: Edge functions use raw `fetch()` to Stripe API instead of the official Stripe SDK, losing type safety and utility
3. **Owner bypass defeats billing**: `isOwnerBypass` in `usePlanLimits.ts:93` allows workspace owners to bypass ALL limits and gates, which undermines the entire billing system
4. **Client-only enforcement**: All plan limits, feature gates, and usage checks are client-side only
5. **Inconsistent member limits**: `PLAN_FEATURES` says Pro has `"5_members"` (stripe.ts:92) but `PLAN_LIMITS` says `maxMembers: 3` (usePlanLimits.ts:40). Pricing page says "5 members" for Pro.

---

## 11. Error Handling & Resilience

### Payment Failures
| Scenario | Handling | Evidence |
|----------|----------|----------|
| Checkout session creation fails | Toast error shown | `CheckoutButton.tsx:80-86` |
| Stripe returns no URL | Error thrown | `CheckoutButton.tsx:77-78` |
| Invoice payment fails | Subscription set to `past_due` | `stripe-webhook:141-154` |
| Past due status | Warning banner shown | `SubscriptionStatus.tsx:21-23` |
| Canceled subscription | Warning banner + resubscribe CTA | `SubscriptionStatus.tsx:22-23` |
| Portal session fails | Toast error shown | `BillingPortal.tsx:65-73` |
| Stripe not configured | Graceful 503 + client-side check | `create-checkout:81-85`, `CheckoutButton.tsx:39-46` |

### Webhook Resilience
| Scenario | Handling | Concern |
|----------|----------|---------|
| Invalid signature | Returns 400 | Correct |
| Missing signature | Returns 400 | Correct |
| Processing error | Returns 200 (no retry) | **Risky** -- legitimate failures won't be retried by Stripe |
| Unknown event type | Logged and ignored | Correct |
| DB upsert fails | Error logged, 200 returned | Could cause subscription state desync |
| Secrets not configured | Returns 500 | Correct |

### Checkout Success Page
- Polls subscription via `useSubscription` + realtime
- Shows spinner while waiting for webhook to process
- Auto-redirects after 5-second countdown once plan is active
- Edge case: If webhook is delayed, user sees spinner indefinitely until subscription activates

---

## 12. Documentation Audit

| Document | File | Quality |
|----------|------|---------|
| Edge Functions Reference | `docs/edge-functions.md` | Excellent -- covers all 10 functions with auth, examples, secrets |
| API Security | `docs/api-security.md` | Excellent -- covers Stripe webhook auth, CORS, rate limiting |
| Secrets Checklist | `docs/secrets-checklist.md` | Good -- lists all required secrets with rotation procedures |
| Stripe Live Cutover | `scripts/stripe-live-cutover.sh` | Excellent -- step-by-step guide with verification steps |
| Launch Checklist | `docs/launch-checklist.md` | References billing verification |

**Documentation Gaps:**
- No billing architecture diagram showing the full data flow
- No runbook for handling subscription state desync
- No documentation on the `isOwnerBypass` behavior and its intended scope

---

## 13. Product Growth & Innovation

### Monetization
| Strategy | Status | Evidence |
|----------|--------|----------|
| 4-tier pricing model | Implemented | Free/Pro/Growth/Business |
| Annual discount (20%) | Implemented | `Pricing.tsx:200-203` |
| Promotion codes | Enabled | `create-checkout:156` (`allow_promotion_codes: "true"`) |
| Trial period | Not implemented | No `trial_period_days` in Stripe checkout params |
| Usage-based pricing | Not implemented | Fixed tier pricing only |

### Conversion Funnel
| Touchpoint | Status | Evidence |
|------------|--------|----------|
| Public pricing page | Implemented | `/pricing` with comparison table + FAQ |
| In-app upgrade prompts | Implemented | FeatureGate, PaywallModal, UpgradePrompt, UsageBanner |
| Usage limit warnings | Implemented | UsageBanner at 80% threshold |
| Navbar plan badge | Implemented | PlanBadge in Navbar |
| Billing portal access | Implemented | Settings -> Billing tab |
| Email on payment failure | Template exists | `payment_failed` template in send-email |

### Upsell Opportunities
| Opportunity | Status |
|-------------|--------|
| "Powered by FormForge" removal as upgrade incentive | Implemented (free plan only) |
| Feature preview behind blur overlay | Implemented (FeatureGate) |
| Usage dashboard showing plan comparison | Implemented (UsageDashboard) |
| Contextual upgrade buttons near gated features | Implemented (UpgradeButton) |
| In-checkout plan comparison | Not implemented |
| Downgrade friction (show what you'll lose) | Not implemented |

---

## 14. Issues Found

### P0 -- Critical (Must Fix Before Production)

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | **No workspace authorization in create-checkout** -- any authenticated user can initiate checkout for any workspace | Security/AuthZ | HIGH | `supabase/functions/create-checkout/index.ts` | 89-95 | Attacker can create subscriptions billed to victim's workspace |
| 2 | **No workspace authorization in create-portal-session** -- any authenticated user can access billing portal for any workspace | Security/AuthZ | HIGH | `supabase/functions/create-portal-session/index.ts` | 80-84 | Attacker can view/modify payment methods and cancel subscriptions |
| 3 | **No server-side enforcement of usage limits** -- submission limits are client-side only, public INSERT endpoints have no guards | Security/Billing | HIGH | `src/hooks/usePlanLimits.ts` | 108-111 | Free users can receive unlimited submissions; no revenue protection |
| 4 | **canAcceptSubmission() never called** -- function exists but is unused in any public form submission flow | Logic/Billing | HIGH | `src/hooks/usePlanLimits.ts` | 108 | Usage limits have zero effect even on client side |
| 5 | **No server-side price ID validation** -- client-provided priceId is passed directly to Stripe without checking against allowed values | Security/Input | HIGH | `supabase/functions/create-checkout/index.ts` | 150 | Attacker could potentially use arbitrary price IDs |

### P1 -- High (Fix Before GA)

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 6 | **Non-constant-time signature comparison** -- webhook signature uses `===` instead of timing-safe comparison | Security/Crypto | HIGH | `supabase/functions/stripe-webhook/index.ts` | 54 | Theoretical timing attack on webhook signature |
| 7 | **isOwnerBypass defeats billing** -- workspace owners bypass ALL plan limits and feature gates | Logic/Billing | HIGH | `src/hooks/usePlanLimits.ts` | 93 | Owners pay for free; testing backdoor in production |
| 8 | **Pro plan member limit mismatch** -- PLAN_FEATURES says "5_members", PLAN_LIMITS says maxMembers:3, Pricing page says "5 members" | Data/Consistency | HIGH | `src/lib/stripe.ts:92`, `src/hooks/usePlanLimits.ts:40` | 92, 40 | Pro users get wrong member count |
| 9 | **Pro plan maxSupportInboxes: 0** -- Pro plan has support_mode in PLAN_FEATURES but maxSupportInboxes is 0 in PLAN_LIMITS | Data/Consistency | HIGH | `src/hooks/usePlanLimits.ts` | 38 | Pro users see support mode available but cannot create support inboxes |
| 10 | **Pricing page says Pro has Support Mode** -- comparison table shows support mode available for Pro, but getRequiredPlanForMode returns "growth" for support | Data/Consistency | HIGH | `src/pages/Pricing.tsx:165`, `src/hooks/usePlanLimits.ts:79` | 165, 79 | Misleading pricing claims |
| 11 | **Price-to-plan mapping duplicated** -- client and webhook have separate mappings that must stay in sync | Maintainability | MEDIUM | `src/lib/stripe.ts:41-63`, `supabase/functions/stripe-webhook/index.ts:69-77` | Multiple | Plan resolution could diverge after price changes |
| 12 | **Webhook returns 200 on processing errors** -- Stripe won't retry legitimate failures | Resilience | MEDIUM | `supabase/functions/stripe-webhook/index.ts` | 276 | Subscription state desync on transient DB failures |
| 13 | **No edge function plan-tier checks** -- AI, workflow, webhook edge functions don't verify caller's plan tier | Security/AuthZ | MEDIUM | Multiple edge functions | N/A | Users can call paid features from DevTools bypassing client gates |
| 14 | **stripe.test.ts uses stale placeholder IDs** -- test expects "price_pro_monthly_placeholder" but code has real Stripe IDs | Test/Quality | HIGH | `src/test/lib/stripe.test.ts` | 61 | Test suite will fail |

### P2 -- Medium (Fix Post-Launch)

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 15 | **CORS wildcard on create-checkout** -- `Access-Control-Allow-Origin: *` allows any origin | Security/CORS | LOW | `supabase/functions/create-checkout/index.ts` | 17 | Low risk since JWT is required, but should restrict to app domain |
| 16 | **No trial period** -- Stripe supports trial_period_days but it's not used | Product/Growth | LOW | `supabase/functions/create-checkout/index.ts` | 147-157 | Lower conversion rate without trials |
| 17 | **No webhook endpoint for create-checkout and create-portal** -- these are not in the CI/CD deployment config | DevOps | LOW | N/A | N/A | Manual deployment risk |
| 18 | **No Stripe SDK** -- raw fetch to Stripe API loses type safety | Code Quality | LOW | Multiple edge functions | N/A | Harder to maintain, no automatic error parsing |
| 19 | **UsageDashboard shows Pro members as 3** -- matches PLAN_LIMITS but contradicts pricing page | UI/Consistency | MEDIUM | `src/components/upgrade/UsageDashboard.tsx` | 58 | User sees inconsistent limits |
| 20 | **Checkout success page could spin indefinitely** -- if webhook is severely delayed, no timeout fallback | UX | LOW | `src/pages/CheckoutSuccess.tsx` | 19-32 | Poor UX on webhook delay |

---

## 15. Recommended Fix Path

### Phase 1: Critical Security (P0) -- Before Any Real Payments

1. **Add workspace authorization to edge functions** (Issues #1, #2):
   - In both `create-checkout` and `create-portal-session`, after JWT auth, verify the user is a member (or owner) of the requested workspace using a Supabase query:
   ```typescript
   const { data: member } = await supabase
     .from("workspace_members")
     .select("role")
     .eq("user_id", user.id)
     .eq("workspace_id", workspaceId)
     .maybeSingle();
   if (!member) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, ... });
   ```
   For billing specifically, consider restricting to owners only (`member.role === 'owner'`).

2. **Add server-side price ID validation** (Issue #5):
   - Create an allowlist of valid price IDs in the edge function and validate before sending to Stripe:
   ```typescript
   const VALID_PRICE_IDS = new Set([...Object.values(priceMap)]);
   if (!VALID_PRICE_IDS.has(priceId)) return new Response(..., { status: 400 });
   ```

3. **Add server-side submission limit enforcement** (Issues #3, #4):
   - Create a PostgreSQL function or trigger that checks usage limits before allowing INSERT on submissions, waitlist_entries, feedback_responses, and tickets tables
   - Alternatively, add a BEFORE INSERT trigger that checks the workspace's subscription plan and current usage count, returning an error if over limit

### Phase 2: High Priority (P1) -- Before GA

4. **Fix timing-safe comparison** (Issue #6): Replace `===` with a constant-time comparison using `crypto.subtle` or a simple byte-by-byte comparison with accumulator.

5. **Remove isOwnerBypass** (Issue #7): Remove or feature-flag this behind a `DEV_MODE` environment variable that is never set in production.

6. **Fix member limit inconsistency** (Issue #8): Change `usePlanLimits.ts` Pro `maxMembers` from 3 to 5 to match pricing page and PLAN_FEATURES.

7. **Fix support mode inconsistency** (Issues #9, #10): Either:
   - Add support mode to Pro plan (change `getRequiredPlanForMode("support")` to return `"pro"` and set `maxSupportInboxes` to a non-zero value), OR
   - Update the pricing page comparison table to show support mode as Growth+ only

8. **Fix stale test** (Issue #14): Update `stripe.test.ts` to use the actual price IDs or mock the env var resolution.

9. **Add webhook error retry logic** (Issue #12): Return 500 for transient DB errors so Stripe will retry, and return 200 only for permanent errors or success.

10. **Add plan-tier checks to edge functions** (Issue #13): Edge functions for AI, webhooks, workflows should verify the workspace's subscription plan before processing.

### Phase 3: Improvements (P2) -- Post-Launch

11. Restrict CORS on billing edge functions to the app's production domain
12. Add Stripe trial period support
13. Consider using the official Stripe SDK for Deno
14. Add a timeout/fallback on the checkout success page
15. Centralize price-to-plan mapping in a shared module or database table
