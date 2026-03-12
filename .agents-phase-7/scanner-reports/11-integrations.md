# Scan Report: Integrations (Slack/Mailchimp/Zapier)
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Components
- `src/components/integrations/IntegrationManager.tsx` — Grid of 4 integration cards + tabs (form selector)
- `src/components/integrations/SlackIntegration.tsx` — Slack webhook URL, channel, event selection, test button
- `src/components/integrations/MailchimpIntegration.tsx` — API key input, list fetcher, field mapping
- `src/components/integrations/ZapierIntegration.tsx` — Documentation-only: setup guide, webhook URL, triggers/actions list

### Hooks
- `src/hooks/useIntegrations.ts` — Integration config CRUD (stored in forms.settings.integrations JSONB)
  - dispatchSlackNotification() — fire-and-forget Slack webhook via slack-notify edge fn
  - syncToMailchimp() — direct client-side POST to Mailchimp API

### Database Tables
- **No dedicated tables** — configs stored in `forms.settings` JSONB field

### Edge Functions
- `slack-notify` — Block Kit formatted Slack messages via Incoming Webhook

### Routes
- `/settings?tab=integrations` — Protected, IntegrationManager

## 2. End-to-End Flow Status

- **Slack: configure webhook → test → receive notifications**: WORKS — test calls slack-notify, events dispatched on form submissions
- **Slack: event filtering**: WORKS — only subscribed events trigger notifications
- **Mailchimp: configure API key → fetch lists → save**: PARTIAL — list fetching works but direct client-side API call has CORS risk
- **Mailchimp: auto-sync on submission**: BROKEN — syncToMailchimp() POSTs directly from browser to Mailchimp API, will be blocked by CORS in production
- **Zapier: setup guide**: WORKS — documentation-only, uses existing webhook infrastructure
- **ConvertKit: config UI**: NOT IMPLEMENTED — shows "Coming Soon" badge

## 3. Business Tier Mapping

| Tier | Access | Limit | Enforced |
|------|--------|-------|----------|
| Free | All integrations | — | NO — no FeatureGate wrapping ⚠️ |
| Pro | Same | — | NO |
| Growth | Same | — | NO |
| Business | Same | — | NO |

**Note**: Integrations have NO plan gating. Any user can configure Slack/Mailchimp/Zapier.

## 4. Cross-Dependencies

- **Depends on**: Auth (01), Forms (05) — configs stored in form settings
- **Depended on by**: All public form pages (FormRenderer, WaitlistLandingPage, FeedbackSurveyPage, SupportSubmitPage) call dispatch helpers
- **Shared files**: `useIntegrations.ts` imported by all public form components

## 5. i18n Status

- t() coverage: ALL strings wrapped (integrations.*)
- Hebrew translations: PARTIAL — some newer integration keys may be missing from he.json
- RTL layout: CORRECT

## 6. Parallelism Eligibility

- Independent: YES (after Batch 1 complete)
- Conflicts with: None

## 7. Issues Found

### P0 — Critical
- **Mailchimp sync CORS failure**: syncToMailchimp() makes direct browser POST to `https://{dc}.api.mailchimp.com/3.0/lists/{list_id}/members`. This WILL fail due to CORS in production browsers. Must proxy through edge function. File: `src/hooks/useIntegrations.ts` lines ~228-273

### P1 — High
- **Mailchimp API key stored plaintext in JSONB**: forms.settings.integrations.mailchimp.api_key is unencrypted. Anyone with workspace member access can read it. File: `src/hooks/useIntegrations.ts`
- **No plan gating on integrations**: All users (including free) can configure and use integrations. Should require at least Pro plan. File: `src/components/integrations/IntegrationManager.tsx`
- **Slack webhook URL stored plaintext**: forms.settings.integrations.slack.webhook_url is unencrypted. File: same

### P2 — Medium
- **No integration health checks**: Configs saved without validating that webhook URLs or API keys actually work
- **No integration event history/audit trail**: Unlike webhooks, integrations have no delivery log
- **Field mapping limited**: Mailchimp only supports email/name mapping, no custom fields
- **ConvertKit stub exists**: Config interface defined but UI shows "Coming Soon"
- **Zapier is documentation-only**: No actual OAuth or API integration

## 8. Recommended Fix Path

1. **P0**: Create edge function `mailchimp-sync` to proxy Mailchimp API calls (avoids CORS + secures API key)
2. Move Mailchimp API key and Slack webhook URL to encrypted storage (or dedicated integrations table)
3. Add FeatureGate to IntegrationManager (requiredPlan="pro" or "growth")
4. Add delivery logging for integration dispatches (extend webhook_deliveries or new table)
