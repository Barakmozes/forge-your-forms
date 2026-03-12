# Agent 23 — FIX-PLAN

## Assessment Summary

All 12 edge functions are **syntactically valid and functionally correct**. No code changes needed for basic operation. The issues are about shared code duplication (P2) and verification of cross-agent contracts (P1).

---

## Per-Function Assessment

| # | Function | Works | Shared Code Duplicated | Remaining Issues |
|---|----------|-------|----------------------|------------------|
| 1 | ai-analyze | YES | CORS, hash, supabase init | None |
| 2 | ai-generate | YES | CORS, hash, supabase init | P1-4: plan gate is frontend (Agent 34) |
| 3 | api-v1 | YES | CORS, hash (inline), supabase init | None |
| 4 | churn-score | YES | CORS, supabase init | N+1 query pattern (low priority) |
| 5 | classify-ticket | YES | CORS, hash, supabase init | P1-3: not wired from frontend (Agent 29) |
| 6 | create-checkout | YES | CORS, supabase init, stripe helper | P1-5: priceId comes from frontend |
| 7 | create-portal-session | YES | CORS, supabase init, stripe helper | None |
| 8 | dispatch-webhook | YES | CORS, supabase init | P2-3: hardcoded retry delays |
| 9 | execute-workflow | YES | supabase init (CORS inline) | None |
| 10 | send-email | YES | supabase init | P2-4: caller fire-and-forget |
| 11 | slack-notify | YES | CORS only | No plan gate on integrations |
| 12 | stripe-webhook | YES | supabase init | Placeholder price IDs in resolvePlanFromPrice |

---

## Shared Code Duplication Inventory

### CORS Headers (12/12 functions)
Identical in 10 functions, slightly different in api-v1 (adds `x-api-key`, `Access-Control-Allow-Methods`) and execute-workflow (inline in OPTIONS handler).

### SHA-256 Hash (3/12 functions: ai-analyze, ai-generate, classify-ticket)
Identical `hashInput()` function in all three. api-v1 has similar inline hash in `authenticateApiKey`.

### Supabase Client Init (11/12 functions, all except slack-notify)
Same pattern: `import createClient`, read env vars, create client.

### Stripe API Helper (2/12: create-checkout, create-portal-session)
Both have identical `stripePost()`. create-checkout also has `stripeGet()`.

---

## FIX-PLAN

### Prompt 23.1: Extract Shared Utilities to _shared/
1. Create `supabase/functions/_shared/cors.ts` — export `corsHeaders` object
2. Create `supabase/functions/_shared/supabase.ts` — export createClient helper
3. Create `supabase/functions/_shared/hash.ts` — export `hashInput()` SHA-256 utility
4. Do NOT update existing functions to import from _shared/ (too risky for 12 files, per prompt instructions)

### Prompt 23.2: Verify AI Edge Functions
1. Document classify-ticket API contract for Agent 29
   - Input: `{ subject, description, categories[], form_id, workspace_id }`
   - Output: `{ category, priority, confidence, reasoning }`
   - Auth: JWT (Bearer token)
2. Document ai-generate API contract
   - Rate limit: 10/day/workspace (checks ai_cache table)
   - Cache: 7-day TTL
   - Claude model: claude-sonnet-4-5-20250514

### Prompt 23.3: Verify Billing and Webhook Functions
1. create-checkout: reads priceId from body, passes to Stripe — correct
2. stripe-webhook: HMAC verification correct, subscription upsert correct
   - NOTE: `resolvePlanFromPrice()` has placeholder price IDs — must match src/lib/stripe.ts
3. dispatch-webhook: retry delays hardcoded [1m, 5m, 30m] — P2, defer
4. send-email: error handling exists (returns error response), fire-and-forget is a caller issue

### Prompt 23.4: Final Verification
1. Run lint and type check
2. Complete HANDOFF.md with all API contracts
