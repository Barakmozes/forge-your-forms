# Agent 30 — FIX-PLAN

## Issues Confirmed

### P2-1: Welcome email fire-and-forget
- **File**: `src/components/onboarding/OnboardingWizard.tsx` lines 44-51
- **Problem**: `sendEmail("welcome", ...)` is called with `.catch(() => {})`. No user feedback on failure.
- **Fix**: Await the `sendEmail` result, show a warning toast on failure using `useToast()` (protected page pattern). Onboarding continues regardless — email failure is non-blocking.

### P2-2: Race condition in FirstFormGuide
- **File**: `src/components/onboarding/FirstFormGuide.tsx`
- **Problem**: Button is disabled when `!currentWorkspace` (line 136) and guard exists (line 76), but no loading state is shown. User sees a disabled button with no explanation when workspace is still loading.
- **Fix**: Import `loading` from `useWorkspace()`. Show a loading spinner or message when workspace is loading. Keep existing guards.

### BONUS: fieldLabelKeys crash for non-standard modes
- **File**: `src/components/onboarding/FirstFormGuide.tsx` line 69
- **Problem**: `config.fieldLabelKeys.map(...)` crashes for waitlist/feedback/support modes because those configs use `fields: []` instead of `fieldLabelKeys`. Runtime error: `Cannot read properties of undefined (reading 'map')`.
- **Fix**: Add safe fallback: `(config.fieldLabelKeys || []).map(...)`.

## Changes Summary

### OnboardingWizard.tsx
1. Import `useToast` from `@/hooks/use-toast`
2. Replace fire-and-forget email call with awaited call + toast on failure

### FirstFormGuide.tsx
1. Destructure `loading` from `useWorkspace()`
2. Show loading indicator when workspace is loading
3. Fix `fieldLabelKeys` crash with safe fallback `(config.fieldLabelKeys || []).map(...)`

## Files Modified
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/components/onboarding/FirstFormGuide.tsx`
