# Agent 28 — FIX-PLAN

## Issue Summary

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| P2-1 | Medium | Sentiment calculation duplicated 3 times | ✅ FIXED |
| P2-2 | Medium | feedback_alerts lacks realtime subscription | ✅ ASSESSED — Not adding |
| P2-3 | Low | Custom field select options edge case | ✅ FIXED |

---

## P2-1: Sentiment Calculation Duplicated — FIXED

### Problem
Three copies of the same sentiment classification logic existed:
1. `src/lib/npsCalculator.ts:5-8` — canonical `calculateSentiment()` function
2. `src/components/feedback/FeedbackSurveyPage.tsx` — local `getNpsCategory()` helper
3. `src/components/feedback/FeedbackSurveyPage.tsx` — inline ternary in `handleSubmit`

### Fix Applied
- Removed `getNpsCategory()` local function
- Imported `calculateSentiment` from `@/lib/npsCalculator`
- Updated all 5 call sites to use `calculateSentiment()`

---

## P2-2: Alerts Realtime — NOT ADDING (Intentional)

### Problem
`useFeedback.ts` subscribes to `feedback_responses` but not `feedback_alerts`.

### Decision
Not adding realtime for alerts because:
- Detractor responses already stream via existing realtime on feedback_responses
- Alerts are fetched on page load and updated optimistically via markAlertRead
- Would require SQL migration (ALTER PUBLICATION) for marginal benefit

---

## P2-3: Custom Fields Edge Case — FIXED

### Problem
`CustomFieldInput` select case called `field.options.map()` which could crash if options is undefined.

### Fix Applied
Changed to `(field.options ?? []).map(...)` — defensive guard against undefined options.
