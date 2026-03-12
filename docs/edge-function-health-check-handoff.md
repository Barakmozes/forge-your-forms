# Edge Function Health Check — Handoff Report

Generated: 2026-03-12
Project: rsuolemihuqjvrcpqjpa
Supabase URL: https://rsuolemihuqjvrcpqjpa.supabase.co

---

## DEPLOYMENT STATUS

All 12 functions are deployed and ACTIVE (verified via `npx supabase functions list`):

| Function | Status | Version |
|----------|--------|---------|
| stripe-webhook | ACTIVE | 5 |
| api-v1 | ACTIVE | 5 |
| send-email | ACTIVE | 6 (redeployed with fix) |
| dispatch-webhook | ACTIVE | 5 |
| create-checkout | ACTIVE | 5 |
| create-portal-session | ACTIVE | 5 |
| ai-generate | ACTIVE | 5 |
| ai-analyze | ACTIVE | 5 |
| churn-score | ACTIVE | 5 |
| classify-ticket | ACTIVE | 5 |
| slack-notify | ACTIVE | 5 |
| execute-workflow | ACTIVE | 5 |

---

## COMPLETED TESTS

### Non-JWT Functions (fully tested)

- **stripe-webhook**: HTTP 400 — PASS — Returns `Missing stripe-signature header` (plain text). Correct behavior: rejects unsigned requests at function level. STRIPE_WEBHOOK_SECRET is configured and function checks it.
- **api-v1 (no key)**: HTTP 401 — PASS — Returns `{"error":{"code":"unauthorized","message":"Missing X-API-Key header"}}`
- **api-v1 (invalid key)**: HTTP 401 — PASS — Returns `{"error":{"code":"unauthorized","message":"Invalid API key"}}`

### JWT Functions (gateway-level tests only)

All JWT-protected functions were tested with the Supabase publishable key (`sb_publishable__fCekyO4cid-4yGmmh0UYw_Hrk47xFs`). This key is NOT a JWT, so Supabase's gateway rejects all requests with `{"code":401,"message":"Invalid JWT"}` before the function code runs. This confirms:
1. The function IS deployed and responding
2. JWT verification IS enabled (working as intended)
3. The gateway correctly rejects invalid tokens

| Function | HTTP Status | Response | Notes |
|----------|------------|----------|-------|
| create-checkout (no auth) | 401 | `{"code":401,"message":"Missing authorization header"}` | Correct |
| create-checkout (anon key) | 401 | `{"code":401,"message":"Invalid JWT"}` | Gateway rejection, expected |
| create-portal-session | 401 | `{"code":401,"message":"Invalid JWT"}` | Gateway rejection, expected |
| send-email | 401 | `{"code":401,"message":"Invalid JWT"}` | Gateway rejection, expected |
| dispatch-webhook | 401 | `{"code":401,"message":"Invalid JWT"}` | Gateway rejection, expected |
| ai-generate | 401 | `{"code":401,"message":"Invalid JWT"}` | Gateway rejection, expected |
| ai-analyze | 401 | `{"code":401,"message":"Invalid JWT"}` | Gateway rejection, expected |
| churn-score | 401 | `{"code":401,"message":"Invalid JWT"}` | Gateway rejection, expected |
| classify-ticket | 401 | `{"code":401,"message":"Invalid JWT"}` | Gateway rejection, expected |
| slack-notify | 401 | `{"code":401,"message":"Invalid JWT"}` | Gateway rejection, expected |
| execute-workflow | 401 | `{"code":401,"message":"Invalid JWT"}` | Gateway rejection, expected |

### CORS Tests (all completed)

| Function | OPTIONS Status | Pass/Fail |
|----------|---------------|-----------|
| stripe-webhook | 405 | PASS (intentional — Stripe is server-to-server, no CORS needed) |
| create-checkout | 200 | PASS |
| create-portal-session | 200 | PASS |
| send-email | 200 | PASS |
| dispatch-webhook | 200 | PASS |
| api-v1 | 200 | PASS |
| ai-generate | 200 | PASS |
| ai-analyze | 200 | PASS |
| churn-score | 200 | PASS |
| classify-ticket | 200 | PASS |
| slack-notify | 200 | PASS |
| execute-workflow | 200 | PASS |

---

## NOT YET TESTED (requires real user JWT)

The following tests could NOT be performed because we don't have a valid user session JWT. The `sb_publishable_` key format is rejected by Supabase's JWT gateway before reaching function code:

- **send-email**: Could not verify the auth fix works end-to-end (service role + JWT both accepted)
- **create-checkout**: Could not verify Stripe API key works (needs JWT to pass gateway, then function calls Stripe)
- **create-portal-session**: Could not verify Stripe portal creation (needs JWT + existing subscription)
- **ai-generate**: Could not verify ANTHROPIC_API_KEY works (needs JWT to pass gateway)
- **ai-analyze**: Could not verify ANTHROPIC_API_KEY works (needs JWT to pass gateway)
- **classify-ticket**: Could not verify ANTHROPIC_API_KEY works (needs JWT to pass gateway)
- **churn-score**: Could not verify scoring logic (needs JWT to pass gateway)
- **dispatch-webhook**: Could not verify webhook delivery (needs JWT to pass gateway)
- **slack-notify**: Could not verify Slack posting (needs JWT to pass gateway)
- **execute-workflow**: Could not verify workflow execution (needs JWT to pass gateway)

**To test these properly**, the continuation agent should either:
1. Use `supabase functions serve` locally (bypasses JWT gateway), OR
2. Obtain a real user JWT by signing in via the Supabase Auth API, OR
3. Test through the running app in a browser

---

## FIXED & REDEPLOYED

### send-email — Auth bug fixed and redeployed

**What was wrong:** The `isAuthorized()` function only accepted `SUPABASE_SERVICE_ROLE_KEY` as the Authorization bearer token or apikey header. When the frontend calls `supabase.functions.invoke("send-email", ...)`, the Supabase SDK sends the user's JWT — NOT the service role key. So every frontend-initiated email call would pass the gateway but fail the function's own auth check with 401 "Unauthorized".

**Callers affected:**
- `src/components/onboarding/OnboardingWizard.tsx:46` — sends welcome email on signup
- Any future code calling `sendEmail()` from `src/lib/emailTemplates.ts`

**What was fixed:**
1. Added `import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0"` and created a Supabase client
2. Made `isAuthorized()` async
3. Added JWT validation fallback: if service role key check fails, the function now calls `supabase.auth.getUser(token)` to validate user JWTs
4. Updated the call site to `await isAuthorized(req)`

**File:** `supabase/functions/send-email/index.ts`
**Redeployed:** Yes, version 6

---

## STILL BROKEN

No functions are currently crashing (500). All return appropriate error codes. However:

1. **Cannot verify secret connectivity** — We confirmed all secrets are set in the dashboard (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, FROM_EMAIL, ANTHROPIC_API_KEY), but we cannot verify they actually work from within the functions because the JWT gateway blocks our test requests. This needs real-user-session testing.

2. **classify-ticket** — This function is deployed but is NOT called from any frontend code (`grep -rn "classify-ticket" src/` returns zero results). It may be intended for internal use or future feature. Not broken, but orphaned.

---

## FRONTEND NAME MAPPING

Every `supabase.functions.invoke()` call in the codebase matches a deployed function name exactly.

| Frontend File | Calls | Deployed Name | Match |
|--------------|-------|---------------|-------|
| `src/hooks/useChurnPrediction.ts:143` | `churn-score` | churn-score | YES |
| `src/hooks/useWebhooks.ts:125` | `dispatch-webhook` | dispatch-webhook | YES |
| `src/lib/webhookEvents.ts:136` | `dispatch-webhook` | dispatch-webhook | YES |
| `src/components/billing/CheckoutButton.tsx:54` | `create-checkout` | create-checkout | YES |
| `src/components/billing/BillingPortal.tsx:50` | `create-portal-session` | create-portal-session | YES |
| `src/components/integrations/SlackIntegration.tsx:75` | `slack-notify` | slack-notify | YES |
| `src/lib/emailTemplates.ts:38` | `send-email` | send-email | YES |
| `src/lib/ai.ts:80` | `ai-generate` | ai-generate | YES |
| `src/lib/ai.ts:106` | `ai-analyze` | ai-analyze | YES |
| `src/lib/workflowEngine.ts:253` | `execute-workflow` | execute-workflow | YES |

### URL References (api-v1)
`src/components/api/ApiDocs.tsx` references `https://rsuolemihuqjvrcpqjpa.supabase.co/functions/v1/api-v1/...` — matches deployed function name.

### Not called from frontend
- `stripe-webhook` — called by Stripe (server-to-server), not frontend. Correct.
- `classify-ticket` — NOT called from anywhere in `src/`. Orphaned function.

---

## SECRETS STATUS

| Secret | Set in Dashboard | Verified Working | How Verified |
|--------|:---:|:---:|---|
| STRIPE_SECRET_KEY | YES | UNKNOWN | Cannot test — JWT gateway blocks. Needs real user session to call create-checkout. |
| STRIPE_WEBHOOK_SECRET | YES | PARTIAL | stripe-webhook returns 400 "Missing stripe-signature header" (not 500 "Webhook not configured"), confirming the secret IS loaded. Actual signature verification untested. |
| RESEND_API_KEY | YES | UNKNOWN | Cannot test — JWT gateway blocks send-email. |
| FROM_EMAIL | YES | UNKNOWN | Cannot test — JWT gateway blocks send-email. |
| ANTHROPIC_API_KEY | YES | UNKNOWN | Cannot test — JWT gateway blocks ai-generate. |
| SUPABASE_URL | AUTO | YES | Used by all functions for Supabase client creation. Functions respond (not crashing on init). |
| SUPABASE_SERVICE_ROLE_KEY | AUTO | YES | Used by all functions for admin client. Functions respond (not crashing on init). |

---

## NEXT STEP FOR CONTINUATION

### Where to pick up: Step 5 — Deep functional testing with real auth

The gateway-level health check is complete. All 12 functions are deployed, responding, and have correct CORS. The one code bug found (send-email auth) has been fixed and redeployed.

**What remains:**

1. **Test with real user JWT** — Sign in via Supabase Auth API to get a real JWT token, then re-run all JWT-protected function tests to verify:
   - send-email fix works (accepts user JWT now)
   - STRIPE_SECRET_KEY is accessible (create-checkout should return Stripe error like "No such price" for fake price IDs)
   - ANTHROPIC_API_KEY is accessible (ai-generate should return generated fields or Anthropic API error)
   - RESEND_API_KEY is accessible (send-email should send or return Resend API error)

2. **Write the final health report** at `docs/edge-function-health-report.md` with the full per-function status table (template provided in the original prompt's Step 7).

3. **Consider classify-ticket** — It's deployed but no frontend code calls it. Decide whether to keep it (for future use) or remove it.

### How to get a real JWT for testing:
```bash
# Sign in with email/password to get a session
curl -s -X POST "https://rsuolemihuqjvrcpqjpa.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"<test-user-email>","password":"<test-user-password>"}'
# Extract access_token from response and use as Bearer token
```

Then re-run each function test with `Authorization: Bearer <real_jwt>`.
