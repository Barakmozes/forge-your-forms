# Agent 34 — Handoff

## Status: COMPLETE

## Files Modified
- `src/pages/Forms.tsx` — Fixed FeatureGate fallback: now opens PaywallModal instead of AI dialog; standardized feature key to `"ai"`
- `src/pages/FormBuilder.tsx` — Standardized FeatureGate feature key to `"ai"`; added `disabled` to fallback button
- `src/hooks/useAiGenerate.ts` — Added `rateLimited` state; detects RATE_LIMIT error code from ai.ts
- `src/components/ai/AiFormGenerator.tsx` — Consumes `rateLimited` flag; disables generate button when rate limited
- `src/hooks/useChurnPrediction.ts` — Fixed `risk_factors.last_interaction` → `last_interaction_at` type mismatch

## What Was Fixed

### P1-16: AiFormGenerator not plan-gated
**Root cause**: In `Forms.tsx`, the FeatureGate fallback button had `onClick={() => setAiDialogOpen(true)}`, allowing non-business users to open the AI dialog.
**Fix**: Fallback button now opens PaywallModal (business plan prompt) instead. In `FormBuilder.tsx`, fallback button is `disabled`. Both use consistent `feature="ai"` key matching `FEATURE_REQUIRED_PLAN`.

### P2-1: Rate limit UX — no button disable
**Root cause**: `useAiGenerate` caught errors but didn't detect the RATE_LIMIT code set by `src/lib/ai.ts`.
**Fix**: Hook now checks `err.code === "RATE_LIMIT"` and sets `rateLimited` state. `AiFormGenerator` disables the generate button when `rateLimited` is true. The error message from the API is still shown.

### P2-4: ChurnScore risk_factors type mismatch
**Root cause**: `ChurnScore.risk_factors.last_interaction` didn't match the edge function's `last_interaction_at` key.
**Fix**: Changed to `last_interaction_at` in the interface.

## Not Fixed (Out of Scope)
- **P1-17 (classify-ticket dead code)**: Agent 29's responsibility to wire frontend integration
- **P2-2 (Churn scores not realtime)**: Known limitation; `refetch` callback available
- **P2-3 (Submission text extraction contract)**: Documentation-only issue

## Verification
- `npm run lint` — 0 errors (16 pre-existing warnings)
- `npx tsc --noEmit` — passes clean
- AiSummaryWidget, AiCannedSuggestions unaffected (no changes to their code or types)

## Dependencies
- Agent 25 (Plan Limits) — `ai: "business"` already in FEATURE_REQUIRED_PLAN ✅
- Agent 21 (Admin bypass) — `isOwnerBypass` works in FeatureGate ✅

## Downstream
- **Agent 37 (i18n)**: May want to add `ai.rateLimitReached` translation key for a more descriptive rate limit message
- No other downstream dependencies
