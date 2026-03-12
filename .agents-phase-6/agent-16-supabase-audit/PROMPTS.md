# Agent 16 — Prompts (Project-Specific)

> Project ID: `rsuolemihuqjvrcpqjpa`
> Audit based on: Supabase Master Audit Prompt v2 + Live Dashboard Scan March 2026

## Prompt Checklist
- [x] 16.0 — Planning: Read Codebase & Verify Live State
- [x] 16.1 — P0 FIX: RLS Policy Role Remediation (CRITICAL)
- [x] 16.2 — P0/P1 FIX: Overly Permissive Policies & Function Hardening
- [x] 16.3 — P1 FIX: Missing Tables, Duplicate Indexes, Schema Integrity
- [x] 16.4 — P1/P2 FIX: Storage, Extensions, Cron Jobs, Documentation

---

### PROMPT 16.0: Planning — Read Codebase & Verify Live State

You are Agent 16 — Supabase Audit & Database Hardening for FormForge.
READ CLAUDE.md first — follow ALL rules.

PROJECT: rsuolemihuqjvrcpqjpa

SUPER TASK: Perform production readiness audit and remediate all findings.

CONFIRMED FINDINGS FROM LIVE SCAN:
- 21 tables, ALL with RLS enabled
- 9 enums, 11 triggers, 14 functions
- P0-1: ALL 65 RLS policies use roles={public} instead of {authenticated}
- P0-2: 3 policies have qual='true' (tickets_select_customer, waitlist_entries_select_own, webhook_deliveries_update_service)
- P0-3: 4 INSERT policies with with_check='true' (notifications, feedback_alerts, ticket_messages, webhook_deliveries)
- P0-4: profiles_select_by_email_authenticated allows any auth user to read ALL profiles
- P1-1: handle_webhook_updated_at NOT SECURITY DEFINER
- P1-2: branding bucket has NO file_size_limit, NO allowed_mime_types
- P1-3: pg_cron and pg_net NOT enabled
- P1-4: 7 expected tables missing from DB
- P1-5: 7 pairs of duplicate indexes

TASK: Create audit directory with AUDIT-REPORT.md, rls-matrix.md, migration-inventory.md. Create docs/database-schema.md. Verify all findings. Create remediation plan.

VERIFY: All files created. All findings confirmed.

---

### PROMPT 16.1: P0 FIX — RLS Policy Role Remediation (CRITICAL)

TASK: Fix the MOST CRITICAL vulnerability — change workspace-scoped policies from {public} to {authenticated} role.

KEEP as {public}: forms_select_active_public, submissions_insert_public, feedback_responses_insert_public, tickets_insert_public, waitlist_entries_insert_public, tickets_select_customer, waitlist_entries_select_own, messages_select_customer, template viewer policy.

CHANGE to {authenticated}: ALL api_keys_*, canned_responses_*, tags_*, webhooks_*, workspace_members_*, workspaces_*, forms_insert/update/delete, forms_select_member, submissions_select_member, feedback_responses_select/update_member, feedback_alerts_select/update_member, tickets_select/update_member, ticket_tags_*, messages_select_member, notifications_select/update_own, waitlist_entries_select/update_member, waitlist_invites_*, webhook_deliveries_select_member, subscriptions_*, profiles_select_own/update_own/insert_own, profiles_select_workspace_member, activation_events_*.

CREATE MIGRATION 024_rls_role_remediation.sql: DROP each policy, recreate with TO authenticated, keep same qual/with_check. Single transaction.

VERIFY: Check roles on all policies. Test anonymous vs authenticated access.

---

### PROMPT 16.2: P0/P1 FIX — Overly Permissive Policies & Function Hardening

TASK: Fix dangerous open policies and function security.

1. DROP webhook_deliveries_update_service (qual='true' — anyone can UPDATE)
2. DROP webhook_deliveries_insert_service (with_check='true')
3. Restrict notifications_insert_system: WITH CHECK validates user_id exists
4. Restrict feedback_alerts_insert_system: WITH CHECK validates form_id exists
5. Restrict ticket_messages_insert_public: WITH CHECK validates ticket exists and not closed
6. DROP profiles_select_by_email_authenticated (redundant, overly broad)
7. ALTER FUNCTION handle_webhook_updated_at() SECURITY DEFINER SET search_path = public

CREATE MIGRATION 025_policy_hardening.sql with all fixes.

VERIFY: Only accepted-risk policies remain with qual='true'. Function is SECURITY DEFINER.

---

### PROMPT 16.3: P1 FIX — Missing Tables, Duplicate Indexes, Schema Integrity

TASK: Add missing tables, remove duplicate indexes, fix schema issues.

1. Check codebase for references to: usage, integrations, workflows, sso_configs, custom_domains, white_label_configs
2. Create tables that ARE referenced in code
3. Most critical: usage table (plan limit enforcement)
4. Remove 7 duplicate index pairs
5. Add missing composite indexes for common queries
6. Add get_workspace_usage() RPC function

CREATE MIGRATIONS 026_missing_tables.sql and 027_cleanup_indexes.sql

VERIFY: New tables exist. Duplicates gone. RPC function works.

---

### PROMPT 16.4: P1/P2 FIX — Storage, Extensions, Cron Jobs, Documentation

TASK: Final hardening and complete documentation.

1. Fix branding bucket: SET file_size_limit=2097152, allowed_mime_types for images
2. Document pg_cron/pg_net enable steps (Dashboard manual)
3. Register auto-close cron job for resolved tickets
4. Verify realtime publication covers all needed tables
5. Write executive summary in AUDIT-REPORT.md
6. Create docs/security-baseline.md
7. Finalize all audit documentation

VERIFY: All buckets secured. Documentation complete. Zero P0 findings remain.
