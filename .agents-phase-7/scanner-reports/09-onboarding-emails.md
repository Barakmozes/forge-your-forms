# Scan Report: Onboarding & Emails
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Components
- `src/components/onboarding/OnboardingWizard.tsx` — 3-step wizard: mode selection → first form → guided tour
- `src/components/onboarding/ModeSelector.tsx` — Step 1: toggle 4 form modes (standard/waitlist/feedback/support)
- `src/components/onboarding/FirstFormGuide.tsx` — Step 2: creates template form with mode-specific fields
- `src/components/onboarding/GuidedTour.tsx` — Step 3: 3 quick tips (dashboard, builder, sharing)

### Hooks
- `src/hooks/useOnboarding.ts` — Checks profiles.onboarding_completed, manages completion state, logs activation events

### Database Tables
- `profiles` — Column: `onboarding_completed` BOOLEAN default false
- `activation_events` — id, user_id, workspace_id, event_type (signup/onboarding_started/completed/first_form/first_submission), metadata, created_at

### Edge Functions
- `send-email` — Welcome email sent on onboarding mount (fire-and-forget)

### Lib
- `src/lib/emailTemplates.ts` — Type-safe email template wrapper for send-email edge function

### Routes
- No dedicated route — OnboardingWizard renders as modal overlay on first visit (when onboarding_completed=false)

## 2. End-to-End Flow Status

- **New user → onboarding wizard appears**: WORKS — checks profiles.onboarding_completed
- **Step 1: select modes**: WORKS — toggle cards with descriptions
- **Step 2: create first form**: WORKS — inserts form with mode-specific template fields
- **Step 3: guided tour tips**: WORKS — 3 numbered tip cards
- **Completion → mark onboarding_completed**: WORKS — updates profiles table
- **Welcome email on mount**: PARTIAL — fire-and-forget, no error handling if Resend fails
- **Activation event logging**: WORKS — logs onboarding_started, onboarding_completed, first_form_created
- **Skip onboarding**: WORKS — skip button available, marks as completed

## 3. Business Tier Mapping

| Tier | Access | Limit | Enforced |
|------|--------|-------|----------|
| Free | Full onboarding | — | N/A — no plan gating |
| All tiers | Same experience | — | N/A |

## 4. Cross-Dependencies

- **Depends on**: Auth (01) — user must be authenticated, Forms (05) — creates first form
- **Depended on by**: None directly
- **Shared files**: None

## 5. i18n Status

- t() coverage: ALL strings wrapped (onboarding.*, common.*, forms.templateField*)
- Hebrew translations: COMPLETE
- RTL layout: CORRECT

## 6. Parallelism Eligibility

- Independent: YES
- Conflicts with: None

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- None

### P2 — Medium
- **Welcome email fire-and-forget**: No retry or error toast if send-email fails. File: `src/components/onboarding/OnboardingWizard.tsx`
- **Race condition in FirstFormGuide**: Creates form without verifying workspace is loaded. File: `src/components/onboarding/FirstFormGuide.tsx`
- **No flow abandonment tracking**: Only logs completion/skip, not per-step interactions

## 8. Recommended Fix Path

1. Add error handling for welcome email failure (toast or silent retry)
2. Add workspace loading guard before form creation in FirstFormGuide
