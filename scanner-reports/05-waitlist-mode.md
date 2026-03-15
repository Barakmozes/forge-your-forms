# Feature 05: Waitlist Mode — Scan Report

**Scanner**: Claude Opus 4.6
**Date**: 2026-03-15
**Scope**: Public waitlist landing page, admin waitlist dashboard, entries management, hooks, analytics, referral system, database schema, RLS policies

---

## 1. Touchpoints

### Pages
| Page | File | Auth |
|------|------|------|
| Public Waitlist Form | `src/pages/PublicForm.tsx` (dispatches to WaitlistLandingPage at line 197) | Public |
| Form Dashboard | `src/pages/FormDashboard.tsx` (dispatches to WaitlistDashboard at line 81) | Protected |
| Waitlist Entries | `src/pages/WaitlistEntries.tsx` | Protected |
| Data Export | `src/pages/DataExport.tsx` (includes waitlistEntries) | Protected |

### Components
| Component | File | Purpose |
|-----------|------|---------|
| WaitlistLandingPage | `src/components/waitlist/WaitlistLandingPage.tsx` | Public signup + referral sharing |
| WaitlistDashboard | `src/components/waitlist/WaitlistDashboard.tsx` | Admin stats, charts, leaderboard |
| AiSummaryWidget | `src/components/ai/AiSummaryWidget.tsx` | AI summary on dashboard |

### Hooks
| Hook | File | Purpose |
|------|------|---------|
| useWaitlist | `src/hooks/useWaitlist.ts` | CRUD + realtime + CSV export |
| useWaitlistAnalytics | `src/hooks/useWaitlistAnalytics.ts` | Stats, daily signups, leaderboard, source breakdown |

### Utilities
| Utility | File | Purpose |
|---------|------|---------|
| generateReferralCode | `src/lib/referralCode.ts` | Crypto-random 8-char referral codes |
| dispatchWebhook | `src/lib/webhookEvents.ts` | Webhook event `WAITLIST_SIGNUP` |
| dispatchSlackNotification | `src/hooks/useIntegrations.ts` | Slack notification on signup |
| syncToMailchimp | `src/hooks/useIntegrations.ts` | Mailchimp sync on signup |
| dispatchWorkflowTrigger | `src/lib/workflowEngine.ts` | Workflow trigger `waitlist_milestone` |

### Database Tables
| Table | Migration | Key Features |
|-------|-----------|--------------|
| waitlist_entries | `002_waitlist_tables.sql` | UNIQUE(form_id, email), auto-position trigger, referral tracking |
| waitlist_invites | `002_waitlist_tables.sql` | Invite records with optional message |

### Database Functions & Triggers
| Function/Trigger | Migration | Purpose |
|------------------|-----------|---------|
| handle_waitlist_position | `004_functions_and_triggers.sql:105-127` | BEFORE INSERT: auto-assigns next position |
| handle_waitlist_referral | `004_functions_and_triggers.sql:82-102` | AFTER INSERT: increments referrer's referral_count |

### Indexes (7 total on waitlist_entries)
- `idx_waitlist_entries_form` (form_id)
- `idx_waitlist_entries_email` (email)
- `idx_waitlist_entries_referral_code` (referral_code)
- `idx_waitlist_entries_referred_by` (referred_by)
- `idx_waitlist_entries_status` (form_id, status)
- `idx_waitlist_entries_form_position` (form_id, position) -- added in migration 026

### RLS Policies (final state after migrations 003 + 024 + 025)
| Policy | Operation | Role | Description |
|--------|-----------|------|-------------|
| waitlist_entries_select_member | SELECT | authenticated | Workspace member can read |
| waitlist_entries_insert_public | INSERT | public/anon | Anyone can insert if form is active + mode=waitlist |
| waitlist_entries_update_member | UPDATE | authenticated | Workspace member can update |
| *(no DELETE policy)* | DELETE | -- | **MISSING** |
| waitlist_invites_select_member | SELECT | authenticated | Workspace member can read |
| waitlist_invites_insert_member | INSERT | authenticated | Workspace member can insert |

### Tests
| Test | File | Coverage |
|------|------|----------|
| useWaitlist.test.ts | `src/test/hooks/useWaitlist.test.ts` | 5 tests: fetch, loading, CRUD methods exist, refetch, realtime subscription |
| referralCode.test.ts | `src/test/lib/referralCode.test.ts` | 5 tests: length, custom length, valid chars, uniqueness, type |

### i18n Keys
- Full English translations at `src/i18n/locales/en.json` lines 345-424 (~80 keys under "waitlist")
- Hebrew translations at `src/i18n/locales/he.json`

---

## 2. E2E Flows

### Flow 1: Join Waitlist (Public)
**Steps**: User visits `/f/:id` -> PublicForm loads form -> mode=waitlist dispatches to WaitlistLandingPage -> user enters email (+ optional name) -> handleSubmit checks duplicate via `.maybeSingle()` -> if new, inserts with generated referral_code -> DB trigger assigns position + increments referrer's count -> shows success with position + referral link

**Verdict**: PASS with issues

**Evidence**:
- Duplicate detection works via `maybeSingle()` query at `WaitlistLandingPage.tsx:99-104`
- Position auto-assigned by `handle_waitlist_position` trigger at `004_functions_and_triggers.sql:105-127`
- Referral tracking handled by `handle_waitlist_referral` trigger at `004_functions_and_triggers.sql:82-102`
- Client also calls `increment_referral_count` RPC at `WaitlistLandingPage.tsx:138` which does NOT exist in any migration

**Gaps**:
1. **BUG**: The `increment_referral_count` RPC call at line 138 references a function that does not exist in any migration. The referral count is already handled by the `handle_waitlist_referral` DB trigger. The RPC call is redundant but uses `as never` casting and silently catches errors, so it does not break functionality -- but it means a double-increment could occur if the RPC were ever created.
2. **BUG**: The duplicate check SELECT at `WaitlistLandingPage.tsx:99-104` queries `waitlist_entries` but after migration 025, the `waitlist_entries_select_own` policy (USING=true) was dropped. The only remaining SELECT policy is `waitlist_entries_select_member` which requires authentication. This means the anonymous duplicate check will **always fail** (return null due to RLS), and duplicate signups will attempt INSERT, which will fail with a unique constraint error on `(form_id, email)`. The user will see a generic error instead of the friendly "already on waitlist" message.
3. **PERFORMANCE**: `fetchTotalSignups` at line 66-75 performs a count query `select("*", { count: "exact", head: true })` but this also hits the RLS issue since anon cannot SELECT.

### Flow 2: Referral Sharing
**Steps**: After signup, user sees referral link -> copies or shares via X/WhatsApp -> new user visits `/f/:id?ref=CODE` -> PublicForm passes `ref` param as `referralCode` prop -> WaitlistLandingPage inserts with `referred_by: referralCode` -> DB trigger increments referrer's `referral_count`

**Verdict**: PASS with issues

**Evidence**:
- Referral link construction at `WaitlistLandingPage.tsx:61-64`
- Share buttons at lines 187-208
- `referred_by` stored in insert at line 127
- DB trigger at `004_functions_and_triggers.sql:89-94`

**Gaps**:
1. **BUG**: No validation that the `referralCode` (from URL `?ref=`) actually belongs to the same form. A referral code from Form A could be used on Form B. The DB trigger at line 93 does `WHERE referral_code = NEW.referred_by AND form_id = NEW.form_id`, so the count won't increment cross-form, but the `referred_by` field will still store an invalid referral code.
2. **UX**: The "share to move up" text at line 360 (`shareToMoveUp`) suggests position movement on referrals, but no mechanism actually changes the user's position. Referrals only increment `referral_count`. This is misleading.

### Flow 3: View Position (Post-Signup)
**Steps**: After signup, user sees position number and referral count in the success state

**Verdict**: PASS

**Evidence**:
- Position displayed at `WaitlistLandingPage.tsx:400-401`
- Controlled by `showPosition` setting at line 53
- Position comes from the INSERT response (assigned by trigger)

### Flow 4: Admin Manage Entries
**Steps**: Admin navigates to `/forms/:id/entries` -> WaitlistEntries loads -> useWaitlist fetches all entries ordered by position -> admin can search, select, invite, delete

**Verdict**: PASS with issues

**Evidence**:
- Protected route at `App.tsx:134`
- useWaitlist hook fetches with `order("position", { ascending: true })` at line 18
- Realtime subscription for INSERT, UPDATE, DELETE at lines 29-62

**Gaps**:
1. **BUG/SECURITY**: No DELETE RLS policy exists for `waitlist_entries`. The `deleteEntry` function at `useWaitlist.ts:145-156` calls `.delete().eq("id", entryId)` but there is no `FOR DELETE` policy. This means the delete operation will be silently rejected by RLS. The hook optimistically removes from local state at line 152, creating a UI/DB mismatch -- the entry reappears on refresh.
2. **UX**: Delete button at `WaitlistEntries.tsx:250-258` has no confirmation dialog. One-click destructive action on production data.
3. **UX**: No pagination. All entries are fetched at once (`select("*")`). For large waitlists (10K+ entries), this will cause performance issues and high memory usage.

### Flow 5: Export CSV
**Steps**: Admin clicks CSV button -> `exportCSV(filtered)` called -> generates CSV string -> downloads via Blob URL

**Verdict**: PASS with issues

**Evidence**:
- CSV export at `useWaitlist.ts:158-178`
- Emails-only export at `useWaitlist.ts:180-190`
- Exports filtered entries when search is active

**Gaps**:
1. **SECURITY**: CSV export at `useWaitlist.ts:161-169` does not sanitize values. If an email or name contains commas, newlines, or quotes, the CSV will be malformed. If a name contains `=`, `+`, `-`, or `@` prefix, it enables CSV injection attacks when opened in Excel. No escaping is performed.
2. **UX**: No BOM (Byte Order Mark) for UTF-8 encoding, which may cause Excel to misinterpret non-ASCII characters.

### Flow 6: Invite User (Bulk)
**Steps**: Admin selects entries -> clicks Invite -> optional message -> bulkInvite updates status to "invited" + creates invite records

**Verdict**: PARTIAL PASS

**Evidence**:
- `bulkInvite` at `useWaitlist.ts:114-143`
- Status update uses `.in("id", entryIds)` at line 119
- Invite records inserted into `waitlist_invites` at lines 130-132

**Gaps**:
1. **BUG**: `bulkInvite` is not atomic. If the status UPDATE succeeds but the invite INSERT fails, entries are marked "invited" without invite records. No rollback mechanism.
2. **ARCHITECTURE**: Inviting users only changes DB status. No actual email/notification is sent to the invited users. The "Send Invites" button label at `WaitlistEntries.tsx:290` is misleading -- it implies email delivery but only updates the database.

---

## 3. Cross-Dependencies

| Dependency | Source | Target | Type |
|------------|--------|--------|------|
| PublicForm dispatch | `src/pages/PublicForm.tsx:197` | `WaitlistLandingPage` | Component import |
| FormDashboard dispatch | `src/pages/FormDashboard.tsx:81` | `WaitlistDashboard` | Component import |
| WaitlistDashboard -> Analytics | `WaitlistDashboard.tsx:116` | `useWaitlistAnalytics` | Hook dependency |
| WaitlistDashboard -> AI Summary | `WaitlistDashboard.tsx:252` | `AiSummaryWidget` | Component import |
| WaitlistEntries -> Waitlist hook | `WaitlistEntries.tsx:41` | `useWaitlist` | Hook dependency |
| WaitlistLandingPage -> Webhook | `WaitlistLandingPage.tsx:154` | `dispatchWebhook` | Fire-and-forget |
| WaitlistLandingPage -> Slack | `WaitlistLandingPage.tsx:161` | `dispatchSlackNotification` | Fire-and-forget |
| WaitlistLandingPage -> Mailchimp | `WaitlistLandingPage.tsx:162` | `syncToMailchimp` | Fire-and-forget |
| WaitlistLandingPage -> Workflow | `WaitlistLandingPage.tsx:165` | `dispatchWorkflowTrigger` | Fire-and-forget |
| Referral code generation | `WaitlistLandingPage.tsx:117` | `generateReferralCode` | Utility |
| Form mode gating | `FormDashboard.tsx:71-77` | `usePlanLimits` | No gating on waitlist mode |
| DataExport | `src/pages/DataExport.tsx:19` | `waitlist_entries` | DB query |
| Templates | `src/data/starterTemplates.ts` | waitlist mode | Template configuration |

**Key finding**: Waitlist mode has no plan gating in FormDashboard.tsx (lines 71-77 only gate feedback and support), meaning it is available on all plans including free.

---

## 4. Parallelism Assessment

| Component | Can Parallelize? | Notes |
|-----------|-----------------|-------|
| WaitlistLandingPage | Yes | Standalone public page, no shared state |
| WaitlistDashboard | Partially | Shares formId with other mode dashboards |
| WaitlistEntries | Yes | Standalone admin page |
| useWaitlist hook | Yes | Form-scoped, independent instances |
| useWaitlistAnalytics hook | Yes | Pure computation from fetched data |

**Parallel development risk**: Low. The waitlist module is well-encapsulated with clear interfaces. The main coupling points are the PublicForm/FormDashboard dispatchers and the shared form/workspace context.

---

## 5. Auth & RBAC Audit

| Operation | Required Auth | Enforcement | Status |
|-----------|--------------|-------------|--------|
| Join waitlist (public) | None | RLS: form must be active + mode=waitlist | PASS |
| Read own entry (duplicate check) | None | RLS: `waitlist_entries_select_own` was **DROPPED** in migration 025 | **FAIL** |
| Read all entries (admin) | Authenticated + workspace member | RLS: `waitlist_entries_select_member` | PASS |
| Update entry status (admin) | Authenticated + workspace member | RLS: `waitlist_entries_update_member` | PASS |
| Delete entry (admin) | Authenticated + workspace member | RLS: **NO DELETE POLICY EXISTS** | **FAIL** |
| Insert invite (admin) | Authenticated + workspace member | RLS: `waitlist_invites_insert_member` | PASS |
| Read invites (admin) | Authenticated + workspace member | RLS: `waitlist_invites_select_member` | PASS |
| Export CSV/emails (admin) | Authenticated (route-level) | Client-side only, data from useWaitlist | PASS |

**Critical finding**: Two RLS gaps:
1. The anon SELECT policy was dropped (migration 025, line 103) to fix a security issue (USING=true exposed ALL entries), but no replacement policy was created for the limited anon SELECT needed by the duplicate check. The public landing page's duplicate detection is broken.
2. No DELETE policy exists anywhere in any migration for `waitlist_entries`. Admin deletes are silently rejected.

---

## 6. Test Coverage Analysis

| Area | Tests | Coverage | Quality |
|------|-------|----------|---------|
| useWaitlist hook | 5 unit tests | Low | Tests verify method existence and loading state; no actual CRUD logic tested |
| generateReferralCode | 5 unit tests | Good | Covers length, charset, uniqueness, type |
| WaitlistLandingPage | 0 | None | No component tests |
| WaitlistDashboard | 0 | None | No component tests |
| WaitlistEntries | 0 | None | No component tests |
| useWaitlistAnalytics | 0 | None | No hook tests |
| E2E flows | 0 | None | No integration/E2E tests |

**Test gaps**:
- `useWaitlist.test.ts` tests are shallow -- they verify that methods exist as functions but never call them to test behavior
- No tests for the duplicate detection flow
- No tests for referral tracking
- No tests for CSV export content/format
- No tests for bulk invite atomicity
- No tests for analytics calculations (NPS-style: daily signups, leaderboard ranking, source breakdown)

---

## 7. Code Architecture & Quality

### Patterns
- **Mode dispatch**: Clean switch/if-chain in PublicForm.tsx and FormDashboard.tsx
- **Hook pattern**: useWaitlist follows established CRUD + realtime pattern
- **Analytics separation**: `useWaitlistAnalytics` separates computation from data fetching (good)
- **Fire-and-forget integrations**: Webhook, Slack, Mailchimp, Workflow triggers are non-blocking

### Code Smells

1. **DRY violation**: `WaitlistLandingPage.tsx` duplicates the Supabase insert/select logic that already exists in `useWaitlist.addEntry()`. The landing page builds its own insert at lines 120-130 instead of using the hook. Both have independent duplicate-detection logic.

2. **DRY violation**: `useWaitlistAnalytics.ts` fetches `waitlist_entries` independently (line 32-41) even though `useWaitlist` already fetches the same data. The dashboard uses `useWaitlistAnalytics` (which fetches all entries) but does not use `useWaitlist`. If both were used in the same component tree, there would be double-fetching.

3. **Type casting**: `WaitlistLandingPage.tsx:138` uses `as never` casting twice for the RPC call, masking type issues.

4. **Redundant referral increment**: The DB trigger `handle_waitlist_referral` already increments referral_count on INSERT. The client-side RPC call at `WaitlistLandingPage.tsx:137-146` is redundant and could cause double-counting if the RPC function were ever created.

5. **Magic strings**: Status values like `"waiting"`, `"invited"` are string literals scattered across hooks and components instead of using a centralized enum/constant.

6. **Implicit any**: `WaitlistDashboard.tsx:47` uses `AiSummaryWidget` with `AiSubmissionInput[]` mapping that coerces waitlist entries to submission-like objects -- a conceptual mismatch.

---

## 8. Error Handling & Resilience

| Scenario | Handling | Quality |
|----------|----------|---------|
| Network error on signup | Caught in try/catch, toast.error shown | Good |
| Duplicate email insert | Caught via pre-check + toast.info | Broken (anon SELECT fails post-migration 025) |
| Unique constraint violation (race) | Thrown as insertError, shown via toast.error | Acceptable but unfriendly message |
| Realtime subscription failure | No error handling on `.subscribe()` | Poor |
| Delete fails (RLS rejection) | Hook optimistically removes from state; no error toast because `.delete()` returns no rows silently | Bug |
| Clipboard API failure | Caught, toast.error shown | Good |
| CSV export with empty data | Generates valid CSV with headers only | Acceptable |
| Form not found (public) | Shows "Form not found" UI | Good |
| Form closed/draft | Shows appropriate message | Good |
| Webhook/Slack/Mailchimp failure | Fire-and-forget, no user impact | Acceptable |

**Key resilience issues**:
1. No retry logic on failed API calls
2. Realtime subscription failures are silently ignored
3. The `bulkInvite` function is not atomic (partial failure possible)
4. No rate limiting on public signup endpoint (relies solely on Supabase/RLS)

---

## 9. Responsive Design Audit (Public Waitlist Page)

| Element | Mobile | Tablet | Desktop | Notes |
|---------|--------|--------|---------|-------|
| Page layout | `min-h-screen flex flex-col items-center justify-center px-4` | Same | Same | Good centering |
| Card width | `w-full max-w-lg` | Constrained | Constrained | Good |
| Typography | `text-3xl sm:text-4xl md:text-5xl` | Responsive | Responsive | Good |
| Email input | Full width with icon | Same | Same | Good |
| CTA button | `w-full h-12` | Full width | Full width | Good |
| Share buttons | `grid grid-cols-2 gap-2` | 2-column | 2-column | Good |
| Referral link input | Flex with copy button | Responsive | Responsive | Good |
| Logo | `h-12 sm:h-14` | Responsive | Responsive | Good |
| Padding | `p-6 sm:p-8` | Responsive | Responsive | Good |
| Dark mode | `dark:` variants throughout | Supported | Supported | Good |

**Responsive verdict**: The public waitlist page is well-designed for responsive layouts. All critical elements use appropriate Tailwind breakpoints. The `max-w-lg` constraint prevents overly wide layouts on desktop.

**Minor gap**: The referral link input on very narrow screens (< 320px) may overflow since the copy button is `shrink-0` and the input takes remaining space.

---

## 10. Database & Query Optimization

### Indexes
The waitlist_entries table has **7 indexes** which is well-covered:
- `idx_waitlist_entries_form` (form_id) -- primary filter
- `idx_waitlist_entries_email` (email) -- duplicate checks
- `idx_waitlist_entries_referral_code` (referral_code) -- UNIQUE constraint also creates index
- `idx_waitlist_entries_referred_by` (referred_by) -- referral tracking
- `idx_waitlist_entries_status` (form_id, status) -- status filtering
- `idx_waitlist_entries_form_position` (form_id, position) -- admin sorting (added in 026)

### Query Patterns

| Query | Location | Optimization Status |
|-------|----------|-------------------|
| Count entries by form_id | `WaitlistLandingPage.tsx:67-70` | Uses `head: true` with exact count -- efficient |
| Duplicate check by (form_id, email) | `WaitlistLandingPage.tsx:99-104` | Uses composite UNIQUE index -- efficient |
| Fetch all entries ordered by position | `useWaitlist.ts:14-18` | Uses `idx_waitlist_entries_form_position` -- efficient |
| Fetch all entries for analytics | `useWaitlistAnalytics.ts:32-37` | Full table scan per form (no pagination) -- concern at scale |
| Referral count update by trigger | `004_functions_and_triggers.sql:90-93` | Uses `idx_waitlist_entries_referral_code` -- efficient |

### Race Conditions

**Position assignment race condition** (`handle_waitlist_position` at `004_functions_and_triggers.sql:114-117`):
```sql
SELECT COALESCE(MAX(position), 0) + 1 INTO next_position
FROM public.waitlist_entries WHERE form_id = NEW.form_id;
```
This uses `MAX(position) + 1` which is vulnerable to race conditions under concurrent inserts. Two simultaneous signups could get the same position number. The function does not use `SELECT ... FOR UPDATE` or advisory locks. The `position` column has no UNIQUE constraint. This is a low-severity issue because position duplicates don't break functionality, but they undermine the fairness perception of the waitlist.

### Scalability Concerns

1. **No pagination**: `useWaitlist` and `useWaitlistAnalytics` fetch ALL entries for a form. For a viral waitlist with 100K+ entries, this will cause:
   - Slow API responses
   - High memory usage on the client
   - Slow `useMemo` computations in analytics

2. **Analytics computed client-side**: All stats (daily signups, leaderboard, source breakdown) are computed from raw entries in `useMemo`. At scale, this should be done server-side (views, materialized views, or edge functions).

---

## 11. Accessibility Audit (Public Waitlist Page)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Form labels | PASS | `<label htmlFor="waitlist-email">` at line 309-310, `<label htmlFor="waitlist-name">` at line 289-290 |
| Input IDs match labels | PASS | `id="waitlist-email"` and `id="waitlist-name"` |
| Required fields | PASS | `required` attribute on email input (line 324), conditional on name (line 301) |
| Button disabled state | PASS | `disabled={submitState === "submitting"}` at line 334 |
| Loading spinner | PARTIAL | Uses visual spinner (line 344) but no `aria-busy` or `aria-live` region |
| Copy button aria-label | PASS | `aria-label="Copy referral link"` at line 443 |
| SVG icons decorative | PASS | `aria-hidden="true"` on share button SVGs at lines 464, 479 |
| Color contrast | LIKELY PASS | Uses Tailwind theme tokens; primary green on white should pass WCAG AA |
| Focus management | PARTIAL | No focus management after form submission -- focus stays on submit button area |
| Error announcements | FAIL | Toast errors (`sonner`) may not be announced by screen readers unless sonner uses `aria-live` |
| Success state | FAIL | No `aria-live="polite"` region for the success/confirmation state |
| Keyboard navigation | PASS | Standard form elements, buttons, and inputs are keyboard-accessible |
| Skip navigation | N/A | Single-page form, no complex navigation |

**Key a11y gaps**:
1. No `aria-live` region for post-submission state transition
2. No `role="status"` on the position/referral count display
3. Toast notifications may not be screen-reader-friendly

---

## 12. SEO Audit (Public Waitlist Page)

| Criterion | Status | Notes |
|-----------|--------|-------|
| Page title | FAIL | No dynamic `<title>` tag. Uses static "FormForge" from `index.html`. Each waitlist should show its own title. |
| Meta description | FAIL | No dynamic meta description per waitlist |
| Open Graph tags | FAIL | No dynamic OG tags. Static OG from `index.html` describes FormForge, not the specific waitlist |
| Twitter Card | FAIL | Same as OG -- static, not waitlist-specific |
| Canonical URL | FAIL | No canonical tag set |
| Structured data | FAIL | No JSON-LD or schema.org markup |
| Server-side rendering | N/A | SPA -- no SSR. Search engines using JS rendering may index, but social media preview cards will show generic FormForge metadata |
| robots.txt | Not checked | |
| Sitemap | Not checked | |

**Impact**: When users share their waitlist link on social media (X, WhatsApp, LinkedIn), the preview card will show generic "FormForge" branding instead of the specific waitlist title and description. This significantly reduces viral sharing effectiveness -- the core growth mechanism for waitlists.

**Recommendation**: Implement `react-helmet-async` or a similar solution to set dynamic `<title>`, `<meta>`, and OG tags per waitlist. Alternatively, use a server-side meta tag injection approach (Supabase Edge Function or Cloudflare Worker) for proper social media preview cards.

---

## 13. Documentation Audit

| Area | Documented? | Location |
|------|------------|----------|
| Waitlist mode overview | Yes | `CLAUDE.md` sections 1, 4, 13 |
| Database schema | Yes | `CLAUDE.md` section 4 |
| RLS policies | Yes | `CLAUDE.md` section 4 (but outdated -- doesn't reflect 025 changes) |
| Settings/branding options | Partial | Settings like `requireName`, `showPosition`, `showCount`, `enableReferrals` are only documented in code |
| API/webhook events | Partial | `WAITLIST_SIGNUP` event exists but no public API docs |
| Referral system mechanics | No | No docs explaining referral code format, position logic, or sharing mechanics |
| Adding a new waitlist | Yes | `CLAUDE.md` section 14 (generic mode creation checklist) |

**Key gap**: The CLAUDE.md documents the `waitlist_entries_select_own` policy as still existing (section 4, RLS Policy Summary: "Public insert"), but it was dropped in migration 025. The documentation is stale regarding RLS policy state.

---

## 14. Product Growth & Innovation (7 Lenses)

### 1. Viral Growth
- **Current**: Referral system with unique codes, X/WhatsApp sharing, copy link
- **Gap**: No position-based rewards (e.g., "move up 3 spots per referral")
- **Opportunity**: Add referral milestone rewards, email-based sharing, Facebook/LinkedIn share buttons, embeddable waitlist widget

### 2. Engagement
- **Current**: Shows position and referral count post-signup
- **Gap**: No email notifications for position changes, no re-engagement
- **Opportunity**: Automated email sequences (confirmation, weekly position update, "you're almost in!"), push notifications

### 3. Conversion
- **Current**: Simple email + optional name form
- **Gap**: No A/B testing on landing page, no urgency indicators
- **Opportunity**: Countdown timers, social proof ("X people joined in the last hour"), customizable CTA text, multi-step signup with qualifying questions

### 4. Analytics Depth
- **Current**: Total, today, this week, referral rate, daily chart, source breakdown, leaderboard
- **Gap**: No cohort analysis, no funnel metrics (visit -> signup conversion), no geographic breakdown
- **Opportunity**: UTM tracking, conversion funnel, cohort retention, geographic heatmap, referral chain visualization

### 5. Admin Productivity
- **Current**: Search, bulk invite, CSV export, email export
- **Gap**: No status filtering in entries page, no bulk delete, no inline editing, no sorting by column
- **Opportunity**: Column sorting, status filter tabs, bulk status change, inline name editing, pagination with server-side filtering

### 6. Integration Depth
- **Current**: Webhooks, Slack, Mailchimp, workflow triggers
- **Gap**: No Zapier/Make integration, no native email sending for invites
- **Opportunity**: Native invite emails, Zapier/Make webhooks, HubSpot/Salesforce sync, Google Sheets sync

### 7. Customization
- **Current**: Branding (colors, logo, gradient), settings (requireName, showPosition, showCount, enableReferrals)
- **Gap**: No custom fields on waitlist signup, no custom thank-you page, no custom email templates
- **Opportunity**: Custom signup fields, custom redirect after signup, custom email templates for invites, embed code generator

---

## 15. Issues Found

### P0 — Critical (must fix)

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 1 | **Missing DELETE RLS policy** for `waitlist_entries`. Admin delete operations are silently rejected by Supabase RLS. Hook optimistically removes entry from local state, but it reappears on refresh. | SECURITY/BUG | HIGH | `supabase/migrations/` (all) | N/A | Admin cannot delete waitlist entries. Data integrity illusion. |
| 2 | **Broken anon duplicate check** after `waitlist_entries_select_own` policy was dropped in migration 025. Public landing page's `.maybeSingle()` SELECT returns null for anon users, so duplicate detection fails. Users see a constraint violation error instead of the friendly "already on waitlist" message. | BUG | HIGH | `src/components/waitlist/WaitlistLandingPage.tsx` | 99-114 | Degraded public UX for returning visitors. |
| 3 | **Broken anon total count query**. The `fetchTotalSignups` count query at line 67-70 also fails for anon users since no SELECT policy allows it. `totalSignups` stays null, and the count badge never renders. | BUG | HIGH | `src/components/waitlist/WaitlistLandingPage.tsx` | 66-75 | Social proof counter invisible to all public visitors. |

### P1 — High (should fix soon)

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 4 | **CSV injection vulnerability**. CSV export does not escape/quote values containing commas, quotes, newlines, or formula prefixes (`=`, `+`, `-`, `@`). Malicious email/name data could execute formulas when opened in Excel. | SECURITY | HIGH | `src/hooks/useWaitlist.ts` | 161-169 | Potential RCE via Excel formula injection on admin machines. |
| 5 | **Position assignment race condition**. `handle_waitlist_position` uses `MAX(position) + 1` without locking, allowing duplicate positions under concurrent inserts. | DATABASE | MEDIUM | `supabase/migrations/004_functions_and_triggers.sql` | 114-117 | Duplicate position numbers undermine waitlist fairness. |
| 6 | **Non-atomic bulk invite**. Status UPDATE and invite record INSERT are separate operations. Partial failure leaves entries marked "invited" without invite records. | RESILIENCE | MEDIUM | `src/hooks/useWaitlist.ts` | 114-143 | Data inconsistency between status and invite records. |
| 7 | **No pagination on entries fetch**. Both `useWaitlist` and `useWaitlistAnalytics` fetch ALL entries. At scale (10K+ entries), this causes slow responses, high memory, and browser lag. | PERFORMANCE | HIGH | `src/hooks/useWaitlist.ts` | 14-18 | Performance degradation for popular waitlists. |
| 8 | **Redundant RPC call for referral increment**. `increment_referral_count` RPC at line 138 does not exist in any migration. The DB trigger already handles this. If the function is ever created, referral counts would be double-incremented. | BUG | MEDIUM | `src/components/waitlist/WaitlistLandingPage.tsx` | 137-146 | Dead code; potential double-counting risk. |

### P2 — Medium (improve when possible)

| # | Issue | Category | Confidence | File | Line | Impact |
|---|-------|----------|------------|------|------|--------|
| 9 | **No delete confirmation dialog**. Admin can delete waitlist entries with a single click, no confirmation. | UX | HIGH | `src/pages/WaitlistEntries.tsx` | 250-258 | Accidental data deletion. |
| 10 | **Misleading "share to move up" text**. Referrals increment `referral_count` but do not change position. | UX | HIGH | `src/components/waitlist/WaitlistLandingPage.tsx` | 360 | Users expect position changes that never happen. |
| 11 | **DRY violation**: WaitlistLandingPage duplicates insert/duplicate-check logic from useWaitlist hook. | ARCHITECTURE | HIGH | `src/components/waitlist/WaitlistLandingPage.tsx` | 81-172 | Maintenance burden; divergent logic paths. |
| 12 | **No dynamic SEO meta tags**. Public waitlist pages use static FormForge OG/Twitter tags. Shared links show generic preview instead of waitlist-specific content. | SEO | HIGH | `src/components/waitlist/WaitlistLandingPage.tsx` | N/A | Reduced social sharing effectiveness. |
| 13 | **No `aria-live` region** for post-submission state. Screen readers may not announce the success/duplicate confirmation. | UX | MEDIUM | `src/components/waitlist/WaitlistLandingPage.tsx` | 362 | Accessibility gap for screen reader users. |
| 14 | **Referral code modulo bias**. `arr[i] % CHARS.length` where CHARS has 55 characters and arr[i] is 0-255 introduces slight bias (256 % 55 = 36, so first 36 chars are ~1.8% more likely). | SECURITY | LOW | `src/lib/referralCode.ts` | 8 | Negligible for 8-char codes but technically imperfect. |
| 15 | **Hardcoded `en-US` date locale** in dashboard. `formatDate` at line 58-61 always uses `en-US` locale regardless of i18n settings. | UX | MEDIUM | `src/components/waitlist/WaitlistDashboard.tsx` | 58-61 | Dates don't respect user's locale preference. |
| 16 | **No cross-form referral validation**. A referral code from Form A can be stored as `referred_by` on Form B entry. The trigger won't increment counts cross-form, but invalid data is stored. | DATABASE | LOW | `src/components/waitlist/WaitlistLandingPage.tsx` | 127 | Minor data integrity issue. |
| 17 | **Double data fetching**. `useWaitlistAnalytics` independently fetches all entries even when `useWaitlist` already has the same data loaded. If used together, the same data is fetched twice. | PERFORMANCE | MEDIUM | `src/hooks/useWaitlistAnalytics.ts` | 31-41 | Unnecessary network requests. |
| 18 | **Invite button misleading**. "Send Invites" text implies email delivery, but only updates database status. No email is actually sent. | UX | HIGH | `src/pages/WaitlistEntries.tsx` | 290 | Admin expects invites to reach users but they don't. |
| 19 | **Stale CLAUDE.md documentation**. RLS policy section still references `waitlist_entries_select_own` which was dropped in migration 025. | DOCS | MEDIUM | `CLAUDE.md` | Section 4 | Developers may rely on outdated policy information. |
| 20 | **Badge variant mismatch**. `WaitlistDashboard.tsx:191` checks `formStatus === "published"` but the form_status enum values are `draft`, `active`, `closed` -- there is no `published` value. The badge will always show "secondary" variant. | BUG | HIGH | `src/components/waitlist/WaitlistDashboard.tsx` | 191 | Status badge always shows wrong variant. |

---

## 16. Recommended Fix Path

### Phase 1: Critical Fixes (P0)

1. **Create migration for DELETE RLS policy** on `waitlist_entries`:
   ```sql
   CREATE POLICY "waitlist_entries_delete_member" ON public.waitlist_entries
     FOR DELETE TO authenticated
     USING (
       EXISTS (
         SELECT 1 FROM public.forms f
         WHERE f.id = form_id AND public.is_workspace_member(auth.uid(), f.workspace_id)
       )
     );
   ```

2. **Create scoped anon SELECT policy** for `waitlist_entries` to restore duplicate check and count functionality:
   ```sql
   CREATE POLICY "waitlist_entries_select_anon_own" ON public.waitlist_entries
     FOR SELECT
     USING (
       EXISTS (
         SELECT 1 FROM public.forms f
         WHERE f.id = form_id AND f.status = 'active' AND f.mode = 'waitlist'
       )
     );
   ```
   Alternatively, refactor the duplicate check to use a DB function (SECURITY DEFINER) that can bypass RLS, returning only the specific entry.

### Phase 2: High Priority Fixes (P1)

3. **Fix CSV injection**: Wrap all CSV cell values in quotes and escape internal quotes. Prefix formula characters with a single quote.
4. **Fix position race condition**: Use `SELECT ... FOR UPDATE` or `pg_advisory_xact_lock` in `handle_waitlist_position`, or add a UNIQUE constraint on `(form_id, position)` with a retry loop.
5. **Make bulk invite atomic**: Wrap the UPDATE + INSERT in a single Supabase RPC function using a transaction.
6. **Add pagination**: Implement cursor-based or offset pagination in `useWaitlist` and `useWaitlistAnalytics`.
7. **Remove redundant RPC call**: Delete the `increment_referral_count` RPC call from `WaitlistLandingPage.tsx:137-146`.

### Phase 3: UX & Quality Improvements (P2)

8. Add delete confirmation dialog (AlertDialog component already exists in shadcn/ui inventory).
9. Fix "share to move up" text to accurately reflect referral behavior, or implement position-based rewards.
10. Refactor `WaitlistLandingPage` to use `useWaitlist.addEntry()` instead of duplicating Supabase logic.
11. Implement `react-helmet-async` for dynamic SEO meta tags on public waitlist pages.
12. Add `aria-live="polite"` region for post-submission state.
13. Fix `formStatus === "published"` check to use `"active"`.
14. Fix hardcoded `en-US` locale in `formatDate`.
15. Clarify invite button text or implement actual email delivery.
