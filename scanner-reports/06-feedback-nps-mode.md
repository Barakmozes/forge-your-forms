# Scan Report: Feature 06 -- Feedback/NPS Mode

**Scanner**: Feature Scanner Agent
**Date**: 2026-03-15
**Feature**: Feedback/NPS Mode (public survey, admin dashboard, NPS calculation, detractor alerts)
**Status**: COMPLETE

---

## 1. Touchpoints

### Pages
| File | Role | Description |
|------|------|-------------|
| `src/pages/PublicForm.tsx` | Public | Dispatches to `FeedbackSurveyPage` when `form.mode === "feedback"` (line 210-220) |
| `src/pages/FormDashboard.tsx` | Protected | Dispatches to `FeedbackDashboard` when `form.mode === "feedback"` (line 82) |
| `src/pages/Forms.tsx` | Protected | Lists all forms; includes feedback mode in `MODE_CONFIG` (line 47) |
| `src/pages/DataExport.tsx` | Protected | Exports feedback_responses as part of GDPR data export (lines 77-78, 96) |

### Components
| File | Role | Description |
|------|------|-------------|
| `src/components/feedback/FeedbackSurveyPage.tsx` | Public | NPS 0-10 survey with categories, custom fields, follow-up text |
| `src/components/feedback/FeedbackDashboard.tsx` | Protected | Admin dashboard: NPS score, trends, sentiment breakdown, at-risk clients, category analysis |
| `src/components/NotificationPanel.tsx` | Protected | Displays `detractor_alert` notifications with red AlertTriangle icon (lines 29, 37) |
| `src/components/ai/AiSummaryWidget.tsx` | Protected | AI-powered summary widget embedded in FeedbackDashboard |
| `src/components/predictions/AtRiskWidget.tsx` | Protected | Churn prediction widget embedded in FeedbackDashboard |
| `src/components/ai/SentimentBadge.tsx` | Protected | Reusable sentiment display badge |

### Hooks
| File | Description |
|------|-------------|
| `src/hooks/useFeedback.ts` | CRUD for feedback_responses and feedback_alerts; realtime subscriptions (INSERT, UPDATE, DELETE) |
| `src/hooks/useFeedbackAnalytics.ts` | Derived analytics: NPS score, delta, breakdown, weekly trend, volume by sentiment, category breakdown, at-risk clients |
| `src/hooks/useChurnPrediction.ts` | Churn scoring that incorporates NPS data |
| `src/hooks/useAiAnalysis.ts` | AI analysis hook used by AiSummaryWidget for feedback |

### Utilities
| File | Description |
|------|-------------|
| `src/lib/npsCalculator.ts` | `calculateSentiment()`, `calculateNPS()`, `getNPSBreakdown()` |
| `src/lib/webhookEvents.ts` | `FEEDBACK_RESPONSE` webhook event (line 8) |
| `src/lib/workflowEngine.ts` | `DETRACTOR_ALERT` workflow trigger (line 16) |
| `src/lib/emailTemplates.ts` | `detractor_alert` email template type (line 12) |

### Database Tables
| Table | Migration | Description |
|-------|-----------|-------------|
| `feedback_responses` | `005_feedback_tables.sql` | NPS scores, sentiment, follow-up, custom answers, flagging |
| `feedback_alerts` | `005_feedback_tables.sql` | Detractor alerts with read/unread state |

### Database Triggers
| Trigger | Migration | Description |
|---------|-----------|-------------|
| `on_feedback_response_created` | `005_feedback_tables.sql` | BEFORE INSERT: auto-sets sentiment, creates detractor alert + notification |

### Database Indexes
| Index | Migration | Columns |
|-------|-----------|---------|
| `idx_feedback_responses_form` | `005` | `(form_id)` |
| `idx_feedback_responses_nps` | `005` | `(form_id, nps_score)` |
| `idx_feedback_alerts_form` | `005` | `(form_id)` |
| `idx_feedback_alerts_read` | `005` | `(form_id, read)` |
| `idx_feedback_responses_form_created` | `010` | `(form_id, created_at DESC)` |
| `idx_feedback_responses_form_sentiment` | `010` | `(form_id, sentiment)` |

### Enums
| Enum | Values | Migration |
|------|--------|-----------|
| `feedback_sentiment` | `promoter`, `passive`, `detractor` | `001` |
| `feedback_alert_type` | `detractor`, `score_drop`, `keyword` | `001` |

### RLS Policies (after migration 024/025 hardening)
| Policy | Table | Role | Type | Description |
|--------|-------|------|------|-------------|
| `feedback_responses_select_member` | `feedback_responses` | authenticated | SELECT | Workspace members can read |
| `feedback_responses_insert_public` | `feedback_responses` | public | INSERT | Anyone can insert if form is active + mode=feedback |
| `feedback_responses_update_member` | `feedback_responses` | authenticated | UPDATE | Workspace members can flag/unflag |
| `feedback_alerts_select_member` | `feedback_alerts` | authenticated | SELECT | Workspace members can read |
| `feedback_alerts_insert_system` | `feedback_alerts` | public | INSERT | Validated: form_id and response_id must exist |
| `feedback_alerts_update_member` | `feedback_alerts` | authenticated | UPDATE | Workspace members can mark read |

### Tests
| File | Description | Tests |
|------|-------------|-------|
| `src/test/lib/npsCalculator.test.ts` | Unit tests for NPS calculator | 10 tests covering all sentiment classifications and NPS formulas |
| `src/test/hooks/useFeedback.test.ts` | Hook tests for useFeedback | 5 tests: fetch, loading, CRUD methods, realtime, alerts |
| `src/test/pages/FormDashboard.test.tsx` | Integration test for dashboard dispatch | 1 test confirming feedback mode routes to FeedbackDashboard |

### Configuration
| File | Relevance |
|------|-----------|
| `src/integrations/supabase/types.ts` | Auto-generated types for `feedback_responses`, `feedback_alerts`, enums |
| `src/types/database.ts` | Re-exported types: `FeedbackAlertRow`, `FeedbackAlertType` |
| `src/types/forms.ts` | Form type definitions including feedback mode |

---

## 2. E2E Flows

### Flow 2.1: Submit NPS Survey (Public)

**Steps:**
1. User navigates to `/f/:id` where form mode is `feedback`
2. `PublicForm.tsx` fetches form, checks status (active), checks submission limits
3. `FeedbackSurveyPage` renders NPS 0-10 scale buttons
4. User clicks a score button; follow-up section, category selector, and custom fields appear
5. User optionally fills follow-up text, selects category, provides contact info
6. User clicks "Submit Feedback"
7. Client validates: NPS score required, required custom fields checked
8. Client inserts into `feedback_responses` via Supabase
9. DB trigger `handle_feedback_response()` fires BEFORE INSERT: sets `sentiment`, creates `feedback_alerts` entry for detractors, creates `notifications` entry
10. Client dispatches webhook, Slack notification, workflow trigger
11. Thank-you screen displays with score and sentiment badge

**Verdict:** PASS -- complete flow with proper validation and server-side processing.

**Evidence:**
- `FeedbackSurveyPage.tsx:221-298` -- handleSubmit with validation and insert
- `005_feedback_tables.sql:89-143` -- trigger sets sentiment and creates alerts
- `FeedbackSurveyPage.tsx:300-362` -- thank-you screen

**Gaps:**
- G1: No duplicate submission prevention (same user can submit multiple times)
- G2: No rate limiting on public insert endpoint
- G3: Email field has no server-side validation (only `type="email"` HTML attribute)
- G4: Webhook dispatch on line 275-276 sends same event for both detractor and non-detractor (redundant ternary: `WEBHOOK_EVENTS.FEEDBACK_RESPONSE` in both branches)

### Flow 2.2: View Feedback Dashboard (Admin)

**Steps:**
1. Authenticated user navigates to `/forms/:id`
2. `FormDashboard.tsx` fetches form metadata, checks plan access via `canAccessMode("feedback")`
3. If gated, shows `UpgradePrompt` for pro plan
4. `FeedbackDashboard` renders with loading skeletons
5. `useFeedback(formId)` fetches all `feedback_responses` and `feedback_alerts`
6. Data passed to `useFeedbackAnalytics()` for derived stats
7. Dashboard renders: NPS score card, sentiment donut, total responses, NPS trend chart, volume chart, at-risk clients table, category breakdown chart
8. Realtime subscription updates data on new INSERT/UPDATE/DELETE

**Verdict:** PASS -- functional dashboard with comprehensive analytics.

**Evidence:**
- `FormDashboard.tsx:71-73` -- plan gating for feedback mode
- `FeedbackDashboard.tsx:231-912` -- full dashboard rendering
- `useFeedback.ts:32-70` -- realtime subscription for all events

**Gaps:**
- G5: No pagination on responses fetch (fetches ALL responses); will degrade with scale
- G6: Dashboard uses `sonner` toast (line 49) but is a protected page (should use `useToast`)
- G7: `formatDate` helper (line 76-79) hardcodes `"en-US"` locale, breaking i18n

### Flow 2.3: NPS Calculation

**Steps:**
1. `useFeedbackAnalytics` receives array of `FeedbackResponse` objects
2. Filters by date range (7d/30d/90d/all)
3. Calls `calculateNPS()` from `npsCalculator.ts`
4. Formula: `((promoters - detractors) / scored.length) * 100`, rounded

**Verdict:** PASS -- correct NPS formula implementation.

**Evidence:**
- `npsCalculator.ts:16-24` -- NPS calculation
- `npsCalculator.ts:5-9` -- sentiment classification (9-10=promoter, 7-8=passive, 0-6=detractor)
- 10 unit tests covering edge cases in `npsCalculator.test.ts`

**Gaps:**
- G8: `calculateNPS` returns 0 for empty arrays (could be confused with actual NPS of 0; should return `null`)

### Flow 2.4: NPS Delta / Previous Period Comparison

**Steps:**
1. `useFeedbackAnalytics` computes `previousPeriod` responses for the same duration before the current range
2. Calculates `previousNps` and `npsDelta = npsScore - previousNps`
3. Dashboard displays delta with trend arrow

**Verdict:** PASS -- correct period comparison logic.

**Evidence:**
- `useFeedbackAnalytics.ts:23-32` -- previous period calculation
- `useFeedbackAnalytics.ts:35-36` -- delta computation
- `FeedbackDashboard.tsx:419-435` -- delta display with TrendingUp/TrendingDown

**Gaps:**
- G9: When `dateRange === "all"`, `previousPeriod` returns empty array and delta is null; this is correct behavior but undocumented

### Flow 2.5: Detractor Alerts

**Steps:**
1. DB trigger detects `sentiment === 'detractor'` on INSERT
2. Checks form settings for `alertOnDetractor` (defaults to true)
3. Creates `feedback_alerts` record with type `detractor`
4. Creates `notifications` record for workspace owner
5. Dashboard shows unread alerts banner at top
6. Admin can dismiss alerts via "Dismiss" button
7. Alert is marked `read: true` in DB

**Verdict:** PASS -- complete alert lifecycle.

**Evidence:**
- `005_feedback_tables.sql:110-134` -- trigger logic
- `FeedbackDashboard.tsx:323-352` -- alerts banner display
- `useFeedback.ts:112-124` -- markAlertRead function

**Gaps:**
- G10: Alerts do NOT have realtime subscription; new alerts only appear on page refresh
- G11: Only workspace `owner` gets notification (line 122-131 in 005); other team members with editor role are excluded
- G12: `score_drop` and `keyword` alert types exist in the enum but are never triggered by any code

### Flow 2.6: Category Analysis

**Steps:**
1. `useFeedbackAnalytics` groups responses by `category` field
2. Computes NPS per category
3. Renders horizontal bar chart with color-coded NPS scores

**Verdict:** PASS -- functional category breakdown.

**Evidence:**
- `useFeedbackAnalytics.ts:75-88` -- categoryBreakdown computation
- `FeedbackDashboard.tsx:829-905` -- category chart rendering

**Gaps:**
- G13: Responses without a category are grouped as "Uncategorized" (line 78) which is hardcoded in English, breaking i18n

### Flow 2.7: At-Risk Clients

**Steps:**
1. `useFeedbackAnalytics` filters for detractors that are NOT flagged
2. Returns top 20 at-risk clients
3. Dashboard shows table with email, score, follow-up, date, flag button
4. Admin can flag/unflag responses for follow-up

**Verdict:** PASS -- functional at-risk identification.

**Evidence:**
- `useFeedbackAnalytics.ts:90-94` -- atRiskClients filter
- `FeedbackDashboard.tsx:751-827` -- at-risk table

**Gaps:**
- G14: At-risk filter excludes already-flagged responses (line 92: `!r.flagged`), but flagged responses may still need attention; the "at-risk" definition is too narrow
- G15: Table shows only top 10 (`.slice(0, 10)` at line 784) but no "view all" link

### Flow 2.8: Response Flagging

**Steps:**
1. Admin clicks flag icon on at-risk client row
2. `toggleFlag()` updates `flagged` column via Supabase
3. Local state updated optimistically

**Verdict:** PASS -- functional flagging.

**Evidence:**
- `useFeedback.ts:98-110` -- toggleFlag function
- `FeedbackDashboard.tsx:278-285` -- handleToggleFlag

**Gaps:**
- G16: No undo / confirmation dialog for flag toggle

### Flow 2.9: Weekly Trend Chart

**Steps:**
1. `useFeedbackAnalytics` groups responses by week (Sunday start)
2. Computes NPS per week
3. Line chart renders with reference line at 0

**Verdict:** PASS -- functional trend visualization.

**Evidence:**
- `useFeedbackAnalytics.ts:39-59` -- weeklyTrend calculation
- `FeedbackDashboard.tsx:583-645` -- trend chart

**Gaps:**
- G17: Week grouping uses `setDate(getDate() - getDay())` which assumes Sunday as week start; may be incorrect for locales where Monday is week start

---

## 3. Cross-Dependencies

| Dependency | Direction | Description |
|------------|-----------|-------------|
| `forms` table | feedback_responses -> forms | FK on `form_id`; RLS checks form membership |
| `submissions` table | feedback_responses -> submissions | Optional FK on `submission_id` (unused in current code) |
| `notifications` table | trigger -> notifications | Detractor trigger creates notification for workspace owner |
| `workspaces` table | dashboard -> workspaces | Mode gating checks subscription plan |
| `subscriptions` table | PublicForm -> subscriptions | Submission limit check queries subscription plan |
| Webhook system | survey page -> webhookEvents | Dispatches `FEEDBACK_RESPONSE` event |
| Workflow engine | survey page -> workflowEngine | Dispatches `detractor_alert` trigger |
| Slack integration | survey page -> useIntegrations | Dispatches Slack notification |
| AI analysis | dashboard -> useAiAnalysis | AI summary widget consumes feedback responses |
| Churn prediction | dashboard -> useChurnPrediction | AtRiskWidget uses NPS data for churn scoring |
| i18n | all components -> react-i18next | Translation keys throughout |
| Plan limits | dashboard -> usePlanLimits | Feedback mode gated to pro plan |

---

## 4. Parallelism Assessment

| Pair | Conflict Risk | Notes |
|------|---------------|-------|
| Two users submitting feedback simultaneously | NONE | Independent INSERT operations |
| Admin viewing dashboard while submissions arrive | LOW | Realtime subscription handles new entries; race condition unlikely |
| Two admins flagging same response | LOW | Last-write-wins on `flagged` boolean; no conflict resolution |
| Admin dismissing alert while trigger creates new one | NONE | Different records; independent operations |
| Date range filtering while new data arrives | LOW | Filtered in `useMemo` from local state; new data causes re-render |

---

## 5. Auth & RBAC Audit

### Public Access
- **Survey submission**: Correctly gated by RLS to `form.status = 'active' AND form.mode = 'feedback'`
- **No authentication required**: Anonymous users can submit (correct for public surveys)

### Authenticated Access
- **Dashboard read**: Correctly requires workspace membership via `is_workspace_member()`
- **Flag toggle**: Correctly requires workspace membership via UPDATE policy
- **Alert dismiss**: Correctly requires workspace membership via UPDATE policy

### Role Differentiation
| Action | Owner | Editor | Viewer |
|--------|-------|--------|--------|
| View dashboard | Yes | Yes | Yes |
| Flag/unflag responses | Yes | Yes | Yes |
| Dismiss alerts | Yes | Yes | Yes |
| Delete responses | No (no DELETE policy) | No | No |

**Issues:**
- P1: No role differentiation -- viewers can flag responses and dismiss alerts, which are write operations that should likely be restricted to editor+ roles (via RLS UPDATE policy checks `is_workspace_member` but not role)
- P2: No DELETE policy on `feedback_responses` -- responses cannot be deleted by anyone, even workspace owners

---

## 6. Test Coverage Analysis

### Existing Tests

| File | Tests | Coverage |
|------|-------|----------|
| `src/test/lib/npsCalculator.test.ts` | 10 | `calculateSentiment`, `calculateNPS`, `getNPSBreakdown` -- comprehensive |
| `src/test/hooks/useFeedback.test.ts` | 5 | Fetch, loading, CRUD methods, realtime, alerts -- basic happy paths |
| `src/test/pages/FormDashboard.test.tsx` | 1 (feedback-related) | Verifies feedback mode routes to FeedbackDashboard |

### Missing Test Coverage

| Area | Priority | Description |
|------|----------|-------------|
| `useFeedbackAnalytics` hook | HIGH | No tests for date filtering, weekly trend, volume, category breakdown, at-risk, npsDelta |
| `FeedbackSurveyPage` component | HIGH | No rendering tests for NPS scale, form validation, submission flow, thank-you screen |
| `FeedbackDashboard` component | MEDIUM | No rendering tests for charts, alert banner, at-risk table, copy link |
| `useFeedback.submitFeedback()` | MEDIUM | Not tested in `useFeedback.test.ts` (only checks method exists) |
| `useFeedback.toggleFlag()` | MEDIUM | Not tested for actual DB call or state update |
| `useFeedback.markAlertRead()` | MEDIUM | Not tested for actual DB call or state update |
| Custom field rendering | LOW | `CustomFieldInput` not tested |
| Error handling paths | MEDIUM | No tests for failed submissions, network errors |

### Coverage Estimate
- **npsCalculator.ts**: ~95% (excellent)
- **useFeedback.ts**: ~40% (basic)
- **useFeedbackAnalytics.ts**: 0% (none)
- **FeedbackSurveyPage.tsx**: 0% (none)
- **FeedbackDashboard.tsx**: 0% (none)

---

## 7. Code Architecture & Quality

### Strengths
1. **Clean separation of concerns**: Data hook (`useFeedback`) separate from analytics hook (`useFeedbackAnalytics`) separate from UI components
2. **NPS calculator is pure and testable**: No side effects, well-tested
3. **Comprehensive realtime**: `useFeedback` subscribes to INSERT, UPDATE, and DELETE events (better than most hooks in the codebase)
4. **Duplicate prevention in realtime**: Line 43 checks `prev.some((r) => r.id === newResponse.id)` before adding
5. **Proper DB trigger for sentiment**: Server-side sentiment classification prevents client-side tampering
6. **Dark mode support**: All color classes include dark variants
7. **Loading skeletons**: Dashboard uses skeleton components during data fetch
8. **i18n throughout**: All user-facing strings use translation keys

### Weaknesses
1. **`FeedbackDashboard.tsx` is a 913-line monolith**: Should be decomposed into sub-components (NPS card, trend chart, volume chart, at-risk table, category chart)
2. **Direct Supabase calls instead of TanStack Query**: No caching, deduplication, or retry logic
3. **No error boundaries**: Chart rendering errors could crash entire dashboard
4. **`calculateSentiment` called multiple times per render**: In `FeedbackSurveyPage.tsx`, lines 53, 92, 274, 469 call it redundantly for the same score

### Code Smells
- `FeedbackSurveyPage.tsx:303`: Variable `category` shadows the outer-scope `category` state variable (line 188). The inner `const category = calculateSentiment(npsScore)` is confusing.
- `FeedbackSurveyPage.tsx:275-276`: Ternary is a no-op: both branches evaluate to `WEBHOOK_EVENTS.FEEDBACK_RESPONSE`
- `FeedbackDashboard.tsx:49`: Uses `sonner` toast in a protected page (should use `useToast`)

---

## 8. Error Handling & Resilience

### Survey Page (Public)
| Scenario | Handling | Quality |
|----------|----------|---------|
| Submit without NPS score | Toast error + scroll to NPS section | GOOD |
| Required custom field empty | Toast error + scroll to field | GOOD |
| Supabase insert fails | Catch block shows error message, resets state to "idle" | GOOD |
| Non-Error thrown | Fallback to generic message via i18n | GOOD |
| Network timeout | No explicit timeout; relies on Supabase client defaults | FAIR |

### Dashboard (Admin)
| Scenario | Handling | Quality |
|----------|----------|---------|
| Fetch returns error | Silently swallowed (line 15-28 in useFeedback); `data ?? []` fallback | POOR |
| Toggle flag fails | Shows error toast | GOOD |
| Dismiss alert fails | Silently swallowed (no error toast on line 289) | POOR |
| Copy link fails | Shows error toast | GOOD |
| Zero responses | Empty state messages displayed | GOOD |

### Missing Error Handling
- No error state in `useFeedback` hook (no `error` in return value)
- No retry logic on failed fetches
- No error boundary around Recharts components
- Alert dismiss failure (line 289) shows no user feedback

---

## 9. Responsive Design Audit

### Public Survey Page (`FeedbackSurveyPage.tsx`)

| Breakpoint | Element | Behavior | Quality |
|------------|---------|----------|---------|
| Mobile (<640px) | NPS buttons | `grid-cols-6` -- wraps to 2 rows | GOOD |
| Mobile | Contact info | `grid-cols-1` -- stacks vertically | GOOD |
| Tablet (640px+) | NPS buttons | `grid-cols-11` -- single row | GOOD |
| Tablet | Contact info | `grid-cols-2` -- side by side | GOOD |
| All | Container | `max-w-2xl mx-auto` | GOOD |
| All | Text sizes | `text-2xl sm:text-3xl md:text-4xl` responsive | GOOD |
| Mobile | NPS labels | `text-[11px] sm:text-sm` -- reduced size on mobile | GOOD |

**Issues:**
- R1: On 6-column mobile grid, the 11th NPS button (score 10) sits alone on row 2, creating visual asymmetry. Consider `grid-cols-4` for better balance.

### Dashboard (`FeedbackDashboard.tsx`)

| Breakpoint | Element | Behavior | Quality |
|------------|---------|----------|---------|
| Mobile | Stats cards | `grid-cols-1` | GOOD |
| Tablet | Stats cards | `sm:grid-cols-2` | GOOD |
| Desktop | Stats cards | `lg:grid-cols-3` | GOOD |
| Mobile | Action bar | `flex-col` stacked | GOOD |
| Desktop | Action bar | `sm:flex-row` horizontal | GOOD |
| Mobile | At-risk table | Follow-up column hidden (`hidden md:table-cell`) | GOOD |
| Mobile | At-risk table | Date column hidden (`hidden sm:table-cell`) | GOOD |
| Mobile | Bottom row | `grid-cols-1` stacked | GOOD |
| Desktop | Bottom row | `lg:grid-cols-2` side by side | GOOD |

**Issues:**
- R2: Charts use fixed heights (300px) which may be too tall on very small mobile screens
- R3: Donut chart container is `w-[120px] h-[120px]` fixed -- adequate but tight on mobile

---

## 10. Database & Query Optimization

### Index Coverage

| Query Pattern | Index Used | Status |
|---------------|------------|--------|
| `feedback_responses WHERE form_id = X ORDER BY created_at DESC` | `idx_feedback_responses_form_created` | COVERED |
| `feedback_responses WHERE form_id = X AND sentiment = Y` | `idx_feedback_responses_form_sentiment` | COVERED |
| `feedback_responses WHERE form_id = X AND nps_score = Y` | `idx_feedback_responses_nps` | COVERED |
| `feedback_alerts WHERE form_id = X ORDER BY created_at DESC` | `idx_feedback_alerts_form` | COVERED |
| `feedback_alerts WHERE form_id = X AND read = false` | `idx_feedback_alerts_read` | COVERED |

### Query Performance Concerns

| Issue | Severity | Description |
|-------|----------|-------------|
| No pagination | HIGH | `useFeedback.ts:17-20` fetches ALL responses with `select("*")`. For forms with 10K+ responses, this will be slow and memory-intensive |
| Full client-side analytics | MEDIUM | All NPS calculation, weekly trend, volume, category breakdown computed in `useMemo` on client. Should be server-side aggregate queries for large datasets |
| No query limit on alerts | LOW | All alerts fetched; unlikely to be high volume |
| Realtime on all events | LOW | DELETE subscription (line 59-63) is rare but harmless |

### RLS Query Performance
- `feedback_responses_select_member` and `feedback_responses_update_member` use a subquery joining `forms` table with `is_workspace_member()` function call -- standard pattern but adds overhead per row. For large result sets, this is mitigated by the `form_id` filter in the application query.

### Missing DELETE Policy
- No DELETE policy exists on `feedback_responses`. Responses cannot be deleted by any user. This is a feature decision (immutable feedback records) but should be documented. GDPR "right to erasure" may require a DELETE policy for compliance.

---

## 11. Accessibility Audit

### NPS Scale Component

| Criterion | Status | Details |
|-----------|--------|---------|
| `aria-label` on buttons | PASS | `aria-label={\`Score ${score}\`}` (line 443) |
| `aria-pressed` on buttons | PASS | `aria-pressed={npsScore === score}` (line 444) |
| Focus visibility | PASS | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (line 440) |
| Keyboard navigation | PARTIAL | Buttons are focusable but no `role="radiogroup"` or arrow key navigation |
| Color contrast | PASS | Selected states use bold colors with white text |
| Required field indicator | PASS | Asterisk with `aria-hidden="true"` on required custom fields (line 539) |

### Survey Form

| Criterion | Status | Details |
|-----------|--------|---------|
| Form labels | PASS | `<Label htmlFor>` used for follow-up, category, contact fields |
| Error messages | PARTIAL | Errors shown via toast only; no inline error messages or `aria-invalid` |
| Submit button disabled state | PASS | `disabled={submitState === "submitting" || npsScore === null}` (line 620) |
| Loading spinner | PASS | Visible spinner during submission |

### Dashboard

| Criterion | Status | Details |
|-----------|--------|---------|
| Chart accessibility | POOR | Recharts provides no screen reader alternative text; data is visual-only |
| Table headers | PASS | Proper `<TableHead>` elements used |
| Color-only information | PARTIAL | NPS trend colors (red/yellow/green) have text accompaniment but charts rely heavily on color |

### Issues
- A1: NPS buttons should use `role="radiogroup"` with `role="radio"` for proper semantics (currently plain buttons)
- A2: No inline validation errors; screen reader users only hear toast messages
- A3: Charts have no `aria-label` or text alternative for screen readers
- A4: `helpText` for custom fields (line 554-558) is not linked via `aria-describedby`

---

## 12. SEO Audit

### Public Survey Page (`/f/:id`)

| Criterion | Status | Details |
|-----------|--------|---------|
| `<title>` tag | FAIL | No dynamic page title set; uses default Vite HTML title |
| `<meta description>` | FAIL | No meta description for survey pages |
| Open Graph tags | FAIL | No OG tags for social sharing of survey links |
| Semantic HTML | PARTIAL | Uses `<h1>` for title but no `<main>`, `<article>`, or `<section>` elements |
| URL structure | GOOD | Clean `/f/:id` URL |
| `robots` meta | N/A | Survey pages should be indexable if public |

**Issues:**
- S1: No `<title>` tag management (no react-helmet or similar). Survey pages share the generic app title.
- S2: No Open Graph / Twitter Card meta tags. Shared survey links will have no preview image or description.
- S3: No structured data (JSON-LD) for survey/form schema.

---

## 13. Documentation Audit

| Aspect | Status | Details |
|--------|--------|---------|
| CLAUDE.md coverage | GOOD | Feedback mode documented in sections 1, 4, 7, 13, 14 |
| Database schema | GOOD | All tables, triggers, RLS policies documented |
| NPS formula | GOOD | Documented in CLAUDE.md section 13 |
| Sentiment thresholds | GOOD | Documented: 9-10=promoter, 7-8=passive, 0-6=detractor |
| API/hook documentation | POOR | No JSDoc comments in `useFeedback.ts` or `useFeedbackAnalytics.ts` |
| Component props | PARTIAL | TypeScript interfaces defined but no JSDoc descriptions |
| Form settings schema | POOR | `settings.categories`, `settings.alertOnDetractor` are undocumented magic keys |

---

## 14. Product Growth & Innovation (7 Lenses)

### 14.1 Activation
- **Current**: User creates feedback form, sets to active, shares link
- **Gap**: No onboarding flow specific to feedback mode; no guided NPS survey setup
- **Opportunity**: Add a "Setup Wizard" that walks through categories, branding, and first test submission

### 14.2 Engagement
- **Current**: Dashboard shows NPS trends, at-risk clients, category analysis
- **Gap**: No scheduled/recurring surveys, no email-embedded NPS
- **Opportunity**: Email-embedded NPS (click score in email body) would dramatically increase response rates

### 14.3 Retention
- **Current**: Detractor alerts notify workspace owner
- **Gap**: No follow-up workflow for detractors (e.g., auto-send email, create support ticket)
- **Opportunity**: Automated detractor response workflow: "When detractor detected, create support ticket and send acknowledgment email"

### 14.4 Revenue
- **Current**: Feedback mode gated to Pro plan
- **Gap**: No premium analytics features (cohort analysis, benchmark comparison, export)
- **Opportunity**: Premium features: historical benchmarks, industry comparison, PDF report export

### 14.5 Referral/Viral
- **Current**: No sharing or viral mechanics in feedback mode
- **Gap**: Promoters are identified but not leveraged
- **Opportunity**: "Promoter CTA" -- when a promoter submits (score 9-10), show a prompt to leave a review on G2/Capterra or share referral link

### 14.6 Data & Analytics
- **Current**: Client-side analytics with useMemo
- **Gap**: No aggregation queries, no export, no scheduled reports
- **Opportunity**: Server-side analytics with PostgreSQL aggregate functions; CSV export; scheduled weekly NPS email digest

### 14.7 Platform/Ecosystem
- **Current**: Webhook + Slack + workflow integration for feedback events
- **Gap**: No Zapier/native CRM integration for detractor follow-up
- **Opportunity**: Native Salesforce/HubSpot integration to create contacts and flag at-risk accounts

---

## 15. Issues Found

### P0 -- Critical (Production Blockers)

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | No pagination on feedback_responses query; fetches ALL rows. Forms with 10K+ responses will cause client-side memory exhaustion and degraded performance | Performance | HIGH | `src/hooks/useFeedback.ts` | 17-20 | Dashboard becomes unusable at scale |
| 2 | No DELETE RLS policy on `feedback_responses`; GDPR right-to-erasure cannot be fulfilled via client | Compliance | HIGH | `supabase/migrations/005_feedback_tables.sql` | -- | GDPR non-compliance risk |

### P1 -- High (Significant Bugs / Security)

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 3 | Feedback alerts have NO realtime subscription; new detractor alerts only appear on page refresh | Functionality | HIGH | `src/hooks/useFeedback.ts` | 35-66 | Admins miss critical detractor alerts in real-time |
| 4 | `feedback_alerts_insert_system` policy is public role (not authenticated); while validated via form_id + response_id existence, a malicious client could insert fake alerts for any valid form/response pair | Security | MEDIUM | `supabase/migrations/025_policy_hardening.sql` | 68-73 | Potential alert spam by unauthenticated users |
| 5 | Viewer role can UPDATE feedback_responses (flag) and feedback_alerts (dismiss); RLS UPDATE policies only check `is_workspace_member`, not role | RBAC | HIGH | `supabase/migrations/024_rls_role_remediation.sql` | 210-218 | Viewers performing write operations they shouldn't |
| 6 | Dashboard uses `sonner` toast import instead of `useToast` hook, violating the project's dual-toast convention for protected pages | Convention | HIGH | `src/components/feedback/FeedbackDashboard.tsx` | 49 | Inconsistent toast behavior/styling |
| 7 | `score_drop` and `keyword` alert types exist in DB enum but have zero implementation; dead enum values | Technical Debt | HIGH | `supabase/migrations/001_core_tables_and_enums.sql` | 11 | Misleading schema; suggests unfinished feature |
| 8 | Only workspace owner receives detractor notification; editors with responsibility for feedback are excluded | Functionality | MEDIUM | `supabase/migrations/005_feedback_tables.sql` | 122-131 | Team members miss critical alerts |

### P2 -- Medium (Quality / UX / Maintainability)

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 9 | `formatDate` and `formatWeek` helpers hardcode `"en-US"` locale, breaking i18n for non-English users | i18n | HIGH | `src/components/feedback/FeedbackDashboard.tsx` | 76-84 | Dates display in English regardless of user locale |
| 10 | Variable shadowing: inner `const category = calculateSentiment(npsScore)` shadows outer `category` state | Code Quality | HIGH | `src/components/feedback/FeedbackSurveyPage.tsx` | 303 | Confusing code; potential future bugs |
| 11 | Redundant webhook ternary: both branches evaluate to same value `WEBHOOK_EVENTS.FEEDBACK_RESPONSE` | Code Quality | HIGH | `src/components/feedback/FeedbackSurveyPage.tsx` | 275-276 | Dead code; likely intended to use different event for detractors |
| 12 | "Uncategorized" fallback string is hardcoded in English | i18n | HIGH | `src/hooks/useFeedbackAnalytics.ts` | 78 | Category chart label not translated |
| 13 | NPS buttons on mobile use 6-column grid; score 10 sits alone on second row | UX | MEDIUM | `src/components/feedback/FeedbackSurveyPage.tsx` | 430 | Visual asymmetry on mobile |
| 14 | No inline form validation errors; errors only shown via toast notifications | Accessibility | MEDIUM | `src/components/feedback/FeedbackSurveyPage.tsx` | 225-240 | Screen reader users may miss validation errors |
| 15 | NPS buttons lack `role="radiogroup"` semantics | Accessibility | MEDIUM | `src/components/feedback/FeedbackSurveyPage.tsx` | 430-448 | Improper ARIA semantics for mutually exclusive selection |
| 16 | Charts have no screen reader alternative text | Accessibility | MEDIUM | `src/components/feedback/FeedbackDashboard.tsx` | 598-642 | Charts are invisible to screen readers |
| 17 | No `<title>` tag or OG meta tags on public survey page | SEO | MEDIUM | `src/components/feedback/FeedbackSurveyPage.tsx` | -- | Poor social sharing preview; no tab title |
| 18 | `calculateNPS` returns 0 for empty arrays; indistinguishable from actual NPS of 0 | Logic | LOW | `src/lib/npsCalculator.ts` | 18 | Dashboard may show misleading "0" instead of "N/A" |
| 19 | `FeedbackDashboard.tsx` is 913 lines; should be decomposed into sub-components | Maintainability | LOW | `src/components/feedback/FeedbackDashboard.tsx` | 1-913 | Difficult to maintain and test |
| 20 | `useFeedback` hook has no error state in return value; errors are silently swallowed | Error Handling | MEDIUM | `src/hooks/useFeedback.ts` | 15-29 | Admins see empty dashboard on fetch failure with no feedback |
| 21 | No duplicate submission prevention; same anonymous user can submit unlimited feedback | Functionality | MEDIUM | `src/components/feedback/FeedbackSurveyPage.tsx` | 267-269 | Data pollution from repeated submissions |
| 22 | Alert dismiss failure on line 289 shows no user feedback | Error Handling | LOW | `src/components/feedback/FeedbackDashboard.tsx` | 287-292 | Admin thinks alert was dismissed when it wasn't |
| 23 | At-risk clients table limited to 10 with no "view all" link | UX | LOW | `src/components/feedback/FeedbackDashboard.tsx` | 784 | Large detractor list truncated silently |
| 24 | No CSV export for feedback responses (waitlist mode has CSV export, feedback does not) | Feature Parity | MEDIUM | `src/hooks/useFeedback.ts` | -- | Users cannot export feedback data from dashboard |
| 25 | `submission_id` FK in feedback_responses is never populated by the submit flow | Technical Debt | LOW | `src/components/feedback/FeedbackSurveyPage.tsx` | 246-265 | Orphaned column; join to submissions table always null |
| 26 | Custom field `helpText` is not linked via `aria-describedby` to input | Accessibility | LOW | `src/components/feedback/FeedbackSurveyPage.tsx` | 554-558 | Help text not announced to screen readers |
| 27 | Week grouping assumes Sunday as first day of week | i18n | LOW | `src/hooks/useFeedbackAnalytics.ts` | 45 | Incorrect week boundaries for Monday-start locales |
| 28 | `useFeedbackAnalytics` has 0% test coverage | Testing | MEDIUM | `src/hooks/useFeedbackAnalytics.ts` | -- | All analytics logic is untested |

---

## 16. Recommended Fix Path

### Immediate (Sprint 1)

1. **Add pagination to `useFeedback`** (P0-1): Implement cursor-based or offset pagination with a reasonable page size (e.g., 100). Move analytics aggregation to server-side PostgreSQL queries for large datasets.

2. **Add DELETE RLS policy for GDPR** (P0-2): Create migration with workspace-member DELETE policy on `feedback_responses`. Ensure cascading delete also removes related `feedback_alerts`.

3. **Add realtime subscription for feedback_alerts** (P1-3): In `useFeedback.ts`, add a channel subscription for `feedback_alerts` table INSERT events to show new detractor alerts in real-time.

4. **Fix toast import in FeedbackDashboard** (P1-6): Replace `import { toast } from "sonner"` with `import { useToast } from "@/hooks/use-toast"` and update all toast calls.

5. **Fix RBAC on feedback UPDATE policies** (P1-5): Add role check to RLS UPDATE policies: `get_workspace_role(auth.uid(), f.workspace_id) IN ('owner', 'editor')`.

### Short-Term (Sprint 2)

6. **Fix i18n issues** (P2-9, P2-12, P2-27): Replace hardcoded `"en-US"` locale with user's locale. Translate "Uncategorized" via i18n key. Consider locale-aware week start.

7. **Fix variable shadowing and dead code** (P2-10, P2-11): Rename inner `category` variable. Fix webhook ternary to dispatch different events for detractors vs. non-detractors.

8. **Add tests for `useFeedbackAnalytics`** (P2-28): Write unit tests for date filtering, weekly trend, volume by sentiment, category breakdown, at-risk clients, and NPS delta.

9. **Improve accessibility** (P2-14, P2-15, P2-16): Add `role="radiogroup"` to NPS container. Add inline validation errors. Add `aria-label` to chart containers.

10. **Add CSV export for feedback responses** (P2-24): Implement CSV export similar to waitlist mode's existing export.

### Medium-Term (Sprint 3-4)

11. **Decompose FeedbackDashboard** (P2-19): Extract NPS card, trend chart, volume chart, at-risk table, and category chart into separate components.

12. **Add error state to useFeedback** (P2-20): Return `error` state alongside `loading` and display error UI in dashboard.

13. **Implement score_drop and keyword alert types** (P1-7): Or remove from enum if not planned.

14. **Notify all editors on detractor alerts** (P1-8): Modify trigger to notify all workspace members with editor+ role.

15. **Add SEO meta tags for survey pages** (P2-17): Implement `react-helmet-async` or similar for dynamic page titles and OG tags.

16. **Add duplicate submission prevention** (P2-21): Use `localStorage` fingerprint or form-level setting for single-submission enforcement.

---

*End of scan report.*
