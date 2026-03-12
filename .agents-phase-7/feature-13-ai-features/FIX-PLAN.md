# Agent 34 — FIX-PLAN

## Assessment Summary

### P1-16: AiFormGenerator not plan-gated — CONFIRMED (partially broken)

**Root Cause**: Buttons in `Forms.tsx:260` and `FormBuilder.tsx:459` are wrapped with `FeatureGate`, BUT the fallback buttons ALSO have `onClick={() => setAiDialogOpen(true)}`. Non-business users click the "faded" button and the dialog opens anyway. The `AiFormGenerator` dialog itself (rendered at `Forms.tsx:377` and `FormBuilder.tsx:692`) is NOT wrapped with FeatureGate.

**Fix**:
1. Remove `onClick` from fallback buttons in both files (just show a disabled/faded button)
2. Wrap `AiFormGenerator` dialog itself with FeatureGate as a safety net
3. Use consistent feature key `"ai"` to match `FEATURE_REQUIRED_PLAN` in usePlanLimits

### P1-17: classify-ticket dead code — OUT OF SCOPE
Agent 29 is responsible for wiring. Verify only.

### P2-1: Rate limit UX — CONFIRMED

**Root Cause**: `src/lib/ai.ts:90` sets `err.code = "RATE_LIMIT"` on thrown errors, but `useAiGenerate.ts:28` catches errors and only extracts `err.message`. The `RATE_LIMIT` code is lost. No `rateLimited` state exists.

**Fix**:
1. In `useAiGenerate.ts`: detect `RATE_LIMIT` code from caught error, set `rateLimited` state
2. Return `rateLimited` from hook
3. In `AiFormGenerator.tsx`: disable generate button when `rateLimited` is true, show message

### P2-4: ChurnScore risk_factors type mismatch — CONFIRMED

**Root Cause**: `useChurnPrediction.ts:19` has `last_interaction` inside `risk_factors` type, but the edge function stores it as `last_interaction_at`.

**Fix**: Change `last_interaction` to `last_interaction_at` in the `ChurnScore.risk_factors` interface.

### P2-2: Churn scores not realtime — ACKNOWLEDGED, NOT FIXING
This is a known limitation. Adding realtime subscriptions is low priority and the `refetch` callback is available.

### P2-3: Submission text extraction contract — ACKNOWLEDGED, NOT FIXING
Documentation-only issue, not a code bug.

## Execution Order

1. **Prompt 34.1**: Fix FeatureGate on AiFormGenerator (P1-16)
   - Fix fallback buttons in Forms.tsx and FormBuilder.tsx
   - Wrap AiFormGenerator dialog with FeatureGate

2. **Prompt 34.2**: Fix type mismatch + rate limit UX (P2-1, P2-4)
   - Fix ChurnScore risk_factors type
   - Add rateLimited state to useAiGenerate
   - Disable button in AiFormGenerator when rate limited

3. **Prompt 34.3**: Final verification
