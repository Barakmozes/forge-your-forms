# Agent 31 — Webhooks & API

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Webhooks & API verification engineer. Addresses webhook secret storage and delivery log gaps.

## Batch
Batch 3 — Parallel. Can run simultaneously with Agents 23, 30, 32-34. Depends on Batch 1 completing.

## Scan Report
.agents-phase-7/scanner-reports/10-webhooks-api.md

## Issues to Fix
### P1
- P1-12: Webhook secret stored plaintext in webhooks table — should be hashed like API keys

### P2
- P2-1: Test webhook uses no-cors mode
- P2-2: Delivery log limited to 50 entries, no pagination
- P2-3: No delivery log realtime subscription
- P2-4: API key prefix truncation (11 chars) — could be ambiguous

## Owned Files (Exclusive)
- src/components/webhooks/WebhookManager.tsx
- src/components/webhooks/WebhookForm.tsx
- src/components/webhooks/DeliveryLog.tsx
- src/components/api/ApiKeyManager.tsx
- src/components/api/ApiDocs.tsx
- src/hooks/useWebhooks.ts
- src/hooks/useApiKeys.ts
- src/lib/webhookEvents.ts
- .agents-phase-7/feature-10-webhooks-api/*

## DO NOT TOUCH
- supabase/functions/dispatch-webhook/* (Agent 23)
- supabase/functions/api-v1/* (Agent 23)
- src/i18n/locales/*.json (Agent 37)

## Dependencies
- Batch 1 complete

## Success Criteria
- [ ] Webhook secret hashing documented (implementation may require migration + edge fn update)
- [ ] Delivery log realtime decision documented
- [ ] E2E flow: create webhook → test → delivery log verified
- [ ] npm run lint passes
- [ ] npx tsc --noEmit passes
