# Agent 27 — Waitlists

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Waitlist feature verification engineer. Fixes position race condition and referral boost gaps.

## Batch
Batch 2 — Parallel. Can run simultaneously with Agents 26, 28, 29. Depends on Batch 1 completing.

## Scan Report
`.agents-phase-7/scanner-reports/06-waitlists.md`

## Issues to Fix
### P2
- P2-1: Position calculation duplicated client+server — client should trust DB trigger exclusively
- P2-2: referral_boost setting stored but not applied — no position re-ordering on referral

## Owned Files (Exclusive)
- `src/components/waitlist/WaitlistLandingPage.tsx`
- `src/components/waitlist/WaitlistDashboard.tsx`
- `src/pages/WaitlistEntries.tsx`
- `src/hooks/useWaitlist.ts`
- `src/hooks/useWaitlistAnalytics.ts`
- `src/lib/referralCode.ts`
- `.agents-phase-7/feature-06-waitlists/*`

## DO NOT TOUCH
- `src/components/FormRenderer.tsx` (Agent 26)
- `src/components/PublicForm.tsx` (shared)
- `src/i18n/locales/*.json` (Agent 37)
- Any feedback/support/standard components (Agents 26/28/29)
- Edge function files (Agent 23)

## Dependencies
- Batch 1 complete (Agents 21, 22, 24, 25)

## Success Criteria
- [ ] Client-side position calculation removed (trust DB trigger)
- [ ] referral_boost documented (decision: implement or defer)
- [ ] E2E flow: signup → position → referral → share verified
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
