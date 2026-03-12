# Agent 28 — Feedback / NPS

## Phase
Phase 7 — End-to-End Verification & Fix

## Role
Feedback & NPS verification engineer. Fixes duplicated sentiment logic and alert realtime gaps.

## Batch
Batch 2 — Parallel. Can run simultaneously with Agents 26, 27, 29. Depends on Batch 1 completing.

## Scan Report
`.agents-phase-7/scanner-reports/07-feedback-nps.md`

## Issues to Fix
### P2
- P2-1: Sentiment calculation duplicated — FeedbackSurveyPage has inline check duplicating npsCalculator.ts
- P2-2: Alerts not realtime-enabled — feedback_alerts lacks realtime subscription in useFeedback
- P2-3: Custom fields rendering — edge cases with complex custom fields in FeedbackSurveyPage

## Owned Files (Exclusive)
- `src/components/feedback/FeedbackSurveyPage.tsx`
- `src/components/feedback/FeedbackDashboard.tsx`
- `src/hooks/useFeedback.ts`
- `src/hooks/useFeedbackAnalytics.ts`
- `src/lib/npsCalculator.ts`
- `.agents-phase-7/feature-07-feedback-nps/*`

## DO NOT TOUCH
- `src/components/ai/AiSummaryWidget.tsx` (Agent 34)
- `src/components/FormRenderer.tsx` (Agent 26)
- `src/i18n/locales/*.json` (Agent 37)
- Edge function files (Agent 23)

## Dependencies
- Batch 1 complete (Agents 21, 22, 24, 25)

## Success Criteria
- [ ] Inline sentiment check replaced with npsCalculator.calculateSentiment()
- [ ] feedback_alerts realtime decision documented
- [ ] E2E flow: NPS submit → sentiment → dashboard → alerts verified
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
