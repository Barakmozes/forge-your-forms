# Feature 09: AI Features — Scanner Report

> Scanned: 2026-03-15
> Scanner: Claude Opus 4.6

---

## 1. Touchpoints

### Edge Functions (5 AI-related)
| Function | File | AI Provider | Model |
|----------|------|-------------|-------|
| `ai-generate` | `supabase/functions/ai-generate/index.ts` | Anthropic | `claude-sonnet-4-5-20250514` |
| `ai-analyze` | `supabase/functions/ai-analyze/index.ts` | Anthropic | `claude-sonnet-4-5-20250514` |
| `ai-suggest-reply` | `supabase/functions/ai-suggest-reply/index.ts` | Anthropic | `claude-haiku-4-5-20251001` |
| `classify-ticket` | `supabase/functions/classify-ticket/index.ts` | Anthropic | `claude-haiku-4-5-20251001` |
| `churn-score` | `supabase/functions/churn-score/index.ts` | None (heuristic) | N/A |

### Frontend Components (7)
| Component | File | Purpose |
|-----------|------|---------|
| `AiFormGenerator` | `src/components/ai/AiFormGenerator.tsx` | Multi-step AI form creation dialog |
| `AiSummaryWidget` | `src/components/ai/AiSummaryWidget.tsx` | Dashboard card showing AI insights |
| `SentimentBadge` | `src/components/ai/SentimentBadge.tsx` | Inline sentiment indicator badge |
| `AiCannedSuggestions` | `src/components/predictions/AiCannedSuggestions.tsx` | AI-powered ticket reply suggestions |
| `AtRiskWidget` | `src/components/predictions/AtRiskWidget.tsx` | Top 5 at-risk customers card |
| `AtRiskDashboard` | `src/components/predictions/AtRiskDashboard.tsx` | Full-page churn prediction dashboard |
| `ChurnScoreBadge` | `src/components/predictions/ChurnScoreBadge.tsx` | Inline risk score badge |

### Hooks (6)
| Hook | File | Purpose |
|------|------|---------|
| `useAiGenerate` | `src/hooks/useAiGenerate.ts` | Loading/error state for AI form generation |
| `useAiAnalysis` | `src/hooks/useAiAnalysis.ts` | Loading/error state for AI analysis with auto-trigger |
| `useAiSuggestReply` | `src/hooks/useAiSuggestReply.ts` | Auto-fetch reply suggestions on mount |
| `useAtRiskCustomers` | `src/hooks/useChurnPrediction.ts` | Fetch churn scores from DB |
| `useCalculateChurnScores` | `src/hooks/useChurnPrediction.ts` | Trigger churn-score edge function |
| `useAutoCalculateChurnScores` | `src/hooks/useChurnPrediction.ts` | Auto-calculate if scores >24h stale |

### Library
| File | Purpose |
|------|---------|
| `src/lib/ai.ts` | Typed wrappers for AI edge function calls + auth helper |

### Shared Edge Function Utilities
| File | Purpose |
|------|---------|
| `supabase/functions/_shared/cors.ts` | CORS headers, JSON response helpers |
| `supabase/functions/_shared/hash.ts` | SHA-256 hashing for cache keys |
| `supabase/functions/_shared/supabase.ts` | Shared admin client + authenticateUser helper |

### Database Tables (2 AI-specific)
| Table | Migration | Purpose |
|-------|-----------|---------|
| `ai_cache` | `019_ai_cache.sql` | Cached AI responses with TTL |
| `churn_scores` | `020_predictions.sql` | Per-customer risk scores |

### Config / Plan Gating
| Component | Feature Gate | Required Plan |
|-----------|-------------|---------------|
| `AiSummaryWidget` | `ai-analysis` | Business |
| `AiCannedSuggestions` | `ai_suggestions` | Business |
| `AtRiskWidget` | `churn_prediction` | Business |
| `AtRiskDashboard` | `churn_prediction` | Business |
| `AiFormGenerator` | Not gated in component | (gated at parent level) |

---

## 2. E2E Flows

### Flow A: AI Form Generation
**Path:** Forms.tsx / FormBuilder.tsx -> AiFormGenerator -> useAiGenerate -> src/lib/ai.ts (generateForm) -> ai-generate edge function -> Anthropic API

1. User opens "Create with AI" dialog from Forms listing or FormBuilder
2. Selects mode (standard/waitlist/feedback/support) if not fixed
3. Types natural language prompt describing desired form
4. Frontend calls `generateForm()` via `useAiGenerate` hook
5. `src/lib/ai.ts` gets fresh auth token, invokes `ai-generate` edge function
6. Edge function: authenticates JWT, checks workspace membership, checks rate limit (10/day), checks cache, calls Anthropic, parses JSON, caches result (7-day TTL)
7. Returns generated fields -> preview step -> user creates form with generated fields

**Verdict: PASS (Well-structured)** — Auth, workspace authorization, rate limiting, caching, JSON validation, error handling all present. Rate limit (10/day per workspace) tracked via `ai_cache` table.

### Flow B: AI Response Analysis (Summary Widget)
**Path:** FeedbackDashboard / SupportDashboard / WaitlistDashboard -> AiSummaryWidget -> useAiAnalysis -> src/lib/ai.ts (analyzeResponses) -> ai-analyze edge function -> Anthropic API

1. Dashboard mounts AiSummaryWidget with pre-extracted text submissions
2. If `autoAnalyze=true` and >= 3 submissions, auto-triggers analysis (with 5-min cooldown)
3. Frontend calls `analyzeResponses()` which invokes `ai-analyze` edge function
4. Edge function: authenticates JWT, checks workspace membership, checks cache (24h TTL), sends up to 100 submissions to Anthropic, parses JSON response
5. Returns themes, sentiment trend, suggested actions, per-submission sentiments
6. Widget displays insights; sentiments shared with parent via `externalAnalysis` prop

**Verdict: PASS** — Auth, workspace authorization, batch limit (100), caching, auto-trigger cooldown. Sentiments correctly shared between AiSummaryWidget and SupportDashboard for inline badges.

### Flow C: AI Reply Suggestions
**Path:** TicketDetail.tsx -> AiCannedSuggestions -> useAiSuggestReply -> src/lib/ai.ts (suggestReplies) -> ai-suggest-reply edge function -> Anthropic API

1. User opens ticket detail page
2. AiCannedSuggestions auto-fetches suggestions on mount (keyed by formId + subject)
3. Edge function: authenticates via shared `authenticateUser()`, checks workspace membership, checks cache (6h TTL), fetches context from resolved tickets, calls Anthropic Haiku
4. Returns 2-3 tailored reply suggestions with labels and reasoning
5. User can insert suggestion into reply box, dismiss, or refresh

**Verdict: PASS** — Uses refactored shared utilities (`_shared/cors.ts`, `_shared/hash.ts`, `_shared/supabase.ts`). Good context fetching from resolved tickets. Cache error logging present.

### Flow D: Ticket Classification
**Path:** SupportSubmitPage.tsx (public) -> classify-ticket edge function -> Anthropic API -> tickets.ai_classification update

1. Public user submits a support ticket
2. After successful ticket insert, `classifyTicket()` fires as fire-and-forget
3. Edge function: requires JWT auth, checks cache, calls Anthropic Haiku, validates priority enum, caches result (24h TTL)
4. Result stored in `tickets.ai_classification` JSONB column

**Verdict: FAIL** — Called from unauthenticated public page (SupportSubmitPage), but the edge function requires JWT authentication. The Supabase client on public pages has no user session, so `supabase.functions.invoke()` sends no auth header. The edge function returns 401, and the classification silently fails. The entire auto-classification feature is non-functional for public ticket submissions.

### Flow E: Churn Score Calculation
**Path:** AtRiskWidget / AtRiskDashboard -> useAutoCalculateChurnScores / useCalculateChurnScores -> churn-score edge function -> DB queries -> churn_scores upsert

1. Dashboard mounts AtRiskWidget which triggers `useAutoCalculateChurnScores`
2. Checks if scores are stale (>24h), if so triggers calculation
3. Edge function: authenticates JWT, collects unique customer emails from feedback/tickets/submissions, calculates risk score per customer based on NPS average, ticket frequency, sentiment trend, days since last interaction
4. Upserts scores into `churn_scores` table

**Verdict: CONDITIONAL PASS** — Functional for authenticated users. Two concerns: (1) no workspace membership check in edge function (auth only), (2) N+1 query pattern iterates over all customer emails with individual DB queries, which will hit performance limits at scale.

### Flow F: Sentiment Display
**Path:** SupportDashboard.tsx -> useAiAnalysis (shared) -> SentimentBadge per ticket row

1. SupportDashboard lifts AI analysis state via `useAiAnalysis` with `autoTrigger`
2. Builds `sentimentMap` (Map<ticketId, sentiment>) from analysis sentiments
3. Renders `SentimentBadge` inline for each ticket with a matching sentiment

**Verdict: PASS** — Clean shared-state pattern between AiSummaryWidget and SentimentBadge column.

---

## 3. Cross-Dependencies

| AI Feature | Depends On | Nature |
|------------|-----------|--------|
| AiFormGenerator | `useForms.createForm` | Creates form record after AI generates fields |
| AiFormGenerator | WorkspaceContext | Workspace ID for edge function call |
| AiSummaryWidget | FeatureGate + usePlanLimits | Business plan gating |
| AiSummaryWidget | i18n (react-i18next) | Locale for analysis |
| AiCannedSuggestions | FeatureGate | Business plan gating |
| AiCannedSuggestions | TicketDetail props | Ticket context for suggestions |
| SentimentBadge | useAiAnalysis (lifted state) | Shared sentiments from SupportDashboard |
| AtRiskWidget | useAutoCalculateChurnScores | Auto-triggers stale score recalculation |
| classify-ticket | SupportSubmitPage (broken) | Requires auth but called from public page |
| churn-score | feedback_responses, tickets, submissions | Cross-table data aggregation |
| All AI edge funcs | ANTHROPIC_API_KEY secret | Required environment secret |
| ai_cache | pg_cron cleanup job | Expired cache cleanup (external dependency) |

---

## 4. Parallelism Assessment

| Flow | Can Parallelize With | Notes |
|------|---------------------|-------|
| AI Form Generation | Form creation UI | Independent dialog, no blocking dependencies |
| AI Analysis (auto) | Dashboard data loading | Runs after submissions are fetched |
| AI Suggest Reply | Ticket detail loading | Auto-fetches alongside ticket data |
| Ticket Classification | Ticket submission | Already fire-and-forget |
| Churn Score Calc | Dashboard mount | Auto-calculates if stale, non-blocking |

All AI features are non-blocking (async with loading states). No parallel execution conflicts identified. The `useAutoCalculateChurnScores` has a `triggeredRef` to prevent duplicate calculations.

---

## 5. Edge Function / Serverless Audit

### ai-generate
| Aspect | Status | Details |
|--------|--------|---------|
| Trigger | User-initiated POST | From AiFormGenerator dialog |
| Auth | JWT (per-request client) | `createClient` with user's auth header |
| Workspace Auth | Yes | Checks `workspace_members` via admin client |
| Rate Limit | 10/day/workspace | Tracked via `ai_cache` table COUNT |
| Error Handling | Comprehensive | 401/400/403/429/502/503/500 covered |
| Cold Start Risk | Low | Shared module-level client init |
| Cache | 7-day TTL | Keyed on `prompt:mode:locale` hash |
| Input Validation | Partial | Checks required fields, no prompt length limit |

### ai-analyze
| Aspect | Status | Details |
|--------|--------|---------|
| Trigger | Auto-trigger + manual refresh | From AiSummaryWidget |
| Auth | JWT (per-request client) | `createClient` with user's auth header |
| Workspace Auth | Yes | Checks `workspace_members` |
| Rate Limit | None explicit | Batch capped at 100 submissions |
| Error Handling | Comprehensive | All status codes covered |
| Cold Start Risk | Low | Module-level client |
| Cache | 24h TTL | **Weak cache key**: `form_id:count:locale` — same count with different data returns stale cache |
| Input Validation | Partial | Checks required fields, no size limit on text_fields |

### ai-suggest-reply
| Aspect | Status | Details |
|--------|--------|---------|
| Trigger | Auto-fetch on TicketDetail mount | Via useAiSuggestReply |
| Auth | JWT (shared authenticateUser) | Uses `_shared/supabase.ts` |
| Workspace Auth | Yes | Checks `workspace_members` |
| Rate Limit | None | No per-workspace rate limit |
| Error Handling | Good | Uses shared `jsonError` helper |
| Cold Start Risk | Low | Shared module setup |
| Cache | 6h TTL | Keyed on workspace+form+subject+description+category |
| Input Validation | Checks required fields | No length limits |

### classify-ticket
| Aspect | Status | Details |
|--------|--------|---------|
| Trigger | Fire-and-forget from SupportSubmitPage | After ticket creation |
| Auth | JWT (service-role getUser) | **Uses service-role client for auth** — security concern |
| Workspace Auth | **None** | Does not verify workspace membership |
| Rate Limit | None | No rate limiting |
| Error Handling | Good | All status codes covered |
| Cold Start Risk | Low | Module-level client |
| Cache | 24h TTL | Keyed on subject+description+categories |
| Input Validation | Checks required fields | Validates priority output enum |
| **Critical Bug** | Called from public page with no JWT | Always returns 401 silently |

### churn-score
| Aspect | Status | Details |
|--------|--------|---------|
| Trigger | Auto-calculate if stale + manual recalculate | From AtRiskWidget/Dashboard |
| Auth | JWT (service-role getUser) | **Uses service-role client for auth** |
| Workspace Auth | **None** | Does not verify workspace membership |
| Rate Limit | None | No rate limiting |
| Error Handling | Good | All status codes covered |
| Cold Start Risk | Medium | N+1 queries can be slow with many customers |
| Cache | N/A | Results persisted to `churn_scores` table |
| Performance Risk | **High** | Per-email loop with multiple DB queries each |

---

## 6. API Security Audit

### API Key Exposure
- **No hardcoded API keys found** in source code. All keys reference `Deno.env.get()` or placeholder patterns in docs.
- `ANTHROPIC_API_KEY` is stored as a Supabase Edge Function secret (server-side only).
- `.env` file contains only client-safe `VITE_` prefixed variables (Supabase anon key, Stripe publishable key).
- `src/lib/ai.ts` correctly routes all AI calls through edge functions — no client-side API key usage.

### Prompt Injection Risks

| Edge Function | User Input in Prompt | Mitigation | Risk |
|---------------|---------------------|------------|------|
| `ai-generate:172` | `prompt` directly interpolated into user message | System prompt + user message separation | **Medium** — User prompt is string-interpolated: `"${prompt}"`. A malicious prompt could attempt to override system instructions. |
| `ai-analyze:172` | `text_fields` values interpolated | System prompt separation | **Medium** — Submission text is inserted verbatim. Malicious submissions could attempt prompt injection. |
| `ai-suggest-reply:153-158` | `ticket_subject`, `ticket_description` interpolated | System prompt separation | **Medium** — Ticket content is user-controlled, inserted with quotes but no escaping. |
| `classify-ticket:133-138` | `subject`, `description`, `categories` interpolated | System prompt separation | **Low-Medium** — Same pattern, but output is validated (priority enum check). |

**Key Finding:** No edge function performs input sanitization, escaping, or length validation on user-provided text before inserting it into LLM prompts. The system/user message separation provides baseline protection, but there are no explicit anti-injection measures (e.g., input length caps, character filtering, output validation beyond basic JSON parsing).

### Rate Limiting
| Function | Rate Limit | Method |
|----------|-----------|--------|
| `ai-generate` | 10/day/workspace | DB-tracked via `ai_cache` COUNT |
| `ai-analyze` | None | Batch capped at 100 submissions |
| `ai-suggest-reply` | None | Cache provides de-facto throttling (6h) |
| `classify-ticket` | None | No rate limiting |
| `churn-score` | None | 24h staleness check prevents re-runs |

### CORS
All AI functions use `Access-Control-Allow-Origin: *`. This is acceptable since they all require JWT authentication (the auth token cannot be obtained without valid credentials).

### Auth Pattern Inconsistency
Two different auth patterns are used across AI functions:
1. **Per-request user client** (`ai-generate`, `ai-analyze`): Creates a Supabase client with the user's auth header, calls `getUser()`. This is the recommended pattern.
2. **Service-role `getUser(token)`** (`classify-ticket`, `churn-score`): Uses the admin/service-role client's `auth.getUser()` with the raw token. This works but the service-role client has elevated privileges.
3. **Shared `authenticateUser()`** (`ai-suggest-reply`): Uses the refactored shared utility. This is the cleanest pattern.

---

## 7. Test Coverage Analysis

| Component/Hook | Unit Tests | Integration Tests | E2E Tests |
|---------------|------------|-------------------|-----------|
| `src/lib/ai.ts` | None | None | None |
| `useAiGenerate` | None | None | None |
| `useAiAnalysis` | None | None | None |
| `useAiSuggestReply` | None | None | None |
| `useChurnPrediction` | None | None | None |
| `AiFormGenerator` | None | None | None |
| `AiSummaryWidget` | None | None | None |
| `AiCannedSuggestions` | None | None | None |
| `SentimentBadge` | None | None | None |
| `AtRiskWidget` | None | None | None |
| `AtRiskDashboard` | None | None | None |
| `ai-generate` (edge) | Smoke test only (401 check) | None | None |
| `ai-analyze` (edge) | Smoke test only (401 check) | None | None |
| `ai-suggest-reply` (edge) | **Not in smoke test** | None | None |
| `classify-ticket` (edge) | Smoke test only (401 check) | None | None |
| `churn-score` (edge) | Smoke test only (401 check) | None | None |

**Test Coverage: 0%** — No unit, integration, or E2E tests exist for any AI feature. The only coverage is the `scripts/test-functions.sh` smoke test which verifies functions return 401 when called without auth. The `ai-suggest-reply` function is not included in the smoke test script.

---

## 8. Code Architecture & Quality

### Strengths
1. **Clean layered architecture**: Edge functions -> `src/lib/ai.ts` (typed wrappers) -> hooks (state management) -> components (UI). Clear separation of concerns.
2. **Typed interfaces**: All AI request/response types are defined in `src/lib/ai.ts` with proper TypeScript interfaces.
3. **Shared utilities**: `_shared/cors.ts`, `_shared/hash.ts`, `_shared/supabase.ts` reduce duplication (used by `ai-suggest-reply`; older functions have inline copies).
4. **Feature gating**: AI features gated to Business plan via `FeatureGate` component.
5. **Caching layer**: All AI functions cache results in `ai_cache` table with appropriate TTLs.
6. **Graceful degradation**: All edge functions return 503 when `ANTHROPIC_API_KEY` is missing.
7. **i18n support**: All UI strings use translation keys.
8. **Dark mode**: All components use Tailwind dark mode classes.
9. **Auto-trigger with cooldown**: `useAiAnalysis` has a 5-minute cooldown for auto-triggered analysis.
10. **External analysis pattern**: `AiSummaryWidget` supports `externalAnalysis` prop for sharing state (used by SupportDashboard to show SentimentBadge in ticket rows).

### Weaknesses
1. **Code duplication**: `hashInput()` function is duplicated in `ai-generate`, `ai-analyze`, and `classify-ticket` instead of importing from `_shared/hash.ts`.
2. **Inconsistent shared utility adoption**: `ai-suggest-reply` uses shared utilities; `ai-generate`, `ai-analyze`, and `classify-ticket` define their own CORS headers and auth logic inline.
3. **Inconsistent auth patterns**: Three different authentication approaches across 5 functions.
4. **No output schema validation**: AI JSON output is parsed but not validated against a schema. A malformed response could cause runtime errors in consuming components.
5. **`churn-score` N+1 query problem**: Per-customer loop makes 3-4 DB queries each (`supabase/functions/churn-score/index.ts:188-273`). With 1000 customers, that's ~4000 DB queries.

---

## 9. Error Handling & Resilience

### AI Failure Fallbacks
| Component | Fallback on AI Failure |
|-----------|----------------------|
| AiFormGenerator | Shows error message, suggests "Try template instead" button |
| AiSummaryWidget | Shows error text, retry button available |
| AiCannedSuggestions | Shows error with retry button; hides if no suggestions |
| classify-ticket (in SupportSubmitPage) | Silent failure — ticket submission succeeds without classification |
| AtRiskWidget | Hides completely if no data |
| AtRiskDashboard | Shows empty state message |

### Timeout Handling
**No timeout handling exists on any Anthropic API call.** All `fetch()` calls to `api.anthropic.com` use default Deno timeouts. If the Anthropic API is slow or hanging:
- `ai-generate`: User sees infinite "Generating..." spinner
- `ai-analyze`: User sees infinite "Analyzing..." spinner
- `ai-suggest-reply`: User sees infinite "Generating suggestions..." spinner
- `classify-ticket`: Silent hang (fire-and-forget, bounded by edge function timeout)

No `AbortController` or `signal` is used anywhere.

### Auth Token Refresh
`src/lib/ai.ts:98-109` calls `getUser()` before `getSession()` to force token refresh. This handles stale tokens correctly. If auth fails, a clear error message is shown ("You must be signed in to use AI features").

### Rate Limit UX
`useAiGenerate` detects `RATE_LIMIT` error code and sets `rateLimited=true`, which disables the generate button in `AiFormGenerator`. Good UX for the rate-limited case.

### JSON Parse Resilience
All edge functions strip markdown code fences (`\`\`\`json ... \`\`\``) before JSON.parse. This handles the common LLM behavior of wrapping JSON in code blocks. Parse failures return 502 with a user-friendly message.

---

## 10. Documentation Audit

| Document | AI Coverage | Issues |
|----------|-------------|--------|
| `CLAUDE.md` | None | No mention of AI features in project instructions |
| `docs/edge-function-secrets.md` | Partial | **Missing `ai-suggest-reply`** from the Function -> Secret Matrix |
| `docs/api-security.md` | Good | Documents AI function auth methods and rate limits |
| `docs/edge-functions.md` | Partial | References AI functions but may be outdated |
| `scripts/test-functions.sh` | Partial | **Missing `ai-suggest-reply`** from smoke tests |
| `docs/secrets-checklist.md` | Partial | Lists ANTHROPIC_API_KEY but not ai-suggest-reply |
| Inline code comments | Good | Each file has header comment block explaining purpose and deployment |

---

## 11. Product Growth & Innovation

### Current Capabilities
1. **AI Form Generation**: Competitive feature — natural language to form fields with mode-specific requirements
2. **AI Response Analysis**: Automated sentiment, theme extraction, and action suggestions across all dashboard modes
3. **AI Reply Suggestions**: Context-aware ticket reply suggestions using resolved ticket history
4. **Ticket Auto-Classification**: Category + priority prediction (currently broken for public submissions)
5. **Churn Prediction**: Multi-signal risk scoring (NPS, ticket frequency, sentiment, engagement)

### Growth Opportunities
1. **Fix classify-ticket for public submissions**: Either make the edge function accept unauthenticated calls with form/active validation (like public insert RLS), or trigger classification from a DB trigger/webhook instead.
2. **Add streaming for long AI operations**: `ai-analyze` with 100 submissions can be slow; streaming would improve UX.
3. **Add AI summary to FeedbackDashboard**: Currently uses AiSummaryWidget but could display NPS-specific AI insights.
4. **Export AI analysis as PDF/report**: Actionable for stakeholder sharing.
5. **AI-powered form A/B testing suggestions**: Analyze submission completion rates and suggest field optimizations.

---

## 12. Issues Found

### P0 — Critical (Must Fix)

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | classify-ticket called from unauthenticated public page; always returns 401 silently. Auto-classification feature is completely non-functional. | Bug | High | `src/components/support/SupportSubmitPage.tsx` | 110 | Ticket auto-classification never works for public submissions |
| 2 | classify-ticket has no workspace membership check; any authenticated user could classify tickets for any workspace | Security | High | `supabase/functions/classify-ticket/index.ts` | 64-84 | Cross-workspace data access via authenticated user |
| 3 | churn-score has no workspace membership check; any authenticated user could trigger score calculation for any workspace | Security | High | `supabase/functions/churn-score/index.ts` | 80-100 | Cross-workspace data manipulation |

### P1 — High (Should Fix)

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 4 | No timeout/AbortController on Anthropic API calls; slow API causes infinite loading spinners | Resilience | High | `supabase/functions/ai-generate/index.ts` | 174-190 | UX degradation, edge function timeout reached instead of graceful timeout |
| 5 | No timeout/AbortController on Anthropic API calls | Resilience | High | `supabase/functions/ai-analyze/index.ts` | 174-190 | Same as above |
| 6 | No timeout/AbortController on Anthropic API calls | Resilience | High | `supabase/functions/ai-suggest-reply/index.ts` | 160-176 | Same as above |
| 7 | No timeout/AbortController on Anthropic API calls | Resilience | High | `supabase/functions/classify-ticket/index.ts` | 140-156 | Same as above |
| 8 | No prompt length validation on any AI edge function; excessively long prompts waste API credits and can hit token limits | Input Validation | High | `supabase/functions/ai-generate/index.ts` | 148-161 | API cost spike, potential failures |
| 9 | ai-analyze cache key is too weak: `form_id:count:locale`. Same submission count with different data returns stale cached analysis | Bug | High | `supabase/functions/ai-analyze/index.ts` | 138-139 | Stale/incorrect AI analysis results |
| 10 | churn-score N+1 query: per-customer loop makes 3-4 DB queries each. With 1000 customers, ~4000 queries per calculation | Performance | High | `supabase/functions/churn-score/index.ts` | 188-273 | Function timeout, DB connection exhaustion at scale |
| 11 | No input sanitization or prompt injection mitigation on user-provided text before LLM prompt injection | Security | Medium | `supabase/functions/ai-generate/index.ts` | 227 | Potential prompt manipulation via crafted inputs |
| 12 | `ai-suggest-reply` missing from smoke test script | Test Gap | High | `scripts/test-functions.sh` | — | Deployment regressions undetected |
| 13 | `ai-suggest-reply` missing from `docs/edge-function-secrets.md` matrix | Documentation | High | `docs/edge-function-secrets.md` | 46-58 | Ops confusion about required secrets |

### P2 — Medium (Nice to Fix)

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 14 | hashInput() duplicated in 3 edge functions instead of importing from `_shared/hash.ts` | Code Duplication | High | `supabase/functions/ai-generate/index.ts` | 106-112 | Maintenance burden |
| 15 | hashInput() duplicated | Code Duplication | High | `supabase/functions/ai-analyze/index.ts` | 55-61 | Same as above |
| 16 | hashInput() duplicated | Code Duplication | High | `supabase/functions/classify-ticket/index.ts` | 49-55 | Same as above |
| 17 | Inconsistent auth patterns: 3 different approaches across 5 AI functions | Code Quality | Medium | Multiple files | — | Harder to maintain and audit |
| 18 | No output schema validation on AI JSON responses; malformed responses could cause runtime errors in components | Resilience | Medium | `supabase/functions/ai-generate/index.ts` | 276-282 | Only checks `fields` is array; doesn't validate field shape |
| 19 | Zero test coverage for all AI features | Test Gap | High | Multiple files | — | Regressions go undetected |
| 20 | FeatureGate shows children during `isLoading` state (`if (isLoading) return <>{children}</>`) — briefly exposes gated content before plan check completes | UX | Medium | `src/components/upgrade/FeatureGate.tsx` | 33 | Brief flash of Business-tier content for free-tier users |
| 21 | `ai-analyze` has no explicit rate limit (only implicit via 100-submission cap and cache) | Security | Low | `supabase/functions/ai-analyze/index.ts` | — | Potential API cost abuse by rapid manual refreshes |
| 22 | `ai-suggest-reply` has no explicit rate limit | Security | Low | `supabase/functions/ai-suggest-reply/index.ts` | — | Same as above; mitigated partially by cache |
| 23 | AiFormGenerator not wrapped in FeatureGate at component level (relies on parent) | Architecture | Low | `src/components/ai/AiFormGenerator.tsx` | — | Could be rendered without plan check if imported elsewhere |

---

## 13. Recommended Fix Path

### Immediate (P0)

1. **Fix classify-ticket for public submissions** (`SupportSubmitPage.tsx:93-136`, `classify-ticket/index.ts`):
   - Option A: Convert classify-ticket to accept a service-role internal call triggered by a DB webhook/trigger on ticket insert (best approach — keeps auth server-side).
   - Option B: Add an alternative auth path in classify-ticket that validates `form.status = 'active' AND form.mode = 'support'` for unauthenticated calls (matches public insert RLS pattern).

2. **Add workspace membership check to classify-ticket** (`classify-ticket/index.ts:64-84`):
   ```typescript
   // After user auth, add:
   const { data: member } = await supabase
     .from("workspace_members")
     .select("user_id")
     .eq("user_id", user.id)
     .eq("workspace_id", workspace_id)
     .maybeSingle();
   if (!member) return jsonError("Forbidden", 403);
   ```

3. **Add workspace membership check to churn-score** (`churn-score/index.ts:80-100`):
   Same pattern as above.

### Short-term (P1)

4. **Add request timeouts to all Anthropic API calls** (all AI edge functions):
   ```typescript
   const controller = new AbortController();
   const timeout = setTimeout(() => controller.abort(), 25000); // 25s
   const response = await fetch(url, { ...options, signal: controller.signal });
   clearTimeout(timeout);
   ```

5. **Add prompt length validation** to `ai-generate` and `ai-analyze`:
   ```typescript
   if (prompt.length > 2000) {
     return jsonError("Prompt too long (max 2000 characters)", 400);
   }
   ```

6. **Fix ai-analyze cache key** (`ai-analyze/index.ts:138`): Include a content hash of submission IDs or text, not just the count:
   ```typescript
   const submissionIds = limitedSubmissions.map(s => s.id).sort().join(",");
   const cacheKey = `${form_id}:${submissionIds}:${locale}`;
   ```

7. **Refactor churn-score to batch queries**: Replace per-customer loop with bulk queries using `.in("respondent_email", emails)` and aggregate in code.

8. **Add ai-suggest-reply to smoke test** and docs matrix.

### Medium-term (P2)

9. **Refactor all AI edge functions to use shared utilities** from `_shared/`.
10. **Standardize auth pattern** across all AI functions to use `authenticateUser()` from `_shared/supabase.ts`.
11. **Add unit tests** for `src/lib/ai.ts`, hooks, and component rendering.
12. **Add output schema validation** using Zod or manual checks on AI JSON responses.
13. **Add FeatureGate to AiFormGenerator** component directly.
14. **Fix FeatureGate loading flash** — show skeleton/placeholder during `isLoading` instead of children.
