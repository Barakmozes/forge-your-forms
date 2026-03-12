# Agent 32 — Handoff

## Status: COMPLETE

## Files Modified
- `supabase/functions/mailchimp-sync/index.ts` — **NEW** edge function proxying Mailchimp API calls
- `src/hooks/useIntegrations.ts` — syncToMailchimp() now uses edge function; added fetchMailchimpLists() helper
- `src/components/integrations/MailchimpIntegration.tsx` — fetchLists() now uses edge function proxy via fetchMailchimpLists()
- `src/components/integrations/IntegrationManager.tsx` — added FeatureGate wrapping (feature="integrations", requiredPlan="pro")

## What Was Fixed

### P0-2: Mailchimp CORS Failure (FIXED)
- **Before**: `syncToMailchimp()` made direct browser POST to `https://{dc}.api.mailchimp.com/3.0/lists/{list_id}/members` — blocked by CORS in production
- **After**: Proxied through `mailchimp-sync` edge function via `supabase.functions.invoke()`
- **Bonus**: Also fixed `fetchLists()` in MailchimpIntegration.tsx which had the same CORS issue

### P1-14: No Plan Gating on Integrations (FIXED)
- **Before**: Any user (including free tier) could configure integrations
- **After**: IntegrationManager wrapped with `<FeatureGate feature="integrations" requiredPlan="pro" featureName="Integrations">`
- Free users see blur overlay + upgrade prompt; Pro+ users get full access
- `integrations` was already added to `FEATURE_REQUIRED_PLAN` by Agent 25

### Edge Function: mailchimp-sync
- **Location**: `supabase/functions/mailchimp-sync/index.ts`
- **Auth**: JWT required (authenticated users only)
- **Actions**: `sync` (add member to list) and `fetch_lists` (get audience lists)
- **Security**: SSRF protection — validates datacenter format matches `^[a-z]{2}\d{1,2}$`
- **Pattern**: Matches slack-notify edge function pattern (CORS headers, error handling, Deno.serve)
- **Deploy**: `supabase functions deploy mailchimp-sync`

## Deferred (Not This Phase)

### P1-13/P1-15: Plaintext Secret Storage
- **Issue**: Mailchimp API keys and Slack webhook URLs stored unencrypted in `forms.settings` JSONB
- **Mitigation**: The edge function proxy means the API key is still sent from client to edge function, but the actual Mailchimp API call happens server-side. This prevents API key exposure in browser network tab CORS errors.
- **Future fix**: Create dedicated `integration_credentials` table with server-side encryption (pgcrypto). Store only encrypted references in forms.settings, decrypt in edge functions only.

### P2 Items (Out of Scope)
- No integration health checks
- No integration event history/audit trail
- Field mapping limited to email/name
- ConvertKit stub (Coming Soon)
- Zapier documentation-only

## Dependencies
- Batch 1 complete ✅
- Agent 25 HANDOFF.md — FeatureGate spec ✅

## Downstream
- Agent 23 (Edge Functions) — new `mailchimp-sync` function added; needs deployment

## Verification
- `npm run lint` — 0 errors (16 pre-existing warnings)
- `npx tsc --noEmit` — passes clean
- No direct Mailchimp API calls remain in `src/` (all proxied through edge function)
- FeatureGate correctly wraps IntegrationManager main content
- Slack integration untouched and still functional
