# Product Roadmap — FormForge

> Last updated: 2026-03-15
> Generated from scanner reports (18 features, 339 issues) and pipeline agent outcomes (agents 01–18).
> Agents resolved 97 of 128 unique P0/P1 issues. See Deferred P2 Issues section for remaining work.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| DONE | Implemented in this pipeline run |
| IN_PROGRESS | Partially implemented — specific gaps noted |
| PLANNED | Prioritized for next sprint |
| BACKLOG | Catalogued but not yet scheduled |
| DEFERRED | Explicitly deferred with reason |

## Effort Legend

| Size | Meaning |
|------|---------|
| S | Small — 1-2 days, single file/component |
| M | Medium — 3-5 days, multiple files, possible migration |
| L | Large — 1-2 weeks, new feature area, multiple components |
| XL | Extra Large — 2+ weeks, architectural change |

---

## Quick Wins (Small effort, High confidence)

Items that can be shipped in 1-2 days with high confidence of success.

| # | Opportunity | Effort | Impact | Status | Agent | Notes |
|---|------------|--------|--------|--------|-------|-------|
| 5 | Dark mode toggle | S | Medium | **DONE** | Agent 16 | ThemeProvider mounted; toggle in Navbar (desktop + mobile) |
| 7 | Dynamic OG images per form | S | High | **DONE** | Agent 16 | og:image in index.html; PublicForm updates document.title + og:title/description dynamically |
| 8 | Position-based referral rewards for waitlists | S | High | BACKLOG | — | Referral system (position, referral_count) already exists in DB. Add milestone reward emails or badge UI. |
| 11 | Breadcrumb navigation | S | Medium | BACKLOG | — | React Router v6 exists. Add `<Breadcrumb>` component using `useMatches()` or `useLocation()`. |
| 15 | Native Web Share API on public pages | S | Medium | BACKLOG | — | Public pages exist for all 4 modes. Add `navigator.share()` button when API available; fallback to copy-link. |
| 16 | Onboarding tour highlighting nav items | S | Medium | BACKLOG | — | GuidedTour component exists. Wire it to highlight Navbar items on first login. |
| 19 | Embed code generator for forms | S | High | BACKLOG | — | Public form URLs exist (`/f/:id`). Generate `<iframe>` snippet + copy button in FormDashboard. |
| 20 | Custom success page / redirect after submission | S | Medium | BACKLOG | — | `form.settings` JSONB already stores custom config. Add `successUrl` field in FormBuilder settings; redirect in FormRenderer after submit. |

---

## Short-term (1–2 weeks)

Items for the next development sprint — medium effort, high impact.

| # | Opportunity | Effort | Impact | Status | Agent | Notes |
|---|------------|--------|--------|--------|-------|-------|
| 4 | Webhook/Zapier integrations on all events | M | High | **IN_PROGRESS** | Agents 03, 11 | dispatch-webhook secured (JWT auth, workspace check). Webhook retry added (3 attempts, exponential backoff). Operator evaluation fixed. Gap: no Zapier native integration UI; no event-subscription UI for all form modes. |
| 10 | CSV/PDF export for all dashboards | M | Medium | **IN_PROGRESS** | Agents 04, 07 | Data export improved (15 tables in DataExport.tsx). Waitlist CSV export hardened (CSV injection fixed). Gap: FeedbackDashboard and SupportDashboard have no bulk CSV export buttons. PDF export not implemented. |
| 1 | AI form generation from natural language | M | High | BACKLOG | — | `ai-generate` edge fn exists and is now secured (timeout, length validation, prompt injection mitigation). Gap: no UI trigger in FormBuilder for natural language → field generation. |
| 9 | Automated detractor response workflows | M | High | BACKLOG | — | Workflow engine fixed (condition operators, retry). Feedback alerts realtime added. Gap: no pre-built detractor workflow template; no UI to create "when NPS ≤ 6, trigger response email" in one click. |
| 17 | Audit logging for enterprise compliance | M | High | BACKLOG | — | Supabase available. No `audit_log` table exists. Add table + trigger on key tables (forms, submissions, tickets). Required for enterprise SOC 2 / compliance buyers. |
| 3 | Email-embedded NPS (click score in email) | M | High | BACKLOG | — | `send-email` edge fn exists. Generate score-click URLs (`/f/:id?nps=8`) that pre-fill score and submit. Add to `scheduled-nps-email` digest. |
| 6 | Command palette (Cmd+K) for power users | M | Medium | BACKLOG | — | React Router exists. Implement with `cmdk` or shadcn Command component (already in inventory). Index pages + actions (new form, go to submissions, etc.). |
| 12 | Scheduled NPS email digest | M | Medium | BACKLOG | — | `send-email` fn exists. Add pg_cron job (Supabase Dashboard) + edge function to query NPS weekly and email workspace owners. |
| 18 | Push notifications via Web Push API | M | Medium | BACKLOG | — | Notifications table + realtime exists. Add service worker + VAPID key. `useNotifications` error handling fixed (Agent 13). |

---

## Medium-term (1–2 months)

Items requiring more planning and design.

| # | Opportunity | Effort | Impact | Status | Agent | Notes |
|---|------------|--------|--------|--------|-------|-------|
| 13 | Customer health dashboard (unified churn view) | L | High | **IN_PROGRESS** | Agent 03 | `churn-score` edge fn fixed (N+1 eliminated, field name mismatch fixed, per-email error isolation). Gap: no dashboard UI that displays churn scores, risk factors, and trend charts for all customers. |
| 2 | Template marketplace with community templates | L | High | BACKLOG | Agent 12 | `useTemplates` hook exists. Auth redirect after template selection fixed (sessionStorage). Gap: no community submission flow, no approval queue, no public marketplace page. templates UPDATE RLS for use_count also missing (Agent 02 deferred). |

---

## Long-term (3+ months)

Strategic initiatives requiring significant investment.

| # | Opportunity | Effort | Impact | Status | Agent | Notes |
|---|------------|--------|--------|--------|-------|-------|
| 14 | A/B testing for landing pages | L | High | BACKLOG | — | Forms infrastructure (fields, settings JSONB, branding) provides foundation. Requires: variant storage, traffic splitting logic, statistical significance calculator, results dashboard. |

---

## Security Priorities

Critical security items that must be resolved before or alongside product growth.

| # | Item | Effort | Priority | Status | Notes |
|---|------|--------|----------|--------|-------|
| S1 | MFA / 2FA support (P1 #3) | M | P1 | **PLANNED** | No agent implemented this. Supabase Auth supports TOTP (authenticator app). Add enrollment flow in Settings → Security. Required for enterprise customers. |
| S2 | Server-side submission limit enforcement (P0 #21) | M | P0 | **DEFERRED** | `canAcceptSubmission()` exists in `usePlanLimits` but is client-side only. Agent 05 deferred server-side enforcement. Needs DB trigger or edge function middleware. Bypassing via DevTools is still possible. |
| S3 | Wire `canAcceptSubmission()` in public submission flows (P0 #22) | S | P0 | **DEFERRED** | Must be called in `FormRenderer.tsx`, `WaitlistLandingPage.tsx`, `FeedbackSurveyPage.tsx`, `SupportSubmitPage.tsx` before submitting. Agent 05 deferred (other agents own those files). |
| S4 | classify-ticket 401 on public pages (P0 #24) | M | P0 | **DEFERRED** | `classify-ticket` edge fn was secured (workspace auth) by Agent 03. But `SupportSubmitPage` calls it without a JWT → always 401. Fix: move classification to post-submission DB trigger, or call via service role proxy. |
| S5 | Ticket enumeration via RLS (P1 #35 partial) | M | P1 | **DEFERRED** | Agent 02 narrowed scope to form-level but full fix requires server-side email verification token flow. Customers can still enumerate all tickets for a form by email. |
| S6 | Stripe subscription not cancelled on account deletion (P1 #89) | M | P1 | **DEFERRED** | Agent 04 added warning UI. Auto-cancellation requires a dedicated edge function with Stripe API `subscriptions.cancel()`. |
| S7 | Client-side encryption key hardcoded (Agent 01 decision) | M | P2 | **DEFERRED** | Integration secrets (Slack webhook, Mailchimp API key) now AES-GCM encrypted in DB. However, the PBKDF2 key is derived from a hardcoded seed in `secretEncryption.ts`. MVP-level only. Full solution: server-side key management (Supabase Vault or KMS). |

---

## Deferred P2 Issues

Issues identified during scanning that were deprioritized in favor of P0/P1 fixes. These represent technical debt that should be addressed in future sprints.

### Remaining P0/P1 Issues (Not Resolved by Any Agent)

| Source | Issue | Category | Effort | Reason Deferred |
|--------|-------|----------|--------|-----------------|
| Agent 05 | P0 #21: Server-side submission limit enforcement | BILLING | M | Requires DB trigger or edge function; other agents own submission entry points |
| Agent 05 | P0 #22: canAcceptSubmission() not called in public submission flows | BILLING | S | Called from hook (client-side); integration deferred to mode-specific agents |
| Agents 03/06 | P0 #24: classify-ticket 401 on unauthenticated SupportSubmitPage | BUG | M | Edge fn now secured but public caller has no JWT. Requires DB trigger approach or proxy. |
| Agent 13 | P1 #76: ticket_message and waitlist_signup notification types have no DB triggers | FUNCTIONALITY | M | DB triggers are outside Agent 13's owned files. SQL provided in Agent 13 HANDOFF. |
| Agent 13 | P1 #77: Submission notifications only go to workspace owner — editors excluded | FUNCTIONALITY | S | Same trigger modification needed. SQL provided in Agent 13 HANDOFF. |
| Agent 08 | P1 #34: Detractor notifications only sent to owner — editors excluded | FUNCTIONALITY | S | Requires modifying `handle_feedback_response` trigger in a new migration. |
| Agent 14 | P1 #70: No SSO login UI in Auth.tsx | FUNCTIONALITY | S | Auth.tsx owned by other agents. Implementation snippet documented in Agent 14 HANDOFF. |
| Agent 14 | P1 #72: White-label not applied to public pages | FUNCTIONALITY | M | Requires PublicForm + mode-specific components to read enterprise_settings and apply branding. |
| Agent 14 | P1 #74: Custom domains have no routing functionality | FUNCTIONALITY | XL | UI scaffold complete. Requires DNS verification edge fn + CDN/proxy routing + SSL. Infrastructure change. |
| Agent 02 | P1 #35: Ticket enumeration via tickets_select_customer (partial fix) | SECURITY | M | Full fix needs server-side email verification token. Scope reduced to form-level. |
| Agent 06 | P1 #39: Ticket number race condition (MAX+1 without locking) | DATABASE | M | Requires migration with advisory lock (`pg_advisory_xact_lock`) or per-form sequence. |
| Agent 07 | P1 #25: Waitlist position race condition (MAX+1 without locking) | DATABASE | M | Same pattern as ticket number. Requires migration-level fix. |
| Agent 07 | P1 #26: Non-atomic bulk waitlist invite | RESILIENCE | M | Requires Supabase RPC with transaction to wrap UPDATE + INSERT. |
| Agent 02 | P1 #56: Missing UPDATE RLS on form_templates (use_count) | DATABASE | S | Table existence uncertain at time of fix; guard pattern available but not applied. |
| Agent 04 | P1 #89: Stripe subscription not auto-cancelled on account deletion | BILLING | M | Needs dedicated edge fn with Stripe API. UI warning added as interim. |
| Agent 16 | P1 #7: Member invite requires existing account — no email invitations | UX | L | Backend change needed: Supabase email invitations or magic links. |
| Agent 05 | P1 #47: Price-to-plan mapping duplicated (stripe.ts + stripe-webhook) | ARCHITECTURE | N/A | Structural impossibility: client (Vite module) and server (Deno) cannot import from each other. Sync comment added. |

### P2 Technical Debt

| Source | Issue | Category | Effort | Reason Deferred |
|--------|-------|----------|--------|-----------------|
| Agent 07 | Social proof counter only visible post-signup | UX | S | No anon-accessible count without migration. Fix: create SECURITY DEFINER RPC `get_waitlist_count(form_id)`. |
| Agent 07 | Duplicate signup shows no position/referral data | UX | M | 23505 catch has no entry data. Needs anon-accessible RPC or separate lookup path. |
| Agents 07, 09 | Client-side search operates on paginated data only | UX | M | Server-side search requires query API changes. Current search misses entries on other pages. |
| Agent 09 | Mobile FormBuilder missing validation + conditional logic editors | RESPONSIVE | M | FormBuilder mobile sheet (~lines 754-810) still lacks number/text/phone/file validation and ConditionalLogic. Needs responsive specialist. |
| Agent 08 | `score_drop` and `keyword` feedback alert types are dead enum values | TECHNICAL DEBT | M | Enum values exist but no triggers fire them. Either implement or document as future features. |
| Agent 11 | dispatch-webhook scheduled retry processor — no cron job | RESILIENCE | M | Retry logic added in execute-workflow (3 attempts). But `next_retry_at` scheduling in dispatch-webhook has no background processor. Needs pg_cron or Supabase Edge Cron. |
| Agent 11 | run_count race condition in execute-workflow | RESILIENCE | S | Needs SQL-level atomic increment (`UPDATE ... SET run_count = run_count + 1`). |
| Agent 11 | workflows/workflow_runs tables missing from Supabase generated types | TYPE_SAFETY | S | Run `npx supabase gen types` after confirming table is applied to production. |
| Agent 11 | nps_below_threshold removed from TriggerNode but FeedbackSurveyPage never dispatches it | FUNCTIONALITY | S | Re-enable: add `dispatchWorkflowTrigger` in FeedbackSurveyPage + remove AVAILABLE_TRIGGER_TYPES filter. |
| Agent 12 | Auth.tsx does not read `redirect` query param after template login | BUG | S | sessionStorage workaround works. Full fix: add `redirectTo = searchParams.get("redirect")` in Auth.tsx login success handler. |
| Agent 01 | Client-side encryption key hardcoded in secretEncryption.ts | SECURITY | M | PBKDF2 from hardcoded seed — MVP level. Full fix: Supabase Vault or server-side KMS for key management. |
| Agent 17 | useDocumentTitle conflicts with AppLayout white-label title override | ARCHITECTURE | S | Both set `document.title`. Last-write-wins. Fix: add white-label mode check in `useDocumentTitle`. |
| Agent 02 | No audit log for auth events | SECURITY | M | No `audit_log` table. Add for enterprise compliance (SOC 2). |
| Agent 02 | `getInitials()` utility duplicated across multiple files | ARCHITECTURE | S | Pre-existing DRY violation. Extract to `src/lib/utils.ts`. |
| Agent 16 | og-image.png placeholder file not created in `public/` | DESIGN | S | Tag added in index.html. Physical file needs to be designed and placed at `public/og-image.png`. |
| Agent 17 | 8 test failures introduced by pagination refactors | TESTING | M | `useWaitlist` (3), `useFeedback` (3), `getPriceId` (2) tests broken by Agent 07, 08, 05 changes. Tests need updating. |
| Agent 17 | Migration 035 is potential duplicate of migration 034 | DATABASE | S | Both add `consent_given_at` with `IF NOT EXISTS` (no DB harm). Verify intent and remove if redundant. |

---

## Implementation Recommendations

### Recommended Next Sprint (High Priority)

1. **Wire `canAcceptSubmission()` in all 4 public submission flows** — P0 bug. S effort. Four files to update: `FormRenderer.tsx`, `WaitlistLandingPage.tsx`, `FeedbackSurveyPage.tsx`, `SupportSubmitPage.tsx`. Agent 05 left explicit code snippet in HANDOFF. No migration needed.

2. **MFA / 2FA via Supabase TOTP** — Security priority. M effort. Supabase Auth supports authenticator apps natively. Add enrollment flow in Settings → Security tab. Blocks enterprise sales.

3. **Embed code generator for forms** — S effort, High impact, no dependencies. `<iframe src="/f/:id">` snippet + copy button in FormDashboard. Immediate distribution value.

4. **notification DB triggers: ticket_message + waitlist_signup** — M effort. Agent 13 provided the complete SQL in HANDOFF. Two triggers; apply in migration `038_notify_triggers.sql`. Resolves dead UI code and improves engagement.

5. **Fix social proof counter via SECURITY DEFINER RPC** — S effort DB migration. Create `get_waitlist_count(form_id UUID) RETURNS INT` that bypasses RLS to return count-only. Immediately improves waitlist conversion.

### Dependencies to Resolve First

- **Server-side submission limits (P0 #21)**: Must be resolved before scaling any acquisition campaigns. Free users could currently submit unlimited data.
- **classify-ticket 401 fix (P0 #24)**: Blocks AI ticket classification for all support forms. Should be DB trigger approach (no auth required).
- **Stripe auto-cancel on deletion**: Until resolved, deleted accounts may retain active Stripe subscriptions (revenue leakage + GDPR risk).

### Technical Prerequisites

- **pg_cron**: Required for scheduled NPS email digest (#12) and dispatch-webhook retry processor. Enable in Supabase Dashboard (Extensions).
- **Supabase Vault or KMS**: Required before expanding secret encryption beyond MVP. Currently hardcoded PBKDF2 key in `secretEncryption.ts`.
- **og-image.png**: Create design asset and place at `public/og-image.png`. Referenced in index.html but file does not exist.
- **VAPID keys**: Required before implementing Web Push notifications (#18). Generate via `web-push generate-vapid-keys`.
- **`npx supabase gen types`**: Should be re-run to pick up migrations 031–037 (agents 02–14). Missing types for `enterprise_settings.sso_domain`, `profiles.consent_given_at`.

---

## Detailed Opportunity Descriptions

### 1. AI Form Generation from Natural Language

- **Effort**: M | **Impact**: High | **Confidence**: HIGH | **Status**: BACKLOG
- **Description**: Allow users to describe a form in plain English ("Create a customer satisfaction survey with NPS, contact info, and open feedback") and have the AI generate the appropriate fields. The `ai-generate` edge function already exists and generates form fields from prompts.
- **Implementation Notes**: Agent 10 secured `ai-generate`: added 30s timeout, 10,000-char prompt length validation, prompt injection mitigation, and `<user_content>` delimiters. The backend is ready. Gap: no UI trigger in FormBuilder that calls `ai-generate` and populates the fields array.
- **Prerequisites**: FormBuilder field schema must match ai-generate output format. Test with `src/types/forms.ts` canonical `FormField` type (consolidated by Agent 09).
- **Recommended approach**: Add an "AI Generate" button in FormBuilder toolbar; open a dialog with a text area; call `supabase.functions.invoke("ai-generate", { prompt })`; parse response and `setFields(generatedFields)`.

---

### 2. Template Marketplace with Community Templates

- **Effort**: L | **Impact**: High | **Confidence**: HIGH | **Status**: BACKLOG
- **Description**: Allow users to browse community-contributed form templates, preview them, and use them as starting points. Currently templates exist in DB but are internal only.
- **Implementation Notes**: Agent 12 fixed the auth redirect bug (sessionStorage mechanism). `useTemplates` hook exists with error state. Gap: no community submission flow, no moderation/approval queue, no public marketplace page. Missing UPDATE RLS on `form_templates` for `use_count` increment (Agent 02 deferred P1 #56 — table existence uncertain at time).
- **Prerequisites**: Confirm `form_templates` table exists in production Supabase. Add UPDATE RLS for `use_count`. Create community submission flow with moderation.
- **Recommended approach**: Phase 1 — curated internal templates (current state). Phase 2 — user submissions with approval workflow. Phase 3 — public search and trending.

---

### 3. Email-Embedded NPS (Click Score in Email)

- **Effort**: M | **Impact**: High | **Confidence**: HIGH | **Status**: BACKLOG
- **Description**: Send NPS surveys via email where recipients can click their score (0–10) directly in the email body. The click pre-fills the score and submits, reducing friction. Industry studies show 3-5× higher response rates vs. "click here to take survey" links.
- **Implementation Notes**: `send-email` edge fn exists. Public NPS survey page (`FeedbackSurveyPage`) exists at `/f/:id`. Add URL parameter support: `/f/:id?nps=7` pre-fills and auto-submits the NPS score, then shows follow-up textarea only. Email template renders 11 clickable score buttons (0–10).
- **Prerequisites**: `send-email` edge fn must accept NPS survey template. `FeedbackSurveyPage` must read `?nps=N` URL param. Unsubscribe link required for GDPR compliance.
- **Recommended approach**: Add `npsScore` URL param handler in `FeedbackSurveyPage.tsx`; add NPS email template to `send-email` fn; add "Send NPS Survey" button in FeedbackDashboard.

---

### 4. Webhook/Zapier Integrations on All Events

- **Effort**: M | **Impact**: High | **Confidence**: HIGH | **Status**: IN_PROGRESS
- **Description**: Allow users to configure webhooks that fire on form events (new submission, new waitlist entry, ticket created, NPS response, etc.) to integrate with Zapier, Make.com, Slack, or custom endpoints.
- **Implementation Notes**: Agent 03 secured `dispatch-webhook` (JWT auth, workspace membership check). Agent 11 added webhook retry (3 attempts, 1s/2s/4s backoff) and fixed condition operator evaluation in `execute-workflow`. Gap: no Zapier native integration (OAuth handshake, trigger/action definitions). No event-subscription UI for all 4 form modes.
- **Prerequisites**: Verify `supabaseAdmin.functions.invoke("dispatch-webhook", ...)` works with service role (bypasses JWT) — Agent 11 flagged this as unverified. Test in staging.
- **Recommended approach**: Phase 1 — generic webhook UI for all modes (show webhook URL input per event type). Phase 2 — Zapier app submission (OAuth, trigger/action definitions).

---

### 5. Dark Mode Toggle

- **Effort**: S | **Impact**: Medium | **Confidence**: HIGH | **Status**: **DONE (Agent 16)**
- **Description**: Toggle between light/dark/system theme.
- **Implementation Notes**: Agent 16 mounted `ThemeProvider` from `next-themes` as outermost provider in `App.tsx` with `attribute="class" defaultTheme="system" enableSystem`. Dark mode toggle (sun/moon icon) added to Navbar for both desktop and mobile. CSS variables were already defined in `src/index.css` for both themes.
- **No further work needed.**

---

### 6. Command Palette (Cmd+K) for Power Users

- **Effort**: M | **Impact**: Medium | **Confidence**: HIGH | **Status**: BACKLOG
- **Description**: A keyboard-accessible command palette (⌘K / Ctrl+K) that lets power users navigate pages, create forms, search submissions, and trigger actions without using the mouse.
- **Implementation Notes**: shadcn/ui `Command` component is already in the component inventory (48 components). React Router `useNavigate` is available. No new dependencies needed.
- **Prerequisites**: Define command registry (pages, actions, form titles). Search should be client-side for speed.
- **Recommended approach**: Create `CommandPalette.tsx` using shadcn `<Command>`. Mount in `AppLayout.tsx`. Register keyboard shortcut in global `useEffect`. Include: navigation commands (Go to Forms, Go to Settings), action commands (Create Form, Export Data), and recent forms search.

---

### 7. Dynamic OG Images per Form for Social Shares

- **Effort**: M | **Impact**: High | **Confidence**: HIGH | **Status**: **DONE (Agent 16)**
- **Description**: When a form URL is shared on social media, show a rich preview image specific to that form.
- **Implementation Notes**: Agent 16 added `og:image` and `twitter:image` meta tags to `index.html` (referencing `/og-image.png`). `PublicForm.tsx` now dynamically updates `og:title` and `og:description` from form data. Gap: `/og-image.png` file does not yet exist in `public/` — design task needed.
- **Remaining**: Create `public/og-image.png` design asset. For truly dynamic per-form images (with form title text), an edge function rendering a canvas/Satori image would be needed (optional enhancement).

---

### 8. Position-Based Referral Rewards for Waitlists

- **Effort**: S | **Impact**: High | **Confidence**: HIGH | **Status**: BACKLOG
- **Description**: Reward waitlist users who refer others by moving them up the queue or sending them exclusive perks. The referral system already tracks referral counts and positions.
- **Implementation Notes**: `waitlist_entries.referral_count` and `position` are tracked in DB. DB trigger `handle_waitlist_referral` increments referral count on INSERT. Agent 07 removed the redundant client-side RPC call. Referral code display and share buttons exist in `WaitlistLandingPage`.
- **Prerequisites**: Define reward tiers (e.g., 5 referrals = move to top 10%). Build UI to show current position change.
- **Recommended approach**: Add "Your Impact" section to waitlist landing page showing position improvement from referrals. Add optional email trigger when reaching a milestone.

---

### 9. Automated Detractor Response Workflows

- **Effort**: M | **Impact**: High | **Confidence**: MEDIUM | **Status**: BACKLOG
- **Description**: When a detractor NPS response (0–6) is detected, automatically trigger a response workflow: assign a ticket, send a personal follow-up email, or notify a Slack channel.
- **Implementation Notes**: Agent 11 fixed workflow execution (condition operators, milestone guards, retry logic). Feedback alerts realtime subscription added (Agent 08). `feedback_alerts` table with `detractor` type exists; DB trigger fires on NPS ≤ 6. Gap: no pre-built detractor workflow template; `nps_below_threshold` trigger type was removed from TriggerNode (Agent 11) because FeedbackSurveyPage never dispatches it.
- **Prerequisites**: Re-enable `nps_below_threshold` trigger dispatch in `FeedbackSurveyPage.tsx` + restore in TriggerNode. Create workflow template wizard for "respond to detractors."
- **Recommended approach**: Add "Smart Response" wizard in FeedbackDashboard that creates a pre-configured workflow: trigger=nps_below_threshold → action=send_email (template). Phase 2: integrate with SupportDashboard to auto-create tickets.

---

### 10. CSV/PDF Export for All Dashboards

- **Effort**: M | **Impact**: Medium | **Confidence**: HIGH | **Status**: IN_PROGRESS
- **Description**: Allow admins to export data from any dashboard as CSV or PDF for reporting and data portability.
- **Implementation Notes**: Agent 07 added CSV injection protection (`sanitizeCSVValue()`) and UTF-8 BOM to waitlist exports. Agent 04 improved `DataExport.tsx` to cover 15 tables. Gap: `FeedbackDashboard` has no CSV export button for filtered responses. `SupportDashboard` has no CSV export. PDF export not implemented for any dashboard.
- **Prerequisites**: None — existing data hooks provide the data.
- **Recommended approach**: Add "Export CSV" button to FeedbackDashboard and SupportDashboard using the same `sanitizeCSVValue` pattern from `useWaitlist.ts`. PDF: use `@react-pdf/renderer` or browser `window.print()` with print CSS (no new dep if print CSS used).

---

### 11. Breadcrumb Navigation

- **Effort**: S | **Impact**: Medium | **Confidence**: HIGH | **Status**: BACKLOG
- **Description**: Show breadcrumb trail on nested pages (e.g., Forms → My Form → Submissions) to improve wayfinding.
- **Implementation Notes**: shadcn/ui `Breadcrumb` component exists in inventory. React Router v6 `useMatches()` or `useLocation()` + route config provides path data.
- **Prerequisites**: Define route labels. Add breadcrumb rendering to `AppLayout.tsx`.
- **Recommended approach**: Create `<AppBreadcrumb>` component; render in `AppLayout.tsx` between Navbar and `<main>`. Map route paths to human-readable labels using a config object.

---

### 12. Scheduled NPS Email Digest

- **Effort**: M | **Impact**: Medium | **Confidence**: MEDIUM | **Status**: BACKLOG
- **Description**: Send workspace owners a weekly NPS digest email showing score trends, new detractors, and response volume.
- **Implementation Notes**: `send-email` edge fn exists. `useFeedbackAnalytics` computes NPS score, sentiment breakdown, weekly trends. Agent 08 added `analyticsData` (lightweight all-responses fetch) to ensure analytics accuracy across pages.
- **Prerequisites**: pg_cron extension enabled in Supabase. Define email template. Add opt-in preference to Settings.
- **Recommended approach**: Create `nps-weekly-digest` edge fn. Schedule via pg_cron: `SELECT cron.schedule('nps-digest', '0 9 * * 1', ...)`. Call `send-email` with aggregated NPS data per workspace.

---

### 13. Customer Health Dashboard (Unified Churn View)

- **Effort**: L | **Impact**: High | **Confidence**: MEDIUM | **Status**: IN_PROGRESS
- **Description**: A dashboard that shows which customers are at risk of churning, based on ticket sentiment, NPS score, usage patterns, and last activity.
- **Implementation Notes**: Agent 03 fixed `churn-score` edge fn comprehensively: eliminated N+1 query (2 bulk queries + in-memory Maps), fixed `last_interaction` → `last_interaction_at` field name, replaced `ilike` with exact match, added per-email error isolation. The backend is now production-ready.
- **Gap**: No UI dashboard that calls `churn-score` and displays results (risk factors, score over time, per-customer drill-down).
- **Prerequisites**: Confirm `churn-score` fn works end-to-end with real data. Consider caching results in a `customer_health_scores` table.
- **Recommended approach**: New page `/health` (protected). Fetch scores via `supabase.functions.invoke("churn-score")`. Render a table sorted by risk score with color-coded indicators.

---

### 14. A/B Testing for Landing Pages

- **Effort**: L | **Impact**: High | **Confidence**: MEDIUM | **Status**: BACKLOG
- **Description**: Allow operators to create variants of waitlist or feedback landing pages and split traffic to test which converts better.
- **Implementation Notes**: Forms infrastructure (fields JSONB, settings JSONB, branding JSONB) provides a foundation. Public form rendering dispatches on `form.mode`. No A/B infrastructure exists.
- **Prerequisites**: New DB table `form_variants` with traffic split config. Statistical significance calculation. Results analytics.
- **Recommended approach**: Phase 1 — URL-based variants (create 2 forms with same config, manually split traffic). Phase 2 — built-in A/B with random assignment tracked in `submissions.metadata`. Phase 3 — automatic winner selection.

---

### 15. Native Web Share API on Public Pages

- **Effort**: S | **Impact**: Medium | **Confidence**: HIGH | **Status**: BACKLOG
- **Description**: Add a native share button on public waitlist, feedback, and support pages that uses the OS share sheet on mobile.
- **Implementation Notes**: Public pages for all 4 modes exist. `WaitlistLandingPage` already has copy-link functionality.
- **Prerequisites**: None — `navigator.share()` is available in modern browsers.
- **Recommended approach**: Add `<ShareButton>` component that calls `navigator.share({ title, url })` when available, falls back to clipboard copy. Use in all 4 public page components.

---

### 16. Onboarding Tour Highlighting Nav Items

- **Effort**: S | **Impact**: Medium | **Confidence**: HIGH | **Status**: BACKLOG
- **Description**: Guide new users through key features with a step-by-step tooltip tour highlighting navigation items.
- **Implementation Notes**: Agent 12 fixed onboarding error handling (FirstFormGuide now shows toast on error; OnboardingWizard catches completion failures). GuidedTour component exists (referenced in MASTER-BRIEF). Onboarding wizard exists in `src/components/onboarding/OnboardingWizard.tsx`.
- **Prerequisites**: Confirm GuidedTour component location and API. Link it to onboarding wizard flow.
- **Recommended approach**: After onboarding wizard completes, show a 3-4 step tooltip tour: (1) point to "Create Form", (2) point to "Public Link", (3) point to "Dashboard". Use Floating UI or built-in Popover component.

---

### 17. Audit Logging for Enterprise Compliance

- **Effort**: M | **Impact**: High | **Confidence**: HIGH | **Status**: BACKLOG
- **Description**: Record all significant actions (form created/deleted, member added/removed, settings changed, data exported) in an immutable audit log. Required for SOC 2, HIPAA, and enterprise sales.
- **Implementation Notes**: No `audit_log` table exists. This was identified in Agent 02's Issues Remaining list. Supabase supports triggers on all tables.
- **Prerequisites**: Define which actions to log. Create `audit_log` table (actor_id, workspace_id, action, table_name, record_id, before_data JSONB, after_data JSONB, ip_address, created_at).
- **Recommended approach**: Create migration with `audit_log` table + generic trigger function `record_audit_event()` applied to key tables (forms, workspace_members, enterprise_settings). Add "Audit Log" tab to Settings for workspace owners.

---

### 18. Push Notifications via Web Push API

- **Effort**: M | **Impact**: Medium | **Confidence**: MEDIUM | **Status**: BACKLOG
- **Description**: Allow users to receive browser push notifications for new submissions, ticket replies, and NPS detectors — even when the app is closed.
- **Implementation Notes**: `notifications` table + Supabase Realtime subscription works in-app. Agent 13 fixed `useNotifications` error handling (infinite loading fixed, CRUD failures surface as toasts). Agent 02 added DELETE RLS for notifications. The in-app layer is solid.
- **Prerequisites**: Generate VAPID keys. Register service worker. Add notification permission prompt to Settings. Supabase DB webhook or trigger to call push fn.
- **Recommended approach**: Create `web-push` edge fn (VAPID signature + FCM/WebPush delivery). Add service worker (`public/sw.js`). Store push subscriptions in new `push_subscriptions` table. Trigger from existing notification insert triggers.

---

### 19. Embed Code Generator for Forms

- **Effort**: S | **Impact**: High | **Confidence**: HIGH | **Status**: BACKLOG
- **Description**: Generate a copy-paste `<iframe>` or JavaScript embed snippet that allows users to embed their forms on any website without leaving.
- **Implementation Notes**: Public form URLs exist (`/f/:id`). `FormDashboard.tsx` could host this feature. No backend changes needed.
- **Prerequisites**: None.
- **Recommended approach**: Add "Embed" tab or button in FormDashboard. Show code snippet: `<iframe src="https://app.formforge.com/f/{id}" width="100%" height="600" frameborder="0"></iframe>`. Add copy button. Optionally show JS embed snippet for dynamic height. Add CORS headers to public form pages if needed.

---

### 20. Custom Success Page / Redirect After Submission

- **Effort**: S | **Impact**: Medium | **Confidence**: HIGH | **Status**: BACKLOG
- **Description**: Allow form creators to configure a custom message or redirect URL shown after a form is submitted, replacing the default "Thank you" message.
- **Implementation Notes**: `form.settings` JSONB already stores custom config. `FormRenderer.tsx` shows a success state after submission. Agent 09 fixed open redirect vulnerability (protocol validation before `window.location` redirect). The security guard is in place.
- **Prerequisites**: FormBuilder UI to add `successUrl` and `successMessage` fields to settings. `FormRenderer` already does URL redirect via `window.location` (with protocol validation).
- **Recommended approach**: Add "Success Page" section in FormBuilder settings panel. Fields: `successMessage` (text), `successRedirectUrl` (URL with protocol validation). Apply in `FormRenderer` post-submit state.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Opportunities in MASTER-BRIEF | 20 |
| **DONE** (implemented this pipeline run) | **2** (#5 dark mode, #7 OG images) |
| **IN_PROGRESS** (partially implemented) | **3** (#4 webhooks, #10 CSV export, #13 churn dashboard) |
| **BACKLOG** (not yet scheduled) | **15** |
| Security priority items | 7 |
| Deferred P0/P1 issues from agents | 17 |
| Deferred P2 technical debt items | 18 |
| Total deferred issues catalogued | **35** |
| P0/P1 issues resolved by pipeline | **97 of 128** (76%) |
