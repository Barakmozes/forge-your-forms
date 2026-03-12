# Scan Report: AI Features
> Scanned: 2026-03-12 | Scanner: Automation 1 — Phase 7

## 1. Touchpoints Inventory

### Components
- `src/components/ai/AiFormGenerator.tsx` — Multi-step modal: mode select → prompt → preview fields → create form
- `src/components/ai/AiSummaryWidget.tsx` — Dashboard card: on-demand submission analysis (themes, sentiment, actions)
- `src/components/predictions/AiCannedSuggestions.tsx` — Suggest similar resolved ticket responses when composing reply
- `src/components/predictions/AtRiskDashboard.tsx` — Full churn prediction dashboard: risk scores, filters, customer table
- `src/components/predictions/AtRiskWidget.tsx` — Compact top-5 at-risk customers card (dashboard widget)
- `src/components/predictions/ChurnScoreBadge.tsx` — Reusable risk score badge (color-coded)

### Hooks
- `src/hooks/useAiGenerate.ts` — Wraps generateForm() API call with state management
- `src/hooks/useAiAnalysis.ts` — Wraps analyzeResponses() API call (on-demand)
- `src/hooks/useChurnPrediction.ts` — useAtRiskCustomers, useCustomerRiskScore, useCalculateChurnScores

### Database Tables
- `ai_cache` — RLS: workspace member read, service role write. TTL: 24h (analysis), 7d (generation). Realtime: no
- `churn_scores` — RLS: workspace member CRUD. Triggers: auto-update timestamp. Realtime: no

### Edge Functions
- `ai-generate` — Claude Sonnet: prompt → form fields (rate limited: 10/day/workspace, 7d cache)
- `ai-analyze` — Claude Sonnet: submissions → themes, sentiment, actions (24h cache)
- `classify-ticket` — Claude Haiku: subject+description → category, priority, confidence (24h cache)
- `churn-score` — Aggregates feedback/tickets/submissions → per-customer risk score (0-100)

### Lib
- `src/lib/ai.ts` — Type definitions + API wrappers (generateForm, analyzeResponses)

### Routes
- `/at-risk` — Protected, AtRiskDashboard
- AiFormGenerator: modal overlay (no dedicated route)
- AiSummaryWidget: embedded in FeedbackDashboard
- AiCannedSuggestions: embedded in TicketDetail

## 2. End-to-End Flow Status

- **AI form generation (prompt → fields)**: WORKS — AiFormGenerator → ai-generate edge fn → Claude → return fields
- **AI submission analysis (submissions → insights)**: WORKS — AiSummaryWidget → ai-analyze edge fn → Claude → themes/sentiment
- **AI canned suggestions (similar ticket responses)**: WORKS — AiCannedSuggestions queries resolved tickets + agent messages
- **Churn risk scoring**: WORKS — useCalculateChurnScores → churn-score edge fn → aggregates data → upserts scores
- **At-risk customer dashboard**: WORKS — AtRiskDashboard → useAtRiskCustomers → churn_scores table
- **At-risk widget (top 5)**: WORKS — AtRiskWidget → useAtRiskCustomers(limit=5)
- **AI ticket classification**: UNTESTED — classify-ticket edge function exists but **NOT called from any frontend component**
- **AI cache deduplication**: WORKS — SHA-256 hash-based caching in ai_cache table

## 3. Business Tier Mapping

| Feature | Required Plan | FeatureGate? | Enforced |
|---------|--------------|-------------|----------|
| AI Form Generator | Business | NO ⚠️ | NO — any user can invoke |
| AI Summary Widget | Business | YES | YES — FeatureGate(feature="ai-analysis") |
| AI Canned Suggestions | Business | YES | YES — FeatureGate(feature="ai_suggestions") |
| Churn Dashboard | Business | YES | YES — FeatureGate(feature="churn_prediction") |
| Churn Widget | Business | YES | YES — FeatureGate(feature="churn_prediction") |
| Ticket Classification | Business | N/A | N/A — not wired to frontend |

## 4. Cross-Dependencies

- **Depends on**: Auth (01), Plan Limits (04), Feedback (07) — AiSummaryWidget in FeedbackDashboard, Support (08) — AiCannedSuggestions + churn uses ticket data
- **Depended on by**: None directly
- **Shared files**: None (isolated components)

## 5. i18n Status

- t() coverage: ALL strings wrapped (ai.*, predictions.*)
- Hebrew translations: COMPLETE
- RTL layout: CORRECT

## 6. Parallelism Eligibility

- Independent: YES
- Conflicts with: None

## 7. Issues Found

### P0 — Critical
- None

### P1 — High
- **AiFormGenerator not plan-gated**: No FeatureGate wrapping. Any free user can generate unlimited forms via AI (rate limit is 10/day but plan not checked). File: `src/components/ai/AiFormGenerator.tsx`
- **classify-ticket dead code**: Edge function exists and works but is never called from frontend. Tickets are not auto-classified. File: `supabase/functions/classify-ticket/index.ts`

### P2 — Medium
- **Rate limit UX**: generateForm() detects RATE_LIMIT error but no button disable state. User can keep clicking. File: `src/hooks/useAiGenerate.ts`
- **Churn scores not realtime**: useAtRiskCustomers queries directly, no subscription. Must manual refresh after recalculation. File: `src/hooks/useChurnPrediction.ts`
- **Submission text extraction contract undocumented**: AiSummaryWidget expects pre-extracted AiSubmissionInput[]. Parent must transform. File: `src/components/ai/AiSummaryWidget.tsx`
- **ChurnScore risk_factors type mismatch**: Hook type shows `last_interaction` but DB column is `last_interaction_at`. File: `src/hooks/useChurnPrediction.ts`

## 8. Recommended Fix Path

1. Add FeatureGate to AiFormGenerator (feature="ai", requiredPlan="business")
2. Wire classify-ticket into SupportSubmitPage or useTickets.ts (call after ticket insert, store in tickets.ai_classification)
3. Add rate limit tracking in useAiGenerate (disable button after RATE_LIMIT error until next day)
4. Fix ChurnScore type: `last_interaction` → `last_interaction_at`
