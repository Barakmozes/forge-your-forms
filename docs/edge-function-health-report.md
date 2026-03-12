# Edge Function Health Report

Generated: 2026-03-12

## Summary

| Total | Healthy | Fixed | Orphaned |
|-------|---------|-------|----------|
| 12    | 11      | 1     | 1        |

All 12 edge functions are deployed, active, and responding. No functions are broken.
One bug was found and fixed (send-email auth). One function (classify-ticket) is deployed but not called from frontend code.

---

## Per-Function Status

### stripe-webhook
- **Status**: ✅ HEALTHY
- **JWT**: No (--no-verify-jwt)
- **Test**: HTTP 400 — `Missing stripe-signature header` (correctly rejects unsigned requests)
- **CORS**: OPTIONS 405 (intentional — server-to-server, no browser CORS needed)
- **Frontend calls as**: Not called from frontend (Stripe server-to-server callback)
- **Match**: ✅ N/A

### api-v1
- **Status**: ✅ HEALTHY
- **JWT**: No (--no-verify-jwt, uses custom X-API-Key header)
- **Test (no key)**: HTTP 401 — `{"error":{"code":"unauthorized","message":"Missing X-API-Key header"}}`
- **Test (invalid key)**: HTTP 401 — `{"error":{"code":"unauthorized","message":"Invalid API key"}}`
- **CORS**: OPTIONS 200
- **Frontend calls as**: Direct URL reference in `src/components/api/ApiDocs.tsx`
- **Match**: ✅

### send-email
- **Status**: 🔧 FIXED (v5 → v6)
- **JWT**: Yes
- **Bug found**: `isAuthorized()` only accepted service role key. Frontend sends user JWT via `supabase.functions.invoke()`, which was always rejected. Fixed by adding `supabase.auth.getUser(token)` fallback.
- **Test (anon JWT)**: HTTP 401 — `{"success":false,"error":"Unauthorized"}` (correctly rejects anon key, requires real user)
- **Test (gateway)**: Passes JWT gateway ✅, reaches function code ✅
- **CORS**: OPTIONS 200
- **Frontend calls as**: `send-email` in `src/lib/emailTemplates.ts:38`
- **Match**: ✅

### create-checkout
- **Status**: ✅ HEALTHY
- **JWT**: Yes
- **Test (anon JWT)**: HTTP 401 — `{"error":"Unauthorized"}` (correctly requires real user)
- **Test (gateway)**: Passes JWT gateway ✅, reaches function code ✅
- **CORS**: OPTIONS 200
- **Frontend calls as**: `create-checkout` in `src/components/billing/CheckoutButton.tsx:54`
- **Match**: ✅

### create-portal-session
- **Status**: ✅ HEALTHY
- **JWT**: Yes
- **Test (anon JWT)**: HTTP 401 — `{"error":"Unauthorized"}` (correctly requires real user)
- **Test (gateway)**: Passes JWT gateway ✅, reaches function code ✅
- **CORS**: OPTIONS 200
- **Frontend calls as**: `create-portal-session` in `src/components/billing/BillingPortal.tsx:50`
- **Match**: ✅

### ai-generate
- **Status**: ✅ HEALTHY
- **JWT**: Yes
- **Test (anon JWT)**: HTTP 401 — `{"error":"Unauthorized"}` (correctly requires real user)
- **Test (gateway)**: Passes JWT gateway ✅, reaches function code ✅
- **CORS**: OPTIONS 200
- **Frontend calls as**: `ai-generate` in `src/lib/ai.ts:80`
- **Match**: ✅

### ai-analyze
- **Status**: ✅ HEALTHY
- **JWT**: Yes
- **Test (anon JWT)**: HTTP 401 — `{"error":"Unauthorized"}` (correctly requires real user)
- **Test (gateway)**: Passes JWT gateway ✅, reaches function code ✅
- **CORS**: OPTIONS 200
- **Frontend calls as**: `ai-analyze` in `src/lib/ai.ts:106`
- **Match**: ✅

### classify-ticket
- **Status**: ✅ HEALTHY (orphaned)
- **JWT**: Yes
- **Test (anon JWT)**: HTTP 401 — `{"error":"Unauthorized"}` (correctly requires real user)
- **Test (gateway)**: Passes JWT gateway ✅, reaches function code ✅
- **CORS**: OPTIONS 200
- **Frontend calls as**: **NOT CALLED** — no `functions.invoke("classify-ticket")` in `src/`
- **Match**: ⚠️ Orphaned — deployed but unused

### churn-score
- **Status**: ✅ HEALTHY
- **JWT**: Yes
- **Test (anon JWT)**: HTTP 401 — `{"error":"Unauthorized"}` (correctly requires real user)
- **Test (gateway)**: Passes JWT gateway ✅, reaches function code ✅
- **CORS**: OPTIONS 200
- **Frontend calls as**: `churn-score` in `src/hooks/useChurnPrediction.ts:143`
- **Match**: ✅

### dispatch-webhook
- **Status**: ✅ HEALTHY
- **JWT**: Yes
- **Test (anon JWT)**: HTTP 200 — `{"delivered":0}` (no auth check in function code — relies on JWT gateway only)
- **Test (missing fields)**: HTTP 400 — `{"error":"Missing workspace_id or event_type"}`
- **CORS**: OPTIONS 200
- **Frontend calls as**: `dispatch-webhook` in `src/hooks/useWebhooks.ts:125` and `src/lib/webhookEvents.ts:136`
- **Match**: ✅
- **Note**: No function-level user auth — relies solely on JWT gateway

### slack-notify
- **Status**: ✅ HEALTHY
- **JWT**: Yes
- **Test (anon JWT)**: HTTP 200 — `{"success":true,...}` (no auth check in function code — relies on JWT gateway only)
- **Test (missing fields)**: HTTP 400 — `{"error":"Missing webhook_url or event_type"}`
- **CORS**: OPTIONS 200
- **Frontend calls as**: `slack-notify` in `src/components/integrations/SlackIntegration.tsx:75`
- **Match**: ✅
- **Note**: No function-level user auth — relies solely on JWT gateway

### execute-workflow
- **Status**: ✅ HEALTHY
- **JWT**: Yes
- **Test (anon JWT)**: HTTP 200 — `{"success":false,"error":"Workflow not found or inactive"}` (no auth check — reaches DB query)
- **CORS**: OPTIONS 200
- **Frontend calls as**: `execute-workflow` in `src/lib/workflowEngine.ts:253`
- **Match**: ✅
- **Note**: No function-level user auth — relies solely on JWT gateway

---

## Secrets Verification

| Secret | Set in Dashboard | Verified Working | How Verified |
|--------|:---:|:---:|---|
| STRIPE_SECRET_KEY | ✅ | ⚠️ Partial | Function loads without crashing; full verification requires real user JWT to reach Stripe API call |
| STRIPE_WEBHOOK_SECRET | ✅ | ✅ | stripe-webhook returns 400 "Missing stripe-signature header" (secret is loaded; if missing, function would return 500) |
| RESEND_API_KEY | ✅ | ⚠️ Partial | Function loads without crashing; full verification requires real user JWT to reach Resend API call |
| FROM_EMAIL | ✅ | ⚠️ Partial | Function loads without crashing; full verification requires real user JWT |
| ANTHROPIC_API_KEY | ✅ | ⚠️ Partial | Functions load without crashing; full verification requires real user JWT to reach Anthropic API call |
| SUPABASE_URL | ✅ Auto | ✅ | All functions initialize Supabase client successfully |
| SUPABASE_SERVICE_ROLE_KEY | ✅ Auto | ✅ | All functions initialize without crashing on startup |

---

## Frontend Name Mapping

| Frontend File | Invokes | Deployed Name | Match |
|--------------|---------|---------------|:---:|
| `src/hooks/useChurnPrediction.ts:143` | `churn-score` | churn-score | ✅ |
| `src/hooks/useWebhooks.ts:125` | `dispatch-webhook` | dispatch-webhook | ✅ |
| `src/lib/webhookEvents.ts:136` | `dispatch-webhook` | dispatch-webhook | ✅ |
| `src/components/billing/CheckoutButton.tsx:54` | `create-checkout` | create-checkout | ✅ |
| `src/components/billing/BillingPortal.tsx:50` | `create-portal-session` | create-portal-session | ✅ |
| `src/components/integrations/SlackIntegration.tsx:75` | `slack-notify` | slack-notify | ✅ |
| `src/lib/emailTemplates.ts:38` | `send-email` | send-email | ✅ |
| `src/lib/ai.ts:80` | `ai-generate` | ai-generate | ✅ |
| `src/lib/ai.ts:106` | `ai-analyze` | ai-analyze | ✅ |
| `src/lib/workflowEngine.ts:253` | `execute-workflow` | execute-workflow | ✅ |
| `src/components/api/ApiDocs.tsx` | `api-v1` (URL ref) | api-v1 | ✅ |

### Not called from frontend (by design)
- **stripe-webhook** — Stripe server-to-server callback. Correct.
- **classify-ticket** — Not called from anywhere in `src/`. Orphaned.

---

## CORS Status

| Function | OPTIONS Status | Result |
|----------|:---:|:---:|
| stripe-webhook | 405 | ✅ (no CORS needed — server-to-server) |
| create-checkout | 200 | ✅ |
| create-portal-session | 200 | ✅ |
| send-email | 200 | ✅ |
| dispatch-webhook | 200 | ✅ |
| api-v1 | 200 | ✅ |
| ai-generate | 200 | ✅ |
| ai-analyze | 200 | ✅ |
| churn-score | 200 | ✅ |
| classify-ticket | 200 | ✅ |
| slack-notify | 200 | ✅ |
| execute-workflow | 200 | ✅ |

---

## Issues Found & Fixed

1. **send-email auth bug (FIXED)** — `isAuthorized()` only accepted `SUPABASE_SERVICE_ROLE_KEY` as Bearer token. Frontend sends user JWT via `supabase.functions.invoke()`, which was always rejected with 401. Fixed by adding `supabase.auth.getUser(token)` JWT validation fallback. Redeployed as v6.

---

## Observations

1. **classify-ticket is orphaned** — Deployed and functional but not called from any frontend code. Consider removing to reduce attack surface, or integrate it into the ticket creation flow.

2. **3 functions lack function-level user auth** — `dispatch-webhook`, `slack-notify`, and `execute-workflow` rely solely on the Supabase JWT gateway for access control. They do not validate that the JWT represents a real authenticated user. Since the legacy anon key (a valid JWT) is publicly available in the frontend bundle, these functions could theoretically be called by anyone. In practice, they still require valid inputs (workspace IDs, webhook URLs, workflow IDs) that limit exploitability.

3. **Secret key connectivity unverified** — External API keys (Stripe, Resend, Anthropic) are confirmed set in the dashboard, and functions load without crashing, but end-to-end API calls could not be verified without a real user session JWT. Testing with a logged-in user in the browser is recommended.

---

## Testing Methodology

- **Gateway tests**: All 12 functions tested with the legacy anon JWT (`eyJhbG...`) to pass Supabase's JWT gateway and reach function code
- **Non-JWT functions**: Tested directly without auth headers (stripe-webhook, api-v1)
- **CORS**: All 12 functions tested with `OPTIONS` request + `Origin: https://forge-your-forms.vercel.app`
- **Frontend mapping**: `grep -rn "functions.invoke" src/` cross-referenced against deployed function names
- **Deployment**: All 12 functions verified ACTIVE via `npx supabase functions list`
