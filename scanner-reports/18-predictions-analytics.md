# Scanner Report 18: Predictions & Analytics

**Feature**: Churn Prediction, At-Risk Customer Dashboard, Analytics Dashboards, Trend Charts
**Scanner**: Feature 18 Deep Scan
**Date**: 2026-03-15
**Status**: COMPLETE

---

## 1. Touchpoints

### Components (src/components/)
| File | Purpose | Lines |
|------|---------|-------|
| `predictions/AtRiskDashboard.tsx` | Full-page churn prediction dashboard with table, filters, detail expansion | 377 |
| `predictions/AtRiskWidget.tsx` | Top-5 at-risk customer card (embedded in Feedback/Support dashboards) | 88 |
| `predictions/ChurnScoreBadge.tsx` | Inline risk score badge with color-coded dot | 52 |
| `predictions/AiCannedSuggestions.tsx` | AI-powered response suggestions for ticket replies | 157 |
| `feedback/FeedbackDashboard.tsx` | NPS score, sentiment donut, weekly trend, volume chart, at-risk clients, category NPS | 913 |
| `support/SupportDashboard.tsx` | Ticket volume, priority donut, category/agent workload bars, resolution trend line | ~1200 |
| `waitlist/WaitlistDashboard.tsx` | Signup growth area chart, referral leaderboard, source pie chart | ~540 |
| `FormResponsesTab.tsx` | Standard form response analytics (choice bar charts, number stats, text latest) | 266 |
| `dashboard/DashboardHome.tsx` | Global dashboard home (total forms, monthly/today counts, most active) | 292 |
| `ui/chart.tsx` | shadcn/ui Recharts wrapper (ChartContainer, ChartTooltipContent) | ~280 |
| `upgrade/FeatureGate.tsx` | Plan-gating wrapper (blurs content + shows upgrade CTA for non-business plans) | 77 |

### Hooks (src/hooks/)
| File | Purpose | Lines |
|------|---------|-------|
| `useChurnPrediction.ts` | 4 hooks: `useAtRiskCustomers`, `useCustomerRiskScore`, `useCalculateChurnScores`, `useAutoCalculateChurnScores` + helper fns | 204 |
| `useFeedbackAnalytics.ts` | NPS score, delta, breakdown, weekly trend, volume by sentiment, category breakdown, at-risk clients | 106 |
| `useWaitlistAnalytics.ts` | Stats, daily signups, referral leaderboard, source breakdown | 94 |
| `useSupportAnalytics.ts` | Stats (open/resolved/SLA), volume by day, priority, agent workload, category, resolution trend | 131 |

### Edge Functions (supabase/functions/)
| File | Purpose | Lines |
|------|---------|-------|
| `churn-score/index.ts` | Calculates risk scores for all customers in a workspace (NPS + tickets + sentiment + engagement) | 299 |

### Utilities (src/lib/)
| File | Purpose | Lines |
|------|---------|-------|
| `npsCalculator.ts` | `calculateNPS()`, `getNPSBreakdown()`, `calculateSentiment()` | 36 |
| `analytics.ts` | Web Vitals tracking (FCP, LCP, CLS, TTFB) + custom event tracker | 191 |

### Database (supabase/migrations/)
| File | Purpose |
|------|---------|
| `020_predictions.sql` | `churn_scores` table, indexes, RLS policies, `updated_at` trigger, `ai_classification` on tickets |
| `024_rls_role_remediation.sql` (lines 495-517) | Remediates churn_scores RLS to `authenticated` role |

### Routes (src/App.tsx)
| Path | Component | Auth |
|------|-----------|------|
| `/at-risk` | `AtRiskDashboard` (lazy loaded) | ProtectedRoute |

### Navigation (src/components/Navbar.tsx)
- Line 51: "At-Risk" nav link with `AlertTriangle` icon visible to ALL authenticated users (not plan-gated at nav level)

### i18n
- `src/i18n/locales/en.json` lines 1227-1260: `predictions.*` namespace (30+ keys)
- `src/i18n/locales/he.json` lines 1227-1260: Hebrew translations for same keys

### Build Config (vite.config.ts)
- Line 28: Recharts isolated into `vendor-charts` manual chunk for code splitting

---

## 2. E2E Flows

### Flow 1: View Feedback Analytics Dashboard
**Path**: User navigates to `/forms/:id` with a feedback-mode form
**Steps**:
1. `FormDashboard.tsx` dispatches to `FeedbackDashboard` based on `form.mode === "feedback"`
2. `useFeedback(formId)` fetches all `feedback_responses` + `feedback_alerts` from Supabase
3. `useFeedbackAnalytics(responses, dateRange)` computes NPS, breakdown, weekly trend, volume by sentiment, category breakdown, at-risk clients via `useMemo`
4. Recharts renders: PieChart (sentiment donut), LineChart (NPS trend), BarChart (volume by sentiment), BarChart (category NPS)
5. Date range filter (7d/30d/90d/all) triggers re-computation
6. `AtRiskWidget` renders at bottom of dashboard

**Verdict**: **PASS with caveats**
- All chart types render correctly with empty states
- Date range filtering works via `useMemo` recomputation
- **P2**: `formatDate` helper at `FeedbackDashboard.tsx:77` uses hardcoded `"en-US"` locale instead of respecting i18n locale
- **P2**: Weekly trend aggregation at `useFeedbackAnalytics.ts:45` uses `setDate(getDate() - getDay())` which does not account for locale-specific week starts (Sunday vs Monday)

### Flow 2: View Support Analytics Dashboard
**Path**: User navigates to `/forms/:id` with a support-mode form, clicks Analytics tab
**Steps**:
1. `SupportDashboard` renders stat cards (open, in-progress, resolved, unassigned, resolved today)
2. `useSupportAnalytics(tickets)` computes: volume by day, priority breakdown, agent workload, category breakdown, SLA breaches, resolution trend
3. Charts: BarChart (ticket volume), PieChart (priority), BarChart (category + agent workload), LineChart (resolution trend)
4. `AtRiskWidget` at line 1162

**Verdict**: **PASS with caveats**
- SLA breach detection works (>24h without first response)
- **P2**: Agent workload chart at `SupportDashboard.tsx:1062` displays agent UUID instead of name/email (raw `t.assigned_to` UUID shown on Y-axis)
- **P2**: Resolution trend at `useSupportAnalytics.ts:109-120` has no date windowing -- returns ALL resolved tickets sorted then slices last 30 entries (not last 30 days)

### Flow 3: Churn Prediction / At-Risk Dashboard
**Path**: User clicks "At-Risk" in navbar -> `/at-risk`
**Steps**:
1. `AtRiskDashboard` loads (lazy), wrapped in `FeatureGate feature="churn_prediction" requiredPlan="business"`
2. `useAtRiskCustomers(workspaceId)` fetches from `churn_scores` table ordered by `risk_score DESC`
3. Summary cards show critical/high/medium/low counts
4. Filter dropdown filters by risk level
5. Click on row expands detail panel with NPS average, ticket count, sentiment trend, days since contact
6. "Recalculate" button triggers `useCalculateChurnScores` -> calls `churn-score` edge function
7. Edge function: authenticates via JWT, fetches all forms in workspace, collects unique emails from feedback_responses/tickets/submissions, loops through each email making 3-4 DB queries per customer, calculates risk score, upserts into `churn_scores`

**Verdict**: **FAIL (P0/P1 issues)**
- **P0**: The edge function uses `SUPABASE_SERVICE_ROLE_KEY` to create its Supabase client (line 15), which bypasses RLS. However, the `churn_scores` INSERT/UPDATE RLS policies at migration 024 require `is_workspace_member(auth.uid(), workspace_id)`. The service role key bypasses RLS entirely, so the upsert works, BUT the workspace membership check the user performed is only via JWT auth (line 93) -- the function does NOT verify the user is a member of the requested workspace. **Any authenticated user can calculate and view churn scores for ANY workspace by supplying an arbitrary `workspace_id`.**
- **P1**: N+1 query pattern in edge function (lines 188-273): For each customer email, the function makes 3-4 sequential Supabase queries (NPS data, ticket count, last ticket, etc.). With 100 customers, this is 300-400 DB round trips per invocation. Will timeout on workspaces with many customers.
- **P1**: `risk_factors` field name mismatch between edge function and frontend hook:
  - Edge function writes `risk_factors.last_interaction` (line 256)
  - Frontend `ChurnScore.risk_factors` interface expects `last_interaction_at` (line 19 of `useChurnPrediction.ts`)
  - This means `factors.days_since_interaction` will always be populated (from the `days_since_interaction` field), but the detail panel at `AtRiskDashboard.tsx:353` reads `factors.sentiment_trend` which IS correct; however, the inconsistency means `last_interaction` in `risk_factors` JSONB does not match the interface name

### Flow 4: Auto-Calculate Churn Scores
**Path**: User visits any dashboard with `AtRiskWidget`
**Steps**:
1. `AtRiskWidget` (line 24) calls `useAutoCalculateChurnScores(workspaceId)`
2. Hook checks `churn_scores` table for newest `last_scored_at` for the workspace
3. If stale (>24 hours) or no data, triggers `churn-score` edge function automatically
4. After calculation completes, `AtRiskWidget` refetches via ref-based effect (lines 27-33)
5. Only customers with `risk_score > 40` are displayed

**Verdict**: **PASS with caveats**
- `triggeredRef` prevents duplicate auto-calculations within the same component lifecycle
- **P2**: Auto-calculation triggers on EVERY page that mounts `AtRiskWidget` (both FeedbackDashboard and SupportDashboard embed it). If a user navigates between these pages, the stale check runs twice but `triggeredRef` prevents double-fire only within the same mount
- **P2**: No user-facing indicator that auto-calculation is happening (calculating state is tracked but not rendered in AtRiskWidget)

### Flow 5: Waitlist Analytics
**Path**: User views waitlist form dashboard
**Steps**:
1. `useWaitlistAnalytics(formId)` fetches ALL waitlist entries for the form
2. Computes stats (total, today, this week, referral rate), daily signups with cumulative, leaderboard, source breakdown
3. Charts: AreaChart (signup growth with cumulative + daily), PieChart (source: direct vs referral)

**Verdict**: **PASS**
- Clean `useMemo` computations
- **P2**: No pagination -- fetches all entries with `select("*")` at line 33-36 of `useWaitlistAnalytics.ts`

### Flow 6: Standard Form Response Analytics
**Path**: User views FormBuilder and switches to Responses tab
**Steps**:
1. `FormResponsesTab` fetches submissions for the form
2. Categorizes fields by type (choice, number, text)
3. Choice fields: horizontal bar chart with option counts
4. Number fields: avg/min/max stat cards
5. Text fields: latest 5 responses

**Verdict**: **PASS**
- Realtime subscription for new submissions (line 47-53)
- **P2**: No pagination -- fetches all submissions

---

## 3. Cross-Dependencies

### Upstream Dependencies
| This Feature | Depends On | How |
|-------------|-----------|-----|
| AtRiskDashboard | WorkspaceContext | `currentWorkspace.id` for scoping queries |
| AtRiskWidget | FeatureGate + usePlanLimits | Plan-gated to `business` tier |
| FeedbackDashboard charts | useFeedback hook | Raw responses passed to analytics hook |
| SupportDashboard charts | useTickets hook | Raw tickets passed to analytics hook |
| WaitlistDashboard charts | useWaitlistAnalytics | Direct Supabase fetch (not via useWaitlist) |
| churn-score edge fn | Supabase service role key | Env secret `SUPABASE_SERVICE_ROLE_KEY` |
| ChurnScoreBadge | useChurnPrediction helpers | `getRiskLevel`, `getRiskColor`, `getRiskBgColor` |
| All dashboards | Recharts | `vendor-charts` chunk |

### Downstream Dependents
| This Feature | Used By | How |
|-------------|--------|-----|
| AtRiskWidget | FeedbackDashboard (line 910), SupportDashboard (line 1162) | Embedded widget |
| ChurnScoreBadge | AtRiskDashboard, AtRiskWidget | Inline score display |
| useFeedbackAnalytics | FeedbackDashboard | NPS, breakdown, trends |
| useSupportAnalytics | SupportDashboard | Stats, charts |
| AiCannedSuggestions | TicketDetail (line 45) | AI reply suggestions |
| npsCalculator | useFeedbackAnalytics | Core NPS math |

### Integration Points
- `churn-score` edge function reads from: `forms`, `feedback_responses`, `tickets`, `submissions` tables
- `churn-score` edge function writes to: `churn_scores` table
- `AtRiskDashboard` registered as lazy route in `App.tsx:41`, route at line 157
- Navbar at line 51 always shows "At-Risk" link (not conditionally hidden for free plan users)

---

## 4. Parallelism Assessment

| Component | Can Be Modified Independently? | Shared State | Risk |
|-----------|-------------------------------|-------------|------|
| AtRiskDashboard | YES | WorkspaceContext only | LOW |
| AtRiskWidget | YES | WorkspaceContext only | LOW |
| ChurnScoreBadge | YES | Stateless presentation | NONE |
| useFeedbackAnalytics | CAUTION | Shared with FeedbackDashboard | MEDIUM |
| useSupportAnalytics | CAUTION | Shared with SupportDashboard | MEDIUM |
| useWaitlistAnalytics | CAUTION | Shared with WaitlistDashboard | MEDIUM |
| churn-score edge fn | YES | Independent serverless | LOW |
| npsCalculator | CAUTION | Used by useFeedbackAnalytics + FeedbackDashboard | MEDIUM |
| FormResponsesTab | YES | Self-contained | LOW |

**Max safe parallelism**: 3 developers (1 on predictions components, 1 on mode-specific analytics hooks, 1 on edge function)

---

## 5. Edge Function / Serverless Audit: churn-score

### Architecture
- **Runtime**: Deno (Supabase Edge Functions)
- **Auth**: JWT validation via `supabase.auth.getUser()` (line 92-93)
- **Data access**: Uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- **Input**: `{ workspace_id: string }` from POST body
- **Output**: `{ scored: number, message: string }`

### Security Issues

**P0: Missing workspace membership check**
- `churn-score/index.ts:102-103`: Accepts `workspace_id` from request body without verifying the authenticated user is a member of that workspace
- The function only checks that the JWT is valid (lines 82-100), not that the user has access to the workspace
- **Impact**: Any authenticated user can trigger churn score calculation for any workspace and read the results via `churn_scores` table (RLS on SELECT requires workspace membership, but the upsert via service role bypasses this)
- **Fix**: Add workspace membership check after auth:
  ```ts
  const { data: member } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("workspace_id", workspace_id)
    .maybeSingle();
  if (!member) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, ... });
  ```

**P1: Sequential N+1 queries**
- Lines 188-273: `for (const email of allEmails)` loop makes 3-4 DB queries per email
- With 500 customers: ~2000 sequential DB calls
- Edge function default timeout is 60s -- this WILL timeout on moderate workspaces
- **Fix**: Batch queries using `.in()` for all emails at once, then aggregate in-memory

### Performance Profile
| Operation | Queries | Scaling |
|-----------|---------|---------|
| Fetch forms | 1 | O(1) |
| Collect emails | 3 | O(1) per table |
| Score per customer | 3-4 | **O(N) where N = unique customers** |
| Upsert scores | 1 | O(1) batch |
| **Total** | **6 + 3.5*N** | **Linear, dangerous** |

### CORS
- `Access-Control-Allow-Origin: *` (line 19): Acceptable for now but should be restricted in production

### Error Handling
- Catches auth errors (401), missing fields (400), upsert errors (500), generic catch (500)
- **P2**: Error responses don't include correlation IDs for debugging
- **P2**: `console.error` is the only logging mechanism (no structured logging)

---

## 6. Runtime Performance Audit

### Chart Rendering

**FeedbackDashboard (913 lines, 5 Recharts components)**
- PieChart: Sentiment donut (3 data points) -- negligible
- LineChart: NPS weekly trend -- O(weeks) data points, bounded by date range
- BarChart (stacked): Volume by sentiment -- O(days) data points
- BarChart (horizontal): Category NPS -- O(categories), dynamic height via `Math.max(200, length * 48)`
- **Risk**: With `dateRange="all"` and years of data, the stacked BarChart could render hundreds of bars. No data downsampling exists.

**SupportDashboard (~1200 lines, 5 Recharts components)**
- BarChart: Ticket volume by day -- O(days), unbounded
- PieChart: Priority breakdown -- 4 data points max
- BarChart (2x): Category + agent workload -- O(categories/agents)
- LineChart: Resolution trend -- last 30 entries (bounded)
- **Risk**: Volume-by-day chart has NO date windowing -- renders ALL historical days

**WaitlistDashboard (~540 lines, 2 Recharts components)**
- AreaChart: Signup growth (daily + cumulative) -- O(days), unbounded
- PieChart: Source breakdown -- 2 data points
- **Risk**: Same unbounded growth chart concern

**FormResponsesTab (266 lines)**
- BarChart per choice field -- O(options * fields)
- **Risk**: Many choice fields with many options could create tall scrollable charts, but height is adaptive

### Data Computation

**useFeedbackAnalytics** (6 `useMemo` computations on every render cycle when responses change):
- `filtered`: O(N) filter
- `previousPeriod`: O(N) filter
- `npsScore`: O(N) via `calculateNPS`
- `weeklyTrend`: O(N) group + sort
- `volumeBySentiment`: O(N) group + sort
- `categoryBreakdown`: O(N) group
- `atRiskClients`: O(N) filter + slice
- **Total**: ~7 * O(N) per responses change. Acceptable for <10K responses.

**useSupportAnalytics** (7 `useMemo` computations):
- All O(N) -- similar profile to feedback analytics
- `slaBreaches` at line 97: Recomputes on every render since `Date.now()` changes. However, since it's inside `useMemo([tickets])`, it only recalculates when tickets array reference changes. **Correct behavior.**

**useWaitlistAnalytics**:
- Fetches ALL waitlist entries on mount (line 32-40): No pagination, `select("*")`
- 5 `useMemo` computations, all O(N)

### Memory Concerns
- **P2**: All analytics hooks hold full datasets in state (`useState` arrays). With large datasets (>10K entries), this consumes significant memory since the data is duplicated (once in hook state, once in computed memos).
- No virtualization on any table (AtRiskDashboard, FeedbackDashboard at-risk clients, leaderboard, etc.)

---

## 7. Code Architecture & Quality

### Strengths
1. **Clean separation of concerns**: Analytics computation isolated in dedicated hooks (`useFeedbackAnalytics`, `useSupportAnalytics`, etc.), not mixed into dashboard components
2. **Consistent chart patterns**: All dashboards follow the same structure: stat cards -> charts -> tables, with consistent empty states and loading skeletons
3. **Plan gating**: `FeatureGate` component cleanly wraps premium features (churn prediction, AI suggestions) with blur + upgrade CTA
4. **i18n coverage**: All prediction-related strings are internationalized with en/he translations
5. **Code splitting**: AtRiskDashboard is lazy-loaded; Recharts is in a separate vendor chunk
6. **Dark mode support**: All color helpers (`getRiskColor`, `getRiskBgColor`, `getNpsColor`) return dark-mode-aware classes
7. **`useAutoCalculateChurnScores`**: Smart stale-check pattern with `triggeredRef` to prevent redundant edge function calls
8. **Custom Recharts tooltips**: All dashboards use custom tooltip components for consistent styling

### Weaknesses
1. **Inconsistent data fetching patterns**:
   - `useWaitlistAnalytics` fetches its own data from Supabase
   - `useFeedbackAnalytics` and `useSupportAnalytics` receive pre-fetched data as props
   - `DashboardHome` uses TanStack Query (`useQuery`)
   - `FormResponsesTab` uses raw `useState` + `useEffect` + `supabase.from()`
2. **No TanStack Query for churn scores**: `useChurnPrediction.ts` uses raw `useState`/`useEffect` pattern instead of `useQuery`, missing cache benefits (deduplication, stale-while-revalidate, retry)
3. **Large component files**: `FeedbackDashboard.tsx` is 913 lines, `SupportDashboard.tsx` is ~1200 lines. These should be decomposed into sub-components (chart cards, stat rows, etc.)
4. **Duplicated tooltip components**: Each dashboard file defines its own tooltip components (NpsTrendTooltip, VolumeTooltip, CategoryTooltip, PriorityTooltip, etc.) instead of sharing a generic tooltip component

### Type Safety
- `ChurnScore` interface at `useChurnPrediction.ts:8-28` manually defines types instead of using auto-generated Supabase types (`Tables<"churn_scores">`)
- Cast at line 83: `(data as ChurnScore[])` -- fragile, will silently break if schema changes
- Edge function uses inline type annotations (e.g., `(f: { id: string })`) instead of imported types

---

## 8. Error Handling & Resilience

### Frontend Hooks
| Hook | Error Handling | Rating |
|------|---------------|--------|
| `useAtRiskCustomers` | `console.error` + sets empty array | Adequate |
| `useCustomerRiskScore` | `console.error` + sets null | Adequate |
| `useCalculateChurnScores` | `console.error` + sets failure result | Adequate |
| `useAutoCalculateChurnScores` | `try/catch` with `console.error` | Adequate |
| `useFeedbackAnalytics` | No error states (pure computation) | N/A |
| `useSupportAnalytics` | No error states (pure computation) | N/A |
| `useWaitlistAnalytics` | Silently returns empty on error (line 37: no error handling on `.then()`) | **P2: Weak** |

### Edge Function
| Scenario | Handled? | How |
|----------|----------|-----|
| Missing auth header | YES | 401 response |
| Invalid JWT | YES | 401 response |
| Missing workspace_id | YES | 400 response |
| No forms in workspace | YES | 200 with `scored: 0` |
| No customer emails | YES | 200 with `scored: 0` |
| Upsert failure | YES | 500 response with error message |
| Unexpected exception | YES | Generic 500 catch |
| Request timeout | NO | No timeout management; long loops will hit Deno runtime limit |
| Individual email query failure | NO | Errors inside the loop are not caught -- a single failed query breaks the entire batch |

### Missing Resilience Patterns
- **P1**: No retry logic on edge function invocation from frontend (`useCalculateChurnScores` line 143: single attempt)
- **P2**: No loading/error toasts in `AtRiskWidget` when auto-calculation fails silently
- **P2**: `useWaitlistAnalytics` has no error handling on the Supabase query (line 37)

---

## 9. Database & Query Optimization

### churn_scores Table
**Schema**: Well-designed with appropriate indexes
- `idx_churn_scores_workspace_risk`: Composite index on `(workspace_id, risk_score DESC)` -- optimal for the primary query pattern
- `idx_churn_scores_email`: Index on `customer_email` -- supports individual lookups
- UNIQUE constraint on `(workspace_id, customer_email)` -- prevents duplicates, enables upsert

**RLS**: Properly scoped to authenticated workspace members (after migration 024 remediation)

### Edge Function Query Patterns
| Query | Table | Pattern | Issue |
|-------|-------|---------|-------|
| Fetch forms | `forms` | `.eq("workspace_id", ...)` | OK -- uses workspace_id index |
| Fetch feedback emails | `feedback_responses` | `.in("form_id", formIds)` | **P1**: No index on form_id for this table (relies on FK index) |
| Fetch ticket emails | `tickets` | `.in("form_id", formIds)` | OK -- FK index |
| Fetch submission emails | `submissions` | `.in("form_id", formIds)` | OK -- FK index |
| NPS per customer | `feedback_responses` | `.in("form_id", ...).ilike("respondent_email", email)` | **P1**: `ilike` prevents index usage on email; runs per customer |
| Ticket count per customer | `tickets` | `.in("form_id", ...).ilike("submitted_by_email", email).gte("created_at", ...)` | **P1**: `ilike` prevents index usage; runs per customer |
| Last ticket per customer | `tickets` | `.ilike("submitted_by_email", email).order(...).limit(1)` | **P1**: `ilike` prevents index usage; runs per customer |

**Key Issue**: Using `ilike` for case-insensitive email matching in a loop is extremely inefficient. The lowercasing happens at `emailSet.add(r.respondent_email.toLowerCase())` (line 141), but then queries use `ilike` which does full table scans.

### Analytics Hook Query Patterns
| Hook | Query | Issue |
|------|-------|-------|
| `useWaitlistAnalytics` | `select("*").eq("form_id", ...)` | **P2**: Fetches ALL columns for ALL entries, no pagination |
| `useAtRiskCustomers` | `select("*").eq("workspace_id", ...).order("risk_score", desc)` | OK for now; no pagination could be issue at scale |
| `useCustomerRiskScore` | `.ilike("customer_email", email).maybeSingle()` | **P2**: `ilike` for case-insensitive match |

### Missing Indexes (Recommended)
- `feedback_responses(respondent_email)` -- used in churn-score email collection
- `submissions(submitted_by_email)` -- used in churn-score email collection

### Realtime
- `churn_scores` is NOT added to `supabase_realtime` publication (confirmed by `migration-inventory.md` line 119)
- This means the AtRiskDashboard does NOT auto-update when scores are recalculated; requires manual refetch
- **P2**: After recalculation, the widget relies on explicit `refetch()` call rather than realtime subscription

---

## 10. Documentation Audit

### Existing Documentation
| Document | Coverage | Quality |
|----------|----------|---------|
| `CLAUDE.md` (project) | Does NOT mention churn_scores table, predictions feature, or edge function | **Gap** |
| `docs/edge-functions.md` (section 8) | Documents churn-score endpoint, auth, input/output | Adequate |
| `docs/edge-function-health-report.md` | Health check results, frontend call mapping | Good |
| `docs/edge-function-secrets.md` | Lists churn-score as needing no extra secrets | Adequate |
| `docs/api-security.md` | Lists CORS and auth for churn-score | Adequate |
| `docs/database-schema.md` | Documents churn_scores table structure | Adequate |
| `supabase/audit/rls-matrix.md` | Notes P0 RLS issues with churn_scores policies | Good |
| `supabase/audit/migration-inventory.md` | Lists migration 020 and notes missing realtime | Good |

### Documentation Gaps
1. **CLAUDE.md** does not document the `churn_scores` table, the `predictions/` component directory, or the `useChurnPrediction` hook
2. No JSDoc or inline documentation for the risk score calculation algorithm (`calculateRiskScore` at `churn-score/index.ts:35-71`)
3. Risk score thresholds (>80 critical, >60 high, >40 medium, <=40 low) are hardcoded in `useChurnPrediction.ts:33-37` but not documented
4. The relationship between `useFeedbackAnalytics.atRiskClients` (detractor-based, in feedback context) and `useChurnPrediction` (cross-mode churn scoring) is not documented -- they are separate concepts that could confuse developers

---

## 11. Product Growth & Innovation

### Current Capabilities
- NPS tracking with weekly trends and category breakdowns
- Cross-mode churn prediction (combines NPS + tickets + sentiment + engagement)
- AI-powered ticket reply suggestions
- SLA breach detection (>24h without response)
- Referral leaderboard and source tracking for waitlists

### Growth Opportunities
1. **Predictive NPS trend**: Forecast future NPS based on current trajectory (linear regression on weekly trend data)
2. **Cohort analysis**: Compare churn risk by signup cohort, acquisition source, or form
3. **Automated alerts**: Trigger notifications/webhooks when a customer's risk score crosses a threshold (currently scores are calculated on-demand only)
4. **Scheduled recalculation**: Use Supabase CRON to recalculate churn scores daily instead of relying on auto-calculate on page load
5. **Customer health dashboard**: Unified view combining NPS, ticket history, and engagement for a single customer
6. **Export analytics**: CSV/PDF export of analytics dashboards (currently only waitlist has CSV export)
7. **Benchmark comparison**: Show how workspace NPS/resolution times compare to industry benchmarks
8. **A/B testing analytics**: Track form variant performance (requires form versioning)
9. **Funnel analytics**: Conversion tracking from form view to submission

---

## 12. Issues Found

### P0 (Critical)
| # | Issue | Location | Description |
|---|-------|----------|-------------|
| P0-1 | **Missing workspace authorization in churn-score edge function** | `supabase/functions/churn-score/index.ts:102-110` | The function validates the JWT but does NOT verify the user is a member of the requested `workspace_id`. Any authenticated user can calculate churn scores for any workspace by passing an arbitrary workspace_id. The service role key bypasses RLS on the upsert, so scores are written without workspace membership validation. |

### P1 (High)
| # | Issue | Location | Description |
|---|-------|----------|-------------|
| P1-1 | **N+1 query pattern in churn-score edge function** | `supabase/functions/churn-score/index.ts:188-273` | Sequential loop makes 3-4 DB queries per customer email. With 100+ customers, this creates 300-400 round trips and will timeout on the 60s Deno runtime limit. Should batch queries and aggregate in-memory. |
| P1-2 | **`ilike` email matching prevents index usage** | `supabase/functions/churn-score/index.ts:194,208,233` | Using `.ilike("respondent_email", email)` for case-insensitive matching causes full table scans. Emails are already lowercased in the emailSet; should use `.eq()` with lowercase or create a functional index. |
| P1-3 | **risk_factors.last_interaction field name mismatch** | Edge fn line 256 vs hook line 19 | Edge function writes `risk_factors.last_interaction` but the frontend `ChurnScore` interface expects `risk_factors.last_interaction_at`. The `days_since_interaction` field works correctly, but `last_interaction` will be undefined when accessed as `last_interaction_at` from the JSONB. |
| P1-4 | **No per-email error handling in scoring loop** | `supabase/functions/churn-score/index.ts:188-273` | If any individual query fails inside the `for` loop, the entire function throws and no scores are saved. Should use try/catch per email to allow partial completion. |

### P2 (Medium)
| # | Issue | Location | Description |
|---|-------|----------|-------------|
| P2-1 | **Hardcoded "en-US" locale in formatDate** | `FeedbackDashboard.tsx:77-78` | `formatDate` and `formatWeek` use hardcoded `"en-US"` locale, ignoring i18n settings. Hebrew users see English date formats. |
| P2-2 | **Nav link visible regardless of plan** | `Navbar.tsx:51` | "At-Risk" nav link is shown to all authenticated users, even free-tier. When clicked, the FeatureGate shows a blurred upgrade prompt. Better UX would be to conditionally render the nav link or add a lock icon. |
| P2-3 | **No pagination in analytics data fetching** | `useWaitlistAnalytics.ts:33`, `FormResponsesTab.tsx:37-41` | Fetches ALL entries with `select("*")`. Will degrade on forms with thousands of entries. |
| P2-4 | **Agent workload shows UUIDs** | `SupportDashboard.tsx:1062` | Agent workload Y-axis shows raw `assigned_to` UUID instead of agent name/email. Should join with profiles table. |
| P2-5 | **Volume charts have no date windowing** | `useSupportAnalytics.ts:59-68`, `useWaitlistAnalytics.ts:57-72` | Volume-by-day data includes ALL historical dates. Charts with years of data will have hundreds of bars. Only `resolutionTrend` has a `.slice(-30)` limit. |
| P2-6 | **churn_scores not on realtime** | `supabase/migrations/020_predictions.sql` | `churn_scores` table is not added to `supabase_realtime` publication. Dashboard requires manual refetch after recalculation. |
| P2-7 | **Manual type definition instead of generated types** | `useChurnPrediction.ts:8-28` | `ChurnScore` interface is manually defined instead of using `Tables<"churn_scores">` from auto-generated types. Schema changes won't be caught at compile time. |
| P2-8 | **useWaitlistAnalytics has no error handling** | `useWaitlistAnalytics.ts:37` | `.then(({ data })` ignores the `error` field from Supabase response. Query failures silently result in empty data. |
| P2-9 | **Duplicated tooltip components across dashboards** | `FeedbackDashboard.tsx:152-227`, `SupportDashboard.tsx` (similar) | Each dashboard defines its own tooltip components. Should be extracted to shared components. |
| P2-10 | **No structured logging in edge function** | `churn-score/index.ts:281,293` | Uses `console.error` only. No request IDs, no structured log format, no performance metrics. |

---

## 13. Recommended Fix Path

### Phase 1: Security (P0) -- Immediate
1. **Fix P0-1**: Add workspace membership check in `churn-score/index.ts` after JWT validation:
   ```ts
   // After line 100 (after user auth check)
   const { data: membership } = await supabase
     .from("workspace_members")
     .select("user_id")
     .eq("user_id", user.id)
     .eq("workspace_id", workspace_id)
     .maybeSingle();
   if (!membership) {
     return new Response(
       JSON.stringify({ error: "Forbidden: not a workspace member" }),
       { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
   ```
   **File**: `supabase/functions/churn-score/index.ts`
   **Effort**: 15 minutes

### Phase 2: Performance (P1) -- This Sprint
2. **Fix P1-1 + P1-2**: Refactor edge function to batch queries:
   - Fetch ALL feedback_responses, tickets, submissions for the workspace in 3 bulk queries
   - Aggregate per-email in-memory using Maps
   - Replace `ilike` with `eq` (emails are already lowercased)
   - **Effort**: 2-3 hours

3. **Fix P1-3**: Fix field name mismatch:
   - In `churn-score/index.ts:256`, change `last_interaction` to `last_interaction_at` in the `risk_factors` object
   - **Effort**: 5 minutes

4. **Fix P1-4**: Add try/catch inside the scoring loop:
   - Wrap each iteration in try/catch, log errors, continue to next email
   - **Effort**: 15 minutes

### Phase 3: Quality (P2) -- Next Sprint
5. **Fix P2-1**: Pass `i18n.language` to `formatDate`/`formatWeek` or use `date-fns` locale support
6. **Fix P2-2**: Conditionally render "At-Risk" nav link based on plan, or add a lock icon for free-tier users
7. **Fix P2-5**: Add date windowing to volume charts (default to last 30/90 days with toggle)
8. **Fix P2-4**: Join agent UUIDs with profiles table to display names
9. **Fix P2-7**: Replace manual `ChurnScore` interface with `Tables<"churn_scores">` from generated types
10. **Fix P2-8**: Add error handling to `useWaitlistAnalytics` Supabase query

### Phase 4: Architecture -- Backlog
11. Migrate `useChurnPrediction` hooks to TanStack Query for caching/retry
12. Extract shared chart tooltip components
13. Add `churn_scores` to realtime publication
14. Decompose large dashboard components (FeedbackDashboard, SupportDashboard) into sub-components
15. Add pagination to analytics data fetching hooks

---

*Report generated by Scanner Agent. All line references verified against source.*
