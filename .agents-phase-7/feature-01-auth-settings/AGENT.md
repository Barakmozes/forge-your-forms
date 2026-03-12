# Agent 22 — Auth & Settings

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Auth & Settings verification engineer. Fixes SSO error handling and member limit enforcement gaps.

## Batch
Batch 1 — Sequential (Position 2 of 4). Depends on Agent 21. Must complete BEFORE Agent 24.

## Scan Report
`.agents-phase-7/scanner-reports/01-auth-settings.md`

## Issues to Fix
### P1
- P1-1: Member limit client-only enforcement — no RLS prevents exceeding plan
- P1-2: SSO requires external Supabase config — no error handling for failure

### P2
- P2-1: Custom domain DNS verification is simulated (client-side only)
- P2-2: White-label favicon URL-only (no file upload)
- P2-3: SSO test validates reachability only (no SAML metadata validation)

## Owned Files (Exclusive)
- `src/contexts/AuthContext.tsx` — SSO error handling
- `.agents-phase-7/feature-01-auth-settings/*`

## Shared Files (Modify — sequential with Batch 1)
- `src/pages/Settings.tsx` — may need adjustments (Agent 35 also touches in Batch 4)

## DO NOT TOUCH
- `src/hooks/usePlanLimits.ts` (Agent 21/25)
- `src/lib/stripe.ts` (Agent 24)
- `src/components/Navbar.tsx` (Agent 35)
- `src/components/AppLayout.tsx` (Agent 35)
- `src/i18n/locales/*.json` (Agent 37)
- Edge function files (Agent 23)

## Dependencies
- Agent 21 (ADMIN bypass) — must complete first

## Success Criteria
- [ ] SSO sign-in failure shows user-friendly error toast
- [ ] SSO test button handles unreachable/invalid URLs gracefully
- [ ] All P1 issues addressed or documented with mitigation plan
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
