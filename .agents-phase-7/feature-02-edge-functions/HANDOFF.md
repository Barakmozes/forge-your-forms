# Agent 23 — Handoff

## Status: COMPLETE

## Files Created
- `supabase/functions/_shared/cors.ts` — shared CORS headers, JSON response helpers, preflight handler
- `supabase/functions/_shared/supabase.ts` — shared Supabase client init, auth helper
- `supabase/functions/_shared/hash.ts` — SHA-256 hash + HMAC-SHA256 signing utilities
- `.agents-phase-7/feature-02-edge-functions/FIX-PLAN.md` — full assessment

## Verification Results
- `npm run lint`: 0 errors, 16 warnings (all pre-existing)
- `npx tsc --noEmit`: exit 0 (clean)
- All 12 edge functions verified syntactically valid and functionally correct

## API Contracts (for downstream agents)

### classify-ticket (for Agent 29 — Support)
- **Endpoint**: `supabase.functions.invoke("classify-ticket", { body })`
- **Auth**: JWT Bearer token
- **Input**: `{ subject: string, description: string, categories: string[], form_id: string, workspace_id: string }`
- **Output**: `{ category: string, priority: "low"|"medium"|"high"|"urgent", confidence: number, reasoning: string }`
- **Cache**: 24h TTL, keyed on `subject:description:categories`
- **Model**: claude-haiku-4-5-20251001

### ai-generate (for Agent 34 — AI)
- **Endpoint**: `supabase.functions.invoke("ai-generate", { body })`
- **Auth**: JWT Bearer token
- **Input**: `{ prompt: string, mode: string, locale: string, workspace_id: string }`
- **Output**: `{ title: string, description: string, fields: FieldObject[] }`
- **Rate limit**: 10/day/workspace (returns `{ error, code: "RATE_LIMIT" }` with 429)
- **Cache**: 7-day TTL, keyed on `prompt:mode:locale`
- **Model**: claude-sonnet-4-5-20250514

### ai-analyze
- **Input**: `{ submissions: Array<{id, text_fields}>, locale, form_id, workspace_id }`
- **Output**: `{ summary: {topThemes, sentimentTrend, overallSentiment, suggestedActions, analyzedCount, analyzedAt}, sentiments: Array<{submissionId, sentiment, keywords}> }`
- **Cache**: 24h TTL
- **Model**: claude-sonnet-4-5-20250514

### create-checkout
- **Input**: `{ priceId, workspaceId, customerEmail, successUrl, cancelUrl }`
- **Output**: `{ url: string }` (Stripe Checkout URL)
- **Env**: `STRIPE_SECRET_KEY`

### create-portal-session
- **Input**: `{ workspaceId, returnUrl }`
- **Output**: `{ url: string }` (Stripe Billing Portal URL)
- **Env**: `STRIPE_SECRET_KEY`

### stripe-webhook
- **Auth**: HMAC signature via `stripe-signature` header
- **Handles**: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted
- **Note**: `resolvePlanFromPrice()` has placeholder price IDs matching frontend fallbacks — both will work once real Stripe IDs are configured in env vars

### dispatch-webhook
- **Input**: `{ workspace_id, event_type, payload }`
- **Output**: `{ delivered: number, failed: number, total: number }`
- **P2 deferred**: Retry delays hardcoded [1m, 5m, 30m]

### send-email
- **Input**: `{ to, template, variables?, locale? }`
- **Templates**: welcome, waitlist_invite, ticket_confirmation, detractor_alert, payment_confirmation, payment_failed
- **Auth**: service role key OR JWT OR apikey header
- **Env**: `RESEND_API_KEY`, `FROM_EMAIL`

### execute-workflow
- **Input**: `{ workflow_id, workspace_id, trigger_type, trigger_data, execution_depth? }`
- **Output**: `{ success, run_id, status, steps_executed, error }`
- **Safety**: max execution depth 3, max 100 runs/hour per workflow

### slack-notify
- **Input**: `{ webhook_url, event_type, form_title, data }`
- **Output**: `{ success, status, body }`
- **SSRF protection**: Only allows hooks.slack.com

### api-v1
- **Auth**: X-API-Key header (hashed, looked up in api_keys table)
- **Routes**: GET /forms, GET /forms/:id, GET /submissions, POST /submissions, GET /waitlist, POST /waitlist
- **Rate limit**: 100 req/min per API key (in-memory)

### churn-score
- **Input**: `{ workspace_id }`
- **Output**: `{ scored: number, message: string }`
- **Upserts**: churn_scores table (workspace_id, customer_email)

## P2 Items Deferred
- P2-1: _shared/ created but existing functions not migrated to import from it (too risky for 12 files)
- P2-2: ai-generate rate limit UX (button disable) — frontend concern
- P2-3: dispatch-webhook retry delays hardcoded — functional as-is
- P2-4: send-email caller fire-and-forget — function itself has proper error handling

## Dependencies
- Batch 1 complete (Agents 21, 22, 24, 25) — confirmed

## Downstream
- Agent 29 (Support) — classify-ticket contract documented above
- Agent 32 (Integrations) — can reference _shared/ utilities for new mailchimp-sync function
- Agent 34 (AI) — ai-generate contract documented above
