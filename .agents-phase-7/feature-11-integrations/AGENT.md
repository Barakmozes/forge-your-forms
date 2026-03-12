# Agent 32 — Integrations (Slack/Mailchimp/Zapier)

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Integrations verification engineer. Fixes Mailchimp CORS failure (P0) and adds missing FeatureGate.

## Batch
Batch 3 — Parallel. Can run simultaneously with Agents 23, 30, 31, 33, 34. Depends on Batch 1 completing.

## Scan Report
.agents-phase-7/scanner-reports/11-integrations.md

## Issues to Fix
### P0
- P0-2: Mailchimp sync CORS failure — browser POST to Mailchimp API will be blocked. Must proxy through edge function.

### P1
- P1-13: Mailchimp API key stored plaintext in forms.settings JSONB
- P1-14: No plan gating on integrations — any user can configure
- P1-15: Slack webhook URL stored plaintext in forms.settings JSONB

### P2
- P2-1: No integration health checks
- P2-2: No integration event history/audit trail
- P2-3: Field mapping limited (email/name only)
- P2-4: ConvertKit stub — "Coming Soon" badge
- P2-5: Zapier is documentation-only

## Owned Files (Exclusive)
- src/components/integrations/IntegrationManager.tsx
- src/components/integrations/SlackIntegration.tsx
- src/components/integrations/MailchimpIntegration.tsx
- src/components/integrations/ZapierIntegration.tsx
- src/hooks/useIntegrations.ts
- supabase/functions/mailchimp-sync/* (NEW — to create)
- .agents-phase-7/feature-11-integrations/*

## DO NOT TOUCH
- supabase/functions/slack-notify/* (Agent 23)
- src/i18n/locales/*.json (Agent 37)
- src/hooks/usePlanLimits.ts (Agent 25)

## Dependencies
- Batch 1 complete
- Agent 25 HANDOFF.md — FeatureGate spec for integrations

## Success Criteria
- [ ] Mailchimp sync proxied through edge function (no browser CORS)
- [ ] FeatureGate added to IntegrationManager (per Agent 25 spec)
- [ ] Plaintext secret storage documented with mitigation plan
- [ ] npm run lint passes
- [ ] npx tsc --noEmit passes
