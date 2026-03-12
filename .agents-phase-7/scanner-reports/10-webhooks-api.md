# Scan Report: Webhooks & API
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Components
- `src/components/webhooks/WebhookManager.tsx` — Webhook list/CRUD: create, update, delete, toggle active, delivery log
- `src/components/webhooks/WebhookForm.tsx` — URL validation, event selection, secret generation, test webhook
- `src/components/webhooks/DeliveryLog.tsx` — Last 50 deliveries with status, request/response payloads, retry
- `src/components/api/ApiKeyManager.tsx` — API key generation (ff_ prefix), revocation, last_used display
- `src/components/api/ApiDocs.tsx` — REST API documentation (6 endpoints, cURL examples)

### Hooks
- `src/hooks/useWebhooks.ts` — Webhook CRUD + deliveries fetch + realtime (* all events)
- `src/hooks/useApiKeys.ts` — API key generation (SHA-256 hash), revocation

### Database Tables
- `webhooks` — RLS: workspace member CRUD, service role full. Triggers: none. Realtime: yes
- `webhook_deliveries` — RLS: member read (via webhook join), service role insert/update. Realtime: yes
- `api_keys` — RLS: workspace member read/insert/update. Triggers: none. Realtime: no

### Edge Functions
- `dispatch-webhook` — Delivers payloads with HMAC-SHA256 signing, retry logic (1/5/30 min), SSRF protection
- `api-v1` — REST API: X-API-Key auth, 100 req/min rate limit, 6 endpoints (forms, submissions, waitlist)

### Lib
- `src/lib/webhookEvents.ts` — 6 event types + payload builders + dispatchWebhook() fire-and-forget

### Routes
- `/settings?tab=webhooks` — Protected, WebhookManager
- `/settings?tab=api` — Protected, ApiKeyManager + ApiDocs

## 2. End-to-End Flow Status

- **Create webhook → test → receive deliveries**: WORKS — WebhookForm creates, test triggers dispatch-webhook
- **Event dispatch on submission/waitlist/feedback/ticket**: WORKS — dispatchWebhook called from all public form pages
- **Delivery logging with retry**: WORKS — dispatch-webhook logs attempts, schedules retries on failure
- **HMAC signature verification**: WORKS — X-FormForge-Signature header with SHA-256 HMAC
- **SSRF protection**: WORKS — blocks private IPs, localhost, internal domains (HTTPS only)
- **API key generation**: WORKS — crypto random ff_ key, SHA-256 hash stored, raw shown once
- **API key authentication**: WORKS — api-v1 hashes X-API-Key header, matches against api_keys table
- **REST API endpoints**: WORKS — GET/POST forms, submissions, waitlist with pagination
- **Webhook realtime updates**: WORKS — channel watches * events on webhooks table
- **Retry failed delivery**: WORKS — DeliveryLog retry button re-invokes dispatch-webhook

## 3. Business Tier Mapping

| Tier | Access | Limit | Enforced |
|------|--------|-------|----------|
| Free | No webhooks/API | — | YES — FeatureGate(requiredPlan="growth") |
| Pro | No webhooks/API | — | YES — FeatureGate |
| Growth | Full webhooks + API | 100 req/min API | YES — FeatureGate + edge function rate limit |
| Business | Same | Same | YES |

## 4. Cross-Dependencies

- **Depends on**: Auth (01), Plan Limits (04), Forms (05) — events dispatched from form submissions
- **Depended on by**: Workflows (15) — FIRE_WEBHOOK action type
- **Shared files**: `webhookEvents.ts` used by FormRenderer, WaitlistLandingPage, FeedbackSurveyPage, SupportSubmitPage

## 5. i18n Status

- t() coverage: ALL strings wrapped (webhooks.*, api.*)
- Hebrew translations: PARTIAL — some newer webhook/API keys may be missing from he.json
- RTL layout: CORRECT

## 6. Parallelism Eligibility

- Independent: YES (after Batch 1 complete)
- Conflicts with: None

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- **Webhook secret stored plaintext**: Secrets stored unencrypted in webhooks table. Should be hashed like API keys. File: `src/components/webhooks/WebhookForm.tsx`, `supabase/migrations/016_webhooks.sql`

### P2 — Medium
- **Test webhook uses no-cors mode**: Won't detect CORS errors from customer endpoints. File: `src/components/webhooks/WebhookForm.tsx`
- **Delivery log limited to 50**: Older deliveries not visible, no pagination. File: `src/hooks/useWebhooks.ts`
- **No delivery log realtime**: DeliveryLog doesn't subscribe to webhook_deliveries changes. File: `src/components/webhooks/DeliveryLog.tsx`
- **API key prefix truncation**: Only 11 chars (ff_ + 8) for identification — could be ambiguous. File: `src/hooks/useApiKeys.ts`

## 8. Recommended Fix Path

1. Hash webhook secrets in database (like API keys) — requires migration + edge function update
2. Add realtime subscription to DeliveryLog for live delivery status updates
3. Add pagination to delivery log (or "load more" button)
