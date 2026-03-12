# FormForge — Supabase Live Audit Gap Analysis

> Generated: March 12, 2026
> Project ID: `rsuolemihuqjvrcpqjpa`
> Based on: Master Audit Prompt v2 × Live Dashboard Scan

---

## EXECUTIVE SUMMARY

**21 tables found, ALL with RLS enabled.** However, the audit uncovered **4 P0 critical**, **5 P1 high**, and **6 P2 medium** findings that must be remediated before production launch. The most severe: nearly all RLS policies use the `{public}` PostgreSQL role instead of `{authenticated}`, and several policies have completely open qualifiers (`true`), meaning unauthenticated users may access or modify data.

Additionally, **7 tables expected from the v3 briefing are missing** from the live database, and **pg_cron/pg_net are not enabled**, blocking any scheduled automation.

---

## P0 — CRITICAL (Must Fix Immediately)

### P0-1: RLS Policies Use `{public}` Role Instead of `{authenticated}`
**Impact:** ALL 65 RLS policies use `roles = {public}`. In Supabase, the `public` role grants access to unauthenticated (anon key) requests. Policies that should require authentication (api_keys, webhooks, canned_responses, workspace_members, subscriptions, tags, profiles_select_by_email) are accessible via the anon key.

**Which policies SHOULD use `{public}` (intentionally):** Only those for public form submission:
- `submissions_insert_public`, `tickets_insert_public`, `waitlist_entries_insert_public`, `feedback_responses_insert_public`
- `forms_select_active_public` (public needs to load active forms)
- `templates — Anyone can view active templates`

**Which policies MUST change to `{authenticated}`:** All workspace-scoped policies (api_keys_*, canned_responses_*, tags_*, webhooks_*, webhook_deliveries_*, subscriptions_*, workspace_members_*, workspaces_*, forms_insert/update/delete, notifications_*, activation_events_*, profiles_update_own, profiles_insert_own).

**Remediation:** Agent 16 — Migration to DROP and recreate all workspace-scoped policies with `{authenticated}` role.

### P0-2: Unrestricted SELECT Policies
**Impact:** Three SELECT policies have `qual = 'true'` (no filter at all):
- `tickets_select_customer`: Anyone can read ALL tickets in the system
- `waitlist_entries_select_own`: Anyone can read ALL waitlist entries
- `webhook_deliveries_update_service`: Anyone can UPDATE all webhook deliveries

**Remediation:** Agent 16 — Restrict tickets_select_customer to filter by email match. Restrict waitlist_entries_select_own similarly. Replace webhook_deliveries_update_service with service-role-only or add workspace scoping.

### P0-3: Unrestricted INSERT Policies
**Impact:** Four INSERT policies have `with_check = 'true'`:
- `notifications_insert_system`: Any request can insert notifications for any user
- `feedback_alerts_insert_system`: Any request can insert fake alerts
- `ticket_messages_insert_public`: Any request can add messages to any ticket
- `webhook_deliveries_insert_service`: Any request can create fake delivery records

**Remediation:** Agent 16 — These were intended for trigger/system use but are exploitable via PostgREST. Change to service_role-only or add proper WITH CHECK conditions.

### P0-4: `profiles_select_by_email_authenticated` Allows Broad Access
**Impact:** Policy `qual = (auth.role() = 'authenticated')` allows ANY authenticated user to read ALL profiles. Combined with P0-1 (public role), this may be exploitable.

**Remediation:** Agent 16 — Restrict to workspace-member scoping or remove entirely (profiles_select_workspace_member and profiles_select_own already cover valid use cases).

---

## P1 — HIGH (Fix This Week)

### P1-1: `handle_webhook_updated_at` Not SECURITY DEFINER
**Impact:** This trigger function runs with the caller's permissions instead of elevated privileges, and has no `search_path` set.
**Remediation:** Agent 16 — ALTER FUNCTION to add SECURITY DEFINER and SET search_path = public.

### P1-2: `branding` Storage Bucket Misconfigured
**Impact:** Bucket has `file_size_limit = null` and `allowed_mime_types = null`. Any authenticated user can upload unlimited-size files of any type.
**Remediation:** Agent 16 — UPDATE storage.buckets SET file_size_limit = 2097152, allowed_mime_types = ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml'].

### P1-3: pg_cron and pg_net Not Enabled
**Impact:** No scheduled tasks are possible. Auto-close of resolved tickets (7-day rule), weekly digest emails, and campaign scheduling require cron jobs.
**Remediation:** Agent 16 — Enable pg_cron and pg_net extensions. Register required cron jobs.

### P1-4: 7 Missing Tables (From v3 Briefing)
**Impact:** Tables that were planned in the agent architecture don't exist in production:
- `usage` — monthly usage counters for plan limit enforcement
- `integrations` — third-party integration configuration
- `workflows` / `workflow_executions` — workflow automation
- `sso_configs` / `custom_domains` / `white_label_configs` — enterprise features

**Remediation:** Agent 16 — Verify if these features are deferred or if migrations failed to apply. Create missing tables if features exist in codebase.

### P1-5: Duplicate Indexes Wasting Resources
**Impact:** Multiple pairs of identical indexes exist:
- `idx_tickets_form` + `idx_tickets_form_id` (both on tickets.form_id)
- `idx_tickets_assigned` + `idx_tickets_assigned_to` (both on tickets.assigned_to)
- `idx_submissions_form` + `idx_submissions_form_id` (both on submissions.form_id)
- `idx_waitlist_entries_form` + `idx_waitlist_entries_form_id` (both on waitlist_entries.form_id)
- `idx_waitlist_invites_entry` + `idx_waitlist_invites_entry_id`
- `idx_waitlist_invites_form` + `idx_waitlist_invites_form_id`
- `idx_notifications_user` + `idx_notifications_user_id`

**Remediation:** Agent 16 — DROP duplicate indexes.

---

## P2 — MEDIUM (Fix This Sprint)

### P2-1: Signup Trigger Not Idempotent
No ON CONFLICT clause in handle_new_user. Duplicate signup attempts could fail.

### P2-2: forms.created_by Has No FK to auth.users
The column references users but has no foreign key constraint.

### P2-3: Missing Composite Indexes
- `notifications(user_id, read, created_at)` — for unread notification queries
- `feedback_responses(form_id, created_at)` — for date-range analytics
- `submissions(form_id, submitted_at)` — already partially covered but could be composite
- `ticket_messages(ticket_id, created_at)` — for thread ordering

### P2-4: No Workspace Deletion CASCADE Test
21 FK relationships use CASCADE, but complete cascade behavior hasn't been verified.

### P2-5: No Rate Limiting Infrastructure
No rate_limits table or mechanism for API/AI call limiting beyond plan checks.

### P2-6: No Error Logging Table
Application errors have no persistent storage.

---

## WHAT'S WORKING WELL

| Check | Status | Details |
|-------|--------|---------|
| All tables have RLS | ✅ PASS | 21/21 tables |
| Security Definer functions | ✅ PASS | 13/14 (1 exception noted) |
| search_path set | ✅ PASS | 13/14 functions |
| Storage buckets exist | ✅ PASS | 3 buckets (avatars, branding, form-uploads) |
| Realtime publication | ✅ PASS | 9 tables correctly configured |
| Enums defined | ✅ PASS | 9 enums with correct values |
| Triggers in place | ✅ PASS | 11 triggers covering all modes |
| FK cascades | ✅ PASS | All use CASCADE (except 1 SET NULL) |
| pg_stat_statements | ✅ PASS | Enabled for query monitoring |
| Unique constraints | ✅ PASS | Key tables have correct unique indexes |
| Index coverage | ⚠️ WARN | 60+ indexes but with 7 duplicate pairs |

---

## AGENT TASK MAPPING

| Finding | Severity | Assigned Agent |
|---------|----------|---------------|
| P0-1: Public role policies | P0 | Agent 16 (Prompt 16.2) |
| P0-2: Unrestricted SELECT | P0 | Agent 16 (Prompt 16.2) |
| P0-3: Unrestricted INSERT | P0 | Agent 16 (Prompt 16.2) |
| P0-4: Broad profile access | P0 | Agent 16 (Prompt 16.2) |
| P1-1: Non-SECURITY DEFINER function | P1 | Agent 16 (Prompt 16.3) |
| P1-2: Branding bucket no limits | P1 | Agent 16 (Prompt 16.4) |
| P1-3: pg_cron/pg_net missing | P1 | Agent 16 (Prompt 16.4) |
| P1-4: Missing tables | P1 | Agent 16 (Prompt 16.3) |
| P1-5: Duplicate indexes | P1 | Agent 16 (Prompt 16.3) |
| P2-1 through P2-6 | P2 | Agent 16 (Prompts 16.3-16.4) |
| Edge function deployment | — | Agent 17 (all prompts) |
| Edge function JWT verify | — | Agent 17 (Prompt 17.1-17.3) |
| Testing all security fixes | — | Agent 18 (Prompt 18.1-18.4) |
| CI/CD for edge functions | — | Agent 19 (Prompt 19.1) |
| Production readiness sign-off | — | Agent 20 (Prompt 20.0-20.4) |
