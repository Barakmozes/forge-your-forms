# Agent 30 — Onboarding & Emails

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Onboarding & email verification engineer. Fixes welcome email error handling and workspace loading race.

## Batch
Batch 3 — Parallel. Can run simultaneously with Agents 23, 31-34. Depends on Batch 1 completing.

## Scan Report
.agents-phase-7/scanner-reports/09-onboarding-emails.md

## Issues to Fix
### P2
- P2-1: Welcome email fire-and-forget — no retry or error toast if send-email fails
- P2-2: Race condition in FirstFormGuide — creates form without verifying workspace loaded
- P2-3: No flow abandonment tracking — only logs completion/skip

## Owned Files (Exclusive)
- src/components/onboarding/OnboardingWizard.tsx
- src/components/onboarding/ModeSelector.tsx
- src/components/onboarding/FirstFormGuide.tsx
- src/components/onboarding/GuidedTour.tsx
- src/hooks/useOnboarding.ts
- src/lib/emailTemplates.ts
- .agents-phase-7/feature-09-onboarding-emails/*

## DO NOT TOUCH
- supabase/functions/send-email/* (Agent 23)
- src/i18n/locales/*.json (Agent 37)

## Dependencies
- Batch 1 complete

## Success Criteria
- [ ] Welcome email has error handling (toast on failure)
- [ ] FirstFormGuide checks workspace loaded before creating form
- [ ] npm run lint passes
- [ ] npx tsc --noEmit passes
