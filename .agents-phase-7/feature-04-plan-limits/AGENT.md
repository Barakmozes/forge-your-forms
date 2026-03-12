# Agent 25 — Plan Limits & Feature Gating

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Plan limits & feature gating verification engineer. Adds missing FeatureGates and documents server-side enforcement plan.

## Batch
Batch 1 — Sequential (Position 4 of 4). Depends on Agent 24. Last in Batch 1.

## Scan Report
`.agents-phase-7/scanner-reports/04-plan-limits.md`

## Issues to Fix
### P1
- P1-8: All limits client-side only — no RLS enforcement for form/submission/member counts
- P1-9: IntegrationManager has no FeatureGate wrapping
- P1-10: AiFormGenerator has no FeatureGate wrapping

### P2
- P2-1: Usage percentage can flash >100 before enforcement
- P2-2: Stale usage data (60-second stale time)
- P2-3: No "approaching limit" email notification

## Owned Files (Exclusive)
- `src/hooks/usePlanLimits.ts` — central gating logic (after Agent 21 changes)
- `src/components/upgrade/FeatureGate.tsx` — gate component (after Agent 21 changes)
- `src/components/upgrade/PaywallModal.tsx`
- `src/components/upgrade/UpgradePrompt.tsx`
- `src/components/upgrade/UsageDashboard.tsx`
- `.agents-phase-7/feature-04-plan-limits/*`

## DO NOT TOUCH
- `src/lib/stripe.ts` (Agent 24)
- `src/hooks/useSubscription.ts` (Agent 24)
- `src/components/ai/AiFormGenerator.tsx` (Agent 34 — Batch 3)
- `src/components/integrations/IntegrationManager.tsx` (Agent 32 — Batch 3)
- `src/pages/Settings.tsx` (Agent 35)
- `src/i18n/locales/*.json` (Agent 37)

## Dependencies
- Agent 21 (ADMIN bypass) — usePlanLimits already modified
- Agent 24 (Billing) — useSubscription and stripe.ts finalized

## Success Criteria
- [ ] AiFormGenerator has FeatureGate (documented for Agent 34 to add)
- [ ] IntegrationManager has FeatureGate (documented for Agent 32 to add)
- [ ] Server-side enforcement spec written for future migration
- [ ] usePlanLimits clamps percentage at 100
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
