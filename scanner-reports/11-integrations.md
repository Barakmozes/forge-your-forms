# Feature 11: Integrations (Webhooks / API / Zapier / Slack / Mailchimp)

> Scanner Agent | Date: 2026-03-15
> Scan Dimensions: Touchpoints, E2E Flows, Cross-Dependencies, Parallelism, API Security, Edge Functions, Auth & RBAC, Code Architecture, Error Handling, Documentation, Product Growth, Issues

---

## 1. Touchpoints

### Frontend Components (8 files)
| File | Purpose |
|------|---------|
| `src/components/webhooks/WebhookManager.tsx` | CRUD UI for webhooks (list, create, edit, delete, toggle) |
| `src/components/webhooks/WebhookForm.tsx` | Webhook create/edit form with event selector, secret generation, URL validation |
| `src/components/webhooks/DeliveryLog.tsx` | Webhook delivery history table with retry support, payload inspection |
| `src/components/api/ApiKeyManager.tsx` | API key create, list, copy, revoke |
| `src/components/api/ApiDocs.tsx` | Inline REST API documentation with cURL examples |
| `src/components/integrations/IntegrationManager.tsx` | Grid of integration cards (Slack, Zapier, Mailchimp, ConvertKit) with form selector |
| `src/components/integrations/SlackIntegration.tsx` | Slack webhook URL config, event selection, test button |
| `src/components/integrations/ZapierIntegration.tsx` | Zapier setup guide (documentation-driven, leverages webhook infra) |
| `src/components/integrations/MailchimpIntegration.tsx` | Mailchimp API key input, audience list fetch, field mapping |

### Hooks (3 files)
| File | Purpose |
|------|---------|
| `src/hooks/useWebhooks.ts` | Webhooks + webhook_deliveries CRUD with realtime subscriptions |
| `src/hooks/useApiKeys.ts` | API key generation (SHA-256 hashed), revocation, listing |
| `src/hooks/useIntegrations.ts` | Integration settings CRUD (stored in `forms.settings.integrations` JSONB), Slack/Mailchimp dispatch helpers |

### Libraries (1 file)
| File | Purpose |
|------|---------|
| `src/lib/webhookEvents.ts` | Event type constants, payload builders, client-side `dispatchWebhook()` function |

### Edge Functions (4 files)
| File | Purpose |
|------|---------|
| `supabase/functions/dispatch-webhook/index.ts` | Server-side webhook delivery with HMAC signing, SSRF protection, retry scheduling |
| `supabase/functions/api-v1/index.ts` | Public REST API (forms, submissions, waitlist) with API key auth + rate limiting |
| `supabase/functions/slack-notify/index.ts` | Slack Block Kit message formatting + delivery via incoming webhook |
| `supabase/functions/mailchimp-sync/index.ts` | Mailchimp API proxy (add member, fetch lists) with JWT auth |

### Shared Utilities (2 files)
| File | Purpose |
|------|---------|
| `supabase/functions/_shared/hash.ts` | SHA-256 hash + HMAC-SHA256 signing helpers |
| `supabase/functions/_shared/cors.ts` | CORS headers + JSON response helpers |

### Database Migrations (2 files)
| File | Purpose |
|------|---------|
| `supabase/migrations/016_webhooks.sql` | `webhooks` + `webhook_deliveries` tables, RLS, indexes, realtime |
| `supabase/migrations/017_api_keys.sql` | `api_keys` table with hash-based storage, RLS, indexes |

### Integration Points in Public Pages (4 files)
| File | Integration |
|------|-------------|
| `src/components/FormRenderer.tsx:483-486` | `dispatchWebhook` + `dispatchSlackNotification` on submission |
| `src/components/waitlist/WaitlistLandingPage.tsx:154-162` | `dispatchWebhook` + `dispatchSlackNotification` + `syncToMailchimp` on signup |
| `src/components/feedback/FeedbackSurveyPage.tsx:275-282` | `dispatchWebhook` + `dispatchSlackNotification` on feedback response |
| `src/components/support/SupportSubmitPage.tsx:226-233` | `dispatchWebhook` + `dispatchSlackNotification` on ticket creation |

### Settings Page
| File | Purpose |
|------|---------|
| `src/pages/Settings.tsx` | Hosts Webhooks, API, and Integrations tabs (lines 223-333) |

---

## 2. E2E Flows

### Flow 1: Create Webhook
**Path**: Settings > Webhooks tab > Add Webhook > Fill form > Create
**Verdict**: PASS

1. User navigates to Settings > Webhooks tab
2. `WebhookManager` renders via `FeatureGate` (requires `growth` plan)
3. Clicking "Add Webhook" shows `WebhookForm`
4. Form validates URL (must be valid http/https), requires at least 1 event
5. Secret auto-generated via `crypto.getRandomValues(32 bytes)` -- hex encoded
6. `useWebhooks.createWebhook()` inserts to `webhooks` table with `workspace_id`
7. Realtime subscription updates the list automatically
8. Toast confirms success

**Gaps**: Secret is only shown on create, not on edit (correct UX). Webhook URL allows HTTP in the form (`WebhookForm.tsx:58`) but the edge function only delivers to HTTPS (`dispatch-webhook/index.ts:26`). This mismatch means a user could save an HTTP webhook that will silently fail on delivery.

### Flow 2: Test Webhook
**Path**: WebhookForm > Enter URL > Click Test
**Verdict**: PARTIAL PASS (P2)

1. `handleTestWebhook` in `WebhookForm.tsx:87-107` sends a test payload directly from browser
2. Uses `mode: "no-cors"` which means response details are invisible
3. No signature is sent with the test
4. Does NOT use the `dispatch-webhook` edge function

**Issues**:
- Test payload bypasses the server-side dispatch entirely
- No HMAC signature included in test, so consumer cannot verify
- `no-cors` mode means the test always appears to "succeed" even on failure
- Test fires from browser, not server -- CORS blocks most endpoints

### Flow 3: Webhook Delivery (Production)
**Path**: Public form submission > `dispatchWebhook()` > Edge Function > Target URL
**Verdict**: PASS

1. After form submission, `dispatchWebhook()` in `webhookEvents.ts:83-149` runs
2. Looks up form's `workspace_id`, then fetches active webhooks matching the event
3. Inserts `webhook_deliveries` records
4. Invokes `dispatch-webhook` edge function (fire-and-forget)
5. Edge function re-fetches webhooks, validates SSRF, signs payload with HMAC-SHA256, delivers via HTTPS
6. Records delivery result (status, response body, attempts, next_retry_at)
7. `DeliveryLog` component shows results via realtime subscription

**Note**: There is a double-fetch of webhooks -- once in the client-side `dispatchWebhook()` and again in the edge function. The client-side fetch is redundant since the edge function does its own lookup.

### Flow 4: Manage API Keys
**Path**: Settings > API tab > Generate Key > Copy > Use
**Verdict**: PASS

1. `ApiKeyManager` renders via `FeatureGate` (requires `growth` plan)
2. User clicks "Generate Key", enters name
3. `useApiKeys.createApiKey()` generates `ff_<uuid>` key
4. Raw key is SHA-256 hashed; only hash stored in DB
5. Raw key shown once in dialog with copy button + warning
6. API key listed with prefix (`ff_xxxxxxxx...`), created date, last used date
7. Revoke sets `revoked_at` timestamp, removes from list

### Flow 5: API Key Authentication (api-v1)
**Path**: External request > `X-API-Key` header > Edge function > Workspace-scoped response
**Verdict**: PASS

1. `api-v1` edge function receives request with `X-API-Key` header
2. Hashes the key with SHA-256
3. Looks up `key_hash` in `api_keys` table via service role client
4. Validates key is not revoked
5. Checks in-memory rate limit (100 req/min per key hash)
6. Returns workspace-scoped data with rate limit headers
7. Updates `last_used_at` (fire-and-forget)

### Flow 6: Zapier Setup
**Path**: Settings > Integrations > Select form > Zapier tab
**Verdict**: PASS (Documentation-only)

1. Zapier integration is documentation-driven
2. Provides step-by-step setup guide
3. Lists available triggers (submission, waitlist, feedback, ticket)
4. Toggle saves `enabled: true/false` to `forms.settings.integrations.zapier`
5. No actual Zapier API integration -- relies on webhooks infrastructure

**Note**: The `webhookUrl` prop is optional and never passed from `IntegrationManager.tsx:218`, so the "Your Webhook URL" section never renders.

### Flow 7: Slack Integration
**Path**: Settings > Integrations > Select form > Slack tab > Configure
**Verdict**: PASS

1. User enters Slack incoming webhook URL (validated: must start with `https://hooks.slack.com/`)
2. Optional channel name for display purposes
3. Select events to notify on (5 event types available)
4. Test button invokes `slack-notify` edge function with test payload
5. Save stores config in `forms.settings.integrations.slack` JSONB
6. On form events, `dispatchSlackNotification()` checks config and calls edge function
7. Edge function validates URL (SSRF: only hooks.slack.com), formats Block Kit message, delivers

### Flow 8: Mailchimp Integration
**Path**: Settings > Integrations > Select form > Mailchimp tab > Configure
**Verdict**: PASS with Security Concerns (see P0 below)

1. User enters Mailchimp API key
2. System extracts datacenter from key format (`key-usXX`)
3. Fetch Lists button calls `mailchimp-sync` edge function (`action: fetch_lists`)
4. User selects audience list, configures field mapping (email, name)
5. Save stores config in `forms.settings.integrations.mailchimp` JSONB
6. On waitlist signup, `syncToMailchimp()` reads config and calls edge function (`action: sync`)
7. Edge function proxies to Mailchimp API with SSRF protection (regex validates datacenter)

---

## 3. Cross-Dependencies

| Integration Component | Depends On |
|----------------------|------------|
| `WebhookManager` | `useWebhooks`, `FeatureGate`, `WebhookForm`, `DeliveryLog` |
| `dispatchWebhook()` | `supabase` client, `dispatch-webhook` edge function |
| `dispatch-webhook` edge function | `SUPABASE_SERVICE_ROLE_KEY`, `webhooks` table, `webhook_deliveries` table |
| `ApiKeyManager` | `useApiKeys`, `FeatureGate` |
| `api-v1` edge function | `SUPABASE_SERVICE_ROLE_KEY`, `api_keys` table, all data tables |
| `IntegrationManager` | `useIntegrations`, `FeatureGate`, form selector, 3 integration sub-components |
| `SlackIntegration` | `slack-notify` edge function, `useIntegrations` |
| `MailchimpIntegration` | `mailchimp-sync` edge function, `useIntegrations` |
| `ZapierIntegration` | `useIntegrations` (config toggle only) |
| Public page dispatch | `dispatchWebhook`, `dispatchSlackNotification`, `syncToMailchimp` |

### Plan Gating Dependencies
| Feature | Required Plan | Gate Component |
|---------|---------------|---------------|
| Webhooks | Growth | `FeatureGate feature="webhooks"` |
| REST API | Growth | `FeatureGate feature="api"` |
| Integrations (Slack/Zapier/Mailchimp) | Pro | `FeatureGate feature="integrations"` |

---

## 4. Parallelism Assessment

### Safe to Parallelize
- Webhook management UI and API key management UI are independent
- Slack, Zapier, Mailchimp integration tabs are independent (different form.settings keys)
- Webhook delivery and Slack notification are already dispatched independently

### Must Be Sequential
- API key creation must complete before using key in api-v1
- Webhook form validation before save
- Mailchimp list fetch before list selection

### Race Conditions
- **P2**: `useIntegrations.updateIntegration()` does a read-then-write on `forms.settings`. Two concurrent saves could overwrite each other. Mitigated by the read-before-write pattern (`src/hooks/useIntegrations.ts:126-138`) but not atomic.
- **P2**: `dispatchWebhook()` in `webhookEvents.ts` and `dispatch-webhook` edge function both independently fetch webhooks. Delivery records may be inserted twice (client + edge function) for the same event.

---

## 5. API Security Audit

### API Key Generation & Storage -- PASS
- Raw key format: `ff_<uuid_no_dashes>` (36 chars)
- Only SHA-256 hash stored in DB (`api_keys.key_hash`)
- Key prefix stored for display (`ff_xxxxxxxx`)
- Raw key shown once to user with copy button + warning banner
- **File**: `src/hooks/useApiKeys.ts:33-44`

### API Key Authentication -- PASS
- Hash-based lookup (constant-time DB query)
- Checks `revoked_at IS NULL`
- Rate limited: 100 req/min per key hash (in-memory)
- Updates `last_used_at` on use
- **File**: `supabase/functions/api-v1/index.ts:58-113`

### Webhook Signature Verification -- PASS
- HMAC-SHA256 with per-webhook secret
- Signature format: `sha256=<hex>`
- Sent in `X-FormForge-Signature` header
- Consumer verification guide in docs
- **File**: `supabase/functions/dispatch-webhook/index.ts:46-58`

### SSRF Protection -- PASS
- `dispatch-webhook`: Blocks localhost, private IPs, internal/local domains, non-HTTPS
- `slack-notify`: Only allows `hooks.slack.com`
- `mailchimp-sync`: Validates datacenter regex `^[a-z]{2}\d{1,2}$`
- **Files**: `dispatch-webhook/index.ts:22-42`, `slack-notify/index.ts:117-131`, `mailchimp-sync/index.ts:29-31`

### CORS -- ACCEPTABLE (with notes)
- All edge functions use `Access-Control-Allow-Origin: *`
- `api-v1` additionally allows `X-API-Key` in headers
- Acceptable for public API; `dispatch-webhook` and `slack-notify` should ideally be restricted but auth mitigates

### Webhook Secret Storage -- P1 ISSUE (see Issues)
- Webhook secrets stored as **plaintext** in `webhooks.secret` column (`016_webhooks.sql:12`)
- Any workspace member with SELECT access can read secrets
- Should be hashed or encrypted

### Mailchimp API Key Storage -- P0 ISSUE (see Issues)
- Mailchimp API key stored as **plaintext** in `forms.settings.integrations.mailchimp.api_key` JSONB
- Any workspace member can read it via `forms.settings` SELECT
- Passed in plaintext from browser to edge function on every sync
- **Files**: `src/hooks/useIntegrations.ts:26`, `src/components/integrations/MailchimpIntegration.tsx:78-79`

### Slack Webhook URL Storage -- P1 ISSUE
- Slack incoming webhook URL stored as plaintext in `forms.settings.integrations.slack.webhook_url`
- Webhook URLs are secrets -- anyone with the URL can post to the channel
- **File**: `src/hooks/useIntegrations.ts:14`

---

## 6. Edge Function / Serverless Audit

### dispatch-webhook
- **Auth**: None (no JWT or API key verification) -- relies on being "internal"
- **SSRF**: Comprehensive URL validation
- **Timeout**: 10s per delivery (`AbortSignal.timeout(10000)`)
- **Retry**: Schedules `next_retry_at` but NO cron/scheduler exists to process retries
- **Error handling**: Catches all errors, records in delivery log
- **P1**: No authentication means anyone who knows the function URL can trigger arbitrary webhook deliveries

### api-v1
- **Auth**: API key hash lookup -- solid
- **Rate limiting**: In-memory (resets on cold start) -- acceptable for MVP
- **Pagination**: Capped at 100 per page
- **Workspace scoping**: All queries filtered by `workspace_id` from key lookup
- **Endpoints**: GET/POST forms, submissions, waitlist (6 endpoints)
- **P2**: `_currentRateLimit` uses module-level mutable variable -- not safe under concurrent requests in single isolate (`api-v1/index.ts:125`)

### slack-notify
- **Auth**: None (no JWT verification)
- **SSRF**: Strict hostname validation (hooks.slack.com only)
- **Timeout**: 10s
- **P1**: No authentication -- anyone can invoke to send messages to any Slack webhook URL

### mailchimp-sync
- **Auth**: JWT verification via Supabase auth -- PASS
- **SSRF**: Datacenter regex validation
- **Timeout**: 15s
- **Actions**: `sync` (add member) and `fetch_lists`
- **P2**: API key passed in request body from browser, not stored server-side

---

## 7. Auth & RBAC Audit

### Webhook Management
| Operation | Policy | Check |
|-----------|--------|-------|
| SELECT | `webhooks_select_member` | `is_workspace_member(auth.uid(), workspace_id)` |
| INSERT | `webhooks_insert_member` | `is_workspace_member(auth.uid(), workspace_id)` |
| UPDATE | `webhooks_update_member` | `is_workspace_member(auth.uid(), workspace_id)` |
| DELETE | `webhooks_delete_member` | `is_workspace_member(auth.uid(), workspace_id)` |

**Issue**: All workspace members (including `viewer` role) can create/edit/delete webhooks. Should be restricted to `owner`/`editor`.

### API Key Management
| Operation | Policy | Check |
|-----------|--------|-------|
| SELECT | `api_keys_select_member` | `is_workspace_member(auth.uid(), workspace_id)` |
| INSERT | `api_keys_insert_owner` | `is_workspace_member(auth.uid(), workspace_id)` |
| UPDATE | `api_keys_update_owner` | `is_workspace_member(auth.uid(), workspace_id)` |
| DELETE | `api_keys_delete_owner` | `is_workspace_member(auth.uid(), workspace_id)` |

**Issue**: Despite policy names containing "owner", the actual check is `is_workspace_member` (any role). Migration 024 remediated roles but still uses member-level check, not owner-level. Viewers can create/revoke API keys.

### Integration Settings
- Stored in `forms.settings` JSONB -- governed by `forms` table RLS
- Forms UPDATE requires `editor` or `owner` role -- correct
- Forms SELECT allows any workspace member -- means viewers can read secrets

### Webhook Deliveries
| Operation | Policy | Check |
|-----------|--------|-------|
| SELECT | `webhook_deliveries_select_member` | Join through `webhooks` + `is_workspace_member` |
| INSERT | (dropped in 025) | Service role only now |
| UPDATE | (dropped in 025) | Service role only now |

Delivery INSERT/UPDATE policies were correctly dropped in migration 025 since the edge function uses service role.

---

## 8. Code Architecture & Quality

### Strengths
1. **Clean separation**: Hooks, components, edge functions, and lib utilities are well-separated
2. **Consistent patterns**: All hooks follow the same `useState` + `useEffect` + CRUD pattern
3. **Realtime subscriptions**: Both `webhooks` and `webhook_deliveries` have live updates
4. **Payload builders**: `webhookEvents.ts` provides typed payload builders for each event type
5. **Internationalization**: All UI strings use `useTranslation()` with i18n keys
6. **Feature gating**: Proper plan-based gates on Webhooks (Growth), API (Growth), Integrations (Pro)
7. **Shared CORS/Hash utilities**: `_shared/cors.ts` and `_shared/hash.ts` exist but are not used by all functions (see issues)

### Weaknesses
1. **Duplicate CORS definitions**: Each edge function defines its own CORS headers instead of importing from `_shared/cors.ts`
2. **Duplicate hash logic**: HMAC signing is implemented separately in `dispatch-webhook/index.ts:46-58` and `_shared/hash.ts:22-41`
3. **Client-side webhook dispatch redundancy**: `dispatchWebhook()` in `webhookEvents.ts` fetches webhooks and creates delivery records from the browser, then the edge function does the same server-side
4. **No TypeScript types for edge functions**: Deno runtime uses different type system
5. **Integration config not validated**: `useIntegrations.updateIntegration()` accepts any config shape without Zod validation
6. **`formId` prop unused**: `ZapierIntegration` and `MailchimpIntegration` receive `formId` but never use it
7. **`_currentRateLimit` global mutable**: `api-v1/index.ts:125` uses module-scope mutable state for rate limit headers -- not concurrency-safe

### Code Metrics
| Metric | Value |
|--------|-------|
| Total integration files | 18+ |
| Edge functions | 4 |
| Frontend components | 8 |
| Hooks | 3 |
| Database tables | 2 (webhooks, api_keys) + settings JSONB |
| Webhook events supported | 6 |
| API endpoints | 6 |
| Lines of code (approx) | ~2,200 |

---

## 9. Error Handling & Resilience

### Webhook Retry
- **Retry delays defined**: 1 min, 5 min, 30 min (`dispatch-webhook/index.ts:62-66`)
- **`next_retry_at` stored**: Written to `webhook_deliveries` on failure
- **P1: No retry processor exists**: The `next_retry_at` column is populated but nothing reads it. No cron job, no scheduled function, no background worker processes failed deliveries. Retries are effectively non-functional.
- **Manual retry**: `DeliveryLog` has a retry button that re-invokes `dispatch-webhook` -- this works but requires user action

### Webhook Delivery
- 10-second timeout per delivery
- Response body truncated to 1000 chars
- All errors caught and recorded in `webhook_deliveries`
- Fire-and-forget pattern prevents blocking main user flows

### API Error Handling
- Consistent error format: `{ error: { code, message } }`
- Rate limit exceeded returns 429 with `Retry-After` header
- All database errors caught and returned as 500

### Integration Dispatch
- All dispatch functions (`dispatchWebhook`, `dispatchSlackNotification`, `syncToMailchimp`) are fire-and-forget with `.catch(() => {})` -- silent failures
- No error logging or monitoring for failed dispatches
- No retry for Slack or Mailchimp failures

### Edge Function Resilience
- All functions have try/catch at the top level
- CORS preflight handled in all functions
- Timeout signals on external HTTP calls
- `mailchimp-sync` properly returns 502 for upstream failures

---

## 10. Documentation Audit

### Existing Documentation -- GOOD
| Document | Location | Quality |
|----------|----------|---------|
| API Security | `docs/api-security.md` | Comprehensive: covers auth flow, rate limiting, HMAC verification, SSRF, error format, CORS |
| Edge Functions Reference | `docs/edge-functions.md` | Complete reference for all 10 edge functions |
| API Docs (inline) | `src/components/api/ApiDocs.tsx` | Interactive in-app docs with cURL examples and response samples |
| Secrets Checklist | `docs/secrets-checklist.md` | Lists all required secrets and rotation procedures |
| Edge Function Health Report | `docs/edge-function-health-report.md` | Deployment verification results |

### Missing Documentation
- No webhook payload reference page for consumers (only inline in `api-security.md`)
- No Zapier integration guide beyond the in-app steps
- No Mailchimp troubleshooting guide
- No API changelog or versioning documentation
- Consumer-facing webhook docs not published externally

---

## 11. Product Growth & Innovation

### Current State
- **Solid foundation**: Webhooks + API keys + 3 third-party integrations cover core use cases
- **Plan gating**: Proper tiering (Growth for Webhooks/API, Pro for Integrations)
- **Expandable event system**: Adding new webhook events is straightforward (add to `WEBHOOK_EVENTS` constant)

### Growth Opportunities
1. **Zapier native app**: Currently docs-only; building a native Zapier app would eliminate manual webhook setup
2. **Webhook retry automation**: Implement the cron-based retry processor (infrastructure is 90% built)
3. **API v1 expansion**: Add feedback, tickets, and tag endpoints
4. **OAuth integrations**: Replace API key input for Slack/Mailchimp with proper OAuth flows
5. **Integration marketplace**: ConvertKit is defined but disabled -- framework supports adding more
6. **Webhook event expansion**: `FORM_CREATED` and `TICKET_RESOLVED` events defined but never dispatched
7. **API SDK/client libraries**: Generate TypeScript/Python clients from API docs
8. **Webhook request logging**: Full request/response inspection is already built in DeliveryLog

---

## 12. Issues Found

### P0 -- Critical

| # | Issue | File(s) | Description |
|---|-------|---------|-------------|
| P0-1 | **Mailchimp API key stored in plaintext** | `src/hooks/useIntegrations.ts:26`, `src/components/integrations/MailchimpIntegration.tsx:78` | Mailchimp API key is stored as plaintext in `forms.settings.integrations.mailchimp.api_key` JSONB. Any workspace member can read it via SELECT on forms table. Key is also passed in plaintext from browser to edge function. This key provides full Mailchimp account access. Should be encrypted at rest or stored server-side only. |

### P1 -- High

| # | Issue | File(s) | Description |
|---|-------|---------|-------------|
| P1-1 | **Webhook secrets stored in plaintext** | `supabase/migrations/016_webhooks.sql:12`, `src/hooks/useWebhooks.ts:16-21` | Webhook signing secrets are stored as plaintext `TEXT` in the `webhooks` table. Any workspace member with `SELECT` access can read them. Secrets should be hashed (consumers don't need to read them back) or the signing should be done entirely server-side without exposing the secret. |
| P1-2 | **Slack webhook URL stored in plaintext** | `src/hooks/useIntegrations.ts:14-15` | Slack incoming webhook URLs are stored unencrypted in `forms.settings`. These URLs are secrets -- anyone with the URL can post to the Slack channel. Should be encrypted or stored server-side. |
| P1-3 | **dispatch-webhook has no authentication** | `supabase/functions/dispatch-webhook/index.ts:137-232` | The `dispatch-webhook` edge function does not verify any auth token. Anyone who discovers the function URL can trigger webhook deliveries with arbitrary workspace IDs and payloads. Should require service role key or JWT. |
| P1-4 | **slack-notify has no authentication** | `supabase/functions/slack-notify/index.ts:101-161` | The `slack-notify` edge function does not verify JWT. Anyone can invoke it with any Slack webhook URL to send messages. SSRF protection limits to hooks.slack.com but does not prevent abuse. |
| P1-5 | **Webhook retry system is non-functional** | `supabase/functions/dispatch-webhook/index.ts:62-66,200-201` | `RETRY_DELAYS` and `next_retry_at` are defined and populated, but no scheduled job or cron function exists to process retries. Failed deliveries are never automatically retried. |
| P1-6 | **API key RBAC is viewer-accessible** | `supabase/migrations/024_rls_role_remediation.sql:471-484` | Despite policy names saying "owner", all 4 API key policies use `is_workspace_member()` which allows viewers to create, update, delete, and revoke API keys. Should check for `owner` or `editor` role. |
| P1-7 | **Webhook RBAC is viewer-accessible** | `supabase/migrations/016_webhooks.sql:65-86` | All webhook CRUD policies use `is_workspace_member()`. Viewers can create, edit, and delete webhooks. Should be restricted to `owner`/`editor`. |

### P2 -- Medium

| # | Issue | File(s) | Description |
|---|-------|---------|-------------|
| P2-1 | **Test webhook bypasses server dispatch** | `src/components/webhooks/WebhookForm.tsx:87-107` | The "Test" button sends a test request directly from the browser using `mode: "no-cors"`. This bypasses HMAC signing, SSRF validation, and delivery logging. Test always appears successful. Should use the `dispatch-webhook` edge function instead. |
| P2-2 | **HTTP webhooks silently fail** | `src/components/webhooks/WebhookForm.tsx:55-61` | URL validation accepts HTTP URLs, but `dispatch-webhook` only delivers to HTTPS. User can save an HTTP webhook that will never receive deliveries. Form should enforce HTTPS. |
| P2-3 | **FORM_CREATED and TICKET_RESOLVED webhook events never dispatched** | `src/lib/webhookEvents.ts:11,10` | Two events are defined (`form.created`, `support.ticket_resolved`) but never called with `dispatchWebhook()`. Ticket resolve calls `dispatchWorkflowTrigger` but not `dispatchWebhook`. Users can subscribe to these events but will never receive them. |
| P2-4 | **Double webhook fetch on dispatch** | `src/lib/webhookEvents.ts:103-117`, `supabase/functions/dispatch-webhook/index.ts:154-166` | Client-side `dispatchWebhook()` fetches webhooks and creates delivery records, then the edge function does the same. This causes redundant DB queries and potentially duplicate delivery records. |
| P2-5 | **In-memory rate limiter resets on cold start** | `supabase/functions/api-v1/index.ts:22-48` | Rate limiting uses in-memory `Map`. Each Deno isolate cold start resets all counters. Under high traffic, this provides weaker guarantees than documented. Consider using a database or Redis counter. |
| P2-6 | **Global mutable `_currentRateLimit`** | `supabase/functions/api-v1/index.ts:125` | Module-level mutable variable used to pass rate limit info to response helpers. Not safe if the isolate handles concurrent requests. |
| P2-7 | **Integration settings race condition** | `src/hooks/useIntegrations.ts:125-155` | `updateIntegration()` does read-then-write on `forms.settings`. Two concurrent saves to different integrations (e.g., Slack and Mailchimp) could overwrite each other. Should use JSONB merge or optimistic concurrency. |
| P2-8 | **Zapier webhookUrl never passed** | `src/components/integrations/IntegrationManager.tsx:218` | `ZapierIntegration` accepts an optional `webhookUrl` prop but `IntegrationManager` never provides it, so the "Your Webhook URL" section never renders. |
| P2-9 | **Integration tests are fully mocked** | `src/test/integration/api.test.ts` | All API integration tests use hardcoded response objects -- no actual HTTP requests or mocked Supabase calls. Tests verify nothing about actual behavior. |
| P2-10 | **Shared utilities not used** | `supabase/functions/_shared/cors.ts`, `_shared/hash.ts` | CORS and hash utilities exist but `dispatch-webhook`, `slack-notify`, and `api-v1` all define their own inline copies instead of importing the shared modules. |

---

## 13. Recommended Fix Path

### Phase 1 -- Security Critical (P0 + P1 auth/storage)
1. **Encrypt Mailchimp API keys** (P0-1): Store in a separate `integration_secrets` table with encryption, or use Supabase Vault. Never return the raw key to the frontend after initial save.
2. **Add auth to dispatch-webhook** (P1-3): Require service role key or JWT token. The function uses `SUPABASE_SERVICE_ROLE_KEY` internally already -- add `Authorization` header verification.
3. **Add auth to slack-notify** (P1-4): Require JWT verification (same pattern as `mailchimp-sync`).
4. **Encrypt Slack webhook URLs** (P1-2): Same approach as Mailchimp keys.
5. **Hash webhook secrets** (P1-1): Since secrets only need to be used for HMAC signing server-side, encrypt at rest. Only the edge function needs the raw secret.

### Phase 2 -- RBAC Hardening (P1)
6. **Restrict API key policies** (P1-6): Change RLS to `get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'editor')` for INSERT/UPDATE/DELETE.
7. **Restrict webhook policies** (P1-7): Same role check for webhook CRUD operations.

### Phase 3 -- Reliability (P1 + P2)
8. **Implement webhook retry processor** (P1-5): Create a scheduled edge function (cron) that queries `webhook_deliveries WHERE success = false AND next_retry_at <= now() AND attempts < max_attempts` and retries them.
9. **Fix test webhook** (P2-1): Route test through the `dispatch-webhook` edge function with a special `test` flag.
10. **Enforce HTTPS in webhook form** (P2-2): Change URL validation in `WebhookForm.tsx` to require `https://`.
11. **Dispatch missing events** (P2-3): Add `dispatchWebhook(WEBHOOK_EVENTS.TICKET_RESOLVED, ...)` in `useTickets.ts` and `FORM_CREATED` in form creation flow.

### Phase 4 -- Code Quality (P2)
12. **Eliminate double fetch** (P2-4): Remove client-side webhook lookup from `dispatchWebhook()`. Just pass `workspace_id` + `event_type` + `payload` to the edge function.
13. **Use shared utilities** (P2-10): Refactor edge functions to import from `_shared/cors.ts` and `_shared/hash.ts`.
14. **Fix Zapier webhookUrl** (P2-8): Generate and pass a webhook URL for the selected form.
15. **Fix race condition** (P2-7): Use PostgreSQL JSONB merge operator or add optimistic locking.
16. **Write real integration tests** (P2-9): Replace mocked tests with actual Supabase client calls against a test instance.
