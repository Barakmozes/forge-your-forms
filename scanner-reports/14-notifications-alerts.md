# Scanner Report 14: Notifications & Alerts

**Scanner**: Feature 14 - Notifications & Alerts
**Date**: 2026-03-15
**Status**: COMPLETE

---

## 1. Touchpoints

### Database

| Asset | File | Purpose |
|-------|------|---------|
| `notifications` table | `supabase/migrations/001_core_tables_and_enums.sql:72-81` | Core notification storage (user_id, type, title, message, link, read) |
| `feedback_alerts` table | `supabase/migrations/005_feedback_tables.sql:20-28` | Detractor/score_drop/keyword alerts for feedback mode |
| RLS: notifications SELECT/UPDATE | `supabase/migrations/003_rls_policies.sql:87-92` | Own-user access (later hardened to `authenticated` in 024) |
| RLS: notifications INSERT | `supabase/migrations/003_rls_policies.sql:91-92` | Originally `WITH CHECK(true)`, hardened in 025 to validate `user_id` |
| Detractor notification trigger | `supabase/migrations/005_feedback_tables.sql:121-132` | Auto-creates notification for workspace owner on detractor response |
| Submission notification trigger | `supabase/migrations/012_notification_triggers.sql:7-37` | Notifies workspace owner on new submission |
| Ticket assignment trigger | `supabase/migrations/012_notification_triggers.sql:48-76` | Notifies assigned agent when ticket is assigned |
| RLS hardening (024) | `supabase/migrations/024_rls_role_remediation.sql:132-142` | Restricts SELECT/UPDATE to `authenticated` role |
| RLS hardening (025) | `supabase/migrations/025_policy_hardening.sql:47-58` | Validates `user_id` exists in `auth.users` for INSERT |
| Partial index for unread | `supabase/migrations/026_cleanup_indexes.sql:53-55` | `idx_notifications_user_unread` on (user_id, created_at DESC) WHERE read=false |
| Base indexes | `supabase/migrations/001_core_tables_and_enums.sql:89-90` | `idx_notifications_user`, `idx_notifications_read` |
| Realtime enabled | `supabase/migrations/004_functions_and_triggers.sql:132` | `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications` |

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useNotifications` | `src/hooks/useNotifications.ts` | CRUD + realtime for notifications (fetch, markAsRead, markAllAsRead, deleteNotification) |
| `useFeedback` | `src/hooks/useFeedback.ts` | Manages feedback_alerts alongside feedback_responses (markAlertRead) |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `NotificationPanel` | `src/components/NotificationPanel.tsx` | Bell icon popover with badge, filter (all/unread), mark-all-read, delete, type-specific icons |
| `Navbar` | `src/components/Navbar.tsx:127` | Renders `<NotificationPanel />` in header (always visible, not hidden on mobile) |
| `FeedbackDashboard` | `src/components/feedback/FeedbackDashboard.tsx:261-351` | Renders `feedback_alerts` as dismissible `<Alert>` banners |

### Edge Functions

| Function | File | Purpose |
|----------|------|---------|
| `send-email` | `supabase/functions/send-email/index.ts` | Transactional emails via Resend API (6 templates, bilingual EN/HE) |
| `slack-notify` | `supabase/functions/slack-notify/index.ts` | Sends Slack Block Kit messages via incoming webhooks |
| `execute-workflow` | `supabase/functions/execute-workflow/index.ts:115` | Workflow engine can dispatch send-email as an action |

### Client-side Email Layer

| File | Purpose |
|------|---------|
| `src/lib/emailTemplates.ts` | Type-safe `sendEmail()` wrapper calling send-email edge function |
| `src/components/onboarding/OnboardingWizard.tsx:48` | Sends welcome email on first onboarding |

### Tests

| File | Purpose |
|------|---------|
| `src/test/hooks/useNotifications.test.ts` | Unit tests for useNotifications (fetch, unread count, markAsRead, markAllAsRead, delete, realtime subscription) |
| `src/test/utils.ts:220-231` | `createMockNotification()` factory |

### i18n

| File | Keys |
|------|------|
| `src/i18n/locales/en.json:695-710` | `notifications.title`, `.all`, `.unread`, `.noNotifications`, `.noUnreadNotifications`, `.markAllRead`, `.justNow`, `.minutesAgo`, `.hoursAgo`, `.daysAgo` |
| `src/i18n/locales/he.json:695-710` | Hebrew translations for all notification keys |

---

## 2. E2E Flows

### Flow A: Submission Creates In-App Notification

**Path**: Public form submit -> `submissions` INSERT -> trigger `on_submission_notify` -> `notify_on_submission()` -> INSERT into `notifications` -> Realtime pushes to `useNotifications` -> `NotificationPanel` renders bell badge + item

| Step | Status | Notes |
|------|--------|-------|
| 1. Trigger fires on submission INSERT | PASS | `012_notification_triggers.sql:39-43` |
| 2. Trigger resolves form title + workspace owner | PASS | Joins forms -> workspaces |
| 3. Notification inserted with correct type/link | PASS | type=`submission`, link=`/forms/{id}/submissions` |
| 4. Realtime delivers to subscribed user | PASS | Channel `notifications-{userId}`, INSERT event |
| 5. NotificationPanel deduplicates | PASS | `useNotifications.ts:41` checks `prev.some(n => n.id === newNotif.id)` |
| 6. Badge updates unreadCount | PASS | Computed as `notifications.filter(n => !n.read).length` |

**Verdict**: PASS

### Flow B: Detractor Alert (Feedback Mode)

**Path**: NPS score 0-6 submitted -> trigger `on_feedback_response_created` -> auto-sets sentiment to `detractor` -> inserts `feedback_alerts` row + `notifications` row -> FeedbackDashboard shows alert banner + NotificationPanel shows bell

| Step | Status | Notes |
|------|--------|-------|
| 1. Trigger detects detractor score | PASS | `005_feedback_tables.sql:106` |
| 2. Checks `alertOnDetractor` setting | PASS | Defaults to true if not set |
| 3. Creates `feedback_alerts` row | PASS | type=`detractor` |
| 4. Creates `notifications` row for owner | PASS | type=`detractor_alert`, link=`/forms/{formId}` |
| 5. FeedbackDashboard shows unread alerts | PASS | Filters `!a.read && !dismissedAlerts.has(a.id)` |
| 6. Dismiss updates alert in DB | PASS | `useFeedback.markAlertRead()` |

**Verdict**: PASS

### Flow C: Ticket Assignment Notification

**Path**: Agent assigns ticket -> `tickets` UPDATE -> trigger `on_ticket_assigned_notify` -> notification inserted for assigned agent

| Step | Status | Notes |
|------|--------|-------|
| 1. Trigger checks assigned_to changed | PASS | `IS NOT DISTINCT FROM` comparison |
| 2. Only fires when assigned_to non-null | PASS | Guard at line 57 |
| 3. Notification created with correct link | PASS | link=`/forms/{formId}/tickets/{ticketId}` |

**Verdict**: PASS

### Flow D: Mark Notification as Read

**Path**: User clicks notification -> `markAsRead(id)` -> UPDATE `notifications` SET read=true -> optimistic local state update -> Realtime echoes UPDATE

| Step | Status | Notes |
|------|--------|-------|
| 1. markAsRead sends UPDATE | PASS | `useNotifications.ts:84-87` |
| 2. Local state updates optimistically | PASS | Line 90-92 |
| 3. Navigation on click if link present | PASS | `NotificationPanel.tsx:67-70` |
| 4. RLS allows own-user UPDATE | PASS | Policy `notifications_update_own` |

**Verdict**: PASS

### Flow E: Mark All as Read

**Path**: User clicks "Mark All Read" -> `markAllAsRead()` -> filters unread IDs -> UPDATE ... IN(ids)

| Step | Status | Notes |
|------|--------|-------|
| 1. Filters unread IDs client-side | PASS | `useNotifications.ts:98-99` |
| 2. Batch UPDATE via `.in("id", unreadIds)` | PASS | Line 101-104 |
| 3. Local state marks all read | PASS | Line 107-109 |
| 4. Early return if nothing to update | PASS | Line 99 |

**Verdict**: PASS

### Flow F: Delete Notification

**Path**: User clicks X button -> `deleteNotification(id)` -> DELETE from `notifications` -> Realtime echoes DELETE

| Step | Status | Notes |
|------|--------|-------|
| 1. DELETE query executed | PASS | `useNotifications.ts:115-118` |
| 2. Local state removes item | PASS | Line 121 |
| 3. RLS allows DELETE | **FAIL** | No DELETE policy exists on `notifications` table |

**Verdict**: FAIL -- see Issue #1

### Flow G: Email Notification (send-email)

**Path**: Client calls `sendEmail()` -> `supabase.functions.invoke("send-email")` -> Edge function validates auth -> renders template -> calls Resend API

| Step | Status | Notes |
|------|--------|-------|
| 1. Auth: user JWT accepted | PASS | Fixed in v6 (added `getUser()` fallback) |
| 2. Template lookup | PASS | 6 templates in registry |
| 3. Variable sanitization | PASS | HTML entities escaped, URLs passthrough |
| 4. Bilingual support (EN/HE) | PASS | `locale` param drives template selection |
| 5. Resend API call | PASS | Proper error handling |

**Verdict**: PASS (assuming RESEND_API_KEY is configured)

### Flow H: Slack Notification

**Path**: Integration sends event -> `supabase.functions.invoke("slack-notify")` -> SSRF-protected URL validation -> Slack Block Kit payload -> POST to webhook

| Step | Status | Notes |
|------|--------|-------|
| 1. SSRF protection | PASS | Only `hooks.slack.com` allowed |
| 2. Block Kit formatting | PASS | Event-specific fields (NPS, ticket#, etc.) |
| 3. Timeout protection | PASS | `AbortSignal.timeout(10000)` |

**Verdict**: PASS

---

## 3. Cross-Dependencies

| Dependency | Direction | Nature |
|------------|-----------|--------|
| `notifications` <- `submissions` | DB trigger | `on_submission_notify` fires on INSERT |
| `notifications` <- `tickets` | DB trigger | `on_ticket_assigned_notify` fires on UPDATE |
| `notifications` <- `feedback_responses` | DB trigger | `handle_feedback_response` fires on INSERT |
| `NotificationPanel` <- `Navbar` | Component | Always rendered in app header |
| `useNotifications` <- `AuthContext` | Hook | Requires `user.id` |
| `send-email` <- `emailTemplates.ts` | Edge function | Client-side wrapper |
| `send-email` <- `execute-workflow` | Edge function | Workflow action dispatches emails |
| `send-email` <- `OnboardingWizard` | Component | Sends welcome email |
| `feedback_alerts` <- `useFeedback` | Hook | Fetched alongside feedback_responses |
| `feedback_alerts` <- `FeedbackDashboard` | Component | Alert banners |
| `slack-notify` <- `useIntegrations` | Hook | Slack config stored in form settings |

---

## 4. Parallelism Assessment

| Concern | Risk | Analysis |
|---------|------|----------|
| Multiple tabs with same user | LOW | Realtime deduplication in `useNotifications.ts:41` prevents double entries |
| Race condition on markAllAsRead | LOW | Client-side unread ID snapshot; worst case marks already-read as read again (idempotent) |
| Trigger concurrency | LOW | Each trigger runs in its own transaction; notification INSERTs are independent |
| Channel cleanup | SAFE | `removeChannel` called on unmount in useEffect cleanup |
| Stale closure on notifications | LOW | `setNotifications` uses functional updater form everywhere |

---

## 5. Code Architecture & Quality

### Strengths

1. **Clean separation of concerns**: `useNotifications` is a self-contained hook with CRUD + realtime, following the project's established hook pattern.
2. **Full realtime coverage**: Unlike most other hooks (which only watch INSERT), `useNotifications` subscribes to INSERT, UPDATE, and DELETE events (`useNotifications.ts:30-73`).
3. **Deduplication guard**: `prev.some(n => n.id === newNotif.id)` prevents duplicate entries from rapid realtime events.
4. **Type-safe email templates**: `emailTemplates.ts` uses mapped types to enforce template-specific variables at compile time.
5. **Bilingual email support**: All 6 email templates support EN and HE with proper RTL layout.
6. **SSRF protection in slack-notify**: URL validation restricts to `hooks.slack.com` only.
7. **HTML sanitization**: `send-email/index.ts:20-27` escapes all non-URL template variables.
8. **Test coverage**: `useNotifications.test.ts` covers all main operations (7 test cases).
9. **i18n complete**: All notification UI strings translated to both EN and HE.
10. **Accessible touch targets**: Bell button has `min-h-[44px] min-w-[44px]` for mobile compliance.

### Concerns

1. **`unreadCount` recomputed on every render**: `useNotifications.ts:81` is not wrapped in `useMemo`. With up to 50 notifications, the cost is negligible, but it is inconsistent with the project's `useMemo` pattern in analytics hooks.
2. **No notification type enum in DB**: The `type` column is `TEXT NOT NULL` -- no enum constraint means any string can be inserted, and the UI silently falls back to a generic icon.
3. **Notification trigger functions missing `SET search_path`**: Both `notify_on_submission()` and `notify_on_ticket_assigned()` in `012_notification_triggers.sql` use `SECURITY DEFINER` without `SET search_path = public`, unlike all functions hardened in migration 025. This is a search_path injection vector.
4. **Notifications only sent to workspace owner**: Both `notify_on_submission` and the detractor trigger only notify the workspace `owner_id`. Editors and viewers on the workspace get no notifications.

---

## 6. Error Handling & Resilience

| Area | Handling | Quality |
|------|----------|---------|
| `useNotifications.fetchNotifications` | Silently swallows errors (`if (!error)` path only) | WEAK -- no error state, no toast, no retry |
| `useNotifications.markAsRead` | Returns `{ error }` but caller (`NotificationPanel`) does not check it | WEAK |
| `useNotifications.markAllAsRead` | Returns `{ error }` but caller does not check it | WEAK |
| `useNotifications.deleteNotification` | Returns `{ error }` but caller does not check it | WEAK |
| `sendEmail()` | Returns `{ success, error }` with try/catch | GOOD |
| `OnboardingWizard` welcome email | Non-blocking with toast on failure | GOOD |
| `send-email` edge function | Validates JSON, template, auth; returns structured errors | GOOD |
| `slack-notify` edge function | Catches all errors, returns JSON | GOOD |
| DB trigger `notify_on_submission` | `IF v_form IS NULL THEN RETURN NEW` -- silently skips | ACCEPTABLE (trigger should not block submission) |
| DB trigger `notify_on_ticket_assigned` | Same pattern | ACCEPTABLE |

### Missing Resilience

- **No retry on failed notification fetch**: If the initial fetch fails (network error, RLS issue), the panel stays in loading state forever.
- **No error feedback in NotificationPanel**: All operations fail silently. User has no indication when markAsRead or delete fails.
- **No notification TTL/cleanup**: Old notifications accumulate indefinitely. The `LIMIT 50` on fetch helps but data grows unbounded in DB.

---

## 7. Edge Function / Serverless Audit

### send-email

| Aspect | Status | Detail |
|--------|--------|--------|
| Deployment flag | `--no-verify-jwt` | Required since auth is handled in-function |
| Auth: service role key | PASS | Checks Bearer and apikey headers |
| Auth: legacy JWT | PASS | Decodes and validates role/issuer/ref |
| Auth: user JWT | PASS | Uses `supabase.auth.getUser(token)` |
| CORS | PASS | Handles OPTIONS preflight |
| Input validation | PASS | Validates `to`, `template` required; unknown template rejected |
| Template count | 6 | welcome, waitlist_invite, ticket_confirmation, detractor_alert, payment_confirmation, payment_failed |
| Variable sanitization | PASS | HTML entities escaped; URLs pass-through for href usage |
| Error logging | PASS | `console.error` on Resend API errors |
| Secrets required | 2 | `RESEND_API_KEY`, `FROM_EMAIL` |

**Potential Issue**: URL variables bypass sanitization (`line 33: if key.toLowerCase().endsWith("url")`). If an attacker controls a URL variable, they could inject `javascript:` URIs into email `href` attributes. However, URLs are only used in `<a href="...">` tags, and email clients generally don't execute JS in href. Risk is LOW.

### slack-notify

| Aspect | Status | Detail |
|--------|--------|--------|
| SSRF protection | PASS | Only `hooks.slack.com` hostname allowed |
| Timeout | PASS | 10-second `AbortSignal` |
| Auth | NONE | No auth check -- relies on Supabase gateway JWT |
| Input validation | PASS | Requires `webhook_url` and `event_type` |

### execute-workflow (send_email action)

| Aspect | Status | Detail |
|--------|--------|--------|
| Calls send-email internally | PASS | Uses `supabaseAdmin.functions.invoke` with service role |
| Variable resolution | PASS | Template variables resolved from trigger data |

---

## 8. Database & Query Optimization

### Indexes (Sufficient)

| Index | File | Covers |
|-------|------|--------|
| `idx_notifications_user` | `001:89` | `user_id` equality filter |
| `idx_notifications_read` | `001:90` | `(user_id, read)` composite |
| `idx_notifications_user_unread` | `026:53-55` | Partial: `(user_id, created_at DESC) WHERE read=false` |

The partial index on unread notifications is well-designed for the most common query pattern (fetching unread notifications for badge count).

### Query Patterns

| Query | Efficiency | Notes |
|-------|------------|-------|
| Fetch notifications | GOOD | `.eq("user_id", userId).order("created_at", desc).limit(50)` -- indexed, limited |
| Mark single as read | GOOD | `.update().eq("id", id)` -- PK lookup |
| Mark all as read | ACCEPTABLE | `.update().in("id", unreadIds)` -- up to 50 IDs, but uses client-derived ID list rather than server-side WHERE |
| Delete notification | GOOD | `.delete().eq("id", id)` -- PK lookup |
| Feedback alerts fetch | GOOD | `.eq("form_id", formId).order(...)` -- indexed |

### Missing

- **No pagination**: The `LIMIT 50` is hardcoded. If a user has hundreds of notifications, they can never see past 50. No cursor-based pagination.
- **No bulk delete / clear all**: Users can only delete one at a time.
- **No notification TTL**: No scheduled cleanup of old notifications.
- **`markAllAsRead` sends IDs from client**: The `IN(id1, id2, ...)` approach works but a simpler server-side `UPDATE WHERE user_id = X AND read = false` would be more efficient and race-condition-free.

---

## 9. Documentation Audit

| Document | Coverage | Notes |
|----------|----------|-------|
| `CLAUDE.md` | GOOD | Notifications table documented in schema; triggers listed; RLS patterns explained |
| `docs/database-schema.md` | GOOD | Lists notification triggers |
| `docs/edge-functions.md` | GOOD | send-email documented with endpoint, templates, variables |
| `docs/edge-function-health-report.md` | GOOD | send-email auth bug fix documented |
| `docs/api-security.md` | GOOD | send-email classified as internal-only |
| `docs/secrets-checklist.md` | GOOD | RESEND_API_KEY and FROM_EMAIL documented |
| Inline code comments | GOOD | Migration 012 has clear section headers; edge functions have deployment instructions |

**Gap**: No documentation on which notification types exist or what triggers them. A developer adding a new notification type has to grep the codebase to find the pattern.

---

## 10. Product Growth & Innovation

### Current Notification Types

| Type | Trigger Source | Trigger Mechanism |
|------|---------------|-------------------|
| `submission` | New form submission | DB trigger (`notify_on_submission`) |
| `detractor_alert` | NPS 0-6 feedback | DB trigger (`handle_feedback_response`) |
| `ticket_assigned` | Ticket assigned to agent | DB trigger (`notify_on_ticket_assigned`) |
| `ticket_message` | (UI icon defined) | **NOT IMPLEMENTED** -- icon in NotificationPanel but no trigger creates this type |
| `waitlist_signup` | (UI icon defined) | **NOT IMPLEMENTED** -- icon in NotificationPanel but no trigger creates this type |

### Opportunities

1. **Missing notification triggers**: `ticket_message` and `waitlist_signup` have icons/colors defined in `NotificationPanel.tsx:27-41` but no database trigger creates these notification types. This is dead UI code.

2. **Notification preferences**: No user-level settings to enable/disable notification types. Every workspace owner gets all notifications with no opt-out.

3. **Email notification for in-app events**: Currently, in-app notifications and email notifications are separate systems. No mechanism to also email users when they receive an in-app notification (e.g., detractor alert could trigger both in-app + email automatically).

4. **Push notifications**: No Web Push API integration. The bell icon only works when the app is open.

5. **Digest emails**: No daily/weekly digest of missed notifications.

6. **Notification for all workspace members**: Only the workspace owner receives notifications. Editors assigned to forms should receive relevant notifications too.

7. **Batch operations in UI**: No "Clear all" or "Delete read" button. Only single-delete is available.

---

## 11. Issues Found

| # | Issue | Category | Severity | Confidence | File | Line | Impact |
|---|-------|----------|----------|------------|------|------|--------|
| 1 | **No DELETE RLS policy on `notifications` table** -- `deleteNotification()` in `useNotifications.ts:114-123` sends a DELETE query, but no RLS policy grants DELETE permission. The operation will silently fail (Supabase returns no error for RLS-blocked deletes with no matching rows). | Security / Bug | **P0** | HIGH | `supabase/migrations/003_rls_policies.sql` | 87-92 | Users cannot delete notifications; the UI appears to work (optimistic update) but data persists in DB and reappears on refresh |
| 2 | **`notify_on_submission` and `notify_on_ticket_assigned` missing `SET search_path = public`** -- Both functions use `SECURITY DEFINER` without `SET search_path`, unlike all other functions hardened in migration 025. This is a search_path injection vulnerability where a malicious schema could shadow `public.forms` or `public.workspaces`. | Security | **P1** | HIGH | `supabase/migrations/012_notification_triggers.sql` | 10, 51 | Potential privilege escalation via search_path manipulation |
| 3 | **`ticket_message` and `waitlist_signup` notification types have UI support but no DB triggers** -- `NotificationPanel.tsx` defines icons and colors for these types, but no trigger or application code ever creates notifications with these types. | Feature Gap | **P1** | HIGH | `src/components/NotificationPanel.tsx` | 27-41 | Dead UI code; users will never see these notification types |
| 4 | **Notifications only sent to workspace owner** -- `notify_on_submission` queries `workspaces.owner_id` and only inserts a notification for that user. Editors and viewers who may be responsible for the form receive nothing. | Feature Gap | **P1** | HIGH | `supabase/migrations/012_notification_triggers.sql` | 22-23, 65 | Workspace collaborators miss important events |
| 5 | **No error handling in NotificationPanel for CRUD failures** -- `handleClick` calls `markAsRead()` and ignores the return value. `handleMarkAllRead` calls `markAllAsRead()` and ignores the return value. `deleteNotification` is called without checking the result. | Resilience | **P2** | HIGH | `src/components/NotificationPanel.tsx` | 63-75, 164-168 | Users get no feedback when operations fail; due to Issue #1, delete silently fails every time |
| 6 | **No pagination for notifications** -- `useNotifications` fetches with `.limit(50)` hardcoded. No mechanism to load older notifications. | UX | **P2** | HIGH | `src/hooks/useNotifications.ts` | 19 | Users with many notifications lose access to older ones |
| 7 | **`markAllAsRead` uses client-side ID list instead of server-side filter** -- The function collects unread IDs client-side then sends `.in("id", unreadIds)`. A race condition exists: a new notification arriving between the filter and the update will not be marked as read, which is actually desirable behavior. However, sending up to 50 UUIDs in an IN clause is less efficient than `UPDATE WHERE user_id = X AND read = false`. | Performance | **P2** | MEDIUM | `src/hooks/useNotifications.ts` | 97-104 | Minor efficiency concern; functionally correct |
| 8 | **No notification cleanup mechanism** -- Notifications grow indefinitely. No TTL, no scheduled deletion, no "clear old" functionality. | Operations | **P2** | HIGH | N/A | N/A | DB bloat over time; partial index mitigates read perf but storage grows |
| 9 | **`unreadCount` not memoized** -- Computed as `notifications.filter(n => !n.read).length` on every render. Cost is negligible for 50 items, but inconsistent with the project's `useMemo` pattern. | Code Quality | **P2** | LOW | `src/hooks/useNotifications.ts` | 81 | No real perf impact; style inconsistency |
| 10 | **`send-email` URL variable bypass could allow `javascript:` URIs** -- Template variables ending in "url" skip HTML sanitization. While email clients block `javascript:` in `<a href>`, this is defense-in-depth gap. | Security | **P2** | LOW | `supabase/functions/send-email/index.ts` | 33 | Very low practical risk; email clients mitigate |
| 11 | **`useNotifications` fetch error is silently swallowed** -- If `fetchNotifications` fails (network error, auth expired), `setLoading(false)` is never called and the hook stays in loading state forever. The `data ?? []` fallback handles null but not fetch failure. | Resilience | **P1** | HIGH | `src/hooks/useNotifications.ts` | 14-22 | Panel stays in loading spinner if initial fetch fails; no retry |
| 12 | **Notification trigger hardcoded English text** -- Both `notify_on_submission` ("New submission received") and `notify_on_ticket_assigned` ("Ticket assigned to you") have English-only strings in the DB trigger. The UI is bilingual (EN/HE) but notification content is always English. | i18n | **P2** | HIGH | `supabase/migrations/012_notification_triggers.sql` | 29-30, 69-70 | Hebrew users see English notification titles/messages |
| 13 | **`feedback_alerts` not subscribed to realtime** -- The `useFeedback` hook fetches alerts on mount but does not subscribe to realtime changes on `feedback_alerts`. New detractor alerts only appear after manual page refresh. | Feature Gap | **P2** | HIGH | `src/hooks/useFeedback.ts` | 35-66 | Feedback dashboard alert banners don't update in real-time |

---

## 12. Recommended Fix Path

### Phase 1: Critical (P0)

1. **Create DELETE RLS policy for notifications** (Issue #1)
   - New migration: `CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());`
   - Without this, the `deleteNotification()` function silently fails on every call.

### Phase 2: High Priority (P1)

2. **Harden notification trigger functions with `SET search_path`** (Issue #2)
   - New migration to `CREATE OR REPLACE FUNCTION public.notify_on_submission()` and `notify_on_ticket_assigned()` with `SET search_path = public` added.

3. **Add `waitlist_signup` and `ticket_message` notification triggers** (Issue #3)
   - Create DB trigger on `waitlist_entries` AFTER INSERT -> notification to workspace owner.
   - Create DB trigger on `ticket_messages` AFTER INSERT WHERE `sender_type = 'customer'` -> notification to assigned agent (or workspace owner if unassigned).

4. **Notify all workspace members, not just owner** (Issue #4)
   - Modify `notify_on_submission()` to query `workspace_members` and insert a notification for each member (or at least editors + owner).

5. **Fix fetch error handling in useNotifications** (Issue #11)
   - Add error state; ensure `setLoading(false)` is called in both success and error paths.
   - Consider adding a retry mechanism or error toast.

### Phase 3: Improvements (P2)

6. **Add error toasts in NotificationPanel** (Issue #5) -- Show toast on markAsRead/delete/markAllAsRead failure.
7. **Add pagination** (Issue #6) -- Implement cursor-based "load more" with `created_at` cursor.
8. **Optimize markAllAsRead** (Issue #7) -- Use server-side filter instead of client-side ID list.
9. **Add notification TTL** (Issue #8) -- Scheduled Supabase cron job to delete notifications older than 90 days.
10. **Memoize unreadCount** (Issue #9) -- Wrap in `useMemo`.
11. **Validate URL scheme in send-email** (Issue #10) -- Add `https://` protocol check for URL variables.
12. **Internationalize notification trigger text** (Issue #12) -- Store a notification `type` + structured data; render localized text client-side.
13. **Subscribe feedback_alerts to realtime** (Issue #13) -- Add realtime channel for `feedback_alerts` in `useFeedback` hook.
