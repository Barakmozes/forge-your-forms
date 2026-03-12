# Scan Report: Edge Functions (All 12)
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Edge Functions (12 total)

| # | Function | Purpose | External API | Auth |
|---|----------|---------|-------------|------|
| 1 | `ai-analyze` | Submission sentiment/theme analysis | Anthropic Claude | JWT |
| 2 | `ai-generate` | Form fields from natural language | Anthropic Claude | JWT |
| 3 | `api-v1` | REST API for Growth+ customers | None | X-API-Key |
| 4 | `churn-score` | Customer risk scoring | None | JWT |
| 5 | `classify-ticket` | AI ticket category/priority | Anthropic Claude | JWT |
| 6 | `create-checkout` | Stripe Checkout session | Stripe | JWT |
| 7 | `create-portal-session` | Stripe Billing Portal | Stripe | JWT |
| 8 | `dispatch-webhook` | Webhook delivery + retry | Customer URLs | None (internal) |
| 9 | `execute-workflow` | Workflow condition eval + actions | Internal edge fns | None (internal) |
| 10 | `send-email` | Transactional emails (6 templates) | Resend | JWT/service-role/apikey |
| 11 | `slack-notify` | Slack webhook notifications | Slack | None (validates URL) |
| 12 | `stripe-webhook` | Stripe event → subscription sync | Stripe | HMAC signature |

### Database Tables Accessed by Edge Functions
- `ai_cache` — ai-analyze, ai-generate, classify-ticket (R/W)
- `api_keys` — api-v1 (R)
- `churn_scores` — churn-score (R/W)
- `feedback_responses` — churn-score (R)
- `forms` — api-v1, churn-score, execute-workflow (R)
- `submissions` — api-v1, churn-score (R/W)
- `subscriptions` — create-checkout, create-portal-session, stripe-webhook (R/W)
- `tags`, `ticket_tags` — execute-workflow (R/W)
- `tickets` — api-v1, churn-score, execute-workflow (R/W)
- `waitlist_entries` — api-v1 (R/W)
- `webhook_deliveries` — dispatch-webhook (W)
- `webhooks` — dispatch-webhook (R)
- `workflow_runs` — execute-workflow (R/W)
- `workflows` — execute-workflow (R/W)

## 2. End-to-End Flow Status

- **AI form generation** (ai-generate → FormBuilder): WORKS — prompt → cache check → Claude API → return fields
- **AI submission analysis** (ai-analyze → FeedbackDashboard): WORKS — submissions → cache → Claude → themes/sentiment
- **Ticket classification** (classify-ticket → ?): PARTIAL — edge function works but **NOT called from frontend**
- **REST API** (api-v1 → external clients): WORKS — API key auth, CRUD for forms/submissions/waitlist
- **Churn scoring** (churn-score → AtRiskDashboard): WORKS — aggregates feedback/tickets/submissions per customer
- **Checkout** (create-checkout → Stripe): WORKS — creates session, returns URL
- **Billing portal** (create-portal-session → Stripe): WORKS — returns portal URL
- **Stripe webhook** (stripe-webhook → subscriptions): WORKS — HMAC verified, upserts subscription
- **Webhook dispatch** (dispatch-webhook → customer URLs): WORKS — HMAC signing, retry logic, delivery logging
- **Workflow execution** (execute-workflow → actions): WORKS — condition eval, 6 action types, run logging
- **Email sending** (send-email → Resend): WORKS — 6 templates, bilingual, HTML sanitization
- **Slack notify** (slack-notify → Slack): WORKS — Block Kit formatting, 6 event types

## 3. Business Tier Mapping

| Function | Required Tier | Enforced |
|----------|--------------|----------|
| ai-analyze | Business | YES — FeatureGate on AiSummaryWidget |
| ai-generate | Business | NO — AiFormGenerator has no FeatureGate ⚠️ |
| api-v1 | Growth | YES — FeatureGate on ApiKeyManager |
| churn-score | Business | YES — FeatureGate on AtRiskDashboard |
| classify-ticket | Business | N/A — not called from frontend |
| create-checkout | Any (paid plans) | YES — only paid plans have price IDs |
| create-portal-session | Any (paid) | YES — requires stripe_customer_id |
| dispatch-webhook | Growth | YES — FeatureGate on WebhookManager |
| execute-workflow | Business | YES — FeatureGate on Workflows page |
| send-email | Any | N/A — internal utility |
| slack-notify | Any | N/A — no plan gate on integrations ⚠️ |
| stripe-webhook | N/A | N/A — Stripe-initiated |

## 4. Cross-Dependencies

- **Depends on**: Supabase service role key, external APIs (Anthropic, Stripe, Resend, Slack)
- **Depended on by**: AI features (13), Billing (03), Webhooks (10), Workflows (15), Integrations (11), Onboarding (09)
- **Shared patterns**: CORS headers duplicated across all 12 functions, SHA-256 hash duplicated in 3 AI functions

## 5. i18n Status

- N/A — edge functions are server-side, no UI strings
- send-email has bilingual templates (EN + HE) with locale parameter

## 6. Parallelism Eligibility

- Independent: YES — each function is self-contained
- Conflicts with: None (no shared files between edge functions)

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- **classify-ticket not called from frontend**: Edge function exists and works but no component invokes it. Dead code. File: `supabase/functions/classify-ticket/index.ts`
- **ai-generate not plan-gated**: AiFormGenerator component has no FeatureGate — any free user can generate forms via AI. File: `src/components/ai/AiFormGenerator.tsx`
- **Stripe price IDs are placeholders**: `lib/stripe.ts` contains placeholder price IDs that must be replaced with real Stripe product IDs. File: `src/lib/stripe.ts`

### P2 — Medium
- **No _shared/ directory**: CORS headers, hash functions, Supabase client init duplicated across all 12 functions
- **ai-generate rate limit frontend UX**: Detects RATE_LIMIT error code but no button disable state
- **dispatch-webhook retry delays hardcoded**: 1min, 5min, 30min not configurable
- **send-email welcome fire-and-forget**: No error handling if Resend fails during onboarding

## 8. Recommended Fix Path

1. Wire classify-ticket into SupportSubmitPage.tsx or useTickets.ts on ticket creation
2. Add FeatureGate to AiFormGenerator (requiredPlan="business")
3. Replace placeholder Stripe price IDs in lib/stripe.ts with real values
4. Extract shared edge function utilities into _shared/ directory (optional, reduces duplication)
