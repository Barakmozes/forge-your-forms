# Agent 32 — FIX-PLAN

## Issues Confirmed

| ID | Severity | Issue | File | Line(s) | Status |
|----|----------|-------|------|---------|--------|
| P0-2 | P0 | syncToMailchimp() direct browser POST — CORS blocked | src/hooks/useIntegrations.ts | 260 | TO FIX |
| P0-2b | P0 | fetchLists() direct browser GET — CORS blocked | src/components/integrations/MailchimpIntegration.tsx | 55 | TO FIX |
| P1-13 | P1 | Mailchimp API key stored plaintext in forms.settings JSONB | src/hooks/useIntegrations.ts | — | DOCUMENT (deferred) |
| P1-14 | P1 | No FeatureGate on IntegrationManager | src/components/integrations/IntegrationManager.tsx | — | TO FIX |
| P1-15 | P1 | Slack webhook URL stored plaintext in forms.settings JSONB | src/hooks/useIntegrations.ts | — | DOCUMENT (deferred) |

## Fix Plan

### Prompt 32.1 — Create mailchimp-sync Edge Function (P0)
- Create `supabase/functions/mailchimp-sync/index.ts`
- Accept: `{ api_key, list_id, email, name, merge_fields, action }` where action is `sync` or `fetch_lists`
- Support two actions:
  - `sync` — POST to Mailchimp members endpoint (fixes syncToMailchimp CORS)
  - `fetch_lists` — GET Mailchimp lists endpoint (fixes fetchLists CORS)
- Auth: validate JWT (authenticated user only)
- CORS headers matching slack-notify pattern
- SSRF protection: only allow `*.api.mailchimp.com` hostnames

### Prompt 32.2 — Update useIntegrations + MailchimpIntegration
- `syncToMailchimp()` → call `supabase.functions.invoke('mailchimp-sync', { body: { action: 'sync', ... } })`
- `MailchimpIntegration.fetchLists()` → call `supabase.functions.invoke('mailchimp-sync', { body: { action: 'fetch_lists', ... } })`
- Keep same external API for callers

### Prompt 32.3 — Add FeatureGate (P1-14)
- Import FeatureGate in IntegrationManager.tsx
- Wrap main return JSX with `<FeatureGate feature="integrations" requiredPlan="pro" featureName="Integrations">`
- Option B (internal wrap) per Agent 25 spec — IntegrationManager is a page-level component

### Deferred (not this phase)
- P1-13/P1-15: Plaintext secret storage needs a dedicated `integration_credentials` table with encryption. Documenting mitigation plan in HANDOFF.md.
- P2 items: health checks, audit trail, field mapping expansion, ConvertKit, Zapier OAuth
