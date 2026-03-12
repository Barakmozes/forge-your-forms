# Scan Report: Feedback / NPS
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Components
- `src/components/feedback/FeedbackSurveyPage.tsx` — Public NPS survey: 0-10 scale, category, follow-up, custom fields
- `src/components/feedback/FeedbackDashboard.tsx` — Admin: NPS score, sentiment breakdown, weekly trends, at-risk clients, alerts

### Hooks
- `src/hooks/useFeedback.ts` — CRUD + realtime for feedback_responses and feedback_alerts
- `src/hooks/useFeedbackAnalytics.ts` — Computed analytics: NPS, breakdown, weekly trend, category analysis, at-risk list

### Database Tables
- `feedback_responses` — RLS: member read/update, public insert (if form active + mode=feedback). Triggers: auto-sentiment, detractor alert. Realtime: yes
- `feedback_alerts` — RLS: member read/update, system insert. No triggers. Realtime: no

### Lib
- `src/lib/npsCalculator.ts` — calculateSentiment(), calculateNPS(), getNPSBreakdown()

### Routes
- `/forms/:id` — Protected, FeedbackDashboard (when mode=feedback)
- `/f/:id` — Public, FeedbackSurveyPage

## 2. End-to-End Flow Status

- **Public NPS survey → submit → sentiment auto-set**: WORKS — insert triggers auto-sentiment classification
- **Detractor alert → notification**: WORKS — trigger creates feedback_alert + notification for workspace owner
- **Dashboard: NPS score display**: WORKS — calculateNPS formula: ((promoters - detractors) / total) * 100
- **Dashboard: sentiment breakdown donut**: WORKS — promoter/passive/detractor counts
- **Dashboard: weekly NPS trend chart**: WORKS — weekly grouping with period-over-period comparison
- **Dashboard: daily volume by sentiment**: WORKS — stacked bar chart
- **Dashboard: NPS by category**: WORKS — horizontal bar chart per category
- **Dashboard: at-risk clients table**: WORKS — unflagged detractors with follow-up text
- **Dashboard: flag/unflag responses**: WORKS — toggle flagged boolean on feedback_responses
- **Dashboard: alert management**: WORKS — mark alerts as read
- **AI Summary widget**: WORKS — AiSummaryWidget integrated in dashboard (business plan gated)
- **Realtime updates**: WORKS — INSERT/UPDATE/DELETE on feedback_responses via channel
- **Webhook/Slack/Workflow triggers on submit**: WORKS — dispatched from FeedbackSurveyPage

## 3. Business Tier Mapping

| Tier | Access | Limit | Enforced |
|------|--------|-------|----------|
| Free | No feedback | 0 feedback forms | YES — canAccessMode("feedback") returns false |
| Pro | 3 feedback forms | 5k submissions/mo | YES — client-side |
| Growth | Unlimited | 25k subs/mo | YES — client-side |
| Business | + AI Summary | Unlimited | YES — FeatureGate on AiSummaryWidget |

## 4. Cross-Dependencies

- **Depends on**: Auth (01), Plan Limits (04), Forms (05)
- **Depended on by**: AI Features (13) — AiSummaryWidget in dashboard, Churn scoring uses feedback data
- **Shared files**: None (isolated components)

## 5. i18n Status

- t() coverage: ALL strings wrapped (feedback.*)
- Hebrew translations: COMPLETE
- RTL layout: CORRECT

## 6. Parallelism Eligibility

- Independent: YES (after Batch 1 complete)
- Conflicts with: None

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- None

### P2 — Medium
- **Sentiment calculation duplicated**: FeedbackSurveyPage has inline sentiment check (lines ~279-280) duplicating npsCalculator.ts logic. File: `src/components/feedback/FeedbackSurveyPage.tsx`
- **Alerts not realtime-enabled**: feedback_alerts table has no realtime subscription in useFeedback (requires refetch). File: `src/hooks/useFeedback.ts`
- **Custom fields rendering**: FeedbackSurveyPage renders custom fields from form.settings but validation varies by field type. Edge cases possible with complex custom fields.

## 8. Recommended Fix Path

1. Replace inline sentiment calculation with npsCalculator.calculateSentiment() call
2. Add realtime subscription for feedback_alerts (or polling) if real-time alert awareness is desired
