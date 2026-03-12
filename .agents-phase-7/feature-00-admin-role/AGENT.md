# Agent 21 — ADMIN Role Bypass

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
ADMIN privilege architect. Ensures workspace owners and superadmin users bypass plan limits and feature gates during testing/admin workflows.

## Batch
Batch 1 — Sequential (Position 1 of 4). Must complete BEFORE Agent 22.

## Scan Report
No dedicated scan report. Inferred from cross-cutting P1 issues:
- P1-8: All plan limits client-side only — ADMIN should always bypass
- FeatureGate components don't check for admin/owner bypass

## Owned Files (Exclusive)
- `.agents-phase-7/feature-00-admin-role/*`

## Shared Files (Modify — sequential with Batch 1)
- `src/hooks/usePlanLimits.ts` — add owner/admin bypass logic
- `src/components/upgrade/FeatureGate.tsx` — add admin bypass prop/logic

## DO NOT TOUCH
- `src/lib/stripe.ts` (Agent 24)
- `src/hooks/useSubscription.ts` (Agent 24)
- `src/contexts/AuthContext.tsx` (Agent 22)
- `src/pages/Settings.tsx` (Agent 35)
- `src/components/Navbar.tsx` (Agent 35)
- `src/i18n/locales/*.json` (Agent 37)
- Any edge function files (Agent 23)
- Any migration files (Agent 24)

## Dependencies
- None — runs first in Phase 7

## Success Criteria
- [ ] usePlanLimits returns unlimited access for workspace owners when admin bypass is active
- [ ] FeatureGate renders children without blur for admin users
- [ ] No regressions: non-admin users still see proper limits
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
