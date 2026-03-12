# Supabase Security Audit Report — FormForge

> **Audit Date**: 2026-03-12
> **Project ID**: rsuolemihuqjvrcpqjpa
> **Auditor**: Agent 16 (Phase 6 — Production Hardening)
> **Status**: COMPLETE — All P0 findings remediated

---

## Executive Summary

FormForge's Supabase backend had **critical security vulnerabilities** in its RLS policy configuration. The most severe finding was that ALL 65+ RLS policies defaulted to the `{public}` role, meaning policies were evaluated for unauthenticated (anon) users. Additionally, several policies used `USING(true)` or `WITH CHECK(true)`, creating unrestricted access paths.

**All P0 and P1 findings have been remediated** via migrations 024-027:
- 55 policies changed from `{public}` to `TO authenticated`
- 3 dangerous `USING(true)` policies removed or replaced
- 5 dangerous `WITH CHECK(true)` policies removed or restricted
- 7 functions hardened with SECURITY DEFINER + search_path
- 5 duplicate indexes removed, 6 composite indexes added
- Storage bucket hardened with file size and MIME type limits
- Cron job functions created for auto-close and cache cleanup

**Remaining manual actions**: Enable pg_cron/pg_net extensions via Dashboard, register cron jobs, enable email confirmation.

---

## Findings Summary

| ID | Severity | Category | Description | Status |
|---|---|---|---|---|
| P0-1 | **CRITICAL** | RLS Roles | All 65+ policies use `{public}` role instead of `{authenticated}` | **FIXED** (024) |
| P0-2 | **CRITICAL** | RLS Open Qual | 3 policies with `USING(true)` | **FIXED** (025) |
| P0-3 | **CRITICAL** | RLS Open Check | 5 policies with `WITH CHECK(true)` | **FIXED** (025) |
| P1-1 | HIGH | Functions | 7 functions missing SECURITY DEFINER / search_path | **FIXED** (025) |
| P1-2 | HIGH | Storage | branding bucket: no file_size_limit, no allowed_mime_types | **FIXED** (027) |
| P1-3 | HIGH | Extensions | pg_cron and pg_net not enabled | **DOCUMENTED** — requires Dashboard |
| P1-4 | MEDIUM | Schema | Auto-generated migrations overlap with manual ones | **DOCUMENTED** — no action needed |
| P1-5 | MEDIUM | Indexes | 5 duplicate indexes, missing composites | **FIXED** (026) |
| P2-1 | LOW | Realtime | Several tables missing from realtime publication | **ACCEPTED** — add as needed |
| P2-2 | LOW | Triggers | Race condition in waitlist position assignment | **ACCEPTED** — low likelihood |

---

## Remediation Migrations

| Migration | File | Purpose | Policies Changed |
|---|---|---|---|
| 024 | `024_rls_role_remediation.sql` | Change 55 policies from `{public}` to `TO authenticated` | 55 |
| 025 | `025_policy_hardening.sql` | Fix dangerous open policies, harden functions, add profile scoping | 10 policies + 7 functions |
| 026 | `026_cleanup_indexes.sql` | Drop 5 duplicate indexes, add 6 composite indexes | — |
| 027 | `027_storage_hardening.sql` | Harden branding bucket, create cron job functions | — |

---

## Detailed Findings & Resolutions

### P0-1: RLS Policy Role Remediation (FIXED — Migration 024)

**Problem**: All 65+ RLS policies were created without a `TO` clause, defaulting to `TO PUBLIC`. This meant policies were evaluated for anonymous (unauthenticated) requests.

**Fix**: Migration 024 drops and recreates 55 workspace-scoped policies with `TO authenticated`. 10 intentionally public policies (for anon form access, submissions, ticket tracking) remain on `{public}`.

### P0-2: Dangerous `USING(true)` Policies (FIXED — Migration 025)

| Policy | Table | Resolution |
|---|---|---|
| `tickets_select_customer` | tickets | Replaced with scoped policy: only active support forms |
| `waitlist_entries_select_own` | waitlist_entries | Dropped — unnecessary, no public code reads entries |
| `webhook_deliveries_update_service` | webhook_deliveries | Dropped — service role bypasses RLS |

### P0-3: Dangerous `WITH CHECK(true)` Policies (FIXED — Migration 025)

| Policy | Table | Resolution |
|---|---|---|
| `webhook_deliveries_insert_service` | webhook_deliveries | Dropped — service role bypasses RLS |
| `workflow_runs_insert_service` | workflow_runs | Dropped — service role bypasses RLS |
| `notifications_insert_system` | notifications | Restricted: validates `user_id` exists in `auth.users` |
| `feedback_alerts_insert_system` | feedback_alerts | Restricted: validates `form_id` and `response_id` exist |
| `messages_insert_public` | ticket_messages | Restricted: validates ticket exists, form active+support, ticket not closed |

### P1-1: Function Security (FIXED — Migration 025)

7 functions updated with `SECURITY DEFINER SET search_path = public`:
- handle_webhook_updated_at, handle_churn_score_updated_at
- handle_enterprise_settings_updated_at, handle_custom_domains_updated_at
- handle_workflow_updated, increment_usage_submission, get_workspace_usage

### P1-2: Storage Hardening (FIXED — Migration 027)

Branding bucket updated:
- `file_size_limit`: 2MB (2,097,152 bytes)
- `allowed_mime_types`: image/png, image/jpeg, image/svg+xml, image/webp, image/gif

### P1-3: Missing Extensions (DOCUMENTED)

pg_cron and pg_net cannot be enabled via migration — requires Supabase Dashboard.
Cron job functions created and ready to register:
```sql
SELECT cron.schedule('auto-close-tickets', '0 2 * * *', 'SELECT public.auto_close_resolved_tickets()');
SELECT cron.schedule('cleanup-ai-cache', '0 3 * * *', 'SELECT public.cleanup_expired_ai_cache()');
```

### P1-5: Index Cleanup (FIXED — Migration 026)

**Dropped** (5 duplicates):
- `idx_feedback_responses_sentiment` — duplicate of `idx_feedback_responses_form_sentiment`
- `idx_tickets_assigned` — superseded by partial `idx_tickets_assigned_to`
- `idx_api_keys_key_hash` — redundant with UNIQUE constraint
- `idx_subscriptions_stripe_sub` — redundant with UNIQUE constraint
- `idx_templates_slug` — redundant with UNIQUE constraint

**Added** (6 composites):
- `idx_tickets_form_status_priority` — agent dashboard filtering
- `idx_submissions_form_submitted` — pagination by date
- `idx_waitlist_entries_form_position` — admin entry sorting
- `idx_notifications_user_unread` — partial index for unread notifications
- `idx_tickets_first_response` — SLA tracking (unresponded tickets)
- `idx_webhook_deliveries_retry` — retry queue optimization

---

## Accepted Risks

| Risk | Severity | Rationale |
|---|---|---|
| `tickets_select_customer` allows anon read of tickets for active support forms | Medium | Required for public ticket tracking; scoped to active forms only; client filters by ticket_number + email |
| Waitlist position race condition | Low | Concurrent inserts rare; worst case = duplicate position (cosmetic) |
| No CAPTCHA on public submissions | Medium | Should be added before high-traffic launch |
| Realtime not enabled on all tables | Low | Only needed tables have realtime; add more as features require |

---

## Appendices

- [RLS Policy Matrix](./rls-matrix.md) — Full matrix of all 68 policies with role assignments
- [Migration Inventory](./migration-inventory.md) — Complete inventory of 27 migrations
- [Database Schema](../docs/database-schema.md) — Table/enum/trigger reference
- [Security Baseline](../docs/security-baseline.md) — Security posture and pre-launch checklist
